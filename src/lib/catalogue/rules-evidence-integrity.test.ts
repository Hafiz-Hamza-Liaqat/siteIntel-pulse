import { describe, it, expect } from "vitest";
import { assessmentRegistry } from "./registry";
import { RuleEvaluationContext } from "./types";
import { PageObservation } from "@/types";
import { projectExpertReport } from "../reports/expert-projection";
import { projectOwnerReport } from "../reports/owner-projection";
import { CrawlResult } from "../scanner/crawler";
import { RESPONSIVE_VIEWPORT_WIDTHS } from "../scanner/responsive-runner";

describe("Evidence Integrity & Full Audit Capabilities", () => {
  const baseMockPage: PageObservation = {
    id: "page_entry",
    requestedUrl: "https://example.com/",
    normalizedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    statusCode: 200,
    responseTimeMs: 250,
    contentType: "text/html",
    redirectHistory: [],
    title: "Example Title That Is Sufficiently Long For SEO",
    metaDescription: "This is a comprehensive meta description that easily satisfies standard search engine criteria.",
    canonicalCandidate: "https://example.com/",
    robotsDirectives: ["index", "follow"],
    headings: {
      h1: ["Main Page Heading"],
      h2: ["Subheading"],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
    },
    visibleTextSample: "Sample page content for evaluation.",
    visibleWordCount: 250,
    language: "en",
    doctype: "html5",
    encoding: "utf-8",
    links: [],
    resources: [],
    structuredData: [],
    openGraph: {},
    headers: {},
    cookieAttributes: [],
    discoveredAtDepth: 0,
    discoverySource: "entry",
    consoleErrors: [],
    templateConfidence: "LOW",
  };

  const emptyContext: RuleEvaluationContext = {
    targetUrl: "https://example.com",
    domain: "example.com",
    businessCategory: "ecommerce",
    pages: [],
    sitemapUrls: [],
    externalLinksTested: [],
  };

  describe("1. Elimination of Unearned PASS Results", () => {
    it("returns NOT_TESTED with 0 points for RSP-02, RSP-03, and RSP-04 when browser responsive checks were not executed", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserResponsiveResults: undefined,
      };

      const rsp02 = assessmentRegistry.getRule("RSP-02")!.evaluate(ctx);
      const rsp03 = assessmentRegistry.getRule("RSP-03")!.evaluate(ctx);
      const rsp04 = assessmentRegistry.getRule("RSP-04")!.evaluate(ctx);

      expect(rsp02.status).toBe("NOT_TESTED");
      expect(rsp02.earnedPoints).toBe(0);

      expect(rsp03.status).toBe("NOT_TESTED");
      expect(rsp03.earnedPoints).toBe(0);

      expect(rsp04.status).toBe("NOT_TESTED");
      expect(rsp04.earnedPoints).toBe(0);
    });

    it("evaluates RSP-02 correctly across the 7 required viewport widths when runner evidence is supplied", () => {
      const cleanResponsiveResults = RESPONSIVE_VIEWPORT_WIDTHS.map((width) => ({
        viewport: width,
        pageUrl: "https://example.com",
        status: "TESTED" as const,
        horizontalOverflow: false,
        overflowElements: [] as string[],
        touchTargetIssues: 0,
        touchTargetSelectors: [] as string[],
        clippingIssues: 0,
        accessibleNameIssues: 0,
        screenshotAvailable: false,
        severity: "INFORMATIONAL" as const,
        notes: `Clean layout at ${width}px`,
      }));

      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserResponsiveResults: cleanResponsiveResults,
      };

      const rsp02 = assessmentRegistry.getRule("RSP-02")!.evaluate(ctx);
      expect(rsp02.status).toBe("PASS");
      expect(rsp02.earnedPoints).toBe(2);

      // Now introduce horizontal overflow at 360px
      cleanResponsiveResults[1].horizontalOverflow = true;
      cleanResponsiveResults[1].overflowElements = ["table.data-table"];

      const failingCtx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserResponsiveResults: cleanResponsiveResults,
      };

      const failingRsp02 = assessmentRegistry.getRule("RSP-02")!.evaluate(failingCtx);
      expect(failingRsp02.status).toBe("FAIL");
      expect(failingRsp02.earnedPoints).toBe(0);
      expect(failingRsp02.summary).toContain("360px");
      expect(failingRsp02.sampleEvidence).toContain("table.data-table");
    });

    it("returns UNKNOWN (0 earned points) for SEC-04 when no cookies are observed, never unearned PASS", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [{ ...baseMockPage, cookieAttributes: [] }],
      };

      const sec04 = assessmentRegistry.getRule("SEC-04")!.evaluate(ctx);
      expect(sec04.status).toBe("UNKNOWN");
      expect(sec04.earnedPoints).toBe(0);
    });

    it("returns NOT_TESTED (0 earned points) for SEC-05 when exposure checks were not conducted", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        exposureResults: undefined,
      };

      const sec05 = assessmentRegistry.getRule("SEC-05")!.evaluate(ctx);
      expect(sec05.status).toBe("NOT_TESTED");
      expect(sec05.earnedPoints).toBe(0);
    });

    it("returns UNKNOWN (0 earned points) for SEC-05 when exposure probes return generic HTML fallback", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        exposureResults: {
          executed: true,
          hasExposure: false,
          isInconclusive: true,
          inconclusiveReason: "Server returned generic HTML application fallback for probe paths; absence of sensitive files cannot be conclusively verified.",
          exposedPaths: [],
          safeSummaries: [],
          evidence: ["/.env: HTTP 200 OK (Generic HTML application fallback, inconclusive)"],
        },
      };

      const sec05 = assessmentRegistry.getRule("SEC-05")!.evaluate(ctx);
      expect(sec05.status).toBe("UNKNOWN");
      expect(sec05.earnedPoints).toBe(0);
      expect(sec05.title).toContain("Inconclusive");
    });

    it("returns UNKNOWN (0 earned points) for AI-01 when robots.txt is unavailable or missing", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        robotsTxt: undefined,
      };

      const ai01 = assessmentRegistry.getRule("AI-01")!.evaluate(ctx);
      expect(ai01.status).toBe("UNKNOWN");
      expect(ai01.earnedPoints).toBe(0);
    });

    it("returns UNKNOWN (0 earned points) for RSP-02, RSP-03, and RSP-04 when viewport matrix coverage is incomplete", () => {
      // Only 3 of 7 viewports tested
      const partialResults = [320, 360, 390].map((width) => ({
        viewport: width,
        pageUrl: "https://example.com",
        status: "TESTED" as const,
        horizontalOverflow: false,
        overflowElements: [] as string[],
        touchTargetIssues: 0,
        touchTargetSelectors: [] as string[],
        clippingIssues: 0,
        accessibleNameIssues: 0,
        screenshotAvailable: false,
        severity: "INFORMATIONAL" as const,
        notes: `Layout tested at ${width}px`,
      }));

      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserResponsiveResults: partialResults,
      };

      const rsp02 = assessmentRegistry.getRule("RSP-02")!.evaluate(ctx);
      const rsp03 = assessmentRegistry.getRule("RSP-03")!.evaluate(ctx);
      const rsp04 = assessmentRegistry.getRule("RSP-04")!.evaluate(ctx);

      expect(rsp02.status).toBe("UNKNOWN");
      expect(rsp02.earnedPoints).toBe(0);

      expect(rsp03.status).toBe("UNKNOWN");
      expect(rsp03.earnedPoints).toBe(0);

      expect(rsp04.status).toBe("UNKNOWN");
      expect(rsp04.earnedPoints).toBe(0);
    });

    it("returns NOT_APPLICABLE (0 earned points) for AUTH-01 and AUTH-02 when no auth surfaces or forms exist", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [{ ...baseMockPage, links: [], forms: [] }],
      };

      const auth01 = assessmentRegistry.getRule("AUTH-01")!.evaluate(ctx);
      const auth02 = assessmentRegistry.getRule("AUTH-02")!.evaluate(ctx);

      expect(auth01.status).toBe("NOT_APPLICABLE");
      expect(auth01.earnedPoints).toBe(0);

      expect(auth02.status).toBe("NOT_APPLICABLE");
      expect(auth02.earnedPoints).toBe(0);
    });

    it("returns NOT_TESTED (0 earned points) for CRO-03 when no forms exist", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [{ ...baseMockPage, forms: [] }],
      };

      const cro03 = assessmentRegistry.getRule("CRO-03")!.evaluate(ctx);
      expect(cro03.status).toBe("NOT_TESTED");
      expect(cro03.earnedPoints).toBe(0);
    });

    it("returns NOT_TESTED (0 earned points) for CMP-02 when competitor scans were not run", () => {
      const ctx: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        competitors: ["competitor.com"],
      };

      const cmp02 = assessmentRegistry.getRule("CMP-02")!.evaluate(ctx);
      expect(cmp02.status).toBe("NOT_TESTED");
      expect(cmp02.earnedPoints).toBe(0);
    });
  });

  describe("2. Security Response Headers (SEC-02) 5-Header Agreement", () => {
    it("tests all 5 standard headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)", () => {
      // 5 out of 5 present -> PASS
      const pageWith5Headers: PageObservation = {
        ...baseMockPage,
        headers: {
          "strict-transport-security": "max-age=31536000; includeSubDomains",
          "content-security-policy": "default-src 'self'",
          "x-content-type-options": "nosniff",
          "x-frame-options": "SAMEORIGIN",
          "referrer-policy": "strict-origin-when-cross-origin",
        },
      };

      const sec02 = assessmentRegistry.getRule("SEC-02")!.evaluate({
        ...emptyContext,
        pages: [pageWith5Headers],
      });

      expect(sec02.status).toBe("PASS");
      expect(sec02.earnedPoints).toBe(2);
      expect(sec02.sampleEvidence).toHaveLength(5);

      // 2 out of 5 present -> WARNING (1 point)
      const pageWith2Headers: PageObservation = {
        ...baseMockPage,
        headers: {
          "strict-transport-security": "max-age=31536000",
          "x-content-type-options": "nosniff",
        },
      };

      const sec02Warning = assessmentRegistry.getRule("SEC-02")!.evaluate({
        ...emptyContext,
        pages: [pageWith2Headers],
      });

      expect(sec02Warning.status).toBe("WARNING");
      expect(sec02Warning.earnedPoints).toBe(1);

      // 0 or 1 present -> FAIL (0 points)
      const pageWith0Headers: PageObservation = {
        ...baseMockPage,
        headers: {},
      };

      const sec02Fail = assessmentRegistry.getRule("SEC-02")!.evaluate({
        ...emptyContext,
        pages: [pageWith0Headers],
      });

      expect(sec02Fail.status).toBe("FAIL");
      expect(sec02Fail.earnedPoints).toBe(0);
    });
  });

  describe("3. XML Sitemaps Classification & Exclusion from HTML Findings", () => {
    it("classifies XML sitemaps as PARTIALLY_TESTED and does not generate HTML title or H1 findings for them", () => {
      const crawl: CrawlResult = {
        pages: [
          baseMockPage,
          {
            id: "page_sitemap",
            requestedUrl: "https://example.com/sitemap.xml",
            normalizedUrl: "https://example.com/sitemap.xml",
            finalUrl: "https://example.com/sitemap.xml",
            statusCode: 200,
            responseTimeMs: 120,
            contentType: "application/xml",
            redirectHistory: [],
            title: undefined,
            metaDescription: undefined,
            canonicalCandidate: undefined,
            robotsDirectives: [],
            headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
            visibleTextSample: "<urlset><url><loc>https://example.com/</loc></url></urlset>",
            visibleWordCount: 0,
            language: undefined,
            doctype: undefined,
            encoding: "utf-8",
            links: [],
            resources: [],
            structuredData: [],
            openGraph: {},
            headers: {},
            cookieAttributes: [],
            discoveredAtDepth: 1,
            discoverySource: "sitemap",
            consoleErrors: [],
            templateConfidence: "LOW",
          },
        ],
        sitemapUrls: ["https://example.com/sitemap.xml"],
        externalLinksTested: [],
        discoveredPageUrls: ["https://example.com/", "https://example.com/sitemap.xml"],
        coverage: {
          discoveredPages: 2,
          testedPages: 2,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 45000,
          totalPagesBudget: 50,
          crawlDepthReached: 1,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 100,
          totalWeightedPoints: 100,
          coveragePercentage: 100,
          isExhaustive: true,
        },
      };

      const assessmentResults = assessmentRegistry.evaluateAll({
        ...emptyContext,
        pages: crawl.pages,
        sitemapUrls: crawl.sitemapUrls,
      });

      const report = projectExpertReport(
        "scan_123",
        {
          targetUrl: "https://example.com",
          reportType: "expert",
          maxPages: 10,
          maxDepth: 2,
          businessCategory: "ecommerce",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
        },
        crawl,
        assessmentResults,
        {}
      );

      const htmlPage = report.urlInventory.find((p) => p.url === "https://example.com/");
      const xmlPage = report.urlInventory.find((p) => p.url === "https://example.com/sitemap.xml");

      expect(htmlPage).toBeDefined();
      expect(htmlPage!.testStatus).toBe("FULLY_TESTED");

      expect(xmlPage).toBeDefined();
      expect(xmlPage!.testStatus).toBe("PARTIALLY_TESTED");
      // XML sitemap must not have medium/low findings for missing HTML title/meta-description
      expect(xmlPage!.findingsCount.medium).toBe(0);
      expect(xmlPage!.findingsCount.low).toBe(0);

      // Heading hierarchy must not count XML sitemaps as missing H1
      expect(report.seoDiagnostics.headingHierarchy.pagesMissingH1).toBe(0);
      expect(report.seoDiagnostics.headingHierarchy.pagesWithH1).toBe(1);
    });
  });

  describe("4. Authorization Boundary Honesty", () => {
    it("sets repositoryAuthorized: false when unverified repository URL is supplied", () => {
      const crawl: CrawlResult = {
        pages: [baseMockPage],
        sitemapUrls: [],
        externalLinksTested: [],
        discoveredPageUrls: ["https://example.com/"],
        coverage: {
          discoveredPages: 1,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 20000,
          totalPagesBudget: 50,
          crawlDepthReached: 0,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 100,
          totalWeightedPoints: 100,
          coveragePercentage: 100,
          isExhaustive: true,
        },
      };

      const report = projectExpertReport(
        "scan_123",
        {
          targetUrl: "https://example.com",
          reportType: "expert",
          maxPages: 10,
          maxDepth: 1,
          businessCategory: "saas",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
        },
        crawl,
        [],
        {
          repositoryUrl: "https://github.com/example/repo",
        }
      );

      expect(report.metadata.authorization.repositoryUrl).toBe("https://github.com/example/repo");
      expect(report.metadata.authorization.repositoryAuthorized).toBe(false);
    });
  });

  describe("5. Visual Design Diagnostic Schema & SEC-DIAG-06", () => {
    it("includes SEC-DIAG-06 for Referrer-Policy in expert report security diagnostics", () => {
      const crawl: CrawlResult = {
        pages: [baseMockPage],
        sitemapUrls: [],
        externalLinksTested: [],
        discoveredPageUrls: ["https://example.com/"],
        coverage: {
          discoveredPages: 1,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 20000,
          totalPagesBudget: 50,
          crawlDepthReached: 0,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 100,
          totalWeightedPoints: 100,
          coveragePercentage: 100,
          isExhaustive: true,
        },
      };

      const report = projectExpertReport(
        "scan_123",
        {
          targetUrl: "https://example.com",
          reportType: "expert",
          maxPages: 10,
          maxDepth: 1,
          businessCategory: "saas",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
        },
        crawl,
        [],
        {}
      );

      const secDiag06 = report.securityDiagnostics.find((d) => d.id === "SEC-DIAG-06");
      expect(secDiag06).toBeDefined();
      expect(secDiag06!.headerName).toBe("Referrer-Policy");
      expect(secDiag06!.expectedValue).toContain("strict-origin-when-cross-origin");
    });
  });

  describe("6. Report Projection Evidence Truthfulness", () => {
    it("does not replace missing/zero response time with fabricated default 250ms", () => {
      const pageWithZeroTiming: PageObservation = {
        ...baseMockPage,
        responseTimeMs: 0,
      };

      const crawl: CrawlResult = {
        pages: [pageWithZeroTiming],
        sitemapUrls: [],
        externalLinksTested: [],
        discoveredPageUrls: ["https://example.com/"],
        coverage: {
          discoveredPages: 1,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 5000,
          totalPagesBudget: 50,
          crawlDepthReached: 0,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 100,
          totalWeightedPoints: 100,
          coveragePercentage: 100,
          isExhaustive: true,
        },
      };

      const report = projectExpertReport(
        "scan_123",
        {
          targetUrl: "https://example.com",
          reportType: "expert",
          maxPages: 10,
          maxDepth: 1,
          businessCategory: "saas",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
        },
        crawl,
        [],
        {}
      );

      expect(report.urlInventory[0].responseTimeMs).toBe(0);
      expect(report.urlInventory[0].responseTimeMs).not.toBe(250);
    });

    it("owner projection does not confuse failedPages with broken links and does not claim HTTPS without entry page", () => {
      const crawlWithFailedPages: CrawlResult = {
        pages: [baseMockPage],
        sitemapUrls: [],
        externalLinksTested: [],
        discoveredPageUrls: ["https://example.com/"],
        coverage: {
          discoveredPages: 5,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 4, // 4 failed network fetches
          inaccessiblePages: 0,
          totalBytesFetched: 5000,
          totalPagesBudget: 50,
          crawlDepthReached: 0,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 100,
          totalWeightedPoints: 100,
          coveragePercentage: 100,
          isExhaustive: true,
        },
      };

      const ownerReport = projectOwnerReport(
        "scan_123",
        {
          targetUrl: "https://example.com",
          reportType: "owner",
          maxPages: 10,
          maxDepth: 1,
          businessCategory: "saas",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
        },
        crawlWithFailedPages,
        [],
        undefined
      );

      // Broken links should be 0 (no broken links observed in page.links or externalLinksTested)
      expect(ownerReport.technicalHealthAndSeoSummary.brokenLinksCount).toBe(0);
      expect(ownerReport.issueDistribution.affectedPagesCount).toBe(4);
    });

    it("does not claim authenticated login/logout flows passed when dynamic auth tests were not executed", () => {
      const crawl: CrawlResult = {
        pages: [baseMockPage],
        sitemapUrls: [],
        externalLinksTested: [],
        discoveredPageUrls: ["https://example.com/"],
        coverage: {
          discoveredPages: 1,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 5000,
          totalPagesBudget: 50,
          crawlDepthReached: 0,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 100,
          totalWeightedPoints: 100,
          coveragePercentage: 100,
          isExhaustive: true,
        },
      };

      const report = projectExpertReport(
        "scan_123",
        {
          targetUrl: "https://example.com",
          reportType: "expert",
          maxPages: 10,
          maxDepth: 1,
          businessCategory: "saas",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
          enableAuthorizedAudit: true,
        },
        crawl,
        [],
        {
          isAuthorizedForAuthScan: true,
        }
      );

      // Must not contain fake PASS flows for login handshake or logout
      const passingFlows = report.authenticationAssessment.testedFlows.filter((f) => f.status === "PASS");
      expect(passingFlows).toHaveLength(0);
      expect(report.authenticationAssessment.testedFlows[0].status).toBe("NOT_TESTED");
    });

    it("verifies RSP-05 cannot produce a clean PASS when contrast heuristics are unmeasured", () => {
      // Entry page has language, but browser visual results are absent
      const ctxWithoutVisual: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserVisualResults: undefined,
      };

      const rsp05WithoutVisual = assessmentRegistry.getRule("RSP-05")!.evaluate(ctxWithoutVisual);
      expect(rsp05WithoutVisual.status).toBe("WARNING");
      expect(rsp05WithoutVisual.earnedPoints).toBe(1);
      expect(rsp05WithoutVisual.title).toContain("Contrast Heuristics Unmeasured");

      // Entry page with measured contrast heuristics that passed
      const ctxWithVisualPass: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserVisualResults: {
          status: "TESTED",
          colorContrast: {
            status: "PASS",
            testedElementsCount: 15,
            contrastFailuresCount: 0,
            sampleRatio: "5.2:1",
            failingSelectors: [],
          },
          typography: { status: "PASS", headingHierarchyMaintained: true },
          layoutAndSpacing: { status: "PASS", unintendedOverlapCount: 0, clippingCount: 0, brokenImagesCount: 0, brokenImageUrls: [] },
          controlsAndConsistency: { status: "PASS", touchTargetDefectsCount: 0, accessibleNameDefectsCount: 0, defectiveSelectors: [] },
          themeAdaptability: { supportsDarkMode: false, prefersColorSchemeObserved: false },
          testedViewportWidths: [320, 360, 390, 768, 1024, 1280, 1440],
          limitations: "Heuristic measurement",
        },
      };

      const rsp05WithVisualPass = assessmentRegistry.getRule("RSP-05")!.evaluate(ctxWithVisualPass);
      expect(rsp05WithVisualPass.status).toBe("PASS");
      expect(rsp05WithVisualPass.earnedPoints).toBe(2);
      expect(rsp05WithVisualPass.limitations).toContain("not constitute a full WCAG");
    });

    it("verifies RSP-03 evaluates both navigation clipping and fixed element overlap", () => {
      const cleanResponsiveResults = RESPONSIVE_VIEWPORT_WIDTHS.map((width) => ({
        viewport: width,
        pageUrl: "https://example.com",
        status: "TESTED" as const,
        horizontalOverflow: false,
        overflowElements: [] as string[],
        touchTargetIssues: 0,
        touchTargetSelectors: [] as string[],
        clippingIssues: 0,
        accessibleNameIssues: 0,
        screenshotAvailable: false,
        severity: "INFORMATIONAL" as const,
      }));

      // Overlap detected in visual results
      const ctxWithOverlap: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserResponsiveResults: cleanResponsiveResults,
        browserVisualResults: {
          status: "TESTED",
          colorContrast: { status: "PASS", testedElementsCount: 10, contrastFailuresCount: 0, failingSelectors: [] },
          typography: { status: "PASS", headingHierarchyMaintained: true },
          layoutAndSpacing: { status: "WARNING", unintendedOverlapCount: 2, clippingCount: 0, brokenImagesCount: 0, brokenImageUrls: [] },
          controlsAndConsistency: { status: "PASS", touchTargetDefectsCount: 0, accessibleNameDefectsCount: 0, defectiveSelectors: [] },
          themeAdaptability: { supportsDarkMode: false, prefersColorSchemeObserved: false },
          testedViewportWidths: [320, 360, 390, 768, 1024, 1280, 1440],
          limitations: "Heuristic",
        },
      };

      const rsp03 = assessmentRegistry.getRule("RSP-03")!.evaluate(ctxWithOverlap);
      expect(rsp03.status).toBe("WARNING");
      expect(rsp03.earnedPoints).toBe(1);
      expect(rsp03.title).toContain("Overlap");
    });

    it("verifies RSP-04 evaluates computed mobile font sizing and touch targets", () => {
      const cleanResponsiveResults = RESPONSIVE_VIEWPORT_WIDTHS.map((width) => ({
        viewport: width,
        pageUrl: "https://example.com",
        status: "TESTED" as const,
        horizontalOverflow: false,
        overflowElements: [] as string[],
        touchTargetIssues: 0,
        touchTargetSelectors: [] as string[],
        clippingIssues: 0,
        accessibleNameIssues: 0,
        screenshotAvailable: false,
        severity: "INFORMATIONAL" as const,
      }));

      // Mobile font size is 11px (< 14px threshold)
      const ctxUndersizedFont: RuleEvaluationContext = {
        ...emptyContext,
        pages: [baseMockPage],
        browserResponsiveResults: cleanResponsiveResults,
        browserVisualResults: {
          status: "TESTED",
          colorContrast: { status: "PASS", testedElementsCount: 10, contrastFailuresCount: 0, failingSelectors: [] },
          typography: { status: "WARNING", bodyFontSizeMobilePx: 11, bodyFontSizeDesktopPx: 16, headingHierarchyMaintained: true },
          layoutAndSpacing: { status: "PASS", unintendedOverlapCount: 0, clippingCount: 0, brokenImagesCount: 0, brokenImageUrls: [] },
          controlsAndConsistency: { status: "PASS", touchTargetDefectsCount: 0, accessibleNameDefectsCount: 0, defectiveSelectors: [] },
          themeAdaptability: { supportsDarkMode: false, prefersColorSchemeObserved: false },
          testedViewportWidths: [320, 360, 390, 768, 1024, 1280, 1440],
          limitations: "Heuristic",
        },
      };

      const rsp04 = assessmentRegistry.getRule("RSP-04")!.evaluate(ctxUndersizedFont);
      expect(rsp04.status).toBe("WARNING");
      expect(rsp04.earnedPoints).toBe(1);
      expect(rsp04.summary).toContain("mobile body font size (11px)");
    });

    it("verifies SEC-04 evaluates Secure, HttpOnly, and SameSite attributes truthfully across all combinations", () => {
      // 1. All 3 flags present: Secure, HttpOnly, SameSite=Lax
      const pageWithAllFlags: PageObservation = {
        ...baseMockPage,
        cookieAttributes: [
          { name: "session_id", secure: true, httpOnly: true, sameSite: "Lax" },
        ],
      };
      const ctxAllFlags: RuleEvaluationContext = {
        ...emptyContext,
        pages: [pageWithAllFlags],
      };
      const sec04Pass = assessmentRegistry.getRule("SEC-04")!.evaluate(ctxAllFlags);
      expect(sec04Pass.status).toBe("PASS");
      expect(sec04Pass.earnedPoints).toBe(2);
      expect(sec04Pass.title).toContain("SameSite Flags");
      expect(sec04Pass.sampleEvidence?.[0]).toContain("Secure=true");
      expect(sec04Pass.sampleEvidence?.[0]).toContain("HttpOnly=true");
      expect(sec04Pass.sampleEvidence?.[0]).toContain("SameSite=Lax");

      // 2. Cookie with Secure and HttpOnly, but missing SameSite
      const pageWithMissingSameSite: PageObservation = {
        ...baseMockPage,
        cookieAttributes: [
          { name: "session_id", secure: true, httpOnly: true, sameSite: undefined },
        ],
      };
      const ctxMissingSameSite: RuleEvaluationContext = {
        ...emptyContext,
        pages: [pageWithMissingSameSite],
      };
      const sec04MissingSameSite = assessmentRegistry.getRule("SEC-04")!.evaluate(ctxMissingSameSite);
      expect(sec04MissingSameSite.status).toBe("WARNING");
      expect(sec04MissingSameSite.earnedPoints).toBe(1);
      expect(sec04MissingSameSite.title).toContain("Missing SameSite");

      // 3. Cookie with missing Secure flag
      const pageWithMissingSecure: PageObservation = {
        ...baseMockPage,
        cookieAttributes: [
          { name: "session_id", secure: false, httpOnly: true, sameSite: "Lax" },
        ],
      };
      const ctxMissingSecure: RuleEvaluationContext = {
        ...emptyContext,
        pages: [pageWithMissingSecure],
      };
      const sec04MissingSecure = assessmentRegistry.getRule("SEC-04")!.evaluate(ctxMissingSecure);
      expect(sec04MissingSecure.status).toBe("WARNING");
      expect(sec04MissingSecure.earnedPoints).toBe(0);
      expect(sec04MissingSecure.title).toContain("Missing Core Transport Security Flags");

      // 4. Cookie with missing HttpOnly flag
      const pageWithMissingHttpOnly: PageObservation = {
        ...baseMockPage,
        cookieAttributes: [
          { name: "session_id", secure: true, httpOnly: false, sameSite: "Lax" },
        ],
      };
      const ctxMissingHttpOnly: RuleEvaluationContext = {
        ...emptyContext,
        pages: [pageWithMissingHttpOnly],
      };
      const sec04MissingHttpOnly = assessmentRegistry.getRule("SEC-04")!.evaluate(ctxMissingHttpOnly);
      expect(sec04MissingHttpOnly.status).toBe("WARNING");
      expect(sec04MissingHttpOnly.earnedPoints).toBe(0);
      expect(sec04MissingHttpOnly.title).toContain("Missing Core Transport Security Flags");

      // 5. Zero cookies observed -> UNKNOWN (0 points)
      const pageWithNoCookies: PageObservation = {
        ...baseMockPage,
        cookieAttributes: [],
      };
      const ctxNoCookies: RuleEvaluationContext = {
        ...emptyContext,
        pages: [pageWithNoCookies],
      };
      const sec04NoCookies = assessmentRegistry.getRule("SEC-04")!.evaluate(ctxNoCookies);
      expect(sec04NoCookies.status).toBe("UNKNOWN");
      expect(sec04NoCookies.earnedPoints).toBe(0);
      expect(sec04NoCookies.title).toContain("No Public Cookies Observed");
    });

    it("verifies owner projection derives AI crawler policy with root-level blocks", () => {
      const crawlWithRootBlock: CrawlResult = {
        pages: [baseMockPage],
        sitemapUrls: [],
        externalLinksTested: [],
        discoveredPageUrls: ["https://example.com/"],
        robotsTxt: "User-agent: *\nDisallow: /",
        coverage: {
          discoveredPages: 1,
          testedPages: 1,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 5000,
          totalPagesBudget: 50,
          crawlDepthReached: 0,
          externalLinksTested: 0,
          resourcesTested: 0,
          weightedPointsEvaluated: 100,
          totalWeightedPoints: 100,
          coveragePercentage: 100,
          isExhaustive: true,
        },
      };

      const ownerReport = projectOwnerReport(
        "scan_123",
        {
          targetUrl: "https://example.com",
          reportType: "owner",
          maxPages: 10,
          maxDepth: 1,
          businessCategory: "saas",
          targetMarket: "US",
          preferredLanguage: "en",
          competitors: [],
        },
        crawlWithRootBlock,
        [],
        undefined
      );

      expect(ownerReport.contentTrustAiSummary.aiCrawlerPolicy).toBe(
        "Root-Level Crawl Block (Disallow: / for all bots)"
      );
    });
  });

  describe("Catalogue Rule Truthfulness for Truncated Evidence", () => {
    const seo03Rule = assessmentRegistry.getRule("SEO-03")!;
    const cnt03Rule = assessmentRegistry.getRule("CNT-03")!;
    const tch05Rule = assessmentRegistry.getRule("TCH-05")!;

    describe("SEO-03: Heading Structure and Outline", () => {
      it("returns UNKNOWN with low confidence when a page contains exactly one H1 but is truncated", () => {
        const truncatedSingleH1Page: PageObservation = {
          ...baseMockPage,
          headings: { ...baseMockPage.headings, h1: ["Single Observed H1"] },
          isTruncated: true,
          truncationReason: "Response body truncated at byte limit",
        };

        const result = seo03Rule.evaluate({
          ...emptyContext,
          pages: [truncatedSingleH1Page],
        });

        expect(result.status).toBe("UNKNOWN");
        expect(result.earnedPoints).toBe(0);
        expect(result.confidence).toBe("LOW");
        expect(result.limitations).toContain("Response body truncated at byte limit");
        expect(result.title).toContain("Heading Structure Inconclusive Due to Truncated Content");
      });

      it("preserves WARNING with high confidence when multiple H1s are confirmed in observed content even if truncated", () => {
        const truncatedMultipleH1Page: PageObservation = {
          ...baseMockPage,
          headings: { ...baseMockPage.headings, h1: ["First H1 Heading", "Second H1 Heading"] },
          isTruncated: true,
          truncationReason: "Response body truncated at byte limit",
        };

        const result = seo03Rule.evaluate({
          ...emptyContext,
          pages: [truncatedMultipleH1Page],
        });

        expect(result.status).toBe("WARNING");
        expect(result.earnedPoints).toBe(1);
        expect(result.confidence).toBe("HIGH");
        expect(result.title).toContain("Multiple H1 Headings on Some Pages");
      });

      it("returns UNKNOWN when missing H1 relies solely on truncated pages", () => {
        const truncatedMissingH1Page: PageObservation = {
          ...baseMockPage,
          headings: { ...baseMockPage.headings, h1: [] },
          isTruncated: true,
          truncationReason: "Response body truncated at byte limit",
        };

        const result = seo03Rule.evaluate({
          ...emptyContext,
          pages: [truncatedMissingH1Page],
        });

        expect(result.status).toBe("UNKNOWN");
        expect(result.earnedPoints).toBe(0);
        expect(result.confidence).toBe("LOW");
        expect(result.limitations).toContain("Response body truncated at byte limit");
      });

      it("returns clean PASS when all pages are complete and have exactly one H1", () => {
        const completeSingleH1Page: PageObservation = {
          ...baseMockPage,
          headings: { ...baseMockPage.headings, h1: ["Sole Legitimate H1"] },
          isTruncated: false,
        };

        const result = seo03Rule.evaluate({
          ...emptyContext,
          pages: [completeSingleH1Page],
        });

        expect(result.status).toBe("PASS");
        expect(result.earnedPoints).toBe(2);
        expect(result.confidence).toBe("HIGH");
        expect(result.title).toContain("Clean Single-H1 Heading Hierarchy");
      });
    });

    describe("CNT-03: Trust and Ownership Signals", () => {
      it("returns UNKNOWN when no trust links are observed and only some pages are truncated", () => {
        const completeEmptyPage: PageObservation = {
          ...baseMockPage,
          id: "page_1",
          links: [],
          isTruncated: false,
        };
        const truncatedEmptyPage: PageObservation = {
          ...baseMockPage,
          id: "page_2",
          links: [],
          isTruncated: true,
          truncationReason: "Response body truncated at byte limit",
        };

        const result = cnt03Rule.evaluate({
          ...emptyContext,
          pages: [completeEmptyPage, truncatedEmptyPage],
        });

        expect(result.status).toBe("UNKNOWN");
        expect(result.earnedPoints).toBe(0);
        expect(result.confidence).toBe("LOW");
        expect(result.limitations).toContain("Response body truncated at byte limit");
        expect(result.title).toContain("Trust Signals Inconclusive Due to Truncated Content");
      });

      it("returns UNKNOWN when incomplete trust signals are found but truncated content could contain additional signals", () => {
        const completePageWithAbout: PageObservation = {
          ...baseMockPage,
          id: "page_1",
          links: [
            {
              id: "lnk_about",
              sourceUrl: "https://example.com/",
              targetUrl: "https://example.com/about",
              anchorText: "About Us",
              isInternal: true,
              isBroken: false,
              isRedirect: false,
            },
          ],
          isTruncated: false,
        };
        const truncatedPage: PageObservation = {
          ...baseMockPage,
          id: "page_2",
          links: [],
          isTruncated: true,
          truncationReason: "Response body truncated at byte limit",
        };

        const result = cnt03Rule.evaluate({
          ...emptyContext,
          pages: [completePageWithAbout, truncatedPage],
        });

        expect(result.status).toBe("UNKNOWN");
        expect(result.earnedPoints).toBe(0);
        expect(result.confidence).toBe("LOW");
        expect(result.limitations).toContain("Response body truncated at byte limit");
        expect(result.summary).toContain("About page");
      });

      it("returns WARNING when complete pages positively verify incomplete signals without truncation", () => {
        const completePageWithAbout: PageObservation = {
          ...baseMockPage,
          links: [
            {
              id: "lnk_about",
              sourceUrl: "https://example.com/",
              targetUrl: "https://example.com/about",
              anchorText: "About Us",
              isInternal: true,
              isBroken: false,
              isRedirect: false,
            },
          ],
          isTruncated: false,
        };

        const result = cnt03Rule.evaluate({
          ...emptyContext,
          pages: [completePageWithAbout],
        });

        expect(result.status).toBe("WARNING");
        expect(result.earnedPoints).toBe(1);
        expect(result.confidence).toBe("HIGH");
      });

      it("returns PASS when 3+ trust signals are positively established even if a page is truncated", () => {
        const pageWithThreeSignals: PageObservation = {
          ...baseMockPage,
          links: [
            { id: "1", sourceUrl: "https://example.com/", targetUrl: "https://example.com/about", anchorText: "About", isInternal: true, isBroken: false, isRedirect: false },
            { id: "2", sourceUrl: "https://example.com/", targetUrl: "https://example.com/contact", anchorText: "Contact", isInternal: true, isBroken: false, isRedirect: false },
            { id: "3", sourceUrl: "https://example.com/", targetUrl: "https://example.com/privacy", anchorText: "Privacy", isInternal: true, isBroken: false, isRedirect: false },
          ],
          isTruncated: true,
        };

        const result = cnt03Rule.evaluate({
          ...emptyContext,
          pages: [pageWithThreeSignals],
        });

        expect(result.status).toBe("PASS");
        expect(result.earnedPoints).toBe(2);
        expect(result.confidence).toBe("HIGH");
      });
    });

    describe("TCH-05: Robots.txt and XML Sitemap Availability", () => {
      it("returns UNKNOWN when robots.txt is truncated and no sitemap declaration was found", () => {
        const result = tch05Rule.evaluate({
          ...emptyContext,
          robotsTxt: "User-agent: *\nDisallow: /admin\nDisallow: /private",
          isRobotsTruncated: true,
          sitemapUrls: [],
        });

        expect(result.status).toBe("UNKNOWN");
        expect(result.earnedPoints).toBe(0);
        expect(result.confidence).toBe("LOW");
        expect(result.title).toContain("Robots.txt Truncated; Sitemap Declaration Inconclusive");
        expect(result.limitations).toContain("Robots.txt was truncated at byte limit");
      });

      it("returns UNKNOWN when an XML sitemap is truncated and yields zero discovered URLs", () => {
        const result = tch05Rule.evaluate({
          ...emptyContext,
          robotsTxt: "User-agent: *\nDisallow: /admin\n",
          isSitemapTruncated: true,
          sitemapUrls: [],
        });

        expect(result.status).toBe("UNKNOWN");
        expect(result.earnedPoints).toBe(0);
        expect(result.confidence).toBe("LOW");
        expect(result.title).toContain("Sitemap Inconclusive Due to Truncated Content");
        expect(result.limitations).toContain("Sitemap was truncated at byte limit before URLs could be parsed");
      });

      it("preserves PASS with partial disclosure when sitemap URLs are positively observed but one source is truncated", () => {
        const result = tch05Rule.evaluate({
          ...emptyContext,
          robotsTxt: "User-agent: *\nSitemap: https://example.com/sitemap.xml",
          isSitemapTruncated: true,
          sitemapUrls: ["https://example.com/products", "https://example.com/pricing"],
        });

        expect(result.status).toBe("PASS");
        expect(result.earnedPoints).toBe(2);
        expect(result.confidence).toBe("MEDIUM");
        expect(result.title).toContain("Partially Parsed");
        expect(result.limitations).toContain("truncated at byte limit");
        expect(result.sampleEvidence?.some((e) => e.includes("truncated at byte limit"))).toBe(true);
      });

      it("returns clean PASS when robots and sitemaps are complete without truncation", () => {
        const result = tch05Rule.evaluate({
          ...emptyContext,
          robotsTxt: "User-agent: *\nSitemap: https://example.com/sitemap.xml",
          isRobotsTruncated: false,
          isSitemapTruncated: false,
          sitemapUrls: ["https://example.com/home", "https://example.com/about"],
        });

        expect(result.status).toBe("PASS");
        expect(result.earnedPoints).toBe(2);
        expect(result.confidence).toBe("HIGH");
        expect(result.title).toContain("Robots.txt and XML Sitemap Fully Configured");
        expect(result.limitations).toBeUndefined();
      });

      it("returns WARNING when complete robots.txt has no sitemap reference and no sitemaps are found", () => {
        const result = tch05Rule.evaluate({
          ...emptyContext,
          robotsTxt: "User-agent: *\nDisallow: /admin\n",
          isRobotsTruncated: false,
          isSitemapTruncated: false,
          sitemapUrls: [],
        });

        expect(result.status).toBe("WARNING");
        expect(result.earnedPoints).toBe(1);
        expect(result.confidence).toBe("HIGH");
        expect(result.title).toContain("Robots.txt Present but XML Sitemap Missing");
      });
    });
  });
});
