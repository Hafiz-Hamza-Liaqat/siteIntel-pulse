import { describe, it, expect } from "vitest";
import { calculateCostOfInaction } from "./cost-of-inaction.ts";
import { projectOwnerReport } from "./owner-projection.ts";
import { projectExpertReport } from "./expert-projection.ts";
import { formatCurrency, getCurrencySymbol } from "./currency.ts";
import { AssessmentResult, CrawlResult, ScanRequest } from "@/types";

describe("Cost of Inaction v1/v2 & Dual-Report Synchronization", () => {
  const mockRequest: ScanRequest = {
    targetUrl: "https://example.com",
    businessCategory: "ecommerce",
    reportType: "owner",
    monthlySessions: 20000,
    averageOrderValue: 95,
    grossMarginPct: 55,
    currency: "GBP",
    targetMarket: "Global",
    preferredLanguage: "en",
    competitors: [],
    maxPages: 5,
    maxDepth: 1,
  };

  const mockCrawl: CrawlResult = {
    pages: [
      {
        id: "pg_1",
        requestedUrl: "https://example.com",
        normalizedUrl: "https://example.com",
        finalUrl: "https://example.com",
        statusCode: 200,
        responseTimeMs: 120,
        contentType: "text/html",
        redirectHistory: [],
        title: "Example Store",
        metaDescription: "Example description",
        canonicalCandidate: "https://example.com",
        robotsDirectives: ["index", "follow"],
        headings: { h1: ["Welcome"], h2: [], h3: [], h4: [], h5: [], h6: [] },
        visibleWordCount: 500,
        language: "en",
        doctype: "html",
        encoding: "UTF-8",
        links: [],
        resources: [],
        structuredData: [],
        headers: {},
        openGraph: {},
        cookieAttributes: [],
        templateConfidence: "HIGH",
        discoveredAtDepth: 0,
        discoverySource: "entry",
        consoleErrors: [],
      },
    ],
    sitemapUrls: [],
    externalLinksTested: [],
    discoveredPageUrls: ["https://example.com"],
    coverage: {
      discoveredPages: 1,
      testedPages: 1,
      failedPages: 0,
      skippedPages: 0,
      totalPagesBudget: 10,
      coveragePercentage: 100,
      totalBytesFetched: 5000,
      crawlDepthReached: 0,
      isExhaustive: true,
      inaccessiblePages: 0,
      externalLinksTested: 0,
      resourcesTested: 0,
      weightedPointsEvaluated: 100,
      totalWeightedPoints: 100,
    },
  };

  const mockResults: AssessmentResult[] = [
    {
      testId: "CRO-01",
      testVersion: "1.0.0",
      testName: "Primary Call to Action Prominence",
      category: "conversion_marketing",
      status: "FAIL",
      severity: "HIGH",
      maxPoints: 3,
      earnedPoints: 0,
      title: "Hero CTA Missing",
      summary: "No prominent call to action above the fold.",
      timestamp: new Date().toISOString(),
      confidence: "HIGH",
    },
    {
      testId: "RSP-01",
      testVersion: "1.0.0",
      testName: "Responsive Viewport Meta Tag",
      category: "responsive_accessibility",
      status: "PASS",
      severity: "INFORMATIONAL",
      maxPoints: 2,
      earnedPoints: 2,
      title: "Viewport Meta Present",
      summary: "Standard mobile viewport configured.",
      timestamp: new Date().toISOString(),
      confidence: "HIGH",
    },
  ];

  it("calculates deterministic Cost of Inaction scenarios with revenue vs gross profit distinction", () => {
    const coi = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: {
        targetUrl: "https://example.com",
        businessCategory: "ecommerce",
        monthlySessions: 10000,
        averageOrderValue: 80,
        grossMarginPct: 40,
        currency: "USD",
      },
      results: mockResults,
      remediationCostEstimate: 2500,
    });

    expect(coi.status).toBe("ESTIMATED");
    expect(coi.scenarios).toBeDefined();

    const { conservative, base, upside } = coi.scenarios!;

    // Scenario revenue opportunities
    expect(conservative.monthlyRevenueOpportunity).toBeGreaterThan(0);
    expect(base.monthlyRevenueOpportunity).toBeGreaterThan(conservative.monthlyRevenueOpportunity!);
    expect(upside.monthlyRevenueOpportunity).toBeGreaterThan(base.monthlyRevenueOpportunity!);

    // Annual is 12x monthly
    expect(conservative.annualRevenueOpportunity).toBe(conservative.monthlyRevenueOpportunity! * 12);

    // Gross profit opportunity is 40% of revenue
    expect(conservative.monthlyGrossProfitOpportunity).toBe(Math.round(conservative.monthlyRevenueOpportunity! * 0.4));

    // Payback period should be calculable
    expect(base.paybackMonths).toBeDefined();
    expect(typeof base.paybackMonths).toBe("number");
  });

  it("handles zero gross margin: £0 gross profit, non-zero revenue, and N/A payback", () => {
    const coiZero = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: {
        targetUrl: "https://example.com",
        businessCategory: "ecommerce",
        monthlySessions: 15000,
        averageOrderValue: 120,
        grossMarginPct: 0,
        currency: "GBP",
      },
      results: mockResults,
      remediationCostEstimate: 5000,
    });

    expect(coiZero.status).toBe("ESTIMATED");
    const { conservative, base, upside } = coiZero.scenarios!;

    // Non-zero top-line revenue
    expect(conservative.monthlyRevenueOpportunity).toBeGreaterThan(0);
    expect(base.monthlyRevenueOpportunity).toBeGreaterThan(0);

    // Strictly ZERO gross profit opportunity
    expect(conservative.monthlyGrossProfitOpportunity).toBe(0);
    expect(base.monthlyGrossProfitOpportunity).toBe(0);
    expect(upside.monthlyGrossProfitOpportunity).toBe(0);

    // Payback period is null (rendered as N/A) because gross profit is 0
    expect(conservative.paybackMonths).toBeNull();
    expect(base.paybackMonths).toBeNull();
    expect(upside.paybackMonths).toBeNull();
  });

  it("synchronizes the identical Cost of Inaction snapshot across Owner and Expert reports", () => {
    const sharedCoi = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: mockRequest,
      results: mockResults,
      remediationCostEstimate: 3000,
    });

    const owner = projectOwnerReport(
      "scan-sync-01",
      mockRequest,
      mockCrawl,
      mockResults,
      { costOfInaction: sharedCoi }
    );

    const expert = projectExpertReport(
      "scan-sync-01",
      mockRequest,
      mockCrawl,
      mockResults,
      { costOfInaction: sharedCoi }
    );

    // Both reports have costOfInaction populated
    expect(owner.costOfInaction).toBeDefined();
    expect(expert.costOfInaction).toBeDefined();

    // Verify mathematical identity
    expect(owner.costOfInaction?.scenarios?.base.monthlyRevenueOpportunity).toBe(
      expert.costOfInaction?.scenarios?.base.monthlyRevenueOpportunity
    );
    expect(owner.costOfInaction?.scenarios?.base.annualRevenueOpportunity).toBe(
      expert.costOfInaction?.scenarios?.base.annualRevenueOpportunity
    );
    expect(owner.costOfInaction?.scenarios?.base.monthlyGrossProfitOpportunity).toBe(
      expert.costOfInaction?.scenarios?.base.monthlyGrossProfitOpportunity
    );
    expect(owner.costOfInaction?.scenarios?.base.paybackMonths).toBe(
      expert.costOfInaction?.scenarios?.base.paybackMonths
    );
  });

  it("formats currency deterministically across USD, GBP, EUR", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("EUR")).toBe("€");

    expect(formatCurrency(1250, "USD")).toBe("$1,250");
    expect(formatCurrency(500000, "GBP")).toBe("£500,000");
    expect(formatCurrency(0, "EUR")).toBe("€0");
  });
});
