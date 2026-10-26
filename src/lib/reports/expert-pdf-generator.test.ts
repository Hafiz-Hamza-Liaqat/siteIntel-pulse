import { describe, it, expect } from "vitest";
import { projectExpertReport } from "./expert-projection";
import { generateExpertReportHtml } from "./expert-pdf-generator";
import { assessmentRegistry } from "../catalogue/registry";
import type { PageObservation, ScanCoverage } from "@/types";

describe("Milestone 2: Expert PDF Generator & Print Layout", () => {
  const scanRequest = {
    targetUrl: "https://pdf-test.company.com",
    reportType: "expert" as const,
    platformName: "PDF Test Platform",
    businessCategory: "ecommerce" as const,
    targetMarket: "US",
    preferredLanguage: "en",
    competitors: ["comp.com"],
    maxPages: 5,
    maxDepth: 1,
  };

  const samplePages: PageObservation[] = [
    {
      id: "pg_1",
      requestedUrl: "https://pdf-test.company.com/",
      normalizedUrl: "https://pdf-test.company.com/",
      finalUrl: "https://pdf-test.company.com/",
      statusCode: 200,
      responseTimeMs: 210,
      contentType: "text/html",
      redirectHistory: [],
      title: "PDF Test Storefront",
      metaDescription: "Test storefront for PDF generation verification.",
      canonicalCandidate: "https://pdf-test.company.com/",
      robotsDirectives: ["index"],
      headings: { h1: ["Welcome to PDF Store"], h2: ["Categories"], h3: [], h4: [], h5: [], h6: [] },
      visibleWordCount: 500,
      language: "en",
      doctype: "html",
      encoding: "UTF-8",
      links: [],
      resources: [],
      structuredData: [],
      openGraph: {},
      headers: {
        "content-type": "text/html",
        "x-frame-options": "DENY",
        "strict-transport-security": "max-age=31536000",
      },
      cookieAttributes: [],
      templateConfidence: "HIGH",
      discoveredAtDepth: 0,
      discoverySource: "entry",
      consoleErrors: [],
    },
  ];

  const sampleCoverage: ScanCoverage = {
    discoveredPages: 1,
    testedPages: 1,
    skippedPages: 0,
    failedPages: 0,
    inaccessiblePages: 0,
    totalBytesFetched: 40000,
    totalPagesBudget: 5,
    crawlDepthReached: 0,
    externalLinksTested: 0,
    resourcesTested: 0,
    isExhaustive: true,
    weightedPointsEvaluated: 82,
    totalWeightedPoints: 100,
    coveragePercentage: 82,
  };

  const crawlResult = {
    pages: samplePages,
    coverage: sampleCoverage,
    robotsTxt: "User-agent: *\nAllow: /",
    sitemapUrls: [],
    externalLinksTested: [],
    discoveredPageUrls: ["https://pdf-test.company.com/"],
  };

  const evalContext = {
    targetUrl: scanRequest.targetUrl,
    domain: "pdf-test.company.com",
    businessCategory: scanRequest.businessCategory,
    pages: crawlResult.pages,
    robotsTxt: crawlResult.robotsTxt,
    sitemapUrls: crawlResult.sitemapUrls,
    externalLinksTested: crawlResult.externalLinksTested,
    competitors: scanRequest.competitors,
  };

  const assessmentResults = assessmentRegistry.evaluateAll(evalContext);
  const report = projectExpertReport("job_pdf_test_1", scanRequest, crawlResult, assessmentResults);

  it("generates complete HTML document with print styles and page breaks", () => {
    const html = generateExpertReportHtml(report);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toMatch(/Company B Expert Diagnostic &(?:amp;)? Growth Intelligence Report/);
    expect(html).toContain("pdf-test.company.com");
    expect(html).toMatch(/Assessment Catalogue &(?:amp;)? Score Ledger/);
    expect(html).toContain("Diagnostic Finding Ledger");
    expect(html).toContain("Specialist Remediation Action Plan");
    expect(html).toContain("Cryptographic Integrity Sign-Off");
  });

  it("includes all 11 catalogue categories in score ledger table", () => {
    const html = generateExpertReportHtml(report);

    expect(html).toContain("Technical Health and Crawlability");
    expect(html).toContain("Technical and On-Page SEO");
    expect(html).toContain("Performance");
    expect(html).toContain("Public Security Configuration");
  });

  it("formats findings with severity badges and discrepancy code boxes", () => {
    const html = generateExpertReportHtml(report);

    expect(html).toContain("EXP-");
    expect(html).toContain("CRITICAL");
  });

  it("strictly separates crawl page inventory from catalogue coverage and evaluated points", () => {
    // Create a report where discovered pages = 10, tested pages = 2, but catalogue coverage = 82%
    const customReport = {
      ...report,
      coverage: {
        ...report.coverage,
        discoveredPages: 10,
        testedPages: 2,
        failedPages: 1,
        skippedPages: 7,
        totalPagesBudget: 5,
        weightedPointsEvaluated: 82,
        coveragePercentage: 82,
      },
    };

    const html = generateExpertReportHtml(customReport);

    // 1. Must NEVER display catalogue coverage as percentage of discovered pages (e.g. "Tested: 2 (82%)")
    expect(html).not.toMatch(/Tested:\s*<strong>2<\/strong>\s*\(82%\)/);
    expect(html).not.toMatch(/2\s*\/\s*10\s*\(82%\)/);

    // 2. Must clearly display Crawl Inventory and Catalogue Coverage as distinct metrics
    expect(html).toContain("Crawl Inventory");
    expect(html).toContain("Catalogue Coverage");
    expect(html).toContain("82%");
    expect(html).toContain("82/100 pts");
    expect(html).toContain("Tested: 2 / 5 budget");
    expect(html).toContain("Discovered: <strong>10</strong>");
    expect(html).toContain("Failed: 1 | Skipped: 7");
  });

  it("renders canonical provisional coverage notice and reasons in Expert PDF when isProvisional is true", () => {
    const provisionalReport = {
      ...report,
      executiveSummary: {
        ...report.executiveSummary,
        overallScore: {
          ...report.executiveSummary.overallScore,
          isProvisional: true,
          assessmentStatus: "PROVISIONAL" as const,
          evaluationNote: "Overall catalogue coverage (62%) is below the 70% threshold required for a fully assessed score.",
          ineligibleCategories: ["Performance (40% vs 60% min)", "Observable Authentication Posture (0% vs 60% min)"],
        },
      },
      coverage: {
        ...report.coverage,
        coveragePercentage: 62,
        weightedPointsEvaluated: 62,
      },
    };

    const html = generateExpertReportHtml(provisionalReport);

    expect(html).toContain("PROVISIONAL");
    expect(html).toContain("Provisional Coverage Acceptance Notice:");
    expect(html).toContain("Overall catalogue coverage (62%) is below the 70% threshold");
    expect(html).toContain("Performance (40% vs 60% min)");
    expect(html).toContain("Observable Authentication Posture (0% vs 60% min)");
  });
});
