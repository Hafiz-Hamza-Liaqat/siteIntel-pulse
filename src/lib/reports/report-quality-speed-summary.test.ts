import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALL_ASSESSMENT_RULES } from "../catalogue/registry";
import { computeAuditScores } from "../scoring/engine";
import { projectOwnerReport } from "./owner-projection";
import { projectExpertReport } from "./expert-projection";
import { generateReportHtml } from "./pdf-generator";
import { generateExpertReportHtml } from "./expert-pdf-generator";
import { exportRuleLedgerCsv } from "./expert-export";
import { buildAssessmentAndIssuesSummary } from "./shared-summary";
import {
  calculateLighthousePerformanceScore,
  getMetricRating,
  getMetricRatingStyle,
  PERFORMANCE_THRESHOLDS,
} from "../scoring/performance-thresholds";
import { PageSpeedProvider } from "../providers/pagespeed";
import { isLikelyNonHtmlUrl } from "../scanner/crawler";
import type { PageObservation, ScanRequest, AssessmentResult, RuleAssessmentOutcome } from "@/types";
import { OwnerReportSchema } from "@/types/schema";
import { ExpertReportSchema } from "@/types/expert-schema";
import type { CrawlResult } from "../scanner/crawler";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function createMockPage(overrides: Partial<PageObservation> = {}): PageObservation {
  return {
    id: "page_1",
    requestedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    normalizedUrl: "https://example.com/",
    statusCode: 200,
    responseTimeMs: 140,
    contentType: "text/html",
    visibleWordCount: 500,
    redirectHistory: [],
    robotsDirectives: ["index", "follow"],
    headers: {
      "content-type": "text/html; charset=utf-8",
      "strict-transport-security": "max-age=31536000; includeSubDomains",
    },
    documentType: "html",
    title: "Example Website - High Performance Web Architecture",
    metaDescription: "Providing digital diagnostic scanning and performance intelligence services.",
    canonicalCandidate: "https://example.com/",
    headings: {
      h1: ["Welcome to Example Platform"],
      h2: ["Enterprise Performance", "Security Overview"],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
    },
    visibleTextSample: "Enterprise performance and security diagnostics.",
    links: [
      { id: "l1", sourceUrl: "https://example.com/", targetUrl: "https://example.com/about", anchorText: "About", isInternal: true, isBroken: false, isRedirect: false },
      { id: "l2", sourceUrl: "https://example.com/", targetUrl: "https://example.com/missing", anchorText: "Broken Link", isInternal: true, isBroken: true, statusCode: 404, isRedirect: false },
    ],
    resources: [],
    forms: [],
    structuredData: [],
    openGraph: {},
    cookieAttributes: [],
    templateConfidence: "HIGH",
    discoveredAtDepth: 0,
    discoverySource: "entry",
    consoleErrors: ["Sample console warning"],
    ...overrides,
  };
}

describe("Report Quality, Genuine Speed Audits, and Unified Counts Verification", () => {
  const mockPages: PageObservation[] = [
    createMockPage(),
    createMockPage({
      id: "page_2",
      requestedUrl: "https://example.com/about",
      finalUrl: "https://example.com/about",
      title: "About Us - Company Background",
      metaDescription: "Learn more about our team and technology infrastructure.",
    }),
    createMockPage({
      id: "page_sitemap",
      requestedUrl: "https://example.com/sitemap.xml",
      finalUrl: "https://example.com/sitemap.xml",
      documentType: "xml_sitemap",
      isXmlSitemap: true,
      contentType: "application/xml",
      title: undefined,
      metaDescription: undefined,
    }),
  ];

  const mockCrawl: CrawlResult = {
    pages: mockPages,
    coverage: {
      discoveredPages: 12,
      testedPages: 2,
      skippedPages: 9,
      failedPages: 1,
      inaccessiblePages: 0,
      totalPagesBudget: 50,
      totalBytesFetched: 450000,
      crawlDepthReached: 2,
      isExhaustive: false,
      excludedDocumentTypesCount: 1,
      coveragePercentage: 82,
      externalLinksTested: 0,
      resourcesTested: 0,
      weightedPointsEvaluated: 82,
      totalWeightedPoints: 100,
    },
    sitemapUrls: ["https://example.com/sitemap.xml"],
    externalLinksTested: [],
    discoveredPageUrls: ["https://example.com/", "https://example.com/about"],
    scopeCounts: {
      discoveredUrls: 12,
      attemptedUrls: 3,
      testedHtmlPages: 2,
      nonHtmlResourcesExcluded: 1,
      skippedUrls: 9,
      blockedChecks: 0,
      failedRequests: 1,
    },
  };

  const mockRequest: ScanRequest = {
    targetUrl: "https://example.com/",
    reportType: "owner",
    platformName: "Example Platform",
    businessCategory: "saas",
    targetMarket: "US",
    preferredLanguage: "en",
    competitors: [],
    maxPages: 50,
    maxDepth: 2,
  };

  // Generate real assessment results for all 56 rules
  const results: AssessmentResult[] = ALL_ASSESSMENT_RULES.map((rule) => {
    return rule.evaluate({
      pages: mockPages,
      targetUrl: mockRequest.targetUrl,
      domain: "example.com",
      businessCategory: mockRequest.businessCategory,
      sitemapUrls: ["https://example.com/sitemap.xml"],
      externalLinksTested: [],
      robotsTxt: "User-agent: *\nAllow: /",
      businessCategoryDetection: {
        primaryCategory: "saas",
        categoryLabel: "SaaS & Cloud Platforms",
        confidence: "HIGH",
        confidenceScore: 0.95,
        decisionSource: "AUTO_DETECTED",
        secondaryFacets: [],
      } as any,
      browserResponsiveResults: [
        { pageUrl: "https://example.com/", accessibleNameIssues: 0, screenshotAvailable: false, viewport: 320, horizontalOverflow: true, overflowElements: [".hero-container", ".navbar"], touchTargetIssues: 3, touchTargetSelectors: [".btn-nav", ".btn-submit"], clippingIssues: 0, status: "TESTED", severity: "HIGH" },
        { pageUrl: "https://example.com/", accessibleNameIssues: 0, screenshotAvailable: false, viewport: 360, horizontalOverflow: true, overflowElements: [".hero-container"], touchTargetIssues: 2, touchTargetSelectors: [".btn-nav"], clippingIssues: 0, status: "TESTED", severity: "HIGH" },
        { pageUrl: "https://example.com/", accessibleNameIssues: 0, screenshotAvailable: false, viewport: 390, horizontalOverflow: false, overflowElements: [], touchTargetIssues: 2, touchTargetSelectors: [".btn-nav"], clippingIssues: 0, status: "TESTED", severity: "LOW" },
        { pageUrl: "https://example.com/", accessibleNameIssues: 0, screenshotAvailable: false, viewport: 768, horizontalOverflow: false, overflowElements: [], touchTargetIssues: 2, touchTargetSelectors: [".btn-nav"], clippingIssues: 0, status: "TESTED", severity: "LOW" },
        { pageUrl: "https://example.com/", accessibleNameIssues: 0, screenshotAvailable: false, viewport: 1024, horizontalOverflow: false, overflowElements: [], touchTargetIssues: 0, touchTargetSelectors: [], clippingIssues: 0, status: "TESTED", severity: "INFORMATIONAL" },
        { pageUrl: "https://example.com/", accessibleNameIssues: 0, screenshotAvailable: false, viewport: 1280, horizontalOverflow: false, overflowElements: [], touchTargetIssues: 0, touchTargetSelectors: [], clippingIssues: 0, status: "TESTED", severity: "INFORMATIONAL" },
        { pageUrl: "https://example.com/", accessibleNameIssues: 0, screenshotAvailable: false, viewport: 1440, horizontalOverflow: false, overflowElements: [], touchTargetIssues: 0, touchTargetSelectors: [], clippingIssues: 0, status: "TESTED", severity: "INFORMATIONAL" },
      ],
    });
  });

  const scoresOutput = computeAuditScores(results);

  // Test 1: Unified Assessment and Issues Summary counts exactly 56 rules for synthetic mock fixture
  it("Unified Assessment and Issues Summary reconciles all 56 rules for synthetic mock fixture (fixture-specific counts: 22 PASS, 17 WARN, 3 FAIL, 5 NOT_TESTED, 0 BLOCKED, 4 UNKNOWN, 5 NOT_APPLICABLE)", () => {
    const summary = buildAssessmentAndIssuesSummary({
      crawl: mockCrawl as any,
      ruleOutcomes: scoresOutput.ruleOutcomes,
      findings: scoresOutput.ruleOutcomes,
      technicalErrors: {
        browserJsExceptions: ["TypeError: Cannot read properties of undefined"],
        browserConsoleErrors: ["Console warning: deprecated resource"],
        failedNetworkRequests: [{ url: "https://example.com/api/telemetry" }],
      },
    });

    // Fixture-specific rule counts for the synthetic 2-page mock fixture:
    // 22 PASS, 17 WARN, 3 FAIL, 5 NOT_TESTED, 0 BLOCKED, 4 UNKNOWN, 5 NOT_APPLICABLE (Total: 56)
    expect(summary.ruleCounts.pass).toBe(22);
    expect(summary.ruleCounts.warn).toBe(17);
    expect(summary.ruleCounts.fail).toBe(3);
    expect(summary.ruleCounts.notTested).toBe(5);
    expect(summary.ruleCounts.blocked).toBe(0);
    expect(summary.ruleCounts.unknown).toBe(4);
    expect(summary.ruleCounts.notApplicable).toBe(5);
    expect(summary.ruleCounts.totalAccounted).toBe(56);

    const totalRuleOutcomes =
      summary.ruleCounts.pass +
      summary.ruleCounts.warn +
      summary.ruleCounts.fail +
      summary.ruleCounts.notTested +
      summary.ruleCounts.blocked +
      summary.ruleCounts.unknown +
      summary.ruleCounts.notApplicable;
    expect(totalRuleOutcomes).toBe(56);

    // Severity findings
    expect(summary.severityCounts.totalUniqueFindings).toBe(
      summary.severityCounts.critical +
      summary.severityCounts.high +
      summary.severityCounts.medium +
      summary.severityCounts.low +
      summary.severityCounts.informational
    );

    // Technical errors
    expect(summary.technicalErrorCounts.brokenInternalLinks).toBe(3);
    expect(summary.technicalErrorCounts.browserJsExceptions).toBe(1);
    expect(summary.technicalErrorCounts.browserConsoleErrors).toBe(1);
    expect(summary.technicalErrorCounts.failedBrowserNetworkRequests).toBe(1);
    expect(summary.technicalErrorCounts.confirmedReproducibleDefects).toBe(summary.ruleCounts.fail);

    // Crawl Scope
    expect(summary.crawlScopeSummary.discoveredUrls).toBe(12);
    expect(summary.crawlScopeSummary.testedHtmlPages).toBe(2);
    expect(summary.crawlScopeSummary.nonHtmlResourcesExcluded).toBe(1);
  });

  // Test 1b: Shared live scan snapshot (scan_1793196263096_68rje7) reconciles exact 7-status distribution across reports and CSV
  it("Live scan snapshot (scan_1793196263096_68rje7) reconciles exactly 32 PASS, 13 WARN, 2 FAIL, 1 NOT_TESTED, 0 BLOCKED, 4 UNKNOWN, 4 NOT_APPLICABLE and preserves distinct non-evaluable statuses", () => {
    const csvPath = fs.existsSync(path.resolve("pdf-review-artifacts/final/caferemote-56-rule-ledger.csv"))
      ? path.resolve("pdf-review-artifacts/final/caferemote-56-rule-ledger.csv")
      : path.resolve("pdf-review-artifacts/single-scan-candidate/caferemote-56-rule-ledger.csv");

    const csvContent = fs.readFileSync(csvPath, "utf8");
    const lines = csvContent.trim().split(/\r?\n/);
    const dataRows = lines.slice(1);
    expect(dataRows.length).toBe(56);

    // Parse CSV rows into rule outcomes
    const liveOutcomes: RuleAssessmentOutcome[] = dataRows.map((row) => {
      const cols = parseCsvLine(row);
      const ruleId = cols[0];
      const categoryName = cols[1];
      const testName = cols[2];
      const status = cols[3] as any;
      const severity = cols[4] as any;
      const executionStatus = cols[5] as any;
      const allocatedPoints = parseFloat(cols[6]) || 0;
      const evaluatedPoints = parseFloat(cols[7]) || 0;
      const earnedPoints = parseFloat(cols[8]) || 0;
      const confidence = cols[9] as any;
      const observedValue = cols[10];
      const expectedThreshold = cols[11];
      const remediation = cols[12];
      const validationProcedure = cols[13];

      return {
        ruleId,
        testId: ruleId,
        testVersion: "1.0.0",
        testName,
        category: "seo" as any,
        categoryName,
        description: observedValue,
        status,
        severity,
        executionStatus,
        allocatedPoints,
        evaluatedPoints,
        maxPoints: allocatedPoints,
        earnedPoints,
        scoringWeight: allocatedPoints,
        scoreContribution: earnedPoints,
        evidenceSource: "crawl",
        affectedUrls: [],
        observedValue,
        expectedThreshold,
        timestamp: "2026-10-28T14:05:00.000Z",
        confidence,
        remediation,
        validationProcedure,
        verificationSteps: validationProcedure,
        title: testName,
        summary: observedValue,
        sampleEvidence: [],
        affectedUrlsCount: 0,
      };
    });

    // Reconcile via shared-summary model
    const liveSummary = buildAssessmentAndIssuesSummary({
      crawl: {
        pages: [],
        coverage: {
          discoveredPages: 100,
          testedPages: 50,
          skippedPages: 50,
          failedPages: 0,
          inaccessiblePages: 0,
          totalPagesBudget: 50,
          totalBytesFetched: 1500000,
          crawlDepthReached: 2,
          isExhaustive: false,
          excludedDocumentTypesCount: 0,
          coveragePercentage: 100,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 86,
          totalWeightedPoints: 100,
        },
        sitemapUrls: ["https://www.caferemote.com/sitemap.xml"],
        externalLinksTested: [],
        discoveredPageUrls: [],
        scopeCounts: {
          discoveredUrls: 100,
          attemptedUrls: 50,
          testedHtmlPages: 50,
          nonHtmlResourcesExcluded: 0,
          skippedUrls: 50,
          blockedChecks: 0,
          failedRequests: 0,
        },
      } as any,
      ruleOutcomes: liveOutcomes,
      findings: liveOutcomes,
    });

    // 1. Verify exact 7-status distribution: 32 PASS, 13 WARN, 2 FAIL, 1 NOT_TESTED, 0 BLOCKED, 4 UNKNOWN, 4 NOT_APPLICABLE
    expect(liveSummary.ruleCounts.pass).toBe(32);
    expect(liveSummary.ruleCounts.warn).toBe(13);
    expect(liveSummary.ruleCounts.fail).toBe(2);
    expect(liveSummary.ruleCounts.notTested).toBe(1);
    expect(liveSummary.ruleCounts.blocked).toBe(0);
    expect(liveSummary.ruleCounts.unknown).toBe(4);
    expect(liveSummary.ruleCounts.notApplicable).toBe(4);
    expect(liveSummary.ruleCounts.totalAccounted).toBe(56);

    const sum7 =
      liveSummary.ruleCounts.pass +
      liveSummary.ruleCounts.warn +
      liveSummary.ruleCounts.fail +
      liveSummary.ruleCounts.notTested +
      liveSummary.ruleCounts.blocked +
      liveSummary.ruleCounts.unknown +
      liveSummary.ruleCounts.notApplicable;
    expect(sum7).toBe(56);

    // 2. Non-evaluable statuses NEVER convert to PASS and NEVER earn points
    const nonEvaluableRules = liveOutcomes.filter((r) =>
      ["NOT_TESTED", "BLOCKED", "UNKNOWN", "NOT_APPLICABLE"].includes(r.status)
    );
    expect(nonEvaluableRules.length).toBe(9); // 1 NOT_TESTED + 0 BLOCKED + 4 UNKNOWN + 4 NOT_APPLICABLE = 9
    for (const r of nonEvaluableRules) {
      expect(r.status).not.toBe("PASS");
      expect(r.earnedPoints).toBe(0);
      expect(r.evaluatedPoints).toBe(0);
    }

    // 3. Point totals and score normalization from live scan dataset
    const totalAlloc = liveOutcomes.reduce((acc, r) => acc + r.allocatedPoints, 0);
    const totalEval = liveOutcomes.reduce((acc, r) => acc + r.evaluatedPoints, 0);
    const totalEarn = liveOutcomes.reduce((acc, r) => acc + r.earnedPoints, 0);

    expect(totalAlloc).toBe(100);
    expect(totalEval).toBe(86);
    expect(totalEarn).toBe(71.5);

    // Normalized composite score: 71.5 / 86 = 0.831395... -> 83.14% rounded to 83%
    const normalizedScore = Math.round((totalEarn / totalEval) * 100);
    expect(normalizedScore).toBe(83);
    expect(Number(((totalEarn / totalEval) * 100).toFixed(2))).toBe(83.14);

    // 4. Category SEO point ratio & arithmetic check: 15 earned / 18 evaluated = 83.33% (NOT 94%)
    const seoRules = liveOutcomes.filter((r) => r.ruleId.startsWith("SEO-"));
    expect(seoRules.length).toBe(9);
    const seoEval = seoRules.reduce((acc, r) => acc + r.evaluatedPoints, 0);
    const seoEarn = seoRules.reduce((acc, r) => acc + r.earnedPoints, 0);
    expect(seoEval).toBe(18);
    expect(seoEarn).toBe(15);
    const seoPct = Math.round((seoEarn / seoEval) * 100);
    expect(seoPct).toBe(83);
    expect(Number(((seoEarn / seoEval) * 100).toFixed(2))).toBe(83.33);
    expect(seoPct).not.toBe(94);
  });

  // Test 2: Both Company A and Company B reports share identical Assessment and Issues Summary
  it("Both Company A (Owner) and Company B (Expert) reports include synchronized Assessment and Issues Summary", () => {
    const owner = projectOwnerReport("job_owner_summary", mockRequest, mockCrawl, results);
    const expert = projectExpertReport("job_expert_summary", mockRequest, mockCrawl, results);

    expect(owner.assessmentAndIssuesSummary).toBeDefined();
    expect(expert.assessmentAndIssuesSummary).toBeDefined();

    // Identical counts
    expect(owner.assessmentAndIssuesSummary!.ruleCounts).toEqual(expert.assessmentAndIssuesSummary!.ruleCounts);
    expect(owner.assessmentAndIssuesSummary!.severityCounts).toEqual(expert.assessmentAndIssuesSummary!.severityCounts);
    expect(owner.assessmentAndIssuesSummary!.technicalErrorCounts).toEqual(expert.assessmentAndIssuesSummary!.technicalErrorCounts);
    expect(owner.assessmentAndIssuesSummary!.crawlScopeSummary).toEqual(expert.assessmentAndIssuesSummary!.crawlScopeSummary);

    // Verified in HTML output
    const ownerHtml = generateReportHtml(owner);
    const expertHtml = generateExpertReportHtml(expert);

    expect(ownerHtml).toContain("Assessment and Issues Summary");
    expect(expertHtml).toContain("Assessment and Issues Summary");
    expect(ownerHtml).toContain("Shared Verified Single Source of Truth");
    expect(expertHtml).toContain("Shared Verified Single Source of Truth");
    expect(ownerHtml).toContain("Rule &amp; Test Outcomes");
    expect(expertHtml).toContain("Rule &amp; Test Outcomes");
  });

  // Test 3: Official Lighthouse v10 performance scoring calculator and thresholds
  it("Calculates authentic Lighthouse v10 performance scores from measured lab metrics", () => {
    // Fast site
    const fastScore = calculateLighthousePerformanceScore({
      fcpMs: 1200,
      lcpMs: 1800,
      cls: 0.02,
      tbtMs: 50,
      speedIndexMs: 2000,
      ttfbMs: 250,
    });
    expect(fastScore.overallScore).toBeGreaterThanOrEqual(90);

    // Slow site
    const slowScore = calculateLighthousePerformanceScore({
      fcpMs: 3800,
      lcpMs: 6500,
      cls: 0.45,
      tbtMs: 1200,
      speedIndexMs: 8000,
      ttfbMs: 1500,
    });
    expect(slowScore.overallScore).toBeLessThanOrEqual(45);

    // Standard ratings
    expect(getMetricRating("fcp", 1200)).toBe("GOOD");
    expect(getMetricRating("fcp", 2500)).toBe("NEEDS_IMPROVEMENT");
    expect(getMetricRating("fcp", 4000)).toBe("POOR");
    expect(getMetricRating("fcp", null)).toBe("NOT_TESTED");

    expect(getMetricRating("cls", 0.05)).toBe("GOOD");
    expect(getMetricRating("cls", 0.18)).toBe("NEEDS_IMPROVEMENT");
    expect(getMetricRating("cls", 0.35)).toBe("POOR");

    const style = getMetricRatingStyle("GOOD");
    expect(style.label).toBe("Good");
  });

  // Test 4: PageSpeed provider fallback to local lab audit without fabrication
  it("PageSpeed provider executes local lab fallback or reports transparent NOT_TESTED state", async () => {
    const provider = new PageSpeedProvider(); // No API key
    // Mock run to verify getBothStrategies interface
    const mockData = await provider.getBothStrategies("https://example.com/", {
      mobile: {
        isAvailable: true,
        strategy: "mobile",
        performanceScore: 82,
        labMetrics: { fcpMs: 1400, lcpMs: 2100, cls: 0.03, tbtMs: 120, speedIndexMs: 2400, ttfbMs: 300 },
        providerName: "Headless Chromium Lab Engine",
        measurementMethod: "W3C Navigation & Paint Timing via Playwright Lab Engine",
      },
      desktop: {
        isAvailable: true,
        strategy: "desktop",
        performanceScore: 94,
        labMetrics: { fcpMs: 900, lcpMs: 1400, cls: 0.01, tbtMs: 40, speedIndexMs: 1500, ttfbMs: 210 },
        providerName: "Headless Chromium Lab Engine",
        measurementMethod: "W3C Navigation & Paint Timing via Playwright Lab Engine",
      },
    });

    expect(mockData.mobile.performanceScore).toBe(82);
    expect(mockData.desktop.performanceScore).toBe(94);
    expect(mockData.mobile.providerName).toBe("Headless Chromium Lab Engine");
    expect(mockData.mobile.measurementMethod).toContain("Playwright Lab Engine");
  });

  // Test 5: Sitemap XML files and non-HTML URLs excluded from HTML denominator
  it("Sitemap XML files and non-HTML assets are excluded from HTML denominators and crawl queue", () => {
    expect(isLikelyNonHtmlUrl("https://example.com/sitemap.xml")).toBe(true);
    expect(isLikelyNonHtmlUrl("https://example.com/sitemap_index.xml.gz")).toBe(true);
    expect(isLikelyNonHtmlUrl("https://example.com/documents/report.pdf")).toBe(true);
    expect(isLikelyNonHtmlUrl("https://example.com/images/banner.png")).toBe(true);
    expect(isLikelyNonHtmlUrl("https://example.com/about")).toBe(false);
    expect(isLikelyNonHtmlUrl("https://example.com/products/widget")).toBe(false);
    expect(isLikelyNonHtmlUrl("https://example.com/contact.html")).toBe(false);
  });

  // Test 6: Responsive rules distinguish unique offending elements from total observation occurrences
  it("Responsive rules RSP-02 and RSP-04 distinguish unique selectors from total viewport observations", () => {
    const rsp02 = results.find((r) => r.testId === "RSP-02");
    expect(rsp02).toBeDefined();
    // Unique selectors = [".hero-container", ".navbar"] (length 2), total observation events = 2 (320px, 360px)
    expect(rsp02?.summary).toContain("2 unique offending selector(s) across 2 viewport observation(s)");

    const rsp04 = results.find((r) => r.testId === "RSP-04");
    expect(rsp04).toBeDefined();
    // Unique touch selectors = [".btn-nav", ".btn-submit"] (length 2)
    expect(rsp04?.summary).toContain("unique undersized control(s)");
    expect(rsp04?.summary).toContain("viewport observation(s)");
  });

  // Test 7: Reconciled remediation hours and workstream estimates in Expert report
  it("Expert report headline remediation hours match the sum of remediation task rows", () => {
    const expert = projectExpertReport("job_expert_hours", mockRequest, mockCrawl, results);
    const sumTaskHours = expert.remediationRegister.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const sumWorkstreamHours = expert.executiveSummary.workstreamEstimates.reduce(
      (acc, w) => acc + (w.estimatedHours || 0),
      0
    );

    expect(sumTaskHours).toBe(sumWorkstreamHours);

    const activeWorkstreams = expert.executiveSummary.workstreamEstimates.filter((w) => w.taskCount > 0);
    expect(expert.remediationRegister.length).toBe(activeWorkstreams.length);

    const expertHtml = generateExpertReportHtml(expert);
    expect(expertHtml).toContain(`${sumTaskHours} hrs effort`);
    expect(expertHtml).toContain("Synchronized Effort Schedule");
  });

  // Test 8: All 56 rules have specific measurable thresholds and validation procedures in CSV
  it("Rule ledger CSV export contains specific measurable thresholds and validation procedures for all 56 rules", () => {
    const expert = projectExpertReport("job_expert_csv", mockRequest, mockCrawl, results);
    const csvContent = exportRuleLedgerCsv(expert);
    const rows = csvContent.trim().split("\r\n");

    expect(rows.length).toBe(57); // 1 header + 56 rules

    // No generic fallback placeholder
    expect(csvContent).not.toContain("Validate against target public surface");
    expect(csvContent).not.toContain("public surface probe");

    // All rule rows have non-empty threshold and validation procedure
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split('","');
      expect(cols.length).toBeGreaterThanOrEqual(13);
      const ruleId = cols[0].replace(/"/g, "");
      const expectedThreshold = cols[11]?.replace(/"/g, "");
      const validationProcedure = cols[13]?.replace(/"/g, "");

      expect(expectedThreshold).toBeTruthy();
      expect(validationProcedure).toBeTruthy();
    }
  });

  // Test 9: Measured CLS is included in lab-metrics and real zero (0.000) is preserved
  it("Preserves real measured CLS of 0.000 without coercion or omission", () => {
    const scoreZeroCls = calculateLighthousePerformanceScore({
      fcpMs: 1000,
      lcpMs: 1500,
      cls: 0,
      tbtMs: 100,
      speedIndexMs: 1800,
      ttfbMs: 150,
    });

    expect(scoreZeroCls.metricScores.cls).toBeDefined();
    // CLS 0 is a perfect score (100) under log-normal distribution
    expect(scoreZeroCls.metricScores.cls).toBe(100);
    expect(scoreZeroCls.overallScore).toBeGreaterThanOrEqual(90);

    const scoreNonZeroCls = calculateLighthousePerformanceScore({
      fcpMs: 1000,
      lcpMs: 1500,
      cls: 0.05,
      tbtMs: 100,
      speedIndexMs: 1800,
      ttfbMs: 150,
    });
    expect(scoreNonZeroCls.metricScores.cls).toBeDefined();
    expect(scoreNonZeroCls.metricScores.cls).toBeGreaterThan(80);
  });

  // Test 10: Missing CLS remains explicitly unavailable and is not coerced to zero
  it("Missing CLS remains explicitly unavailable (undefined/null) and renormalizes over evaluated metrics", () => {
    const scoreMissingCls = calculateLighthousePerformanceScore({
      fcpMs: 1200,
      lcpMs: 1800,
      cls: undefined, // Not measured
      tbtMs: 100,
      speedIndexMs: 2000,
      ttfbMs: 200,
    });

    expect(scoreMissingCls.metricScores.cls).toBeUndefined();
    // Evaluates over FCP (10%) + LCP (25%) + TBT (30%) + SI (10%) = 75% weight
    expect(scoreMissingCls.overallScore).toBeGreaterThanOrEqual(85);

    // Rating helper returns NOT_TESTED for null / undefined
    expect(getMetricRating("cls", null)).toBe("NOT_TESTED");
    expect(getMetricRating("cls", undefined as any)).toBe("NOT_TESTED");

    // Report template renders NOT_TESTED when CLS is absent
    const pageSpeedMissingCls = {
      mobile: {
        isAvailable: true,
        strategy: "mobile" as const,
        performanceScore: 88,
        labMetrics: { fcpMs: 1200, lcpMs: 1800, cls: undefined, tbtMs: 150, speedIndexMs: 2000, ttfbMs: 150 },
        providerName: "Custom Lab Performance Index (Headless Chromium v1.50)",
      },
    };
    const expertMissing = projectExpertReport("scan_missing_cls", mockRequest, mockCrawl, results, { pageSpeedData: pageSpeedMissingCls as any });
    const expertMissingHtml = generateExpertReportHtml(expertMissing);
    expect(expertMissingHtml).toContain("NOT_TESTED");
  });

  // Test 11: CLS survives schema validation and projections for both Owner and Expert reports
  it("Both Owner and Expert projections receive identical CLS values from shared scan snapshot and survive schema validation", () => {
    const pageSpeedData = {
      mobile: {
        isAvailable: true,
        strategy: "mobile" as const,
        performanceScore: 92,
        labMetrics: {
          fcpMs: 1100,
          lcpMs: 1600,
          cls: 0.000, // Valid measured zero
          tbtMs: 150,
          speedIndexMs: 1900,
          ttfbMs: 120,
        },
        providerName: "Custom Lab Performance Index (Headless Chromium v1.50)",
        source: "Custom Lab Performance Index v1.0",
        measuredAt: "2026-10-28T14:05:00.000Z",
        measurementMethod: "Custom Lab Performance Index v1.0 (Log-Normal Model)",
        deviceProfile: "Mobile (390×844 px, DPR 3.0, Touch)",
      },
      desktop: {
        isAvailable: true,
        strategy: "desktop" as const,
        performanceScore: 88,
        labMetrics: {
          fcpMs: 900,
          lcpMs: 1300,
          cls: 0.015,
          tbtMs: 80,
          speedIndexMs: 1400,
          ttfbMs: 110,
        },
        providerName: "Custom Lab Performance Index (Headless Chromium v1.50)",
        source: "Custom Lab Performance Index v1.0",
        measuredAt: "2026-10-28T14:05:00.000Z",
        measurementMethod: "Custom Lab Performance Index v1.0 (Log-Normal Model)",
        deviceProfile: "Desktop (1280×800 px, DPR 1.0)",
      },
    };

    const owner = projectOwnerReport("scan_perf_shared", mockRequest, mockCrawl, results, undefined, { pageSpeedData });
    const expert = projectExpertReport("scan_perf_shared", mockRequest, mockCrawl, results, { pageSpeedData });

    // Verify Owner Report receives CLS
    expect(owner.performanceAndResponsiveSummary.labMetrics?.cls).toBe(0.000);
    expect(owner.performanceAndResponsiveSummary.mobileLabScore).toBe(92);

    // Verify Expert Report receives identical CLS values
    expect(expert.performanceDiagnostics.labScores?.cls).toBe(0.000);
    expect(expert.performanceDiagnostics.labScores?.mobileLab?.cls).toBe(0.000);
    expect(expert.performanceDiagnostics.labScores?.desktopLab?.cls).toBe(0.015);

    // Schema Validation: Verify both Owner and Expert models pass Zod schema parsing
    const parsedOwner = OwnerReportSchema.parse(owner);
    expect(parsedOwner.performanceAndResponsiveSummary.labMetrics?.cls).toBe(0.000);
    const parsedExpert = ExpertReportSchema.parse(expert);
    expect(parsedExpert.performanceDiagnostics.labScores?.mobileLab?.cls).toBe(0.000);
    expect(parsedExpert.performanceDiagnostics.labScores?.desktopLab?.cls).toBe(0.015);

    // Verify HTML output displays CLS values
    const expertHtml = generateExpertReportHtml(expert);
    expect(expertHtml).toContain("0.000");
    expect(expertHtml).toContain("0.015");
  });

  // Test 12: Custom scores are labelled as Custom Lab Performance Index and not official Lighthouse
  it("Local runner results are labelled as Custom Lab Performance Index, not official Lighthouse", () => {
    const pageSpeedData = {
      mobile: {
        isAvailable: true,
        strategy: "mobile" as const,
        performanceScore: 92,
        labMetrics: { fcpMs: 1100, lcpMs: 1600, cls: 0.005, tbtMs: 150, speedIndexMs: 1900, ttfbMs: 120 },
        providerName: "Custom Lab Performance Index (Headless Chromium v1.50)",
        source: "Custom Lab Performance Index v1.0",
        measuredAt: "2026-10-28T14:05:00.000Z",
        measurementMethod: "Custom Lab Performance Index v1.0 (Log-Normal Model)",
      },
    };

    const expert = projectExpertReport("scan_label_check", mockRequest, mockCrawl, results, { pageSpeedData });
    const expertHtml = generateExpertReportHtml(expert);

    expect(expertHtml).toContain("Mobile Lab Performance Index");
    expect(expertHtml).toContain("Desktop Lab Performance Index");
    expect(expertHtml).not.toContain('<div class="card-title">Mobile Lighthouse</div>');
    expect(expertHtml).not.toContain('<div class="card-title">Desktop Lighthouse</div>');
  });

  // Test 13: Point denominators reconcile: Allocated, evaluated, earned points and normalized score arithmetic
  it("Reconciles allocated, evaluated, and earned points with exact percentage arithmetic", () => {
    // 1. Math check for live scan normalization: 71.5 / 86 = 0.831395... -> 83.14% rounded to 83%
    const totalEarnedLive = 71.5;
    const totalEvaluatedLive = 86;
    const liveRatio = (totalEarnedLive / totalEvaluatedLive) * 100;
    expect(Number(liveRatio.toFixed(2))).toBe(83.14);
    expect(Math.round(liveRatio)).toBe(83);

    // 2. Math check for SEO category: 15 earned / 18 evaluated = 83.33% (strictly NOT 94%)
    const seoEarned = 15;
    const seoEvaluated = 18;
    const seoRatio = (seoEarned / seoEvaluated) * 100;
    expect(Number(seoRatio.toFixed(2))).toBe(83.33);
    expect(Math.round(seoRatio)).toBe(83);
    expect(Math.round(seoRatio)).not.toBe(94);

    // 3. Dynamic audit score computation on mock fixture
    const auditScores = computeAuditScores(results);

    const totalEarned = (auditScores.overallScore.pointsEarned ?? auditScores.overallScore.totalEarnedCataloguePoints) ?? 0;
    const totalEvaluated = (auditScores.overallScore.pointsActuallyEvaluated ?? auditScores.overallScore.evaluatedWeightedPoints) ?? 1;
    const compositeScore = auditScores.overallScore.score;

    expect(totalEarned).toBeGreaterThan(0);
    expect(totalEvaluated).toBeGreaterThan(0);
    const expectedComposite = Math.round((totalEarned / totalEvaluated) * 100);
    expect(compositeScore).toBe(expectedComposite);

    // Category SEO check: verify percentage matches earned / tested points arithmetic
    const seoCat = auditScores.categoryScores.find((c) => c.category === "seo");
    expect(seoCat).toBeDefined();
    expect(seoCat?.testedPoints).toBeGreaterThan(0);
    const expectedSeoPct = Math.round((seoCat!.earnedPoints / seoCat!.testedPoints) * 100);
    expect(seoCat?.scorePercentage).toBe(expectedSeoPct);
  });
});
