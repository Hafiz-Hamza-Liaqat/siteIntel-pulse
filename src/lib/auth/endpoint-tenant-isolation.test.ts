import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { DatabaseSync } from "node:sqlite";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { runMigrations } from "../persistence/migrator";
import { seedInitialAccounts } from "./seed";
import { hashPassword } from "./index";

// Import API Route Handlers directly
import { POST as scanPostHandler, GET as scanGetHandler } from "@/app/api/scan/route";
import { POST as scanCancelHandler } from "@/app/api/scan/cancel/route";
import { GET as reportGetHandler } from "@/app/api/scan/report/route";
import { GET as expertReportGetHandler } from "@/app/api/scan/expert-report/route";
import { GET as expertExportGetHandler } from "@/app/api/scan/expert-export/route";
import { GET as pdfGetHandler } from "@/app/api/scan/pdf/route";
import { GET as expertPdfGetHandler } from "@/app/api/scan/expert-pdf/route";
import { POST as remediationPostHandler, GET as remediationGetHandler } from "@/app/api/scan/remediation/route";
import { POST as expertDemoPostHandler } from "@/app/api/scan/expert-demo/route";
import { GET as meGetHandler } from "@/app/api/auth/me/route";

describe("Strict Multi-Tenant Isolation & Endpoint Authorization", () => {
  let db: DatabaseSync;
  let adapter: SqliteScanDatabaseAdapter;
  let tokenTenantA: string;
  let tokenTenantB: string;
  let expiredToken: string;

  beforeEach(() => {
    // In-memory isolated database
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    adapter = new SqliteScanDatabaseAdapter(":memory:");
    (globalThis as any).scanDbInstance = adapter;
    const authService = adapter.getAuthService();

    // Seed tenants
    seedInitialAccounts((adapter as any).db);

    // Create session tokens for Company A and Company B
    tokenTenantA = authService.createSession("usr_companya_admin", "tenant_comp_a").token;
    tokenTenantB = authService.createSession("usr_companyb_owner", "tenant_comp_b").token;

    // Create an expired session
    const expiredRes = authService.createSession("usr_companya_admin", "tenant_comp_a");
    expiredToken = expiredRes.token;
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    (adapter as any).db.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?").run(
      pastDate,
      expiredRes.session.tokenHash
    );
  });

  afterEach(() => {
    (globalThis as any).scanDbInstance = undefined;
    adapter.close();
    db.close();
  });

  function createAuthRequest(
    url: string,
    method = "GET",
    token?: string,
    body?: any
  ): NextRequest {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const init: any = { method, headers };
    if (body) {
      init.body = JSON.stringify(body);
    }

    return new NextRequest(new URL(url, "http://localhost:3000"), init);
  }

  describe("Unauthenticated & Expired Session Protection", () => {
    it("rejects unauthenticated requests to /api/scan with HTTP 401", async () => {
      const req = createAuthRequest("http://localhost:3000/api/scan", "GET");
      const res = await scanGetHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHENTICATED");
    });

    it("rejects expired session token and removes it from database", async () => {
      const req = createAuthRequest("http://localhost:3000/api/auth/me", "GET", expiredToken);
      const res = await meGetHandler(req);
      expect(res.status).toBe(401);

      // Verify expired session is cleaned up
      const checkService = adapter.getAuthService();
      expect(checkService.validateSessionToken(expiredToken)).toBeNull();
    });
  });

  describe("Cross-Tenant Resource Isolation", () => {
    let jobTenantA: any;
    let reportTenantA: any;
    let expertReportTenantA: any;

    beforeEach(async () => {
      // Create a scan job belonging to Tenant A
      jobTenantA = await adapter.createJob(
        {
          targetUrl: "https://tenant-a-confidential-store.com",
          platformName: "Tenant A Platform",
          businessCategory: "ecommerce",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
          maxPages: 5,
          maxDepth: 2,
        },
        "tenant_comp_a",
        "usr_companya_admin"
      );

      // Save an owner report for Tenant A
      reportTenantA = {
        reportId: `rep_a_${Date.now()}`,
        jobId: jobTenantA.id,
        tenantId: "tenant_comp_a",
        companyIdentity: {
          domain: "tenant-a-confidential-store.com",
          companyName: "Tenant A Platform",
          businessCategory: "ecommerce",
          targetMarket: "US",
          scanTimestamp: new Date().toISOString(),
        },
        executiveSummary: {
          assessmentTitle: "Confidential Tenant A Audit",
          marketContext: "Private",
          strategicVision: "Private",
          maturityRating: "Standard",
        },
        overallScore: {
          totalAwardedPoints: 85,
          totalApplicablePoints: 100,
          earnedPercentage: 85,
          healthGrade: "B+",
          confidenceScore: 0.9,
          evaluatedWeightedPoints: 85,
          criticalIssuesCount: 0,
        },
        categoryScores: [],
        findingsByRule: {},
        findingsList: [],
        positiveHighlights: [],
        provisionalStatus: { isProvisional: false, missingCoverageCategories: [] },
        scannedUrlCount: 5,
        scanDurationSeconds: 10,
        scanCoverage: { evaluatedRuleCount: 50, applicableRuleCount: 56, coveragePercentage: 89, isFullyAssessed: true },
        evidenceManifestSummary: { totalPages: 5, totalLinks: 10, totalResources: 20 },
      };
      await adapter.saveReport(reportTenantA, "tenant_comp_a");

      // Save an expert report for Tenant A
      expertReportTenantA = {
        metadata: {
          reportId: `exp_a_${Date.now()}`,
          jobId: jobTenantA.id,
          tenantId: "tenant_comp_a",
          companyA: {
            domain: "tenant-a-confidential-store.com",
            companyName: "Tenant A Platform",
            businessCategory: "ecommerce",
            targetMarket: "US",
          },
          companyB: {
            agencyName: "Company B Agency",
            auditorName: "Auditor",
            auditorRole: "Lead",
          },
          generatedAt: new Date().toISOString(),
          scopeSummary: { pagesScanned: 5, totalUrlsDiscovered: 10, totalResourcesLogged: 20, scanDurationMs: 12000 },
        },
        executiveSummary: { overallScore: 85, maturityRating: "Standard", keyTakeaways: [] },
        architectureBreakdown: { pages: [], internalLinks: [], externalLinks: [], thirdPartyResources: [], technologyStack: [] },
        deepDiagnostics: [],
        multiDisciplinaryMatrix: {
          technicalSeo: [], contentReadiness: [], performanceOptimization: [],
          conversionExperience: [], securityPublicPosture: [], geoAeoReadiness: [],
        },
        remediationRoadmap: { phase1Immediate: [], phase2ShortTerm: [], phase3Strategic: [] },
        commercialEstimator: { totalEstimatedHoursMin: 10, totalEstimatedHoursMax: 20, estimatedWeeks: 2, suggestedTier: "Growth" },
        evidenceLedger: [],
      };
      await adapter.saveExpertReport(expertReportTenantA, "tenant_comp_a");
    });

    it("allows Tenant A to retrieve their own scan status", async () => {
      const req = createAuthRequest(`http://localhost:3000/api/scan?id=${jobTenantA.id}`, "GET", tokenTenantA);
      const res = await scanGetHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(jobTenantA.id);
    });

    it("DENIES Tenant B access to Tenant A's scan status (HTTP 403)", async () => {
      const req = createAuthRequest(`http://localhost:3000/api/scan?id=${jobTenantA.id}`, "GET", tokenTenantB);
      const res = await scanGetHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
      // Information disclosure prevention: error does not expose target URL
      expect(JSON.stringify(json)).not.toContain("tenant-a-confidential-store.com");
    });

    it("DENIES Tenant B from cancelling Tenant A's scan (HTTP 403)", async () => {
      const req = createAuthRequest("http://localhost:3000/api/scan/cancel", "POST", tokenTenantB, {
        jobId: jobTenantA.id,
      });
      const res = await scanCancelHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("DENIES Tenant B access to Tenant A's owner report (HTTP 403)", async () => {
      const req = createAuthRequest(`http://localhost:3000/api/scan/report?id=${reportTenantA.reportId}`, "GET", tokenTenantB);
      const res = await reportGetHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
      expect(JSON.stringify(json)).not.toContain("Confidential Tenant A Audit");
    });

    it("DENIES Tenant B access to Tenant A's expert report (HTTP 403)", async () => {
      const req = createAuthRequest(`http://localhost:3000/api/scan/expert-report?id=${expertReportTenantA.metadata.reportId}`, "GET", tokenTenantB);
      const res = await expertReportGetHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
      expect(JSON.stringify(json)).not.toContain("tenant-a-confidential-store.com");
    });

    it("DENIES Tenant B from exporting Tenant A's expert findings CSV (HTTP 403)", async () => {
      const req = createAuthRequest(`http://localhost:3000/api/scan/expert-export?id=${expertReportTenantA.metadata.reportId}&format=csv_findings`, "GET", tokenTenantB);
      const res = await expertExportGetHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("DENIES Tenant B from downloading Tenant A's Owner PDF (HTTP 403)", async () => {
      const req = createAuthRequest(`http://localhost:3000/api/scan/pdf?id=${reportTenantA.reportId}`, "GET", tokenTenantB);
      const res = await pdfGetHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("DENIES Tenant B from downloading Tenant A's Expert PDF (HTTP 403)", async () => {
      const req = createAuthRequest(`http://localhost:3000/api/scan/expert-pdf?id=${expertReportTenantA.metadata.reportId}`, "GET", tokenTenantB);
      const res = await expertPdfGetHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("DENIES Tenant B from modifying Tenant A's remediation task", async () => {
      const req = createAuthRequest("http://localhost:3000/api/scan/remediation", "POST", tokenTenantB, {
        taskId: "task_a_001",
        status: "RESOLVED",
      });
      const res = await remediationPostHandler(req);
      // Since task belongs to Tenant A, Tenant B's scoped update finds no rows and returns 404
      expect(res.status).toBe(404);
    });
  });

  describe("Staging Exposure & Production Guardrails", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("strictly prevents staging demonstration account seeding when NODE_ENV=production, even if ALLOW_STAGING_SEED=true", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.ALLOW_STAGING_SEED = "true";

      const memDb = new DatabaseSync(":memory:");
      memDb.exec("PRAGMA foreign_keys = ON;");
      const result = seedInitialAccounts(memDb);

      expect(result.seeded).toBe(false);
      expect(result.message).toContain("cannot be seeded when NODE_ENV=production");
      memDb.close();
    });

    it("allows staging demonstration account seeding when NODE_ENV is development or test", () => {
      (process.env as any).NODE_ENV = "development";
      delete process.env.ALLOW_STAGING_SEED;

      const memDb = new DatabaseSync(":memory:");
      memDb.exec("PRAGMA foreign_keys = ON;");
      runMigrations(memDb);
      const result = seedInitialAccounts(memDb);

      expect(result.seeded).toBe(true);
      expect(result.message).toContain("successfully seeded");
      memDb.close();
    });

    it("requires authentication for /api/scan/expert-demo in production mode", async () => {
      (process.env as any).NODE_ENV = "production";
      const req = createAuthRequest("http://localhost:3000/api/scan/expert-demo", "POST");
      const res = await expertDemoPostHandler(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHENTICATED");
    });
  });
});
