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
  });
});
