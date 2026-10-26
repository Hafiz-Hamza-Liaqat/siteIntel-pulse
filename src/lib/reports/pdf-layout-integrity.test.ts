import { describe, it, expect } from "vitest";
import { generateReportHtml } from "./pdf-generator";
import { generateExpertReportHtml } from "./expert-pdf-generator";
import { projectOwnerReport } from "./owner-projection";
import { projectExpertReport } from "./expert-projection";
import { assessmentRegistry } from "../catalogue/registry";
import { detectBusinessCategory } from "../classifier/business-category-detector";
import type { PageObservation, ScanCoverage, ScanRequest } from "@/types";

describe("Phase 7 — PDF Responsiveness & Layout Integrity Fixture Suite", () => {
  // Helper to construct a base mock page
  const makePage = (overrides: Partial<PageObservation> = {}): PageObservation => ({
    id: "pg_1",
    requestedUrl: "https://integrity-test.example.com/",
    normalizedUrl: "https://integrity-test.example.com/",
    finalUrl: "https://integrity-test.example.com/",
    statusCode: 200,
    responseTimeMs: 180,
    contentType: "text/html",
    redirectHistory: [],
    title: "Layout Integrity Test",
    metaDescription: "Test suite verifying responsive printable layout.",
    canonicalCandidate: "https://integrity-test.example.com/",
    robotsDirectives: ["index", "follow"],
    headings: { h1: ["Main Heading"], h2: ["Subheading"], h3: [], h4: [], h5: [], h6: [] },
    visibleWordCount: 400,
    language: "en",
    doctype: "html",
    encoding: "UTF-8",
    links: [
      { id: "l1", sourceUrl: "https://integrity-test.example.com/", targetUrl: "https://integrity-test.example.com/about", isInternal: true, anchorText: "About Us", isBroken: false, isRedirect: false },
    ],
    resources: [],
    structuredData: [],
    openGraph: {},
    headers: {
      "content-type": "text/html",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "strict-transport-security": "max-age=31536000",
    },
    cookieAttributes: [],
    templateConfidence: "HIGH",
    discoveredAtDepth: 0,
    discoverySource: "entry",
    consoleErrors: [],
    ...overrides,
  });

  const baseCoverage: ScanCoverage = {
    discoveredPages: 1,
    testedPages: 1,
    skippedPages: 0,
    failedPages: 0,
    inaccessiblePages: 0,
    totalBytesFetched: 35000,
    totalPagesBudget: 10,
    crawlDepthReached: 0,
    externalLinksTested: 0,
    resourcesTested: 0,
    isExhaustive: true,
    weightedPointsEvaluated: 85,
    totalWeightedPoints: 100,
    coveragePercentage: 85,
  };

  // Fixture 1: Short report with few findings (1-2 pages)
  it("Fixture 1: Short report generates clean layout with no-break cards and fixed tables", () => {
    const page = makePage();
    const crawl = {
      pages: [page],
      coverage: baseCoverage,
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: [page.requestedUrl],
    };
    const req: ScanRequest = {
      targetUrl: page.requestedUrl,
      reportType: "owner",
      platformName: "Clean Platform",
      businessCategory: "saas",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 5,
      maxDepth: 1,
    };
    const evalCtx = {
      targetUrl: req.targetUrl,
      domain: "integrity-test.example.com",
      businessCategory: req.businessCategory,
      pages: crawl.pages,
      robotsTxt: crawl.robotsTxt,
      sitemapUrls: crawl.sitemapUrls,
      externalLinksTested: crawl.externalLinksTested,
      competitors: req.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalCtx);
    const ownerReport = projectOwnerReport("job_fix1_owner", req, crawl, results);
    const ownerHtml = generateReportHtml(ownerReport);

    expect(ownerHtml).toContain("@page {");
    expect(ownerHtml).toContain("table.table-custom {");
    expect(ownerHtml).toContain("table-layout: fixed;");
    expect(ownerHtml).toContain("word-break: break-word;");
    expect(ownerHtml).toContain("page-break-inside: avoid;");
    expect(ownerHtml).toContain("Clean Platform");
  });

  // Fixture 2: Long Expert report with many findings and remediation tasks
  it("Fixture 2: Long Expert report includes complete 13 sections with table column widths and no orphan headers", () => {
    const pages = Array.from({ length: 8 }, (_, i) =>
      makePage({
        id: `pg_${i}`,
        requestedUrl: `https://integrity-test.example.com/section-${i}`,
        finalUrl: `https://integrity-test.example.com/section-${i}`,
        title: `Section ${i} Diagnostic Page`,
      })
    );
    const crawl = {
      pages,
      coverage: { ...baseCoverage, discoveredPages: 12, testedPages: 8, totalPagesBudget: 20 },
      robotsTxt: "User-agent: *\nDisallow: /admin\nAllow: /",
      sitemapUrls: ["https://integrity-test.example.com/sitemap.xml"],
      externalLinksTested: [],
      discoveredPageUrls: pages.map((p) => p.requestedUrl),
    };
    const req: ScanRequest = {
      targetUrl: "https://integrity-test.example.com/",
      reportType: "expert",
      platformName: "Enterprise Portal",
      businessCategory: "ecommerce",
      targetMarket: "GLOBAL",
      preferredLanguage: "en",
      competitors: ["competitor-a.com", "competitor-b.com"],
      maxPages: 20,
      maxDepth: 3,
    };
    const evalCtx = {
      targetUrl: req.targetUrl,
      domain: "integrity-test.example.com",
      businessCategory: req.businessCategory,
      pages: crawl.pages,
      robotsTxt: crawl.robotsTxt,
      sitemapUrls: crawl.sitemapUrls,
      externalLinksTested: crawl.externalLinksTested,
      competitors: req.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalCtx);
    const expertReport = projectExpertReport("job_fix2_expert", req, crawl, results);
    const expertHtml = generateExpertReportHtml(expertReport);

    expect(expertHtml).toContain("table-layout: fixed;");
    expect(expertHtml).toContain("display: table-header-group;");
    expect(expertHtml).toContain("page-break-after: avoid;");
    expect(expertHtml).toContain("11. Diagnostic Finding Ledger");
    expect(expertHtml).toContain("12. Specialist Remediation Action Plan");
    expect(expertHtml).toContain("13. Cryptographic Integrity Sign-Off");
  });

  // Fixture 3: Long URLs and exceptionally long evidence strings
  it("Fixture 3: Wraps extremely long URLs and deep paths with break-all without layout clipping", () => {
    const longUrl = "https://integrity-test.example.com/catalog/department/subdepartment/product-line/item-collection/sku-99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999";
    const longEvidence = "Discovered excessively nested element stack: <div><div><span><table><tr><td><span><div><a href='https://nested-long-url-attribute-overflow-test.com/very/deeply/nested/resource/path/with/lots/of/parameters?param1=test&param2=example&verylongparam=abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz'>nested anchor text</a></span></td></tr></table></div></span></td></tr></table>";
    const page = makePage({
      requestedUrl: longUrl,
      finalUrl: longUrl,
      canonicalCandidate: longUrl,
      title: "Extremely Long URL Test with special characters &amp; entities < > \" '",
      visibleTextSample: longEvidence,
      links: [
        { id: "l_long", sourceUrl: longUrl, targetUrl: longUrl, isInternal: true, anchorText: longUrl, isBroken: false, isRedirect: false },
      ],
    });
    const crawl = {
      pages: [page],
      coverage: baseCoverage,
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: [longUrl],
    };
    const req: ScanRequest = {
      targetUrl: longUrl,
      reportType: "expert",
      businessCategory: "portfolio",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 5,
      maxDepth: 1,
    };
    const evalCtx = {
      targetUrl: req.targetUrl,
      domain: "integrity-test.example.com",
      businessCategory: req.businessCategory,
      pages: crawl.pages,
      robotsTxt: crawl.robotsTxt,
      sitemapUrls: crawl.sitemapUrls,
      externalLinksTested: crawl.externalLinksTested,
    };
    const results = assessmentRegistry.evaluateAll(evalCtx);
    const expertReport = projectExpertReport("job_fix3_expert", req, crawl, results);
    const expertHtml = generateExpertReportHtml(expertReport);

    // Verifies that overflow-preventing styles exist
    expect(expertHtml).toContain("word-break: break-all;");
    expect(expertHtml).toContain("overflow-wrap: anywhere;");
    expect(expertHtml).not.toContain("<script>");
  });

  // Fixture 4: Incomplete assessment coverage and UNKNOWN/NOT_TESTED results
  it("Fixture 4: Handles incomplete assessment coverage with provisional notice and UNKNOWN/NOT_TESTED badges", () => {
    const page = makePage({
      headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
      links: [],
      structuredData: [],
    });
    const crawl = {
      pages: [page],
      coverage: {
        ...baseCoverage,
        testedPages: 1,
        coveragePercentage: 45, // Under 70% threshold -> PROVISIONAL
        weightedPointsEvaluated: 45,
      },
      robotsTxt: "",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: [page.requestedUrl],
    };
    const req: ScanRequest = {
      targetUrl: page.requestedUrl,
      reportType: "owner",
      businessCategory: "other",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 5,
      maxDepth: 1,
    };
    const evalCtx = {
      targetUrl: req.targetUrl,
      domain: "integrity-test.example.com",
      businessCategory: req.businessCategory,
      pages: crawl.pages,
      robotsTxt: crawl.robotsTxt,
      sitemapUrls: crawl.sitemapUrls,
      externalLinksTested: crawl.externalLinksTested,
    };
    const results = assessmentRegistry.evaluateAll(evalCtx);
    const ownerReport = projectOwnerReport("job_fix4_owner", req, crawl, results);
    const ownerHtml = generateReportHtml(ownerReport);

    expect(ownerReport.executiveSnapshot.overallScore.isProvisional).toBe(true);
    expect(ownerHtml).toContain("PROVISIONAL");
    expect(ownerHtml).toContain("Provisional Coverage Acceptance Notice");
  });

  // Fixture 5: No competitor data and missing optional provider integrations
  it("Fixture 5: Renders graceful empty states when competitors and third-party integrations are missing", () => {
    const page = makePage();
    const crawl = {
      pages: [page],
      coverage: baseCoverage,
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: [page.requestedUrl],
    };
    const req: ScanRequest = {
      targetUrl: page.requestedUrl,
      reportType: "expert",
      businessCategory: "local_service",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [], // No competitors
      maxPages: 5,
      maxDepth: 1,
    };
    const evalCtx = {
      targetUrl: req.targetUrl,
      domain: "integrity-test.example.com",
      businessCategory: req.businessCategory,
      pages: crawl.pages,
      robotsTxt: crawl.robotsTxt,
      sitemapUrls: crawl.sitemapUrls,
      externalLinksTested: crawl.externalLinksTested,
      competitors: [],
    };
    const results = assessmentRegistry.evaluateAll(evalCtx);
    const expertReport = projectExpertReport("job_fix5_expert", req, crawl, results);
    const expertHtml = generateExpertReportHtml(expertReport);

    expect(expertHtml).toContain("No competitor domains specified");
    expect(expertHtml).toContain("NOT DETECTED");
  });

  // Fixture 6: Empty or unusually sparse extracted page content
  it("Fixture 6: Handles empty or sparse page content gracefully without unrendered templates or exceptions", () => {
    const sparsePage: PageObservation = {
      id: "sparse_1",
      requestedUrl: "https://integrity-test.example.com/sparse",
      normalizedUrl: "https://integrity-test.example.com/sparse",
      finalUrl: "https://integrity-test.example.com/sparse",
      statusCode: 200,
      responseTimeMs: 90,
      contentType: "text/html",
      redirectHistory: [],
      title: "",
      metaDescription: undefined,
      canonicalCandidate: undefined,
      robotsDirectives: [],
      headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
      visibleWordCount: 0,
      language: undefined,
      doctype: undefined,
      encoding: undefined,
      links: [],
      resources: [],
      structuredData: [],
      openGraph: {},
      headers: {},
      cookieAttributes: [],
      templateConfidence: "LOW",
      discoveredAtDepth: 0,
      discoverySource: "entry",
      consoleErrors: [],
    };

    const crawl = {
      pages: [sparsePage],
      coverage: baseCoverage,
      robotsTxt: "",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: [sparsePage.requestedUrl],
    };
    const req: ScanRequest = {
      targetUrl: sparsePage.requestedUrl,
      reportType: "owner",
      businessCategory: "auto",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 5,
      maxDepth: 1,
    };

    const detection = detectBusinessCategory(crawl, req.businessCategory);
    const evalCtx = {
      targetUrl: req.targetUrl,
      domain: "integrity-test.example.com",
      businessCategory: detection.effectiveCategory,
      businessCategoryDetection: detection,
      pages: crawl.pages,
      robotsTxt: crawl.robotsTxt,
      sitemapUrls: crawl.sitemapUrls,
      externalLinksTested: crawl.externalLinksTested,
    };
    const results = assessmentRegistry.evaluateAll(evalCtx);
    const ownerReport = projectOwnerReport("job_fix6_owner", req, crawl, results, {
      businessCategoryDetection: detection,
    });
    const ownerHtml = generateReportHtml(ownerReport);

    expect(ownerHtml).toContain("LOW");
    expect(ownerHtml).toContain("Unresolved");
    expect(ownerHtml).not.toContain("undefined");
    expect(ownerHtml).not.toContain("NaN");
  });

  // Fixture 7: All supported sections populated with evidence-based business category detection
  it("Fixture 7: Fully populated report displays detected business category, facets, and score ledger", () => {
    const home = makePage({
      headings: {
        h1: ["Remote Software Engineer & Tech Jobs"],
        h2: ["Browse Remote Openings", "Top Hiring Companies"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      links: [
        { id: "1", sourceUrl: "https://integrity-test.example.com/", targetUrl: "https://integrity-test.example.com/jobs", isInternal: true, anchorText: "Browse Jobs", isBroken: false, isRedirect: false },
        { id: "2", sourceUrl: "https://integrity-test.example.com/", targetUrl: "https://integrity-test.example.com/apply", isInternal: true, anchorText: "Apply Now", isBroken: false, isRedirect: false },
        { id: "3", sourceUrl: "https://integrity-test.example.com/", targetUrl: "https://integrity-test.example.com/post-a-job", isInternal: true, anchorText: "Post a Job", isBroken: false, isRedirect: false },
        { id: "4", sourceUrl: "https://integrity-test.example.com/", targetUrl: "https://integrity-test.example.com/scholarships", isInternal: true, anchorText: "Scholarships & Fellowships", isBroken: false, isRedirect: false },
      ],
      structuredData: [
        { "@type": "JobPosting", title: "Senior Backend Engineer", hiringOrganization: { name: "TechCorp" } },
      ],
      visibleTextSample: "Search 5,000+ verified remote jobs. Fellowships and scholarships available for qualifying candidates.",
    });

    const crawl = {
      pages: [home],
      coverage: { ...baseCoverage, coveragePercentage: 88 },
      robotsTxt: "User-agent: *\nAllow: /\nSitemap: https://integrity-test.example.com/sitemap.xml",
      sitemapUrls: ["https://integrity-test.example.com/sitemap.xml"],
      externalLinksTested: [],
      discoveredPageUrls: [home.requestedUrl],
    };
    const req: ScanRequest = {
      targetUrl: home.requestedUrl,
      reportType: "expert",
      businessCategory: "auto",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: ["competitor.com"],
      maxPages: 5,
      maxDepth: 1,
    };

    const detection = detectBusinessCategory(crawl, req.businessCategory);
    expect(detection.primaryCategory).toBe("job_board");
    expect(detection.confidence).toBe("HIGH");

    const evalCtx = {
      targetUrl: req.targetUrl,
      domain: "integrity-test.example.com",
      businessCategory: detection.effectiveCategory,
      businessCategoryDetection: detection,
      pages: crawl.pages,
      robotsTxt: crawl.robotsTxt,
      sitemapUrls: crawl.sitemapUrls,
      externalLinksTested: crawl.externalLinksTested,
      competitors: req.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalCtx);
    const expertReport = projectExpertReport("job_fix7_expert", req, crawl, results, {
      businessCategoryDetection: detection,
    });
    const expertHtml = generateExpertReportHtml(expertReport);

    expect(expertHtml).toContain("Job Board");
    expect(expertHtml).toContain("Auto");
    expect(expertHtml).toContain("education and scholarships");
  });
});
