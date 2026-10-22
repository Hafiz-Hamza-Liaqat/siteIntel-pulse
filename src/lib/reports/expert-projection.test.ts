import { describe, it, expect } from "vitest";
import { projectExpertReport } from "./expert-projection";
import { ExpertReportSchema } from "@/types";
import { assessmentRegistry } from "../catalogue/registry";
import type { PageObservation, LinkObservation, ResourceObservation, ScanCoverage } from "@/types";

describe("Milestone 2: Expert Report Projection & Schema Invariants", () => {
  const scanRequest = {
    targetUrl: "https://shop.company-a.com",
    platformName: "Company A Storefront",
    businessCategory: "ecommerce" as const,
    targetMarket: "US",
    preferredLanguage: "en",
    competitors: ["competitor1.com", "competitor2.com"],
    maxPages: 10,
    maxDepth: 2,
    enableAuthorizedAudit: true,
    authTestAccount: "test_auditor_account",
    authCredentialsRedacted: "s3cr3t_p@ssw0rd!",
  };

  const sampleLinks: LinkObservation[] = [
    { id: "lnk_1", sourceUrl: "https://shop.company-a.com/", targetUrl: "https://shop.company-a.com/products", isInternal: true, anchorText: "Products", isBroken: false, isRedirect: false },
    { id: "lnk_2", sourceUrl: "https://shop.company-a.com/", targetUrl: "https://shop.company-a.com/broken", isInternal: true, anchorText: "Broken", isBroken: true, isRedirect: false, statusCode: 404 },
  ];

  const sampleResources: ResourceObservation[] = [
    { id: "res_1", url: "https://shop.company-a.com/main.js", type: "script", sizeBytes: 150000, isRenderBlocking: true, isThirdParty: false },
    { id: "res_2", url: "https://shop.company-a.com/hero.jpg", type: "image", sizeBytes: 500000, isRenderBlocking: false, isThirdParty: false },
  ];

  const samplePages: PageObservation[] = [
    {
      id: "pg_1",
      requestedUrl: "https://shop.company-a.com/",
      normalizedUrl: "https://shop.company-a.com/",
      finalUrl: "https://shop.company-a.com/",
      statusCode: 200,
      responseTimeMs: 220,
      contentType: "text/html; charset=UTF-8",
      redirectHistory: [],
      title: "Company A — Premium Online Storefront",
      metaDescription: "Shop the best products online with secure checkout and fast delivery.",
      canonicalCandidate: "https://shop.company-a.com/",
      robotsDirectives: ["index", "follow"],
      headings: {
        h1: ["Company A Official Store"],
        h2: ["Top Sellers", "New Arrivals"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleWordCount: 650,
      language: "en",
      doctype: "html",
      encoding: "UTF-8",
      links: sampleLinks,
      resources: sampleResources,
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Sample Widget",
        },
      ],
      openGraph: { "og:title": "Company A" },
      headers: {
        "content-type": "text/html",
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
      },
      cookieAttributes: [
        { name: "sess_id", secure: true, httpOnly: true, sameSite: "Strict" },
      ],
      templateConfidence: "HIGH",
      discoveredAtDepth: 0,
      discoverySource: "entry",
      consoleErrors: [],
    },
  ];

  const sampleCoverage: ScanCoverage = {
    discoveredPages: 2,
    testedPages: 1,
    skippedPages: 1,
    failedPages: 0,
    inaccessiblePages: 0,
    totalBytesFetched: 650000,
    totalPagesBudget: 10,
    crawlDepthReached: 0,
    externalLinksTested: 0,
    resourcesTested: 2,
    isExhaustive: false,
    weightedPointsEvaluated: 85,
    totalWeightedPoints: 100,
    coveragePercentage: 85,
  };

  const crawlResult = {
    pages: samplePages,
    coverage: sampleCoverage,
    robotsTxt: "User-agent: *\nAllow: /\nDisallow: /admin\nUser-agent: GPTBot\nAllow: /",
    sitemapUrls: ["https://shop.company-a.com/sitemap.xml"],
    externalLinksTested: [],
    discoveredPageUrls: ["https://shop.company-a.com/", "https://shop.company-a.com/products"],
  };

  const evalContext = {
    targetUrl: scanRequest.targetUrl,
    domain: "shop.company-a.com",
    businessCategory: scanRequest.businessCategory,
    pages: crawlResult.pages,
    robotsTxt: crawlResult.robotsTxt,
    sitemapUrls: crawlResult.sitemapUrls,
    externalLinksTested: crawlResult.externalLinksTested,
    competitors: scanRequest.competitors,
  };

  const assessmentResults = assessmentRegistry.evaluateAll(evalContext);

  it("projects a complete ExpertReport matching the 19-section Zod schema", () => {
    const expertReport = projectExpertReport("scan_unit_001", scanRequest, crawlResult, assessmentResults);

    // Schema validation
    const parsed = ExpertReportSchema.safeParse(expertReport);
    expect(parsed.success).toBe(true);

    // Verify key composite sections
    expect(expertReport.metadata.reportId).toBeDefined();
    expect(expertReport.executiveSummary.overallScore.score).toBeGreaterThan(0);
    expect(expertReport.executiveSummary.overallScore.totalPossibleCataloguePoints).toBe(100);
    expect(expertReport.urlInventory.length).toBeGreaterThan(0);
    expect(expertReport.findings.length).toBe(assessmentResults.length);
    expect(expertReport.remediationRegister.length).toBeGreaterThan(0);
  });

  it("strictly redacts credentials and authorization secrets in metadata and export output", () => {
    const expertReport = projectExpertReport("scan_unit_002", scanRequest, crawlResult, assessmentResults);

    // Check metadata serialization does not contain raw password
    const serialized = JSON.stringify(expertReport);
    expect(serialized).not.toContain("s3cr3t_p@ssw0rd!");
    expect(serialized).not.toContain("password");
  });

  it("generates technical findings with structured evidence and reproduction steps", () => {
    const expertReport = projectExpertReport("scan_unit_003", scanRequest, crawlResult, assessmentResults);

    expect(expertReport.findings.length).toBeGreaterThan(0);
    for (const finding of expertReport.findings) {
      expect(finding.id).toMatch(/^EXP-/);
      expect(finding.testId).toBeDefined();
      expect(finding.categoryName).toBeDefined();
      expect(finding.technicalImpact).toBeDefined();
      expect(finding.businessImpact).toBeDefined();
      expect(finding.remediation).toBeDefined();
      expect(finding.validationProcedure).toBeDefined();
      expect(finding.workstream).toBeDefined();

      if (finding.evidence.length > 0) {
        const ev = finding.evidence[0];
        expect(ev.reproductionSteps.length).toBeGreaterThan(0);
        expect(ev.validationAssertion).toBeDefined();
      }
    }
  });

  it("groups actionable tasks into specialist workstreams with effort summaries", () => {
    const expertReport = projectExpertReport("scan_unit_004", scanRequest, crawlResult, assessmentResults);

    expect(expertReport.executiveSummary.workstreamEstimates.length).toBeGreaterThan(0);
    for (const w of expertReport.executiveSummary.workstreamEstimates) {
      expect(["seo", "performance", "security", "accessibility", "analytics", "content", "ai_automation", "engineering"]).toContain(w.workstream);
      expect(w.recommendedSpecialist).toBeDefined();
      expect(w.taskCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("observes robots.txt AI bot policy and populates GEO/AEO diagnostics", () => {
    const expertReport = projectExpertReport("scan_unit_005", scanRequest, crawlResult, assessmentResults);

    expect(expertReport.geoAeoDiagnostics.crawlerPolicies.GPTBot).toBe("Declared");
    expect(expertReport.geoAeoDiagnostics.directAnswerReadiness).toBeDefined();
  });
});
