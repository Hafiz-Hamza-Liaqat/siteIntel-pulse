import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { extractClientIp } from "./login-rate-limiter";
import { POST as scanHandler, GET as getScanHandler } from "@/app/api/scan/route";
import { GET as getReportHandler } from "@/app/api/scan/report/route";
import { GET as getExpertReportHandler } from "@/app/api/scan/expert-report/route";
import { GET as getPdfHandler } from "@/app/api/scan/pdf/route";
import { GET as getExpertPdfHandler } from "@/app/api/scan/expert-pdf/route";
import { GET as getExpertExportHandler } from "@/app/api/scan/expert-export/route";
import { SESSION_COOKIE_NAME } from "../auth";
import * as dnsSafety from "../scanner/dns-safety";
import { scanOrchestrator } from "../scanner/orchestrator";
import { ScanRequest } from "@/types";

describe("Final Guest Security Review & Regression Suite", () => {
  const testDbPath = path.resolve(process.cwd(), "data", `test_guest_sec_review_${Date.now()}.db`);
  let adapter: SqliteScanDatabaseAdapter;

  beforeEach(() => {
    // Mock DNS validation to avoid actual network requests during unit tests
    vi.spyOn(dnsSafety, "validateUrlSafety").mockResolvedValue({
      isSafe: true,
      resolvedIps: ["93.184.216.34"],
    });

    // Mock scan orchestrator audit to avoid network crawling during unit testing
    vi.spyOn(scanOrchestrator, "runAudit").mockResolvedValue({} as any);

    adapter = new SqliteScanDatabaseAdapter(testDbPath);
    (globalThis as any).scanDbInstance = adapter;
  });

  afterEach(() => {
    delete process.env.TRUSTED_IP_HEADER;
    (globalThis as any).scanDbInstance = undefined;
    adapter.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}
  });

  function getTableCounts(): { tenants: number; users: number; sessions: number } {
    const rawDb = (adapter as any).db;
    const tenants = rawDb.prepare("SELECT COUNT(*) as count FROM tenants").get().count;
    const users = rawDb.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const sessions = rawDb.prepare("SELECT COUNT(*) as count FROM sessions").get().count;
    return { tenants, users, sessions };
  }

  describe("1. Secure Client IP Extraction & Anti-Spoofing", () => {
    it("prioritizes trusted reverse-proxy X-Real-IP over spoofed X-Forwarded-For headers", () => {
      const headers = new Headers();
      // Attacker supplies a forged X-Forwarded-For header with rotating random IPs
      headers.set("x-forwarded-for", "1.1.1.1, 8.8.8.8");
      // Documented reverse-proxy (Nginx) unconditionally overwrites X-Real-IP with $remote_addr
      headers.set("x-real-ip", "203.0.113.77");

      const extracted = extractClientIp(headers);
      expect(extracted).toBe("203.0.113.77");
    });

    it("ignores X-Forwarded-For supplied without X-Real-IP (does not fall back to untrusted headers)", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "198.51.100.44, 10.0.0.1");
      // X-Real-IP is intentionally missing

      // In non-production test environment, falls back to loopback (127.0.0.1), NEVER trusting X-Forwarded-For
      const extracted = extractClientIp(headers);
      expect(extracted).toBe("127.0.0.1");
      expect(extracted).not.toBe("198.51.100.44");
    });

    it("prevents bypassing IP rate limits via rotating X-Forwarded-For when X-Real-IP is provided", async () => {
      const trustedIp = "198.51.100.99";

      // Submit 15 valid requests from the same trusted connection IP but varying spoofed X-Forwarded-For headers
      for (let i = 1; i <= 15; i++) {
        const req = new NextRequest("http://localhost:3000/api/scan", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-real-ip": trustedIp,
            "x-forwarded-for": `10.${i}.0.1, 10.${i}.0.2`, // Attacker attempts spoofing
          },
          body: JSON.stringify({
            targetUrl: `https://test-spoof-${i}.example.com`,
            reportType: "owner",
          }),
        });

        const res = await scanHandler(req);
        expect(res.status).toBe(200);
      }

      // 16th request must be blocked by IP rate limit despite another spoofed X-Forwarded-For
      const blockedReq = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": trustedIp,
          "x-forwarded-for": "172.16.99.1",
        },
        body: JSON.stringify({
          targetUrl: "https://test-spoof-blocked.example.com",
          reportType: "owner",
        }),
      });

      const blockedRes = await scanHandler(blockedReq);
      expect(blockedRes.status).toBe(429);
      const json = await blockedRes.json();
      expect(json.code).toBe("IP_RATE_LIMIT_EXCEEDED");
    });

    it("prevents bypassing IP rate limits via rotating X-Forwarded-For when X-Real-IP is missing", async () => {
      // Attacker attempts to evade rate limits by supplying ONLY varying X-Forwarded-For headers
      for (let i = 1; i <= 15; i++) {
        const req = new NextRequest("http://localhost:3000/api/scan", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": `172.20.${i}.5`, // Rotating forged header
          },
          body: JSON.stringify({
            targetUrl: `https://test-forged-ff-${i}.example.com`,
            reportType: "owner",
          }),
        });

        const res = await scanHandler(req);
        expect(res.status).toBe(200);
      }

      // 16th request with yet another forged X-Forwarded-For MUST be blocked because
      // X-Forwarded-For is ignored and all requests map to the same fallback IP (127.0.0.1)
      const blockedReq = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "172.20.99.99",
        },
        body: JSON.stringify({
          targetUrl: "https://test-forged-ff-blocked.example.com",
          reportType: "owner",
        }),
      });

      const blockedRes = await scanHandler(blockedReq);
      expect(blockedRes.status).toBe(429);
      const json = await blockedRes.json();
      expect(json.code).toBe("IP_RATE_LIMIT_EXCEEDED");
    });

    it("fails safely in production when trusted client IP is missing and creates zero guest records", async () => {
      const prevEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";

      try {
        const headers = new Headers();
        headers.set("x-forwarded-for", "198.51.100.1"); // Forged header alone
        // extractClientIp returns null in production when X-Real-IP is absent
        expect(extractClientIp(headers)).toBeNull();

        const initialCounts = getTableCounts();

        const req = new NextRequest("http://localhost:3000/api/scan", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "198.51.100.1",
          },
          body: JSON.stringify({
            targetUrl: "https://untrusted-client-test.example.com",
            reportType: "owner",
          }),
        });

        const res = await scanHandler(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe("UNTRUSTED_CLIENT_IP");

        // Zero guest records must be created in SQLite
        const countsAfter = getTableCounts();
        expect(countsAfter.tenants).toBe(initialCounts.tenants);
        expect(countsAfter.users).toBe(initialCounts.users);
        expect(countsAfter.sessions).toBe(initialCounts.sessions);
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    it("allows legitimate trusted-proxy requests in production when X-Real-IP is provided", async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevSecret = process.env.SESSION_SECRET;
      (process.env as any).NODE_ENV = "production";
      process.env.SESSION_SECRET = "production_super_secure_entropy_key_with_sufficient_length_2026";

      try {
        const legitimateIp = "203.0.113.88";
        const headers = new Headers();
        headers.set("x-real-ip", legitimateIp);
        headers.set("x-forwarded-for", "1.1.1.1"); // Client header ignored

        expect(extractClientIp(headers)).toBe(legitimateIp);

        const req = new NextRequest("http://localhost:3000/api/scan", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-real-ip": legitimateIp,
            "x-forwarded-for": "1.1.1.1",
          },
          body: JSON.stringify({
            targetUrl: "https://legit-proxy-prod.example.com",
            reportType: "owner",
          }),
        });

        const res = await scanHandler(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.jobId).toBeDefined();
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
        if (prevSecret === undefined) {
          delete process.env.SESSION_SECRET;
        } else {
          process.env.SESSION_SECRET = prevSecret;
        }
      }
    });

    it("supports PaaS provider-specific trusted headers via TRUSTED_IP_HEADER", () => {
      const prevHeader = process.env.TRUSTED_IP_HEADER;
      process.env.TRUSTED_IP_HEADER = "fly-client-ip";

      try {
        const headers = new Headers();
        headers.set("fly-client-ip", "192.0.2.123");
        headers.set("x-forwarded-for", "10.0.0.1");

        expect(extractClientIp(headers)).toBe("192.0.2.123");
      } finally {
        if (prevHeader === undefined) {
          delete process.env.TRUSTED_IP_HEADER;
        } else {
          process.env.TRUSTED_IP_HEADER = prevHeader;
        }
      }
    });
  });

  describe("2. Database Hygiene: Rejected Requests Do NOT Create Guest Records", () => {
    it("ensures rate-limited requests do NOT create guest tenant, user, or session records", async () => {
      const clientIp = "198.51.100.150";
      const hour = Math.floor(Date.now() / 3600000);

      // Artificially saturate the IP rate limit
      for (let i = 0; i < 15; i++) {
        await adapter.incrementRateLimit(`ratelimit:ip_scan:${clientIp}:${hour}`, 3600);
      }

      const initialCounts = getTableCounts();

      // Submit a request from the saturated IP
      const req = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": clientIp,
        },
        body: JSON.stringify({
          targetUrl: "https://blocked-site.example.com",
          reportType: "owner",
        }),
      });

      const res = await scanHandler(req);
      expect(res.status).toBe(429);

      // Verify ZERO new records were added to SQLite
      const postCounts = getTableCounts();
      expect(postCounts.tenants).toBe(initialCounts.tenants);
      expect(postCounts.users).toBe(initialCounts.users);
      expect(postCounts.sessions).toBe(initialCounts.sessions);
    });

    it("ensures invalid request bodies do NOT create unnecessary guest records in SQLite", async () => {
      const initialCounts = getTableCounts();

      // 1. Invalid JSON body
      const badJsonReq = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "192.0.2.1" },
        body: "NOT_VALID_JSON{{{",
      });
      const res1 = await scanHandler(badJsonReq);
      expect(res1.status).toBe(400);

      // 2. Missing targetUrl
      const missingUrlReq = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "192.0.2.2" },
        body: JSON.stringify({ reportType: "owner" }),
      });
      const res2 = await scanHandler(missingUrlReq);
      expect(res2.status).toBe(400);

      // 3. Missing reportType
      const missingTypeReq = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "192.0.2.3" },
        body: JSON.stringify({ targetUrl: "https://valid.example.com" }),
      });
      const res3 = await scanHandler(missingTypeReq);
      expect(res3.status).toBe(400);

      // 4. Invalid reportType
      const invalidTypeReq = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "192.0.2.4" },
        body: JSON.stringify({ targetUrl: "https://valid.example.com", reportType: "both" }),
      });
      const res4 = await scanHandler(invalidTypeReq);
      expect(res4.status).toBe(400);

      // Assert that total database table counts remained completely unchanged
      const postCounts = getTableCounts();
      expect(postCounts.tenants).toBe(initialCounts.tenants);
      expect(postCounts.users).toBe(initialCounts.users);
      expect(postCounts.sessions).toBe(initialCounts.sessions);
    });
  });

  describe("3. Guest Session Lifecycle & Single Provisioning", () => {
    it("reuses existing guest session across multiple requests without creating redundant records", async () => {
      const clientIp = "192.0.2.55";
      const initialCounts = getTableCounts();

      // First valid request -> provisions 1 guest tenant, 1 user, 1 session
      const req1 = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": clientIp },
        body: JSON.stringify({ targetUrl: "https://first-scan.example.com", reportType: "owner" }),
      });

      const res1 = await scanHandler(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.jobId).toBeDefined();

      // Complete job 1 so that guest concurrent scan limit (1 active scan) allows the next scan
      await adapter.updateJob(json1.jobId, { status: "completed" });

      // Extract Set-Cookie
      const setCookieHeader = res1.headers.get("set-cookie");
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain(SESSION_COOKIE_NAME);

      const cookieVal = setCookieHeader!.split(";")[0].split("=")[1];

      // Counts should have incremented by exactly 1 each
      const countsAfterReq1 = getTableCounts();
      expect(countsAfterReq1.tenants).toBe(initialCounts.tenants + 1);
      expect(countsAfterReq1.users).toBe(initialCounts.users + 1);
      expect(countsAfterReq1.sessions).toBe(initialCounts.sessions + 1);

      // Second valid request carrying the returned session cookie
      const req2 = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": clientIp,
          cookie: `${SESSION_COOKIE_NAME}=${cookieVal}`,
        },
        body: JSON.stringify({ targetUrl: "https://second-scan.example.com", reportType: "owner" }),
      });

      const res2 = await scanHandler(req2);
      expect(res2.status).toBe(200);

      // Table counts MUST NOT have increased: existing guest tenant/user was reused
      const countsAfterReq2 = getTableCounts();
      expect(countsAfterReq2.tenants).toBe(countsAfterReq1.tenants);
      expect(countsAfterReq2.users).toBe(countsAfterReq1.users);
      expect(countsAfterReq2.sessions).toBe(countsAfterReq1.sessions);
    });
  });

  describe("4. Cross-Guest Isolation on All Resources & Exports", () => {
    it("strictly prevents Guest B from accessing Guest A's scans, reports, PDFs, or CSV exports", async () => {
      // 1. Provision Guest A and create an owner scan
      const guestA = adapter.getAuthService().createGuestSession("192.0.2.10");
      const guestB = adapter.getAuthService().createGuestSession("192.0.2.20");

      const reqA: ScanRequest = {
        targetUrl: "https://guest-a-private.example.com",
        reportType: "owner",
        platformName: "Private A",
        businessCategory: "ecommerce",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 2,
        maxDepth: 1,
      };

      const jobA = await adapter.createJob(reqA, guestA.tenant.id, guestA.user.id);

      const mockOwnerReport: any = {
        reportId: `rep_owner_${jobA.id}`,
        scanId: jobA.id,
        tenantId: guestA.tenant.id,
        generatedAt: new Date().toISOString(),
        companyIdentity: { name: "Private A", domain: "guest-a-private.example.com", targetUrl: reqA.targetUrl },
        executiveSnapshot: { overallScore: { score: 85, ratingBand: "Healthy" }, categoryScores: [], coverage: { coveragePercentage: 85 } },
        results: [],
      };
      await adapter.saveReport(mockOwnerReport, guestA.tenant.id);

      const mockExpertReport: any = {
        metadata: {
          reportId: `rep_expert_${jobA.id}`,
          jobId: jobA.id,
          tenantId: guestA.tenant.id,
          generatedAt: new Date().toISOString(),
          companyA: { domain: "guest-a-private.example.com", name: "Private A" },
        },
        executiveSummary: {
          overallHealthScore: 80,
          categoryScores: {},
        },
        findings: [],
        manifest: { totalPagesCrawled: 2, totalResourcesAnalyzed: 5 },
      };
      await adapter.saveExpertReport(mockExpertReport, guestA.tenant.id);

      // Guest B tries to access Guest A's scan job status -> HTTP 403 Forbidden
      const statusReq = new NextRequest(`http://localhost:3000/api/scan?id=${jobA.id}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guestB.signedToken}` },
      });
      const statusRes = await getScanHandler(statusReq);
      expect(statusRes.status).toBe(403);

      // Guest B tries to access Guest A's owner report -> HTTP 403 Forbidden
      const reportReq = new NextRequest(`http://localhost:3000/api/scan/report?id=${mockOwnerReport.reportId}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guestB.signedToken}` },
      });
      const reportRes = await getReportHandler(reportReq);
      expect(reportRes.status).toBe(403);

      // Guest B tries to download Guest A's Owner PDF -> HTTP 403 Forbidden
      const pdfReq = new NextRequest(`http://localhost:3000/api/scan/pdf?id=${mockOwnerReport.reportId}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guestB.signedToken}` },
      });
      const pdfRes = await getPdfHandler(pdfReq);
      expect(pdfRes.status).toBe(403);

      // Guest B tries to access Guest A's expert report -> HTTP 403 Forbidden
      const expertReportReq = new NextRequest(`http://localhost:3000/api/scan/expert-report?id=${mockExpertReport.metadata.reportId}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guestB.signedToken}` },
      });
      const expertReportRes = await getExpertReportHandler(expertReportReq);
      expect(expertReportRes.status).toBe(403);

      // Guest B tries to download Guest A's Expert PDF -> HTTP 403 Forbidden
      const expertPdfReq = new NextRequest(`http://localhost:3000/api/scan/expert-pdf?id=${mockExpertReport.metadata.reportId}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guestB.signedToken}` },
      });
      const expertPdfRes = await getExpertPdfHandler(expertPdfReq);
      expect(expertPdfRes.status).toBe(403);

      // Guest B tries to export Guest A's Expert Findings CSV -> HTTP 403 Forbidden
      const exportReq = new NextRequest(`http://localhost:3000/api/scan/expert-export?id=${mockExpertReport.metadata.reportId}&format=csv_findings`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guestB.signedToken}` },
      });
      const exportRes = await getExpertExportHandler(exportReq);
      expect(exportRes.status).toBe(403);
    });
  });

  describe("5. Mutual Exclusivity: Single-Report Invariant", () => {
    it("returns HTTP 404 when querying /api/scan/report for an expert scan", async () => {
      const guest = adapter.getAuthService().createGuestSession("192.0.2.33");
      const req: ScanRequest = {
        targetUrl: "https://expert-only.example.com",
        reportType: "expert",
        businessCategory: "saas",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 2,
        maxDepth: 1,
      };

      const job = await adapter.createJob(req, guest.tenant.id, guest.user.id);
      await adapter.updateJob(job.id, { status: "completed" }, guest.tenant.id);

      // Querying owner report endpoint for this expert-only scan
      const reportReq = new NextRequest(`http://localhost:3000/api/scan/report?jobId=${job.id}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guest.signedToken}` },
      });
      const reportRes = await getReportHandler(reportReq);
      expect(reportRes.status).toBe(404);
      const json = await reportRes.json();
      expect(json.error).toContain("This scan was generated as an Expert Diagnostic Report");
    });

    it("returns HTTP 404 when querying /api/scan/expert-report for an owner scan", async () => {
      const guest = adapter.getAuthService().createGuestSession("192.0.2.44");
      const req: ScanRequest = {
        targetUrl: "https://owner-only.example.com",
        reportType: "owner",
        businessCategory: "ecommerce",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 2,
        maxDepth: 1,
      };

      const job = await adapter.createJob(req, guest.tenant.id, guest.user.id);
      await adapter.updateJob(job.id, { status: "completed" }, guest.tenant.id);

      // Querying expert report endpoint for this owner-only scan
      const expertReq = new NextRequest(`http://localhost:3000/api/scan/expert-report?jobId=${job.id}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guest.signedToken}` },
      });
      const expertRes = await getExpertReportHandler(expertReq);
      expect(expertRes.status).toBe(404);
      const json = await expertRes.json();
      expect(json.error).toContain("This scan was generated as a Website Owner Report");
    });
  });
});
