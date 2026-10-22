import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { SqliteScanDatabaseAdapter } from "./db";
import { runMigrations } from "./migrator";
import { DatabaseSync } from "node:sqlite";
import type { ScanRequest, OwnerReport, ExpertReport } from "@/types";

describe("Phase 1: Durable SQLite Persistence & Restart Verification", () => {
  const testDbDir = path.resolve(process.cwd(), "test-data");
  const testDbPath = path.resolve(testDbDir, `test-restart-${Date.now()}.db`);

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temporary database files
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}
  });

  it("applies migrations in strict atomic transactions and tracks versions", () => {
    const rawDb = new DatabaseSync(":memory:");
    const res = runMigrations(rawDb);
    expect(res.appliedCount).toBe(2);

    // Second run should apply 0 additional migrations (idempotent)
    const idempotentRes = runMigrations(rawDb);
    expect(idempotentRes.appliedCount).toBe(0);

    const tables = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("tenants");
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("sessions");
    expect(tableNames).toContain("api_keys");
    expect(tableNames).toContain("scan_jobs");
    expect(tableNames).toContain("owner_reports");
    expect(tableNames).toContain("expert_reports");
    expect(tableNames).toContain("remediation_tasks");
    expect(tableNames).toContain("rate_limits");
    expect(tableNames).toContain("schema_migrations");
    rawDb.close();
  });

  it("survives process restart: persists scan jobs, reports, and remediation tasks to disk", async () => {
    // --- Session 1: Process 1 Writes Data ---
    const dbInstance1 = new SqliteScanDatabaseAdapter(testDbPath);

    const request: ScanRequest = {
      targetUrl: "https://strideto.test",
      reportType: "owner",
      platformName: "StrideTo Test Store",
      businessCategory: "ecommerce",
      targetMarket: "Global",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 10,
      maxDepth: 2,
    };

    const job = await dbInstance1.createJob(request, "tenant_comp_a", "usr_companya_lead");
    expect(job.id).toBeDefined();
    expect(job.tenantId).toBe("tenant_comp_a");

    await dbInstance1.updateJob(job.id, {
      status: "completed",
      currentStage: "Audit complete.",
      progressPercentage: 100,
      discoveredCount: 15,
      testedCount: 10,
      completedAt: new Date().toISOString(),
    });

    const mockOwnerReport: OwnerReport = {
      reportId: `rep_owner_${job.id}`,
      reportVersion: "1.0.0",
      scanId: job.id,
      tenantId: "tenant_comp_a",
      generatedAt: new Date().toISOString(),
      companyIdentity: {
        name: "StrideTo Test",
        domain: "strideto.test",
        targetUrl: "https://strideto.test",
        businessCategory: "ecommerce",
        targetMarket: "Global",
        preferredLanguage: "en",
      },
      executiveSnapshot: {
        overallScore: {
          score: 85,
          ratingBand: "Generally healthy; opportunities remain",
          isProvisional: false,
          assessmentStatus: "FULLY_ASSESSED",
          evaluationNote: "High coverage baseline.",
          totalPossibleCataloguePoints: 100,
          evaluatedWeightedPoints: 92,
          criticalIssuesCount: 0,
        },
        categoryScores: [],
        coverage: {
          discoveredPages: 15,
          testedPages: 10,
          skippedPages: 5,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 45000,
          totalPagesBudget: 50,
          crawlDepthReached: 2,
          externalLinksTested: 4,
          resourcesTested: 20,
          isExhaustive: false,
          weightedPointsEvaluated: 92,
          totalWeightedPoints: 100,
          coveragePercentage: 92,
        },
        topOpportunities: [],
        testedPageCount: 10,
      },
      platformProfile: {
        detectedTechnologies: ["Next.js", "React"],
        totalPagesDiscovered: 15,
        httpsStatus: "Active",
        preferredHost: "strideto.test",
        primaryLanguage: "en",
      },
      scoreDetails: [],
      issueDistribution: { critical: 0, high: 2, medium: 3, low: 4, totalIssues: 9, affectedPagesCount: 3 },
      technicalHealthAndSeoSummary: { titlesHealthy: 10, descriptionsHealthy: 9, canonicalsConsistent: true, brokenLinksCount: 0, sitemapAccessible: true, structuredDataPresent: true },
      performanceAndResponsiveSummary: { mobileLabScore: 82, desktopLabScore: 94, coreWebVitalsStatus: "Good", testedViewports: [390, 1440], horizontalOverflowFound: false },
      securityAndAuthSummary: { httpsEnforced: true, securityHeadersConfigured: 5, totalSecurityHeadersChecked: 6, authSurfacesFound: 1, publicCookieIssues: 0, limitationsNote: "None" },
      contentTrustAiSummary: { blogOrResourcePresent: true, aiCrawlerPolicy: "Allow", entitySchemaPresent: true, contactOrTrustSignalsPresent: true },
      analyticsAndTrackingSummary: { ga4Detected: true, gtmDetected: true, advertisingPixelsCount: 1, consentUiDetected: true, measurementAccountConnected: false },
      competitorSnapshot: [],
      priorityOpportunities: [],
      methodologyAndLimitations: { scanScope: "Bounded", dataSources: ["HTML"], scoreDefinitions: "Standard", disclaimers: ["Disclaimer"], expertEngagementCta: "CTA" },
      results: [],
    };

    const mockExpertReport: ExpertReport = {
      metadata: {
        reportId: `rep_exp_${job.id}`,
        scanId: job.id,
        tenantId: "tenant_comp_a",
        reportVersion: "2.0.0",
        generatedAt: new Date().toISOString(),
        companyA: {
          name: "StrideTo Test",
          domain: "strideto.test",
          targetUrl: "https://strideto.test",
          businessCategory: "ecommerce",
          targetMarket: "Global",
          preferredLanguage: "en",
        },
        companyB: {
          name: "Company B Technical Advisory",
          auditorRole: "Technical Solutions Team",
        },
        authorization: {
          isAuthorizedForAuthScan: false,
          repositoryAuthorized: false,
          connectedIntegrations: [],
        },
        scopeAndBoundaries: "Public bounded crawl",
      },
      executiveSummary: {
        overallScore: mockOwnerReport.executiveSnapshot.overallScore,
        categoryScores: [],
        issueTotals: { critical: 0, high: 2, medium: 3, low: 4, total: 9 },
        workstreamEstimates: [],
      },
      platformProfile: {
        cmsCategory: "Next.js Custom Headless",
        frameworkHints: ["Next.js 15"],
        serverCdnClues: ["Vercel"],
        clientTechnologies: ["React 19"],
        aiIntegrationClues: [],
        confidence: "HIGH",
      },
      urlInventory: [],
      seoDiagnostics: { metadataFindings: [], headingHierarchy: {}, structuredDataEntities: [] },
      linkAudit: { internalLinks: [], outboundLinks: [], brokenLinks: [], orphanCandidates: [] },
      integrations: [],
      performanceDiagnostics: { labScores: {}, coreWebVitals: {}, blockingResources: [], imageDiagnostics: [] },
      responsiveDiagnostics: [],
      securityDiagnostics: [],
      authenticationAssessment: {
        isAuthorized: false,
        publicLoginSurfaces: [],
        testedFlows: [],
        sessionSecurity: { cookieSecure: true, cookieHttpOnly: true, cookieSameSite: "Lax", expiryObserved: "14d" },
        mfaIndicators: { observed: false, method: "None", note: "Public passive inspection only" },
        untestedControls: [],
      },
      geoAeoDiagnostics: { crawlerPolicies: {}, directAnswerReadiness: {}, aiAssistanceClues: {} },
      analyticsAndMetrics: [],
      competitorComparisons: [],
      remediationRegister: [
        {
          id: "task_1",
          title: "Implement Strict CSP Header",
          workstream: "security",
          priority: "HIGH",
          status: "PLANNED",
          findingIds: ["SEC-004"],
          affectedUrls: ["https://strideto.test/"],
          estimatedEffort: "QUICK_FIX",
          estimatedHours: 4,
          actionSteps: ["Define Content-Security-Policy header in Next.js config"],
          validationProcedure: "Inspect response headers via curl or browser DevTools",
          dependencies: [],
        },
      ],
      findings: [],
      coverage: {
        discoveredPages: 15,
        testedPages: 10,
        skippedPages: 5,
        failedPages: 0,
        totalBytesFetched: 45000,
        totalPagesBudget: 50,
        crawlDepthReached: 2,
        isExhaustive: false,
        weightedPointsEvaluated: 92,
        coveragePercentage: 92,
        ineligibleCategories: [],
      },
      exportManifest: {
        exportId: `exp_manifest_${job.id}`,
        reportId: `rep_exp_${job.id}`,
        scanId: job.id,
        version: "2.0.0",
        generatedAt: new Date().toISOString(),
        formats: ["pdf", "json", "csv"],
        dataSourceLimitations: [],
      },
    };

    await dbInstance1.saveReport(mockOwnerReport, "tenant_comp_a");
    await dbInstance1.saveExpertReport(mockExpertReport, "tenant_comp_a");

    // Close session 1 (simulating process termination / server restart)
    dbInstance1.close();

    // --- Session 2: Fresh Process Restart on Same File ---
    const dbInstance2 = new SqliteScanDatabaseAdapter(testDbPath);

    const reloadedJob = await dbInstance2.getJob(job.id, "tenant_comp_a");
    expect(reloadedJob).not.toBeNull();
    expect(reloadedJob?.id).toBe(job.id);
    expect(reloadedJob?.status).toBe("completed");
    expect(reloadedJob?.testedCount).toBe(10);
    expect(reloadedJob?.tenantId).toBe("tenant_comp_a");

    const reloadedOwnerReport = await dbInstance2.getReport(mockOwnerReport.reportId, "tenant_comp_a");
    expect(reloadedOwnerReport).not.toBeNull();
    expect(reloadedOwnerReport?.executiveSnapshot.overallScore.score).toBe(85);
    expect(reloadedOwnerReport?.tenantId).toBe("tenant_comp_a");

    const reloadedExpertReport = await dbInstance2.getExpertReport(mockExpertReport.metadata.reportId, "tenant_comp_a");
    expect(reloadedExpertReport).not.toBeNull();
    expect(reloadedExpertReport?.metadata.companyA.name).toBe("StrideTo Test");
    expect(reloadedExpertReport?.remediationRegister.length).toBe(1);

    // Verify relational remediation tasks survived
    const tasks = await dbInstance2.getRemediationTasks(mockExpertReport.metadata.reportId, "tenant_comp_a");
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe("Implement Strict CSP Header");

    // Update remediation status
    const updateSuccess = await dbInstance2.updateRemediationStatus(
      tasks[0].id,
      "IN_PROGRESS",
      "tenant_comp_a",
      "Alice Security Lead",
      "Drafting CSP directives in next.config.mjs"
    );
    expect(updateSuccess).toBe(true);

    const updatedTasks = await dbInstance2.getRemediationTasks(mockExpertReport.metadata.reportId, "tenant_comp_a");
    expect(updatedTasks[0].status).toBe("IN_PROGRESS");
    expect(updatedTasks[0].assigned_to).toBe("Alice Security Lead");

    dbInstance2.close();
  });
});
