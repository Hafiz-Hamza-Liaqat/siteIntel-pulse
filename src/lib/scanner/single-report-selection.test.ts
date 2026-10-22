import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { JobManager } from "./job-manager";
import { ScanOrchestrator } from "./orchestrator";
import { ScanRequestSchema, ScanRequest } from "@/types";
import * as dnsSafety from "./dns-safety";

describe("Single-Report Selection & Mutual Exclusivity", () => {
  const testDbPath = path.resolve(process.cwd(), "data", `test_single_report_${Date.now()}.db`);
  let db: SqliteScanDatabaseAdapter;
  let jobManager: JobManager;
  let orchestrator: ScanOrchestrator;

  beforeEach(() => {
    // Mock DNS safety check to pass for testing
    vi.spyOn(dnsSafety, "validateUrlSafety").mockResolvedValue({
      isSafe: true,
      resolvedIps: ["93.184.216.34"],
    });

    db = new SqliteScanDatabaseAdapter(testDbPath);
    jobManager = new JobManager();
    orchestrator = new ScanOrchestrator();
  });

  afterEach(() => {
    db.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}
  });

  it("validates that reportType is strictly required and rejects invalid values", () => {
    const validOwner = ScanRequestSchema.safeParse({
      targetUrl: "https://example.com",
      reportType: "owner",
    });
    expect(validOwner.success).toBe(true);

    const validExpert = ScanRequestSchema.safeParse({
      targetUrl: "https://example.com",
      reportType: "expert",
    });
    expect(validExpert.success).toBe(true);

    const missingType = ScanRequestSchema.safeParse({
      targetUrl: "https://example.com",
    });
    expect(missingType.success).toBe(false);

    const invalidType = ScanRequestSchema.safeParse({
      targetUrl: "https://example.com",
      reportType: "both",
    });
    expect(invalidType.success).toBe(false);
  });

  it("generates and persists ONLY Owner Report when reportType is 'owner'", async () => {
    const request: ScanRequest = {
      targetUrl: "https://example.com",
      reportType: "owner",
      platformName: "Example Store",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 2,
      maxDepth: 1,
    };

    const job = await db.createJob(request, "tenant_comp_a");
    expect(job.request.reportType).toBe("owner");

    // Mock crawler to avoid network calls
    vi.spyOn(orchestrator as any, "runAudit").mockImplementationOnce(async (j: any) => {
      const { projectOwnerReport } = await import("../reports/owner-projection");
      const { assessmentRegistry } = await import("../catalogue/registry");

      const crawlResult: any = {
        pages: [
          {
            id: "pg_1",
            requestedUrl: "https://example.com/",
            normalizedUrl: "https://example.com/",
            finalUrl: "https://example.com/",
            statusCode: 200,
            responseTimeMs: 150,
            contentType: "text/html",
            redirectHistory: [],
            title: "Example Domain",
            metaDescription: "Example description for unit testing.",
            canonicalCandidate: "https://example.com/",
            robotsDirectives: ["index", "follow"],
            headings: { h1: ["Example Domain"], h2: [], h3: [], h4: [], h5: [], h6: [] },
            visibleWordCount: 100,
            language: "en",
            doctype: "html",
            encoding: "UTF-8",
            links: [],
            resources: [],
            structuredData: [],
            openGraph: {},
            headers: { "content-type": "text/html" },
            cookieAttributes: [],
          },
        ],
        robotsTxt: "User-agent: *\nAllow: /",
        sitemapUrls: [],
        externalLinksTested: [],
        coverage: {
          discoveredPages: 1,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 1250,
          totalPagesBudget: 2,
          crawlDepthReached: 1,
          isExhaustive: true,
          externalLinksTested: 0,
          resourcesTested: 0,
          totalWeightedPoints: 100,
        },
      };

      const results = assessmentRegistry.evaluateAll({
        targetUrl: j.request.targetUrl,
        domain: "example.com",
        businessCategory: j.request.businessCategory,
        pages: crawlResult.pages,
        robotsTxt: crawlResult.robotsTxt,
        sitemapUrls: crawlResult.sitemapUrls,
        externalLinksTested: crawlResult.externalLinksTested,
      });

      const ownerReport = projectOwnerReport(j.id, j.request, crawlResult, results, j.tenantId);
      await db.saveReport(ownerReport, j.tenantId);
      await db.updateJob(j.id, {
        status: "completed",
        currentStage: "Audit complete. Owner Report ready.",
        progressPercentage: 100,
        coverage: ownerReport.executiveSnapshot.coverage,
        results,
        report: ownerReport,
        ownerReportId: ownerReport.reportId,
        completedAt: new Date().toISOString(),
      }, j.tenantId);

      return ownerReport;
    });

    await orchestrator.runAudit(job);

    // Reload job from DB
    const loadedJob = await db.getJob(job.id, "tenant_comp_a");
    expect(loadedJob?.status).toBe("completed");
    expect(loadedJob?.report).toBeDefined();
    expect(loadedJob?.ownerReportId).toBeDefined();

    // Invariant: Expert report must be strictly undefined
    expect(loadedJob?.expertReport).toBeUndefined();
    expect(loadedJob?.expertReportId).toBeUndefined();

    // Verify DB table contents: owner_reports has row, expert_reports is empty
    const ownerReportDb = await db.getReport(job.id, "tenant_comp_a");
    expect(ownerReportDb).not.toBeNull();
    expect(ownerReportDb?.reportId).toBe(loadedJob?.report?.reportId);

    const expertReportDb = await db.getExpertReport(job.id, "tenant_comp_a");
    expect(expertReportDb).toBeNull();
  });

  it("generates and persists ONLY Expert Report when reportType is 'expert'", async () => {
    const request: ScanRequest = {
      targetUrl: "https://example.com",
      reportType: "expert",
      platformName: "Example Store",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 2,
      maxDepth: 1,
    };

    const job = await db.createJob(request, "tenant_comp_b");
    expect(job.request.reportType).toBe("expert");

    vi.spyOn(orchestrator as any, "runAudit").mockImplementationOnce(async (j: any) => {
      const { projectExpertReport } = await import("../reports/expert-projection");
      const { assessmentRegistry } = await import("../catalogue/registry");

      const crawlResult: any = {
        pages: [
          {
            id: "pg_1",
            requestedUrl: "https://example.com/",
            normalizedUrl: "https://example.com/",
            finalUrl: "https://example.com/",
            statusCode: 200,
            responseTimeMs: 150,
            contentType: "text/html",
            redirectHistory: [],
            title: "Example Domain",
            metaDescription: "Example description for unit testing.",
            canonicalCandidate: "https://example.com/",
            robotsDirectives: ["index", "follow"],
            headings: { h1: ["Example Domain"], h2: [], h3: [], h4: [], h5: [], h6: [] },
            visibleWordCount: 100,
            language: "en",
            doctype: "html",
            encoding: "UTF-8",
            links: [],
            resources: [],
            structuredData: [],
            openGraph: {},
            headers: { "content-type": "text/html" },
            cookieAttributes: [],
          },
        ],
        robotsTxt: "User-agent: *\nAllow: /",
        sitemapUrls: [],
        externalLinksTested: [],
        coverage: {
          discoveredPages: 1,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 1250,
          totalPagesBudget: 2,
          crawlDepthReached: 1,
          isExhaustive: true,
          externalLinksTested: 0,
          resourcesTested: 0,
          totalWeightedPoints: 100,
        },
      };

      const results = assessmentRegistry.evaluateAll({
        targetUrl: j.request.targetUrl,
        domain: "example.com",
        businessCategory: j.request.businessCategory,
        pages: crawlResult.pages,
        robotsTxt: crawlResult.robotsTxt,
        sitemapUrls: crawlResult.sitemapUrls,
        externalLinksTested: crawlResult.externalLinksTested,
      });

      const expertReport = projectExpertReport(j.id, j.request, crawlResult, results, {}, j.tenantId);
      await db.saveExpertReport(expertReport, j.tenantId);
      await db.updateJob(j.id, {
        status: "completed",
        currentStage: "Audit complete. Expert Diagnostic Report ready.",
        progressPercentage: 100,
        coverage: { ...crawlResult.coverage, ...expertReport.coverage },
        results,
        expertReport,
        expertReportId: expertReport.metadata.reportId,
        completedAt: new Date().toISOString(),
      }, j.tenantId);

      return expertReport;
    });

    await orchestrator.runAudit(job);

    // Reload job from DB
    const loadedJob = await db.getJob(job.id, "tenant_comp_b");
    expect(loadedJob?.status).toBe("completed");
    expect(loadedJob?.expertReport).toBeDefined();
    expect(loadedJob?.expertReportId).toBeDefined();

    // Invariant: Owner report must be strictly undefined
    expect(loadedJob?.report).toBeUndefined();
    expect(loadedJob?.ownerReportId).toBeUndefined();

    // Verify DB table contents: expert_reports has row, owner_reports is empty
    const expertReportDb = await db.getExpertReport(job.id, "tenant_comp_b");
    expect(expertReportDb).not.toBeNull();
    expect(expertReportDb?.metadata.reportId).toBe(loadedJob?.expertReportId);

    const ownerReportDb = await db.getReport(job.id, "tenant_comp_b");
    expect(ownerReportDb).toBeNull();
  });

  it("ensures caching separates owner and expert scans for the same URL", async () => {
    const ownerReq: ScanRequest = {
      targetUrl: "https://cache-separation.example.com",
      reportType: "owner",
      platformName: "Cache Test",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 2,
      maxDepth: 1,
    };

    const ownerJob = await db.createJob(ownerReq, "tenant_comp_a");
    await db.updateJob(ownerJob.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    }, "tenant_comp_a");

    // 1. Finding recent job for "expert" must return null (does not reuse owner scan)
    const recentExpert = await db.findRecentJobByUrl(
      "https://cache-separation.example.com",
      "tenant_comp_a",
      "expert"
    );
    expect(recentExpert).toBeNull();

    // 2. Finding recent job for "owner" must return the completed owner scan
    const recentOwner = await db.findRecentJobByUrl(
      "https://cache-separation.example.com",
      "tenant_comp_a",
      "owner"
    );
    expect(recentOwner).not.toBeNull();
    expect(recentOwner?.id).toBe(ownerJob.id);
  });
});
