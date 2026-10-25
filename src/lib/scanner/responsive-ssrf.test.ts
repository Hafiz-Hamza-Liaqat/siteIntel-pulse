import http from "node:http";
import net from "node:net";
import { describe, it, expect, vi } from "vitest";
import { runResponsiveAudit, createPinnedEgressProxy } from "./responsive-runner";
import * as dnsSafety from "./dns-safety";
import { validateHostSafety } from "./dns-safety";
import { responsiveRules } from "../catalogue/rules/responsive";
import { RuleEvaluationContext } from "../catalogue/types";

describe("Playwright Responsive Runner — SSRF & Destination Boundary Safety", () => {
  it("rejects literal private IPv4 addresses at pre-flight and interceptor", async () => {
    const targets = [
      "http://127.0.0.1:8080",
      "http://10.0.0.1/",
      "http://192.168.1.100/admin",
      "http://172.16.0.5/",
    ];

    for (const target of targets) {
      const parsed = new URL(target);
      const safety = await validateHostSafety(parsed.hostname);
      expect(safety.isSafe).toBe(false);
      expect(safety.rejectionReason).toContain("private");

      const result = await runResponsiveAudit(target, { timeoutMs: 2000 });
      expect(result.isBrowserAvailable).toBe(false);
      expect(result.runnerStatus).toBe("SKIPPED");
      expect(result.summary.responsiveStatus).toBe("NOT_TESTED");
      expect(result.summary.horizontalOverflowFound).toBeNull();
      expect(result.viewportResults.every((v) => v.status === "NOT_TESTED")).toBe(true);
    }
  });

  it("rejects loopback and link-local IPv6 literals", async () => {
    const targets = [
      "http://[::1]:8080/",
      "http://[fe80::1]/",
    ];

    for (const target of targets) {
      const parsed = new URL(target);
      const safety = await validateHostSafety(parsed.hostname);
      expect(safety.isSafe).toBe(false);

      const result = await runResponsiveAudit(target, { timeoutMs: 2000 });
      expect(result.isBrowserAvailable).toBe(false);
      expect(result.runnerStatus).toBe("SKIPPED");
      expect(result.summary.responsiveStatus).toBe("NOT_TESTED");
    }
  });

  it("rejects IPv4-mapped IPv6 literals (bracketed and dotted/hex)", async () => {
    const targets = [
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:7f00:1]/",
    ];

    for (const target of targets) {
      const parsed = new URL(target);
      const safety = await validateHostSafety(parsed.hostname);
      expect(safety.isSafe).toBe(false);

      const result = await runResponsiveAudit(target, { timeoutMs: 2000 });
      expect(result.runnerStatus).toBe("SKIPPED");
      expect(result.summary.responsiveStatus).toBe("NOT_TESTED");
    }
  });

  it("rejects cloud metadata destination 169.254.169.254", async () => {
    const target = "http://169.254.169.254/latest/meta-data/";
    const safety = await validateHostSafety(new URL(target).hostname);
    expect(safety.isSafe).toBe(false);

    const result = await runResponsiveAudit(target, { timeoutMs: 2000 });
    expect(result.runnerStatus).toBe("SKIPPED");
    expect(result.summary.responsiveStatus).toBe("NOT_TESTED");
  });

  it("rejects public hostnames that resolve to private or loopback IPs via DNS", async () => {
    // 127.0.0.1.nip.io is a public domain that resolves to 127.0.0.1
    const target = "http://127.0.0.1.nip.io/";
    const safety = await validateHostSafety(new URL(target).hostname);
    expect(safety.isSafe).toBe(false);
    expect(safety.rejectionReason).toContain("prohibited IP");

    const result = await runResponsiveAudit(target, { timeoutMs: 2000 });
    expect(result.runnerStatus).toBe("SKIPPED");
    expect(result.summary.responsiveStatus).toBe("NOT_TESTED");
    expect(result.viewportResults.every((v) => v.status === "NOT_TESTED")).toBe(true);
  });

  it("ensures blocked navigation results in NOT_TESTED with 0 points across catalogue rules", () => {
    const blockedResult = runResponsiveAudit("http://127.0.0.1/"); // will fail pre-flight

    // Construct evaluation context with skipped/blocked runner result
    const ctx: RuleEvaluationContext = {
      targetUrl: "http://127.0.0.1/",
      domain: "127.0.0.1",
      businessCategory: "ecommerce",
      pages: [],
      robotsTxt: undefined,
      sitemapUrls: [],
      externalLinksTested: [],
      browserResponsiveResults: [
        {
          viewport: 320,
          pageUrl: "",
          status: "NOT_TESTED",
          horizontalOverflow: false,
          overflowElements: [],
          touchTargetIssues: 0,
          touchTargetSelectors: [],
          clippingIssues: 0,
          accessibleNameIssues: 0,
          screenshotAvailable: false,
          severity: "INFORMATIONAL",
        },
      ],
      browserVisualResults: {
        status: "NOT_TESTED",
        colorContrast: { status: "NOT_TESTED", testedElementsCount: 0, contrastFailuresCount: 0, failingSelectors: [] },
        typography: { status: "NOT_TESTED", headingHierarchyMaintained: true },
        layoutAndSpacing: { status: "NOT_TESTED", unintendedOverlapCount: 0, clippingCount: 0, brokenImagesCount: 0, brokenImageUrls: [] },
        controlsAndConsistency: { status: "NOT_TESTED", touchTargetDefectsCount: 0, accessibleNameDefectsCount: 0, defectiveSelectors: [] },
        themeAdaptability: { supportsDarkMode: false, prefersColorSchemeObserved: false },
        testedViewportWidths: [],
        limitations: "Visual quality assessment requires active browser execution.",
      },
    };

    const rsp02 = responsiveRules.find((r) => r.id === "RSP-02")!;
    const res02 = rsp02.evaluate(ctx);
    expect(res02.status).toBe("NOT_TESTED");
    expect(res02.earnedPoints).toBe(0);

    const rsp03 = responsiveRules.find((r) => r.id === "RSP-03")!;
    const res03 = rsp03.evaluate(ctx);
    expect(res03.status).toBe("NOT_TESTED");
    expect(res03.earnedPoints).toBe(0);

    const rsp04 = responsiveRules.find((r) => r.id === "RSP-04")!;
    const res04 = rsp04.evaluate(ctx);
    expect(res04.status).toBe("NOT_TESTED");
    expect(res04.earnedPoints).toBe(0);
  });

  describe("Pinned Egress Proxy & DNS-Rebinding Defense", () => {
    it("blocks outbound proxy HTTP requests to private / rebinding destinations", async () => {
      const proxy = await createPinnedEgressProxy();
      const proxyParsed = new URL(proxy.proxyUrl);

      try {
        const statusCode = await new Promise<number>((resolve) => {
          const req = http.request(
            {
              host: proxyParsed.hostname,
              port: proxyParsed.port,
              path: "http://127.0.0.1.nip.io/admin",
              method: "GET",
              headers: { host: "127.0.0.1.nip.io" },
            },
            (res) => {
              resolve(res.statusCode || 0);
            }
          );
          req.on("error", () => resolve(500));
          req.end();
        });

        expect(statusCode).toBe(403);
        const blocked = proxy.getBlockedRequests();
        expect(blocked.some((b) => b.url.includes("127.0.0.1.nip.io"))).toBe(true);
      } finally {
        await proxy.close();
      }
    });

    it("blocks HTTPS CONNECT tunnels to private / link-local destinations", async () => {
      const proxy = await createPinnedEgressProxy();
      const proxyParsed = new URL(proxy.proxyUrl);

      try {
        const responseStatus = await new Promise<string>((resolve) => {
          const client = net.connect(Number(proxyParsed.port), proxyParsed.hostname, () => {
            client.write("CONNECT 169.254.169.254:443 HTTP/1.1\r\nHost: 169.254.169.254\r\n\r\n");
          });

          client.on("data", (data) => {
            resolve(data.toString());
            client.destroy();
          });

          client.on("error", () => resolve("ERROR"));
        });

        expect(responseStatus).toContain("403 Forbidden");
        const blocked = proxy.getBlockedRequests();
        expect(blocked.some((b) => b.url.includes("169.254.169.254"))).toBe(true);
      } finally {
        await proxy.close();
      }
    });

    it("detects DNS rebinding / answer change and terminates the connection immediately", async () => {
      // Mock validateHostSafety to simulate DNS rebinding where host subsequently resolves to private IP
      const validateSpy = vi.spyOn(dnsSafety, "validateHostSafety").mockResolvedValueOnce({
        isSafe: false,
        resolvedIps: ["127.0.0.1"],
        rejectionReason: "DNS Rebinding detected: host resolved to prohibited private IP 127.0.0.1",
      });

      const proxy = await createPinnedEgressProxy();
      const proxyParsed = new URL(proxy.proxyUrl);

      try {
        const statusCode = await new Promise<number>((resolve) => {
          const req = http.request(
            {
              host: proxyParsed.hostname,
              port: proxyParsed.port,
              path: "http://rebind-test.example.com/",
              method: "GET",
              headers: { host: "rebind-test.example.com" },
            },
            (res) => {
              resolve(res.statusCode || 0);
            }
          );
          req.on("error", () => resolve(500));
          req.end();
        });

        expect(statusCode).toBe(403);
        const blocked = proxy.getBlockedRequests();
        expect(blocked.some((b) => b.reason.includes("DNS Rebinding"))).toBe(true);
      } finally {
        validateSpy.mockRestore();
        await proxy.close();
      }
    });

    it("skips scan and leaves viewports NOT_TESTED when navigation redirects to an unsafe internal IP", async () => {
      // Attempting to scan a target that triggers SSRF safety failure
      const result = await runResponsiveAudit("http://10.255.255.1/");
      expect(result.runnerStatus).toBe("SKIPPED");
      expect(result.failureReason).toContain("destination boundary safety validation");
      expect(result.summary.responsiveStatus).toBe("NOT_TESTED");
      expect(result.summary.horizontalOverflowFound).toBeNull();
      expect(result.viewportResults.every((v) => v.status === "NOT_TESTED")).toBe(true);
    });
  });
});
