import http from "node:http";
import { describe, it, expect, vi, afterEach } from "vitest";
import { pinnedFetch, readBoundedText } from "./pinned-transport";
import { SafeCrawler } from "./crawler";
import { checkPublicExposure } from "./exposure-checker";
import * as dnsSafety from "./dns-safety";

describe("Pinned Transport & Whole-Scanner SSRF Protection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Destination Pinning & DNS Rebinding Defense", () => {
    it("fails closed when destination hostname rebinds to a prohibited private IP", async () => {
      // Mock validateHostSafety to simulate DNS rebinding where host resolves to 127.0.0.1
      vi.spyOn(dnsSafety, "validateHostSafety").mockResolvedValue({
        isSafe: false,
        resolvedIps: ["127.0.0.1"],
        rejectionReason: "Prohibited IP address (loopback: 127.0.0.1)",
      });

      await expect(
        pinnedFetch("http://rebind-attack.example.com/", { timeoutMs: 2000 })
      ).rejects.toThrow("Destination safety boundary violation");
    });

    it("rejects literal private addresses and metadata endpoints before socket connection", async () => {
      const targets = [
        "http://127.0.0.1:8080/admin",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/internal",
        "http://[::1]/",
      ];

      for (const target of targets) {
        await expect(pinnedFetch(target, { timeoutMs: 2000 })).rejects.toThrow(
          "Destination safety boundary violation"
        );
      }
    });
  });

  describe("2. Redirect Boundary Protection & Hop Validation", () => {
    it("blocks redirect to private/loopback destination and does not follow unsafely", async () => {
      // Create local test server that issues a redirect to 127.0.0.1
      const server = http.createServer((req, res) => {
        if (req.url === "/redirect-to-private") {
          res.writeHead(302, { location: "http://127.0.0.1:9999/secret" });
          res.end();
          return;
        }
        res.writeHead(200, { "content-type": "text/plain" }).end("ok");
      });

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
      const port = (server.address() as any).port;
      const testServerUrl = `http://127.0.0.1:${port}/redirect-to-private`;

      // Allow preflight on entry but reject target
      vi.spyOn(dnsSafety, "validateHostSafety").mockImplementation(async (host) => {
        if (host === "safe-entry.example.com") {
          return { isSafe: true, resolvedIps: ["127.0.0.1"] }; // proxy/local test simulation
        }
        // Redirect target
        return { isSafe: false, resolvedIps: ["127.0.0.1"], rejectionReason: "Prohibited IP address (127.0.0.1)" };
      });

      try {
        await expect(
          pinnedFetch(`http://safe-entry.example.com:${port}/redirect-to-private`, {
            timeoutMs: 3000,
          })
        ).rejects.toThrow("Destination safety boundary violation");
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it("enforces maximum redirect limit and terminates redirect loops", async () => {
      const server = http.createServer((req, res) => {
        const count = Number(req.url?.replace("/loop-", "")) || 0;
        res.writeHead(302, { location: `/loop-${count + 1}` });
        res.end();
      });

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
      const port = (server.address() as any).port;

      vi.spyOn(dnsSafety, "validateHostSafety").mockResolvedValue({
        isSafe: true,
        resolvedIps: ["127.0.0.1"],
      });

      try {
        await expect(
          pinnedFetch(`http://localhost:${port}/loop-0`, {
            maxRedirects: 3,
            timeoutMs: 3000,
          })
        ).rejects.toThrow("Exceeded maximum redirect limit");
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it("rejects prohibited redirect schemes such as javascript:, file:, or data:", async () => {
      const server = http.createServer((req, res) => {
        res.writeHead(302, { location: "file:///etc/passwd" });
        res.end();
      });

      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
      const port = (server.address() as any).port;

      vi.spyOn(dnsSafety, "validateHostSafety").mockResolvedValue({
        isSafe: true,
        resolvedIps: ["127.0.0.1"],
      });

      try {
        await expect(
          pinnedFetch(`http://localhost:${port}/bad-scheme`, { timeoutMs: 3000 })
        ).rejects.toThrow("Prohibited redirect protocol");
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  describe("3. Crawler & External Link Egress Hardening", () => {
    it("handles unsafe external-link redirects by marking link as broken with status 403", async () => {
      const crawler = new SafeCrawler({ maxExternalLinks: 5 });

      // Mock fetchFn to simulate redirect boundary violation
      const mockFetchFn = vi.fn().mockRejectedValue(
        new Error("Destination safety boundary violation: Prohibited IP address (169.254.169.254)")
      );
      (crawler as any).fetchFn = mockFetchFn;

      const links = [
        {
          id: "lnk_unsafe",
          sourceUrl: "https://example.com/",
          targetUrl: "https://external-partner.example.com/redirect-to-metadata",
          isInternal: false,
          anchorText: "Partner",
          isBroken: false,
          isRedirect: false,
        },
      ];

      const tested = await (crawler as any).testExternalLinksSample(links);
      expect(tested.length).toBe(1);
      expect(tested[0].isBroken).toBe(true);
      expect(tested[0].statusCode).toBe(403);
    });

    it("does not fetch internal URLs declared in adversarial robots.txt sitemaps", async () => {
      const crawler = new SafeCrawler({ maxPages: 2 });

      // Mock fetchFn to return adversarial robots.txt with internal sitemap URL
      const mockFetchFn = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(
            new Response("User-agent: *\nSitemap: http://127.0.0.1:8080/internal-sitemap.xml", {
              status: 200,
              headers: { "content-type": "text/plain" },
            })
          );
        }
        if (url.includes("127.0.0.1")) {
          return Promise.reject(new Error("Destination safety boundary violation: Prohibited IP 127.0.0.1"));
        }
        return Promise.resolve(new Response("<html><head><title>Ok</title></head></html>", { status: 200 }));
      });
      (crawler as any).fetchFn = mockFetchFn;

      await (crawler as any).fetchRobotsTxt("https://example.com", "example.com");
      expect((crawler as any).sitemapUrls).toEqual([]);
    });
  });

  describe("4. Public Exposure Probes with DNS Rebinding", () => {
    it("treats probe target that rebinds to internal IP as inconclusive rather than exposed or safe", async () => {
      // Simulate probe where destination fails safety check
      const mockFetchFn = vi.fn().mockRejectedValue(
        new Error("Destination safety boundary violation: Host resolved to prohibited private IP 10.0.0.1")
      );

      const result = await checkPublicExposure("https://example.com", {
        fetchFn: mockFetchFn,
        timeoutMs: 2000,
      });

      expect(result.hasExposure).toBe(false);
      expect(result.isInconclusive).toBe(true);
      expect(result.inconclusiveReason).toContain("Public exposure probe results were inconclusive");
      expect(result.evidence.some((e) => e.includes("Blocked by destination boundary policy") || e.includes("Inconclusive"))).toBe(true);
    });
  });

  describe("5. Bounded Stream Reading, Cancellation & Timeout", () => {
    it("bounds large responses at explicit maxBytes and truncates cleanly", async () => {
      // 100 KB payload
      const largePayload = "X".repeat(100 * 1024);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(largePayload));
          controller.close();
        },
      });

      const response = new Response(stream, { status: 200 });
      // Limit to 4 KB
      const { text, bytesRead, isTruncated } = await readBoundedText(response, 4096);

      expect(bytesRead).toBe(4096);
      expect(text.length).toBe(4096);
      expect(isTruncated).toBe(true);
    });

    it("times out during stalled stream reading without hanging", async () => {
      // Stream that never sends chunks
      const hangingStream = new ReadableStream<Uint8Array>({
        start() {},
      });

      const response = new Response(hangingStream, { status: 200 });
      await expect(
        readBoundedText(response, 1024, { timeoutMs: 50 })
      ).rejects.toThrow("timed out");
    });

    it("cancels immediately when parent AbortSignal is triggered during stream read", async () => {
      const controller = new AbortController();

      const slowStream = new ReadableStream<Uint8Array>({
        start() {
          // Delay chunks
        },
      });

      const response = new Response(slowStream, { status: 200 });
      const readPromise = readBoundedText(response, 1024, { signal: controller.signal });

      controller.abort();
      await expect(readPromise).rejects.toThrow("Stream read aborted by signal");
    });
  });
});
