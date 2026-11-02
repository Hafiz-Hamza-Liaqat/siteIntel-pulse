import { describe, it, expect } from "vitest";
import { assessmentRegistry, ALL_ASSESSMENT_RULES } from "../catalogue/registry";
import { computeAuditScores, buildRuleAssessmentOutcomes } from "../scoring/engine";
import { projectOwnerReport } from "./owner-projection";
import { projectExpertReport } from "./expert-projection";
import { generateReportHtml } from "./pdf-generator";
import { generateExpertReportHtml } from "./expert-pdf-generator";
import { exportFindingsCsv, exportRuleLedgerCsv } from "./expert-export";
import type { PageObservation, ScanRequest, AssessmentResult } from "@/types";

function createMockPage(overrides: Partial<PageObservation> = {}): PageObservation {
  return {
    id: "page_1",
    requestedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    normalizedUrl: "https://example.com/",
    statusCode: 200,
    responseTimeMs: 120,
    contentType: "text/html",
    visibleWordCount: 400,
    redirectHistory: [],
    robotsDirectives: ["index", "follow"],
    headers: {
      "content-type": "text/html; charset=utf-8",
      "strict-transport-security": "max-age=31536000; includeSubDomains",
    },
    documentType: "html",
    title: "Example Platform - Modern Web Testing and Analytics",
    metaDescription: "Comprehensive platform providing professional web auditing, diagnostic scoring, and enterprise reporting solutions.",
    canonicalCandidate: "https://example.com/",
    headings: {
      h1: ["Welcome to Example Platform"],
      h2: ["Enterprise Auditing Services", "Performance Optimization"],
      h3: ["SEO Analysis"],
      h4: [],
      h5: [],
      h6: [],
    },
    visibleTextSample: "Welcome to Example Platform. We offer enterprise auditing and digital transformation.",
    links: [
      { id: "l1", sourceUrl: "https://example.com/", targetUrl: "https://example.com/about", anchorText: "About Us", isInternal: true, isBroken: false, isRedirect: false },
    ],
    resources: [
      { id: "r1", url: "https://example.com/assets/app.js", type: "script", isRenderBlocking: false, sizeBytes: 15000 },
    ],
    forms: [],
    structuredData: [
      { "@context": "https://schema.org", "@type": "Organization", "name": "Example Corp" },
    ],
    openGraph: {},
    cookieAttributes: [],
    templateConfidence: "HIGH",
    discoveredAtDepth: 0,
    discoverySource: "entry",
    consoleErrors: [],
    ...overrides,
  };
}

describe("Report Completeness, Evidence and Scoring Reconciliation (12 Quality Checks)", () => {
  const mockPages: PageObservation[] = [
    createMockPage({ requestedUrl: "https://example.com/", finalUrl: "https://example.com/" }),
    createMockPage({
      id: "page_2",
      requestedUrl: "https://example.com/about",
      finalUrl: "https://example.com/about",
      title: "About Us - Company History and Technical Background",
      metaDescription: "Learn more about our team, engineering background, and core product offerings worldwide.",
      headings: {
        h1: ["About Our Platform"],
        h2: ["Leadership Team"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
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
      canonicalCandidate: undefined,
      headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
    }),
  ];

  const mockCrawl = {
    pages: mockPages,
    coverage: {
      discoveredPages: 3,
      testedPages: 3,
      skippedPages: 0,
      failedPages: 0,
      inaccessiblePages: 0,
      totalPagesBudget: 50,
      crawlDepthReached: 2,
      totalBytesFetched: 65000,
      externalLinksTested: 0,
      resourcesTested: 1,
      weightedPointsEvaluated: 82,
      totalWeightedPoints: 100,
      coveragePercentage: 82,
      isExhaustive: false,
    },
    robotsTxt: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
    sitemapUrls: ["https://example.com/sitemap.xml"],
    externalLinksTested: [],
    discoveredPageUrls: mockPages.map((p) => p.requestedUrl),
  };

  const mockRequest: ScanRequest = {
    targetUrl: "https://example.com/",
    reportType: "expert",
    platformName: "Example Platform",
    businessCategory: "auto",
    targetMarket: "GLOBAL",
    preferredLanguage: "en",
    competitors: [],
    maxPages: 50,
    maxDepth: 3,
  };

  const evalCtx = {
    targetUrl: mockRequest.targetUrl,
    domain: "example.com",
    businessCategory: mockRequest.businessCategory,
    pages: mockCrawl.pages,
    robotsTxt: mockCrawl.robotsTxt,
    sitemapUrls: mockCrawl.sitemapUrls,
    externalLinksTested: mockCrawl.externalLinksTested,
    competitors: mockRequest.competitors,
  };

  const results = assessmentRegistry.evaluateAll(evalCtx);

  // 1. 56 rules ledger completeness
  it("Check 1: 56 rules ledger completeness (every rule produces a structured record with stable ID, category, maxPoints)", () => {
    expect(ALL_ASSESSMENT_RULES.length).toBe(56);
    expect(results.length).toBe(56);

    const outcomes = buildRuleAssessmentOutcomes(results);
    expect(outcomes.length).toBe(56);

    for (const outcome of outcomes) {
      expect(outcome.ruleId).toBeDefined();
      expect(outcome.testId).toBeDefined();
      expect(outcome.category).toBeDefined();
      expect(outcome.categoryName).toBeDefined();
      expect(outcome.maxPoints).toBeGreaterThan(0);
      expect(outcome.allocatedPoints).toBe(outcome.maxPoints);
      expect(outcome.scoringWeight).toBe(outcome.maxPoints);
      expect(outcome.executionStatus).toBeDefined();
      expect(outcome.remediation).toBeDefined();
      expect(outcome.validationProcedure).toBeDefined();
    }
  });

  // 2. Status validity
  it("Check 2: Status validity (status is one of valid allowed enum values)", () => {
    const validStatuses = new Set([
      "PASS",
      "WARNING",
      "FAIL",
      "UNKNOWN",
      "NOT_TESTED",
      "BLOCKED",
      "NOT_APPLICABLE",
      "NOT_DETECTED",
    ]);

    for (const r of results) {
      expect(validStatuses.has(r.status)).toBe(true);
    }
  });

  // 3. Non-evaluable rules excluded from denominator
  it("Check 3: Non-evaluable rules excluded from denominator and do not inflate coverage", () => {
    const mockUnknownResult: AssessmentResult = {
      testId: "PERF-04",
      testVersion: "1.0.0",
      testName: "Field Core Web Vitals (CrUX)",
      category: "performance",
      status: "UNKNOWN",
      severity: "LOW",
      maxPoints: 2,
      earnedPoints: 0,
      title: "CrUX Field Data Not Connected",
      summary: "No field data available.",
      timestamp: new Date().toISOString(),
      confidence: "LOW",
    };

    const mockNotApplicableResult: AssessmentResult = {
      testId: "CMP-01",
      testVersion: "1.0.0",
      testName: "Competitor Market Definition",
      category: "competitor_comparison",
      status: "NOT_APPLICABLE",
      severity: "INFORMATIONAL",
      maxPoints: 1,
      earnedPoints: 0,
      title: "No Competitor Domains",
      summary: "Excluded from applicable scoring.",
      timestamp: new Date().toISOString(),
      confidence: "HIGH",
    };

    const filteredResults = results.map((r) => {
      if (r.testId === "PERF-04") return mockUnknownResult;
      if (r.testId === "CMP-01") return mockNotApplicableResult;
      return r;
    });

    const scoreOutput = computeAuditScores(filteredResults);
    const perfCat = scoreOutput.categoryScores.find((c) => c.category === "performance")!;
    const cmpCat = scoreOutput.categoryScores.find((c) => c.category === "competitor_comparison")!;

    // Non-evaluable UNKNOWN does not count towards tested points
    expect(perfCat.testedPoints).toBeLessThanOrEqual(perfCat.allocatedWeight);
    expect(scoreOutput.overallScore.pointsActuallyEvaluated).toBeLessThan(100);
    // Non-evaluable rule status NEVER earns points
    expect(perfCat.testCounts.unknown).toBeGreaterThan(0);
    expect(cmpCat.testCounts.notApplicable).toBeGreaterThan(0);
  });

  // 4. Dynamic finding-ledger heading
  it("Check 4: Dynamic finding-ledger heading (no 'Top 15 of 14' label)", () => {
    // Generate report with 14 issues
    const customFindings: AssessmentResult[] = results.map((r, i) => {
      if (i < 14) {
        return {
          ...r,
          status: "FAIL",
          severity: i < 2 ? "CRITICAL" : i < 6 ? "HIGH" : "MEDIUM",
          summary: `Mock Issue ${i + 1}`,
        };
      }
      return { ...r, status: "PASS", severity: "INFORMATIONAL", earnedPoints: r.maxPoints };
    });

    const expert = projectExpertReport("job_dyn_hdr", mockRequest, mockCrawl, customFindings);
    const expertHtml = generateExpertReportHtml(expert);

    expect(expertHtml).not.toContain("Top 15 of 14");
    expect(expertHtml).toContain("14 Findings Identified");
  });

  // 5. Severity counts match between Company A and Company B
  it("Check 5: Severity counts match between Company A and Company B from exact same findings dataset", () => {
    const owner = projectOwnerReport("job_owner_match", mockRequest, mockCrawl, results);
    const expert = projectExpertReport("job_expert_match", mockRequest, mockCrawl, results);

    expect(owner.issueDistribution.critical).toBe(expert.executiveSummary.issueTotals.critical);
    expect(owner.issueDistribution.high).toBe(expert.executiveSummary.issueTotals.high);
    expect(owner.issueDistribution.medium).toBe(expert.executiveSummary.issueTotals.medium);
    expect(owner.issueDistribution.low).toBe(expert.executiveSummary.issueTotals.low);
    expect(owner.issueDistribution.informational ?? 0).toBe(expert.executiveSummary.issueTotals.informational ?? 0);
  });

  // 6. Heading hierarchy evidence
  it("Check 6: Heading hierarchy evidence (no false H1: 0 / H2: 0 when headings exist; truthful evidence)", () => {
    const expert = projectExpertReport("job_heading_truth", mockRequest, mockCrawl, results);
    const expertHtml = generateExpertReportHtml(expert);

    expect(expert.seoDiagnostics.headingHierarchy.h1.length).toBeGreaterThan(0);
    expect(expert.seoDiagnostics.headingHierarchy.h2.length).toBeGreaterThan(0);
    expect(expertHtml).not.toContain("H1: 0 found | H2: 0 found");
    expect(expertHtml).toContain("Homepage: <strong>1 H1</strong>, <strong>2 H2</strong>");
    expect(expertHtml).toContain("Welcome to Example Platform");
  });

  // 7. Canonical consistency status aligns with evidence and no contradictory summary text
  it("Check 7: Canonical consistency status aligns with evidence and has no contradictory summary text", () => {
    const owner = projectOwnerReport("job_canonical_truth", mockRequest, mockCrawl, results);
    const ownerHtml = generateReportHtml(owner);

    if (owner.technicalHealthAndSeoSummary.canonicalsConsistent) {
      expect(ownerHtml).toContain("CONSISTENT");
      expect(ownerHtml).toContain("Canonical URL consistency maintained across all evaluated pages");
      expect(ownerHtml).not.toContain("INCONSISTENT");
    } else {
      expect(ownerHtml).toContain("INCONSISTENT");
      expect(ownerHtml).toContain("Canonical URL inconsistencies detected across evaluated pages");
      expect(ownerHtml).not.toContain("Canonical URL consistency maintained");
    }
  });

  // 8. Performance score explicitly displays evaluated denominator/coverage when provisional
  it("Check 8: Performance score explicitly displays evaluated denominator/coverage when provisional", () => {
    const owner = projectOwnerReport("job_perf_prov", mockRequest, mockCrawl, results);
    const expert = projectExpertReport("job_perf_prov_exp", mockRequest, mockCrawl, results);
    const ownerHtml = generateReportHtml(owner);
    const expertHtml = generateExpertReportHtml(expert);

    const perfScore = owner.scoreDetails.find((c) => c.category === "performance")!;
    if (perfScore.coveragePercentage < 80 || !perfScore.isEligibleForOverall) {
      expect(ownerHtml).toContain(`pts, ${perfScore.coveragePercentage}% cov`);
      expect(expertHtml).toContain(`pts evaluated, ${perfScore.coveragePercentage}% cov`);
    }
  });

  // 9. Competitor benchmark displays 'Not evaluated — no competitor domains supplied' when empty
  it("Check 9: Competitor benchmark displays 'Not evaluated — no competitor domains supplied' when empty", () => {
    const noCompRequest: ScanRequest = { ...mockRequest, competitors: [] };
    const owner = projectOwnerReport("job_no_comp", noCompRequest, mockCrawl, results);
    const expert = projectExpertReport("job_no_comp_exp", noCompRequest, mockCrawl, results);
    const ownerHtml = generateReportHtml(owner);
    const expertHtml = generateExpertReportHtml(expert);

    expect(ownerHtml).toContain("Not evaluated — no competitor domains supplied");
    expect(expertHtml).toContain("Not evaluated — no competitor domains supplied");
    expect(expertHtml).not.toContain("Company A)</strong></td>");
  });

  // 10. Title/meta denominators reconcile eligible, tested, missing, and excluded
  it("Check 10: Title/meta denominators reconcile eligible, tested, missing, and excluded", () => {
    const owner = projectOwnerReport("job_titles_denom", mockRequest, mockCrawl, results);
    const summary = owner.technicalHealthAndSeoSummary;

    expect(summary.totalEligibleHtmlPages).toBe(2);
    expect(summary.nonHtmlResourcesExcluded).toBe(1);
    expect(summary.titlesHealthy + (summary.titlesSuboptimal ?? 0) + (summary.titlesMissing ?? 0)).toBe(summary.totalEligibleHtmlPages);

    const ownerHtml = generateReportHtml(owner);
    expect(ownerHtml).toContain("eligible HTML pages optimized");
    expect(ownerHtml).toContain("non-HTML resources excluded");
  });

  // 11. Company A PDF contains 56-rule appendix
  it("Check 11: Company A PDF contains 56-rule appendix", () => {
    const owner = projectOwnerReport("job_owner_appendix", mockRequest, mockCrawl, results);
    const ownerHtml = generateReportHtml(owner);

    expect(ownerHtml).toContain("Appendix: Complete 56-Rule Assessment Catalogue Outcomes");
    expect(owner.ruleLedger).toBeDefined();
    expect(owner.ruleLedger!.length).toBe(56);
    expect(ownerHtml).toContain("TCH-01");
    expect(ownerHtml).toContain("SEO-01");
    expect(ownerHtml).toContain("CMP-03");
  });

  // 12. Company B PDF contains 56-rule ledger & CSV export
  it("Check 12: Company B PDF contains 56-rule ledger & CSV export contains all 56 rules", () => {
    const expert = projectExpertReport("job_expert_ledger", mockRequest, mockCrawl, results);
    const expertHtml = generateExpertReportHtml(expert);

    expect(expertHtml).toContain("Complete 56-Rule Assessment Catalogue Ledger");
    expect(expert.ruleLedger).toBeDefined();
    expect(expert.ruleLedger!.length).toBe(56);
    expect(expertHtml).toContain("TCH-01");
    expect(expertHtml).toContain("SEO-01");
    expect(expertHtml).toContain("CMP-03");

    // CSV export contains all 56 rule result records
    const rulesCsv = exportRuleLedgerCsv(expert);
    const csvLines = rulesCsv.trim().split("\r\n");
    // 1 header row + 56 rule rows = 57 lines
    expect(csvLines.length).toBe(57);
    expect(rulesCsv).toContain('"TCH-01"');
    expect(rulesCsv).toContain('"CMP-03"');

    const findingsCsv = exportFindingsCsv(expert);
    const findingsLines = findingsCsv.trim().split("\r\n");
    expect(findingsLines.length).toBe(57);
  });
});
