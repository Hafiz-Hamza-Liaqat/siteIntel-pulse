import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { projectOwnerReport } from "./owner-projection";
import { projectExpertReport } from "./expert-projection";
import { exportFindingsCsv, exportManifestJson } from "./expert-export";
import { parsePageHtml } from "../scanner/html-parser";
import { assessmentRegistry } from "../catalogue/registry";
import { isAuthUrl } from "../catalogue/rules/auth";
import { parseRobotsForAi } from "../catalogue/rules/ai";
import {
  computeCanonicalReportDigest,
  verifyReportDigest,
  computePdfDigest,
} from "./manifest-integrity";
import {
  ScanRequest,
  PageObservation,
  LinkObservation,
  ResourceObservation,
  ScanCoverage,
  ExpertReportSchema,
  OwnerReportSchema,
} from "@/types";

describe("Milestone 3 & 4 Evidence Integrity & Business-Model Calibration", () => {
  const baseCoverage: ScanCoverage = {
    discoveredPages: 5,
    testedPages: 3,
    skippedPages: 2,
    failedPages: 0,
    inaccessiblePages: 0,
    totalBytesFetched: 450000,
    totalPagesBudget: 50,
    crawlDepthReached: 1,
    externalLinksTested: 0,
    resourcesTested: 5,
    isExhaustive: false,
    weightedPointsEvaluated: 90,
    totalWeightedPoints: 100,
    coveragePercentage: 90,
  };

  const sampleHtmlPage: PageObservation = {
    id: "pg_home",
    requestedUrl: "https://www.caferemote.com/",
    normalizedUrl: "https://www.caferemote.com/",
    finalUrl: "https://www.caferemote.com/",
    statusCode: 200,
    responseTimeMs: 240,
    contentType: "text/html; charset=UTF-8",
    redirectHistory: [],
    title: "Remote Jobs — Hand-Checked, Updated Daily | CafeRemote",
    metaDescription: "Find hand-curated remote jobs you can do from anywhere. Browse engineering, design, marketing and support roles.",
    canonicalCandidate: "https://www.caferemote.com/",
    robotsDirectives: ["index", "follow"],
    headings: {
      h1: ["4,539 remote jobs you can do from anywhere"],
      h2: ["Browse by Role", "Latest Remote Jobs"],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
    },
    visibleWordCount: 850,
    visibleTextSample: "4,539 remote jobs you can do from anywhere. Search by title, keyword, or company.",
    language: "en",
    doctype: "html5",
    encoding: "UTF-8",
    links: [
      { id: "lnk_1", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/jobs/account-executive", isInternal: true, anchorText: "Account Executive (Remote)", isBroken: false, isRedirect: false },
      { id: "lnk_2", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/jobs/senior-accountant", isInternal: true, anchorText: "Senior Accountant", isBroken: false, isRedirect: false },
      { id: "lnk_3", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/post-a-job", isInternal: true, anchorText: "Post a Job", isBroken: false, isRedirect: false },
      { id: "lnk_4", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/pricing", isInternal: true, anchorText: "Pricing & Plans", isBroken: false, isRedirect: false },
      { id: "lnk_5", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/about", isInternal: true, anchorText: "About CafeRemote", isBroken: false, isRedirect: false },
      { id: "lnk_6", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/privacy", isInternal: true, anchorText: "Privacy Policy", isBroken: false, isRedirect: false },
      { id: "lnk_7", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/terms", isInternal: true, anchorText: "Terms of Service", isBroken: false, isRedirect: false },
    ],
    resources: [],
    structuredData: [
      { "@context": "https://schema.org", "@type": "JobPosting", title: "Remote Account Executive", description: "Full-time role" },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [] },
    ],
    openGraph: { "og:title": "CafeRemote" },
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "strict-transport-security": "max-age=31536000; includeSubDomains",
    },
    cookieAttributes: [], // No cookies observed on initial response
    pageTemplateGuess: "homepage",
    templateConfidence: "HIGH",
    discoveredAtDepth: 0,
    discoverySource: "entry",
    consoleErrors: [],
    isXmlSitemap: false,
    documentType: "html",
  };

  const xmlSitemapPage: PageObservation = {
    id: "pg_sitemap",
    requestedUrl: "https://www.caferemote.com/sitemap.xml",
    normalizedUrl: "https://www.caferemote.com/sitemap.xml",
    finalUrl: "https://www.caferemote.com/sitemap.xml",
    statusCode: 200,
    responseTimeMs: 180,
    contentType: "application/xml; charset=UTF-8",
    redirectHistory: [],
    robotsDirectives: [],
    headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
    visibleWordCount: 0,
    links: [],
    resources: [],
    structuredData: [],
    openGraph: {},
    headers: { "content-type": "application/xml" },
    cookieAttributes: [],
    pageTemplateGuess: "other",
    templateConfidence: "HIGH",
    discoveredAtDepth: 1,
    discoverySource: "sitemap",
    consoleErrors: [],
    isXmlSitemap: true,
    documentType: "xml_sitemap",
  };

  const scanRequest: ScanRequest = {
    targetUrl: "https://www.caferemote.com/",
    reportType: "expert",
    platformName: "CafeRemote",
    businessCategory: "job_board",
    targetMarket: "US",
    preferredLanguage: "en",
    competitors: ["weworkremotely.com", "remoteok.com"],
    maxPages: 10,
    maxDepth: 2,
  };

  const crawlResult = {
    pages: [sampleHtmlPage, xmlSitemapPage],
    coverage: baseCoverage,
    robotsTxt: "User-agent: *\nDisallow: /admin\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nSitemap: https://www.caferemote.com/sitemap.xml",
    sitemapUrls: ["https://www.caferemote.com/sitemap.xml"],
    externalLinksTested: [],
    discoveredPageUrls: ["https://www.caferemote.com/", "https://www.caferemote.com/sitemap.xml"],
  };

  // 1. Missing PageSpeed/CrUX provider cannot generate fabricated performance or field metrics
  it("1. Missing PageSpeed/CrUX provider cannot generate fabricated performance or field metrics", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: crawlResult.pages,
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: crawlResult.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    // Expert report without provider connection
    const expert = projectExpertReport("scan_test_1", scanRequest, crawlResult, results);
    expect(expert.performanceDiagnostics.labScores.mobile).toBeNull();
    expect(expert.performanceDiagnostics.labScores.desktop).toBeNull();
    expect(expert.performanceDiagnostics.coreWebVitals.fcp).toBeNull();
    expect(expert.performanceDiagnostics.coreWebVitals.lcp).toBeNull();
    expect(expert.performanceDiagnostics.coreWebVitals.cls).toBeNull();
    expect(expert.performanceDiagnostics.coreWebVitals.inp).toBeNull();
    expect(expert.performanceDiagnostics.labScores.status).toBe("NOT_CONNECTED");
    expect(expert.performanceDiagnostics.coreWebVitals.status).toBe("NOT_CONNECTED");

    // Owner report without provider connection
    const owner = projectOwnerReport("scan_test_1_o", { ...scanRequest, reportType: "owner" }, crawlResult, results);
    expect(owner.performanceAndResponsiveSummary.mobileLabScore).toBeNull();
    expect(owner.performanceAndResponsiveSummary.desktopLabScore).toBeNull();
    expect(owner.performanceAndResponsiveSummary.coreWebVitalsStatus).toContain("NOT_CONNECTED");
  });

  // 2. Responsive results originate from actual browser measurements, and skipped tests are reported as not tested
  it("2. Responsive results originate from actual browser measurements, and skipped tests are reported as not tested", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: crawlResult.pages,
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: crawlResult.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    // Passive crawl with NO browser runner executed
    const expertPassive = projectExpertReport("scan_test_2a", scanRequest, crawlResult, results);
    expect(expertPassive.responsiveDiagnostics).toEqual([]);

    const ownerPassive = projectOwnerReport("scan_test_2b", { ...scanRequest, reportType: "owner" }, crawlResult, results);
    expect(ownerPassive.performanceAndResponsiveSummary.testedViewports).toEqual([]);

    // With explicit browser measurements
    const actualBrowserResults = [
      {
        viewport: 390,
        pageUrl: scanRequest.targetUrl,
        status: "TESTED" as const,
        horizontalOverflow: false,
        overflowElements: [],
        touchTargetIssues: 0,
        touchTargetSelectors: [],
        clippingIssues: 0,
        accessibleNameIssues: 0,
        screenshotAvailable: false,
        severity: "INFORMATIONAL" as const,
      },
      {
        viewport: 1280,
        pageUrl: scanRequest.targetUrl,
        status: "SKIPPED" as const,
        horizontalOverflow: false,
        overflowElements: [],
        touchTargetIssues: 0,
        touchTargetSelectors: [],
        clippingIssues: 0,
        accessibleNameIssues: 0,
        screenshotAvailable: false,
        severity: "INFORMATIONAL" as const,
        notes: "Viewport skipped by configuration budget",
      },
    ];

    const expertActive = projectExpertReport("scan_test_2c", scanRequest, crawlResult, results, {
      browserResponsiveResults: actualBrowserResults,
    });
    expect(expertActive.responsiveDiagnostics.length).toBe(2);
    expect(expertActive.responsiveDiagnostics[0].status).toBe("TESTED");
    expect(expertActive.responsiveDiagnostics[1].status).toBe("SKIPPED");

    const ownerActive = projectOwnerReport("scan_test_2d", { ...scanRequest, reportType: "owner" }, crawlResult, results, undefined, {
      browserResponsiveResults: actualBrowserResults,
    });
    // Only tested viewports are counted as tested in Owner summary
    expect(ownerActive.performanceAndResponsiveSummary.testedViewports).toEqual([390]);
  });

  // 3. Competitor metrics remain unavailable until a real comparison has been executed
  it("3. Competitor metrics remain unavailable until a real comparison has been executed", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: crawlResult.pages,
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: crawlResult.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    const expert = projectExpertReport("scan_test_3a", scanRequest, crawlResult, results);
    expect(expert.competitorComparisons.length).toBe(2);
    for (const comp of expert.competitorComparisons) {
      expect(comp.status).toBe("NOT_ASSESSED");
      expect(comp.overallScore).toBeNull();
      expect(comp.categoryScores).toBeUndefined();
      expect(comp.dataProvenance).toContain("No comparable scan executed");
    }

    const owner = projectOwnerReport("scan_test_3b", { ...scanRequest, reportType: "owner" }, crawlResult, results);
    expect(owner.competitorSnapshot.length).toBe(2);
    for (const comp of owner.competitorSnapshot) {
      expect(comp.status).toBe("NOT_ASSESSED");
      expect(comp.overallScore).toBeNull();
      expect(comp.keyMetrics.technicalHealthScore).toBeNull();
      expect(comp.keyMetrics.seoScore).toBeNull();
      expect(comp.keyMetrics.performanceScore).toBeNull();
    }
  });

  // 4. Findings identify the actual failing URL/resource and have meaningful remediation text
  it("4. Findings identify the actual failing URL/resource and have meaningful remediation text", () => {
    const pageWithFails: PageObservation = {
      ...sampleHtmlPage,
      id: "pg_fail_seo",
      requestedUrl: "https://www.caferemote.com/jobs/missing-title",
      normalizedUrl: "https://www.caferemote.com/jobs/missing-title",
      finalUrl: "https://www.caferemote.com/jobs/missing-title",
      title: "", // Fails SEO-01
      metaDescription: "", // Fails SEO-02
    };

    const testCrawl = {
      ...crawlResult,
      pages: [sampleHtmlPage, pageWithFails],
    };

    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: testCrawl.pages,
      robotsTxt: testCrawl.robotsTxt,
      sitemapUrls: testCrawl.sitemapUrls,
      externalLinksTested: testCrawl.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);
    const expert = projectExpertReport("scan_test_4", scanRequest, testCrawl, results);

    expect(expert.findings.length).toBeGreaterThan(0);
    const failingFindingsWithUrls = expert.findings.filter((f) => f.affectedUrls.length > 0);
    expect(failingFindingsWithUrls.length).toBeGreaterThan(0);
    expect(failingFindingsWithUrls.some((f) => f.affectedUrls.includes("https://www.caferemote.com/jobs/missing-title"))).toBe(true);

    for (const f of expert.findings) {
      // Must not use generic placeholder text
      expect(f.remediation).not.toContain("Follow documented remediation procedures for this test rule.");
      expect(f.remediation.length).toBeGreaterThan(15);
      if (f.affectedUrls.length > 0) {
        expect(f.affectedUrls.every((u) => u.startsWith("http"))).toBe(true);
      }
    }
  });

  // 5. XML sitemaps are excluded from HTML-only page diagnostics
  it("5. XML sitemaps are excluded from HTML-only page diagnostics", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: [sampleHtmlPage, xmlSitemapPage],
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: [],
      competitors: [],
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    // SEO-01 (Title) must not fail because of the XML sitemap
    const seo01 = results.find((r) => r.testId === "SEO-01")!;
    expect(seo01.status).toBe("PASS");

    // SEO-03 (H1) must not fail because of the XML sitemap
    const seo03 = results.find((r) => r.testId === "SEO-03")!;
    expect(seo03.status).toBe("PASS");

    // SEO-04 (Canonical) must not fail because of the XML sitemap
    const seo04 = results.find((r) => r.testId === "SEO-04")!;
    expect(seo04.status).toBe("PASS");

    // SEO-09 (Thin content) must not fail because of the XML sitemap
    const seo09 = results.find((r) => r.testId === "SEO-09")!;
    expect(seo09.status).toBe("PASS");
  });

  // 6. A homepage with a valid H1 does not falsely fail heading extraction
  it("6. A homepage with a valid H1 does not falsely fail heading extraction", () => {
    const cafeRemoteHomepageHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Remote Jobs — Hand-Checked, Updated Daily | CafeRemote</title>
          <meta name="description" content="Browse thousands of hand-checked remote jobs from anywhere.">
        </head>
        <body>
          <header>
            <h1 class="text-4xl font-extrabold leading-tight tracking-tight text-navy-900 lg:text-5xl">
                4,539 remote jobs you can do
                <span class="relative whitespace-nowrap">
                    <span class="relative z-10">from anywhere</span>
                    <span class="absolute -bottom-0.5 left-0 z-0 h-2 w-full rounded-full bg-coral-200"></span>
                </span>
            </h1>
          </header>
          <main>
            <h2>Featured Categories</h2>
            <p>Remote software engineering, design, marketing, and customer support.</p>
          </main>
        </body>
      </html>
    `;

    const parsed = parsePageHtml(cafeRemoteHomepageHtml, "https://www.caferemote.com/");
    expect(parsed.headings.h1.length).toBe(1);
    expect(parsed.headings.h1[0]).toBe("4,539 remote jobs you can do from anywhere");

    const evalContext = {
      targetUrl: "https://www.caferemote.com/",
      domain: "www.caferemote.com",
      businessCategory: "job_board" as const,
      pages: [parsed],
      robotsTxt: "",
      sitemapUrls: [],
      externalLinksTested: [],
      competitors: [],
    };
    const results = assessmentRegistry.evaluateAll(evalContext);
    const seo03 = results.find((r) => r.testId === "SEO-03")!;
    expect(seo03.status).toBe("PASS");
  });

  // 7. Job-title URLs containing “account” are not classified as login routes
  it("7. Job-title URLs containing 'account' are not classified as login routes", () => {
    expect(isAuthUrl("https://www.caferemote.com/jobs/account-executive")).toBe(false);
    expect(isAuthUrl("https://www.caferemote.com/jobs/senior-accountant")).toBe(false);
    expect(isAuthUrl("https://www.caferemote.com/careers/key-account-manager")).toBe(false);
    expect(isAuthUrl("https://www.caferemote.com/blog/how-to-manage-accounts")).toBe(false);

    // Genuine auth URLs must be recognized
    expect(isAuthUrl("https://www.caferemote.com/login")).toBe(true);
    expect(isAuthUrl("https://www.caferemote.com/signin")).toBe(true);
    expect(isAuthUrl("https://www.caferemote.com/account/login")).toBe(true);
    expect(isAuthUrl("https://www.caferemote.com/user/login")).toBe(true);
    expect(isAuthUrl("https://www.caferemote.com/account")).toBe(true);

    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: [sampleHtmlPage],
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: [],
      competitors: [],
    };
    const results = assessmentRegistry.evaluateAll(evalContext);
    const expert = projectExpertReport("scan_test_7", scanRequest, crawlResult, results);
    const authSurfaces = expert.authenticationAssessment.publicLoginSurfaces;
    expect(authSurfaces.some((s) => s.url.includes("account-executive"))).toBe(false);
    expect(authSurfaces.some((s) => s.url.includes("senior-accountant"))).toBe(false);
  });

  // 8. No observed cookie yields unknown attributes, rather than assumed security flags
  it("8. No observed cookie yields unknown attributes, rather than assumed security flags", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: [sampleHtmlPage], // zero cookies in sampleHtmlPage
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: [],
      competitors: [],
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    // Rule AUTH-03 must return UNKNOWN when no cookies were observed
    const auth03 = results.find((r) => r.testId === "AUTH-03")!;
    expect(auth03.status).toBe("UNKNOWN");
    expect(auth03.summary).toContain("unknown");

    // Expert report session security must report null/unknown flags, not assumed true
    const expert = projectExpertReport("scan_test_8", scanRequest, crawlResult, results);
    expect(expert.authenticationAssessment.sessionSecurity.cookieSecure).toBeNull();
    expect(expert.authenticationAssessment.sessionSecurity.cookieHttpOnly).toBeNull();
    expect(expert.authenticationAssessment.sessionSecurity.cookieSameSite).toBeNull();
    expect(expert.authenticationAssessment.sessionSecurity.status).toBe("NO_COOKIES_OBSERVED");
  });

  // 9. The job-board category produces relevant search/application conversion checks and Owner recommendations
  it("9. The job-board category produces relevant search/application conversion checks and Owner recommendations", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: "job_board" as const,
      pages: [sampleHtmlPage],
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: [],
      competitors: [],
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    // CRO-02 must recognize job board conversion pathways
    const cro02 = results.find((r) => r.testId === "CRO-02")!;
    expect(cro02.status).toBe("PASS");
    expect(cro02.title).toContain("Job Search / Application");

    // CRO-04 must recognize employer pricing / terms
    const cro04 = results.find((r) => r.testId === "CRO-04")!;
    expect(cro04.status).toBe("PASS");

    // Owner report recommendations must be calibrated for job boards when opportunities are triggered
    const mockPerfFail = {
      testId: "PERF-01",
      testVersion: "1.0.0",
      testName: "Mobile Lab Score",
      category: "performance" as const,
      status: "WARNING" as const,
      severity: "MEDIUM" as const,
      maxPoints: 2,
      earnedPoints: 1,
      title: "Mobile Lab Score Needs Improvement",
      summary: "Mobile lab score is moderate.",
      timestamp: new Date().toISOString(),
      confidence: "HIGH" as const,
    };
    const owner = projectOwnerReport(
      "scan_test_9",
      { ...scanRequest, businessCategory: "job_board", reportType: "owner" },
      crawlResult,
      [...results, mockPerfFail]
    );
    const perfOpp = owner.executiveSnapshot.topOpportunities.find((o) => o.id === "opp_perf")!;
    expect(perfOpp.businessImpact).toContain("job application conversions");
    expect(perfOpp.businessImpact).not.toContain("checkout conversions");
  });

  // 10. Score, coverage, issue counts, manifest integrity and export contents remain internally consistent
  it("10. Score, coverage, issue counts, manifest integrity and export contents remain internally consistent", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: crawlResult.pages,
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: crawlResult.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);
    const expert = projectExpertReport("scan_test_10", scanRequest, crawlResult, results);

    // Zod schema validation
    const parsed = ExpertReportSchema.safeParse(expert);
    expect(parsed.success).toBe(true);

    // Issue count consistency
    const issues = expert.executiveSummary.issueTotals;
    const computedTotal = issues.critical + issues.high + issues.medium + issues.low;
    expect(issues.total).toBe(computedTotal);

    // Manifest SHA-256 integrity check
    expect(expert.exportManifest.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    const verification = verifyReportDigest(expert);
    expect(verification.isValid).toBe(true);
    expect(expert.exportManifest.checksum).toBe(verification.expectedChecksum);

    // CSV export consistency
    const csv = exportFindingsCsv(expert);
    const lines = csv.trim().split("\r\n");
    expect(lines.length).toBe(expert.findings.length + 1); // Header + all findings

    // Manifest JSON export
    const manifestJsonStr = exportManifestJson(expert);
    const manifestJson = JSON.parse(manifestJsonStr);
    expect(manifestJson.summaryStats.totalFindings).toBe(expert.findings.length);
  });

  // 11. The report generator never emits placeholder remediation instructions as final expert guidance
  it("11. The report generator never emits placeholder remediation instructions as final expert guidance", () => {
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: crawlResult.pages,
      robotsTxt: crawlResult.robotsTxt,
      sitemapUrls: crawlResult.sitemapUrls,
      externalLinksTested: crawlResult.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);
    const expert = projectExpertReport("scan_test_11", scanRequest, crawlResult, results);

    for (const finding of expert.findings) {
      expect(finding.remediation).not.toBe("");
      expect(finding.remediation).not.toContain("Follow documented remediation procedures for this test rule.");
      expect(finding.remediation.toLowerCase()).not.toContain("placeholder remediation");
      expect(finding.remediation.toLowerCase()).not.toContain("placeholder guidance");
      expect(finding.validationProcedure).not.toBe("");
    }

    for (const task of expert.remediationRegister) {
      expect(task.actionSteps.length).toBeGreaterThan(0);
      for (const step of task.actionSteps) {
        expect(step).not.toContain("Follow documented remediation procedures for this test rule.");
      }
    }
  });

  // Additional check: AI Crawler Wildcard Policy
  it("correctly identifies AI crawlers as blocked when wildcard 'Disallow: /' is present", () => {
    const blockedRobots = "User-agent: *\nDisallow: /\n";
    const res = parseRobotsForAi(blockedRobots);
    expect(res.wildcardDisallowsAll).toBe(true);
    expect(res.blocksGpt).toBe(true);
    expect(res.blocksClaude).toBe(true);
    expect(res.blocksPerplexity).toBe(true);

    const allowedGptRobots = "User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /\n";
    const res2 = parseRobotsForAi(allowedGptRobots);
    expect(res2.wildcardDisallowsAll).toBe(true);
    expect(res2.blocksGpt).toBe(false); // Specifically allowed!
    expect(res2.blocksClaude).toBe(true); // Still blocked by wildcard!
  });

  // P0 Regression: Live H1 vs Meta-Description Distinction
  it("13. Strictly differentiates SEO-02 (meta-description) from SEO-03 (heading hierarchy) and rejects validating H1 evidence against SEO-02", () => {
    const testCrawl = {
      pages: [sampleHtmlPage],
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: ["https://www.caferemote.com/"],
      coverage: baseCoverage,
    };
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: testCrawl.pages,
      robotsTxt: testCrawl.robotsTxt,
      sitemapUrls: testCrawl.sitemapUrls,
      externalLinksTested: testCrawl.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    const seo02 = results.find((r) => r.testId === "SEO-02");
    const seo03 = results.find((r) => r.testId === "SEO-03");

    expect(seo02).toBeDefined();
    expect(seo03).toBeDefined();

    // Verify rules are completely distinct
    expect(seo02?.testName).toBe("Meta Description Presence and Quality");
    expect(seo03?.testName).toBe("Heading Structure and Outline");

    // SEO-02 must contain meta description evidence, never H1 evidence
    expect(seo02?.sampleEvidence?.[0]).toContain("Find hand-curated remote jobs");
    expect(seo02?.sampleEvidence?.[0]).not.toMatch(/^H1:/);

    // SEO-03 must contain H1 heading evidence
    expect(seo03?.sampleEvidence?.[0]).toMatch(/^H1:/);
    expect(seo03?.sampleEvidence?.[0]).toContain("4,539 remote jobs you can do from anywhere");

    // A validator function that mistakenly checks SEO-02 for H1 evidence MUST fail
    const isH1InResult = (r: any) => Boolean(r?.sampleEvidence?.some((ev: string) => ev.startsWith("H1:")));
    expect(isH1InResult(seo02)).toBe(false);
    expect(isH1InResult(seo03)).toBe(true);
  });

  // P0 Regression: Core Web Vitals Field Mapping & No Cross-Mapping
  it("14. Core Web Vitals strictly prevents FCP cross-mapping and maintains isolated metric provenance", () => {
    const testCrawl = {
      pages: [sampleHtmlPage],
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: ["https://www.caferemote.com/"],
      coverage: baseCoverage,
    };

    // Scenario A: CrUX has lcpMs but no fcpMs
    const expertWithoutFcp = projectExpertReport(
      "scan_crux_test_1",
      scanRequest,
      testCrawl,
      [],
      {
        pageSpeedData: {
          mobile: {
            isAvailable: true,
            strategy: "mobile",
            performanceScore: 82,
            cruxFieldData: {
              lcpMs: 2450,
              inpMs: 130,
              cls: 0.04,
              category: "FAST",
            },
            source: "CrUX API",
            measuredAt: new Date().toISOString(),
          },
        },
      }
    );

    const cwvA = expertWithoutFcp.performanceDiagnostics.coreWebVitals;
    // FCP MUST BE NULL - never populated from lcpMs!
    expect(cwvA.fcp).toBeNull();
    expect(cwvA.lcp).toBe("2450ms (Field)");
    expect(cwvA.inp).toBe("130ms (Field)");
    expect(cwvA.cls).toBe("0.04");
    expect(cwvA.status).toBe("AVAILABLE");

    // Scenario B: CrUX supplies distinct FCP and LCP
    const expertWithFcp = projectExpertReport(
      "scan_crux_test_2",
      scanRequest,
      testCrawl,
      [],
      {
        pageSpeedData: {
          mobile: {
            isAvailable: true,
            strategy: "mobile",
            performanceScore: 85,
            cruxFieldData: {
              fcpMs: 950,
              lcpMs: 1900,
              inpMs: 80,
              cls: 0.02,
              category: "FAST",
            },
            source: "CrUX API",
            measuredAt: new Date().toISOString(),
          },
        },
      }
    );

    const cwvB = expertWithFcp.performanceDiagnostics.coreWebVitals;
    expect(cwvB.fcp).toBe("950ms (Field)");
    expect(cwvB.lcp).toBe("1900ms (Field)");
    expect(cwvB.fcp).not.toBe(cwvB.lcp);
  });

  // P1 Regression: Owner Summary Defaults & Unmeasured States
  it("15. Owner summary correctly reflects unmeasured states (horizontal overflow null, cookie issues null, 5 security headers checked)", () => {
    const testCrawl = {
      pages: [sampleHtmlPage],
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: ["https://www.caferemote.com/"],
      coverage: baseCoverage,
    };
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: testCrawl.pages,
      robotsTxt: testCrawl.robotsTxt,
      sitemapUrls: testCrawl.sitemapUrls,
      externalLinksTested: testCrawl.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);

    // Scenario: No browser responsive results provided
    const owner = projectOwnerReport("scan_owner_test_15", scanRequest, testCrawl, results);

    // Horizontal overflow must be null (unmeasured), NOT false!
    expect(owner.performanceAndResponsiveSummary.horizontalOverflowFound).toBeNull();
    expect(owner.performanceAndResponsiveSummary.responsiveStatus).toBe("NOT_TESTED");

    // Public cookies: sampleHtmlPage has empty cookieAttributes
    expect(owner.securityAndAuthSummary.publicCookieIssues).toBeNull();
    expect(owner.securityAndAuthSummary.cookieAssessmentStatus).toBe("NO_COOKIES_OBSERVED");

    // Security headers: Exactly 5 headers checked, no x- inflation
    expect(owner.securityAndAuthSummary.totalSecurityHeadersChecked).toBe(5);
    expect(owner.securityAndAuthSummary.securityHeadersConfigured).toBeLessThanOrEqual(5);

    // No unconditional HIGH-priority performance opportunity if performance issues are absent
    const perfOpp = owner.priorityOpportunities.find((o) => o.id === "opp_perf");
    const hasPerfFails = results.some(
      (r) => (r.category === "performance" || r.category === "responsive_accessibility") && (r.status === "FAIL" || r.status === "WARNING")
    );
    if (!hasPerfFails) {
      expect(perfOpp).toBeUndefined();
    }
  });

  // P1 Regression: Competitor Unassessed Assumptions
  it("16. Competitor status 'NOT_ASSESSED' preserves null for httpsActive and mobileFriendly", () => {
    const reqWithCompetitors: ScanRequest = {
      ...scanRequest,
      competitors: ["remoteok.com", "weworkremotely.com"],
    };
    const testCrawl = {
      pages: [sampleHtmlPage],
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: ["https://www.caferemote.com/"],
      coverage: baseCoverage,
    };
    const owner = projectOwnerReport("scan_comp_test_16", reqWithCompetitors, testCrawl, []);

    expect(owner.competitorSnapshot.length).toBe(2);
    for (const comp of owner.competitorSnapshot) {
      expect(comp.status).toBe("NOT_ASSESSED");
      expect(comp.overallScore).toBeNull();
      // Crucial P1 fix: httpsActive and mobileFriendly must be null, NOT assumed true!
      expect(comp.keyMetrics.httpsActive).toBeNull();
      expect(comp.keyMetrics.mobileFriendly).toBeNull();
      expect(comp.keyMetrics.technicalHealthScore).toBeNull();
      expect(comp.keyMetrics.seoScore).toBeNull();
      expect(comp.keyMetrics.performanceScore).toBeNull();
    }
  });

  // P1 Regression: Finding Affected URL Accuracy
  it("17. Findings accurately map affected URLs, distinguish site-wide scope, and never assign targetUrl to passing rules", () => {
    const testCrawl = {
      pages: [sampleHtmlPage],
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: ["https://www.caferemote.com/"],
      coverage: baseCoverage,
    };
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: testCrawl.pages,
      robotsTxt: testCrawl.robotsTxt,
      sitemapUrls: testCrawl.sitemapUrls,
      externalLinksTested: testCrawl.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);
    const expert = projectExpertReport("scan_urls_test_17", scanRequest, testCrawl, results);

    for (const finding of expert.findings) {
      if (finding.status === "PASS") {
        // PASSING rules must NEVER list affected URLs
        expect(finding.affectedUrls).toEqual([]);
      } else {
        // Failing rules must have valid scope and bounded URLs
        expect(["site_wide", "page_specific", "unspecified"]).toContain(finding.scope);
        expect(finding.affectedUrls.length).toBeLessThanOrEqual(10);
      }
    }
  });

  // P1 Regression: Cryptographic Manifest Verification & Tamper Detection
  it("18. Cryptographic manifest validates canonical audit payload and reliably detects tampered data", () => {
    const testCrawl = {
      pages: [sampleHtmlPage],
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapUrls: [],
      externalLinksTested: [],
      discoveredPageUrls: ["https://www.caferemote.com/"],
      coverage: baseCoverage,
    };
    const evalContext = {
      targetUrl: scanRequest.targetUrl,
      domain: "www.caferemote.com",
      businessCategory: scanRequest.businessCategory,
      pages: testCrawl.pages,
      robotsTxt: testCrawl.robotsTxt,
      sitemapUrls: testCrawl.sitemapUrls,
      externalLinksTested: testCrawl.externalLinksTested,
      competitors: scanRequest.competitors,
    };
    const results = assessmentRegistry.evaluateAll(evalContext);
    const expert = projectExpertReport("scan_manifest_test_18", scanRequest, testCrawl, results);

    // Initial valid report must pass cryptographic verification
    const verification = verifyReportDigest(expert);
    expect(verification.isValid).toBe(true);
    expect(verification.expectedChecksum).toBe(expert.exportManifest.checksum);

    // Tamper Test 1: Inflating overallScore
    const tamperedScore = JSON.parse(JSON.stringify(expert));
    tamperedScore.executiveSummary.overallScore.score = 99;
    const scoreVerification = verifyReportDigest(tamperedScore);
    expect(scoreVerification.isValid).toBe(false);

    // Tamper Test 2: Altering a finding status
    const tamperedFinding = JSON.parse(JSON.stringify(expert));
    if (tamperedFinding.findings.length > 0) {
      tamperedFinding.findings[0].status = tamperedFinding.findings[0].status === "PASS" ? "FAIL" : "PASS";
      const findingVerification = verifyReportDigest(tamperedFinding);
      expect(findingVerification.isValid).toBe(false);
    }

    // Binary PDF digest check
    const mockPdfBytes = Buffer.from("%PDF-1.4 mock pdf data");
    const pdfDigest = computePdfDigest(mockPdfBytes);
    expect(pdfDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
