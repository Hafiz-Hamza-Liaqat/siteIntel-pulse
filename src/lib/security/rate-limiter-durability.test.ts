import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { TenantRateLimiter } from "./rate-limiter";
import { seedInitialAccounts } from "../auth/seed";
import type { ScanRequest, OwnerReport, ExpertReport } from "@/types";

describe("Rate Limiter & Database Durability Across Process Restarts", () => {
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.resolve(
      process.cwd(),
      "data",
      `test-restart-${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.db`
    );
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {}
  });

  it("persists hourly rate limit counts in SQLite and survives database adapter restart", async () => {
    const rateLimiter = new TenantRateLimiter();

    // 1. Process 1: Open database and increment rate limit for tenant_comp_a
    const adapter1 = new SqliteScanDatabaseAdapter(testDbPath);
    seedInitialAccounts((adapter1 as any).db);

    const allowance1 = await rateLimiter.checkScanAllowance("tenant_comp_a", adapter1);
    expect(allowance1.allowed).toBe(true);
    expect(allowance1.limit).toBe(20);
    expect(allowance1.remaining).toBe(19);

    const allowance2 = await rateLimiter.checkScanAllowance("tenant_comp_a", adapter1);
    expect(allowance2.allowed).toBe(true);
    expect(allowance2.remaining).toBe(18);

    // Explicitly terminate adapter 1 (simulating process restart)
    adapter1.close();

    // 2. Process 2: Reopen database from disk and verify rate limits continue from previous count
    const adapter2 = new SqliteScanDatabaseAdapter(testDbPath);

    const allowance3 = await rateLimiter.checkScanAllowance("tenant_comp_a", adapter2);
    expect(allowance3.allowed).toBe(true);
    // Count should be 3, remaining should be 17
    expect(allowance3.remaining).toBe(17);

    adapter2.close();
  });

  it("enforces concurrent scan caps and frees slots upon job cancellation", async () => {
    const rateLimiter = new TenantRateLimiter();
    const adapter = new SqliteScanDatabaseAdapter(testDbPath);
    seedInitialAccounts((adapter as any).db);

    const req: ScanRequest = {
      targetUrl: "https://concurrency-test.demo",
      reportType: "owner",
      platformName: "Concurrency Store",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 5,
      maxDepth: 1,
    };

    // Tenant has max_concurrent_scans = 2
    // 1. Create first active scan
    const job1 = await adapter.createJob(req, "tenant_comp_a", "usr_companya_admin");
    await adapter.updateJob(job1.id, { status: "discovering" }, "tenant_comp_a");

    const check1 = await rateLimiter.checkScanAllowance("tenant_comp_a", adapter);
    expect(check1.allowed).toBe(true);

    // 2. Create second active scan (reaches limit)
    const job2 = await adapter.createJob(req, "tenant_comp_a", "usr_companya_admin");
    await adapter.updateJob(job2.id, { status: "assessing" }, "tenant_comp_a");

    // 3. Third scan must be BLOCKED due to concurrency limit
    const check2 = await rateLimiter.checkScanAllowance("tenant_comp_a", adapter);
    expect(check2.allowed).toBe(false);
    expect(check2.reason).toContain("Concurrent scan quota exceeded");

    // 4. Cancel job1
    await adapter.updateJob(job1.id, { status: "canceled" }, "tenant_comp_a");

    // 5. Check allowance again: slot is freed, scan now allowed
    const check3 = await rateLimiter.checkScanAllowance("tenant_comp_a", adapter);
    expect(check3.allowed).toBe(true);

    adapter.close();
  });

  it("proves complete audit and report durability across disk restarts", async () => {
    // 1. First process session: create job, owner report, expert report, remediation task
    const adapter1 = new SqliteScanDatabaseAdapter(testDbPath);
    seedInitialAccounts((adapter1 as any).db);

    const req: ScanRequest = {
      targetUrl: "https://durability-store.demo",
      reportType: "owner",
      platformName: "Durability Store",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 5,
      maxDepth: 2,
    };

    const job = await adapter1.createJob(req, "tenant_comp_b", "usr_companyb_owner");

    const ownerReport: any = {
      reportId: `owner_${job.id}`,
      jobId: job.id,
      tenantId: "tenant_comp_b",
      companyIdentity: {
        domain: "durability-store.demo",
        name: "Durability Store",
        targetUrl: "https://durability-store.demo",
        businessCategory: "ecommerce",
        targetMarket: "US",
        preferredLanguage: "en",
      },
      overallScore: {
        totalAwardedPoints: 92,
        totalApplicablePoints: 100,
        earnedPercentage: 92,
        healthGrade: "A-",
        confidenceScore: 0.95,
        evaluatedWeightedPoints: 92,
        criticalIssuesCount: 0,
      },
      categoryScores: [],
      findingsByRule: {},
      findingsList: [],
      positiveHighlights: ["Persistent SQLite Storage Verified"],
      provisionalStatus: { isProvisional: false, missingCoverageCategories: [] },
      scannedUrlCount: 5,
      scanDurationSeconds: 15,
      scanCoverage: { evaluatedRuleCount: 52, applicableRuleCount: 56, coveragePercentage: 92, isFullyAssessed: true },
    };

    const expertReport: any = {
      metadata: {
        reportId: `expert_${job.id}`,
        jobId: job.id,
        tenantId: "tenant_comp_b",
        companyA: {
          domain: "durability-store.demo",
          name: "Durability Store",
          targetUrl: "https://durability-store.demo",
          businessCategory: "ecommerce",
          targetMarket: "US",
          preferredLanguage: "en",
        },
        companyB: {
          name: "Company B Technical Advisory",
          auditorName: "Bob Vance",
          auditorRole: "Technical Director",
        },
        generatedAt: new Date().toISOString(),
        scopeSummary: { pagesScanned: 5, totalUrlsDiscovered: 20, totalResourcesLogged: 40, scanDurationMs: 15000 },
      },
      executiveSummary: {
        overallScore: {
          score: 92,
          earnedPercentage: 92,
          evaluatedWeightedPoints: 92,
          totalAwardedPoints: 92,
          totalApplicablePoints: 100,
          healthGrade: "A-",
          confidenceScore: 0.95,
          isProvisional: false,
          ratingBand: "Strong observed baseline",
          criticalIssuesCount: 0,
        },
        maturityRating: "Advanced",
        keyTakeaways: [],
      },
      architectureBreakdown: { pages: [], internalLinks: [], externalLinks: [], thirdPartyResources: [], technologyStack: [] },
      deepDiagnostics: [],
      multiDisciplinaryMatrix: {
        technicalSeo: [], contentReadiness: [], performanceOptimization: [],
        conversionExperience: [], securityPublicPosture: [], geoAeoReadiness: [],
      },
      remediationRoadmap: { phase1Immediate: [], phase2ShortTerm: [], phase3Strategic: [] },
      commercialEstimator: { totalEstimatedHoursMin: 15, totalEstimatedHoursMax: 30, estimatedWeeks: 3, suggestedTier: "Growth" },
      evidenceLedger: [],
    };

    await adapter1.saveReport(ownerReport, "tenant_comp_b");
    await adapter1.saveExpertReport(expertReport, "tenant_comp_b");

    // Close process 1 completely
    adapter1.close();

    // 2. Second process session: Reopen database from disk and verify all records exist
    const adapter2 = new SqliteScanDatabaseAdapter(testDbPath);

    const loadedJob = await adapter2.getJob(job.id, "tenant_comp_b");
    expect(loadedJob).not.toBeNull();
    expect(loadedJob?.request.targetUrl).toBe("https://durability-store.demo");

    const loadedOwnerReport = await adapter2.getReport(ownerReport.reportId, "tenant_comp_b");
    expect(loadedOwnerReport).not.toBeNull();
    expect((loadedOwnerReport as any)?.overallScore?.earnedPercentage ?? (loadedOwnerReport as any)?.executiveSnapshot?.overallScore?.earnedPercentage).toBe(92);
    expect((loadedOwnerReport as any)?.positiveHighlights).toContain("Persistent SQLite Storage Verified");

    const loadedExpertReport = await adapter2.getExpertReport(expertReport.metadata.reportId, "tenant_comp_b");
    expect(loadedExpertReport).not.toBeNull();
    expect((loadedExpertReport as any)?.metadata?.companyB?.auditorName).toBe("Bob Vance");

    adapter2.close();
  }, 20000);
});
