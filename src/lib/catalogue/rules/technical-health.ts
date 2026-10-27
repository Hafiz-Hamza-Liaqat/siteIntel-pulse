import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const technicalHealthRules: RuleDefinition[] = [
  {
    id: "TCH-01",
    name: "HTTPS and Page Availability",
    version: "1.0.0",
    category: "technical_health",
    categoryName: "Technical Health & Crawlability",
    maxPoints: 2,
    description: "Evaluates entry URL availability, HTTP status code 200, TLS reachability, and response timing.",
    businessImpactSummary: "If visitors or search engines cannot reliably reach your platform over HTTPS, traffic, trust, and sales are immediately lost.",
    remediationAdvice: "Ensure your primary entry page responds with HTTP 200 over a valid HTTPS certificate under 1000ms.",
    evaluate: (ctx): AssessmentResult => {
      const entry = ctx.pages[0];
      const now = new Date().toISOString();

      if (!entry) {
        return {
          testId: "TCH-01",
          testVersion: "1.0.0",
          testName: "HTTPS and Page Availability",
          category: "technical_health",
          status: "FAIL",
          severity: "CRITICAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Primary Website Entry Page Inaccessible",
          summary: "The scanner could not fetch the primary homepage or entry page.",
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: 1,
          sampleEvidence: ["Entry URL unreachable or timed out"],
        };
      }

      const isHttps = entry.finalUrl.startsWith("https://");
      const is200 = entry.statusCode === 200;
      const isFast = entry.responseTimeMs < 1200;

      if (isHttps && is200 && isFast) {
        return {
          testId: "TCH-01",
          testVersion: "1.0.0",
          testName: "HTTPS and Page Availability",
          category: "technical_health",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Entry Page Accessible via Secure HTTPS",
          summary: `Primary entry page loaded successfully with HTTP 200 in ${entry.responseTimeMs}ms over HTTPS.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`URL: ${entry.finalUrl}`, `Status: 200 OK`, `Latency: ${entry.responseTimeMs}ms`],
        };
      }

      if (isHttps && is200 && !isFast) {
        return {
          testId: "TCH-01",
          testVersion: "1.0.0",
          testName: "HTTPS and Page Availability",
          category: "technical_health",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Entry Page Reached but Initial Response is Slow",
          summary: `Entry page is available over HTTPS but took ${entry.responseTimeMs}ms to respond, which degrades first impression.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Latency: ${entry.responseTimeMs}ms (> 1200ms threshold)`],
        };
      }

      return {
        testId: "TCH-01",
        testVersion: "1.0.0",
        testName: "HTTPS and Page Availability",
        category: "technical_health",
        status: "FAIL",
        severity: "CRITICAL",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Entry Page Not Secure or Returned Error Status",
        summary: `Page returned HTTP status ${entry.statusCode} or failed to enforce HTTPS.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: [`Final URL: ${entry.finalUrl}`, `Status: ${entry.statusCode}`],
      };
    },
  },
  {
    id: "TCH-02",
    name: "Preferred Hostname and Redirect Consistency",
    version: "1.0.0",
    category: "technical_health",
    categoryName: "Technical Health & Crawlability",
    maxPoints: 2,
    description: "Validates HTTP-to-HTTPS redirect, www vs non-www canonical resolution, and redirect loops.",
    businessImpactSummary: "Inconsistent hostnames split domain authority, confuse search engines, and can trigger security warnings for customers.",
    remediationAdvice: "Configure a single permanent 301 redirect from HTTP to HTTPS and choose one canonical hostname (www or non-www).",
    evaluate: (ctx): AssessmentResult => {
      const entry = ctx.pages[0];
      const now = new Date().toISOString();

      if (!entry) {
        return {
          testId: "TCH-02",
          testVersion: "1.0.0",
          testName: "Preferred Hostname and Redirect Consistency",
          category: "technical_health",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Redirect Consistency Unknown",
          summary: "Entry page observations unavailable to verify hostname redirection.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const finalIsHttps = entry.finalUrl.startsWith("https://");
      const hasExcessiveRedirects = entry.redirectHistory.length > 3;

      if (finalIsHttps && !hasExcessiveRedirects) {
        return {
          testId: "TCH-02",
          testVersion: "1.0.0",
          testName: "Preferred Hostname and Redirect Consistency",
          category: "technical_health",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Consistent Preferred Hostname Enforced",
          summary: `Requests successfully resolve to canonical secure host '${new URL(entry.finalUrl).hostname}'.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Canonical host: ${new URL(entry.finalUrl).hostname}`, `Redirect hops: ${entry.redirectHistory.length}`],
        };
      }

      return {
        testId: "TCH-02",
        testVersion: "1.0.0",
        testName: "Preferred Hostname and Redirect Consistency",
        category: "technical_health",
        status: "WARNING",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Multiple Redirect Hops or Host Inconsistency Detected",
        summary: `Redirect chain contains ${entry.redirectHistory.length} hops before reaching final destination.`,
        timestamp: now,
        confidence: "MEDIUM",
        sampleEvidence: entry.redirectHistory,
      };
    },
  },
  {
    id: "TCH-03",
    name: "Crawlability and Indexability Signals",
    version: "1.0.0",
    category: "technical_health",
    categoryName: "Technical Health & Crawlability",
    maxPoints: 2,
    description: "Checks robots meta tag, X-Robots-Tag, and fetchable HTML status for unintended noindex directives.",
    businessImpactSummary: "An accidental 'noindex' or disallow directive will cause search engines to drop your website from search results entirely.",
    remediationAdvice: "Verify that public production pages do not emit 'noindex' or 'none' in meta tags or HTTP headers.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const htmlPages = ctx.pages.filter((p) => {
        const pageUrl = (p.finalUrl || (p as any).url || "").toLowerCase();
        return (
          (p.documentType === "html" || !p.documentType) &&
          !p.isXmlSitemap &&
          !(p.contentType || "").toLowerCase().includes("xml") &&
          !pageUrl.endsWith(".xml") &&
          !pageUrl.endsWith("/robots.txt")
        );
      });

      if (htmlPages.length === 0) {
        return {
          testId: "TCH-03",
          testVersion: "1.0.0",
          testName: "Crawlability and Indexability Signals",
          category: "technical_health",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Pages Unobservable",
          summary: "No HTML page data available to evaluate crawlability and indexability directives.",
          timestamp: now,
          confidence: "LOW",
        };
      }
      const noindexPages = htmlPages.filter((p) =>
        (p.robotsDirectives || []).some((d) => d.includes("noindex") || d.includes("none"))
      );

      // If entry page is noindexed, that is critical
      const entryIsNoindex = (htmlPages[0]?.robotsDirectives || []).some((d) => d.includes("noindex"));

      if (entryIsNoindex) {
        return {
          testId: "TCH-03",
          testVersion: "1.0.0",
          testName: "Crawlability and Indexability Signals",
          category: "technical_health",
          status: "FAIL",
          severity: "CRITICAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Homepage Contains 'noindex' Directive",
          summary: "The main homepage contains a noindex directive, preventing search engines from indexing the platform.",
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: 1,
          sampleEvidence: [htmlPages[0]?.finalUrl || ctx.targetUrl],
        };
      }

      if (noindexPages.length > 0) {
        return {
          testId: "TCH-03",
          testVersion: "1.0.0",
          testName: "Crawlability and Indexability Signals",
          category: "technical_health",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Some Subpages Are Blocked from Indexing",
          summary: `${noindexPages.length} discovered subpages declare noindex. Ensure this is intentional (e.g. checkout or thank-you pages).`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: noindexPages.length,
          sampleEvidence: noindexPages.slice(0, 3).map((p) => p.finalUrl),
        };
      }

      return {
        testId: "TCH-03",
        testVersion: "1.0.0",
        testName: "Crawlability and Indexability Signals",
        category: "technical_health",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "All Public Pages Are Freely Indexable",
        summary: `All ${htmlPages.length} evaluated HTML pages allow search engine indexing without blocking directives.`,
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "TCH-04",
    name: "Broken Internal Links",
    version: "1.0.0",
    category: "technical_health",
    categoryName: "Technical Health & Crawlability",
    maxPoints: 2,
    description: "Measures discovered internal link targets, broken link rates, and 404/500 responses.",
    businessImpactSummary: "Broken links frustrate customers, cause checkout abandonment, and waste search engine crawl budget.",
    remediationAdvice: "Fix or remove links pointing to 404 pages or create 301 redirects to active successor pages.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "TCH-04",
          testVersion: "1.0.0",
          testName: "Broken Internal Links",
          category: "technical_health",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Links Unobservable",
          summary: "No page data available to evaluate broken internal links.",
          timestamp: now,
          confidence: "LOW",
        };
      }
      const brokenPages = ctx.pages.filter((p) => p.statusCode === 404 || p.statusCode >= 500);

      if (brokenPages.length === 0) {
        return {
          testId: "TCH-04",
          testVersion: "1.0.0",
          testName: "Broken Internal Links",
          category: "technical_health",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "No Broken Internal Pages Detected",
          summary: `All ${ctx.pages.length} crawled internal URLs returned successful response codes.`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      if (brokenPages.length <= 2) {
        return {
          testId: "TCH-04",
          testVersion: "1.0.0",
          testName: "Broken Internal Links",
          category: "technical_health",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Minor Broken Internal Pages Found",
          summary: `${brokenPages.length} internal links resulted in HTTP errors.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: brokenPages.length,
          sampleEvidence: brokenPages.map((p) => `${p.finalUrl} (HTTP ${p.statusCode})`),
        };
      }

      return {
        testId: "TCH-04",
        testVersion: "1.0.0",
        testName: "Broken Internal Links",
        category: "technical_health",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Multiple Broken Internal Links Detected",
        summary: `${brokenPages.length} internal pages returned 404 or server errors during discovery.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: brokenPages.length,
        sampleEvidence: brokenPages.slice(0, 5).map((p) => `${p.finalUrl} (HTTP ${p.statusCode})`),
      };
    },
  },
  {
    id: "TCH-05",
    name: "Robots.txt and XML Sitemap Availability",
    version: "1.0.0",
    category: "technical_health",
    categoryName: "Technical Health & Crawlability",
    maxPoints: 2,
    description: "Validates robots.txt parseability, XML sitemap reference, and eligible URL coverage.",
    businessImpactSummary: "Without an XML sitemap and a clean robots.txt, new products, blog posts, and service pages take significantly longer to be discovered by search engines.",
    remediationAdvice: "Deploy an active XML sitemap index and declare its URL in your robots.txt file.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const hasRobots = Boolean(ctx.robotsTxt && ctx.robotsTxt.length > 10);
      const hasSitemap = ctx.sitemapUrls.length > 0;
      const isRobotsTruncated = Boolean(ctx.isRobotsTruncated);
      const isSitemapTruncated = Boolean(ctx.isSitemapTruncated);

      if (hasRobots && hasSitemap) {
        const isPartial = isRobotsTruncated || isSitemapTruncated;
        const truncationDetails = [
          isRobotsTruncated && "robots.txt truncated",
          isSitemapTruncated && "sitemap truncated at 1 MB limit",
        ]
          .filter(Boolean)
          .join("; ");

        return {
          testId: "TCH-05",
          testVersion: "1.0.0",
          testName: "Robots.txt and XML Sitemap Availability",
          category: "technical_health",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: isPartial
            ? "Robots.txt and XML Sitemap Active (Partially Parsed)"
            : "Robots.txt and XML Sitemap Fully Configured",
          summary: isPartial
            ? `Found valid robots.txt with ${ctx.sitemapUrls.length} discovered sitemap entries (${truncationDetails}; discovery may be partial).`
            : `Found valid robots.txt with ${ctx.sitemapUrls.length} discovered sitemap entries.`,
          timestamp: now,
          confidence: isPartial ? "MEDIUM" : "HIGH",
          limitations: isPartial
            ? "Content was truncated at byte limit; additional directives or sitemap URLs may exist."
            : undefined,
          sampleEvidence: [
            `Robots.txt: Active${isRobotsTruncated ? " (truncated at byte limit)" : ""}`,
            `Sitemap URLs found: ${ctx.sitemapUrls.length}${isSitemapTruncated ? " (truncated at byte limit)" : ""}`,
          ],
        };
      }

      // Truncated robots.txt could contain an unseen sitemap declaration
      if (isRobotsTruncated && !hasSitemap) {
        return {
          testId: "TCH-05",
          testVersion: "1.0.0",
          testName: "Robots.txt and XML Sitemap Availability",
          category: "technical_health",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Robots.txt Truncated; Sitemap Declaration Inconclusive",
          summary: "Robots.txt was found but was truncated at byte limit. No sitemap directive was observed in the evaluated prefix, but truncation could conceal declarations.",
          timestamp: now,
          confidence: "LOW",
          limitations: "Robots.txt was truncated at byte limit; unseen Sitemap declarations may exist beyond boundary.",
          sampleEvidence: ["Robots.txt present (truncated at byte limit); no Sitemap: directive observed in evaluated prefix"],
        };
      }

      // Truncated sitemap yielding zero discovered URLs cannot conclusively establish absence
      if (isSitemapTruncated && !hasSitemap) {
        return {
          testId: "TCH-05",
          testVersion: "1.0.0",
          testName: "Robots.txt and XML Sitemap Availability",
          category: "technical_health",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Sitemap Inconclusive Due to Truncated Content",
          summary: "An XML sitemap was referenced or fetched but was truncated at byte limit before valid URLs could be extracted.",
          timestamp: now,
          confidence: "LOW",
          limitations: "Sitemap was truncated at byte limit before URLs could be parsed.",
          sampleEvidence: ["Sitemap fetched but truncated at byte limit with zero discovered URLs"],
        };
      }

      if (hasRobots && !hasSitemap) {
        return {
          testId: "TCH-05",
          testVersion: "1.0.0",
          testName: "Robots.txt and XML Sitemap Availability",
          category: "technical_health",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Robots.txt Present but XML Sitemap Missing",
          summary: "Robots.txt was found but did not specify an active XML sitemap reference.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["robots.txt present, no Sitemap: line detected"],
        };
      }

      return {
        testId: "TCH-05",
        testVersion: "1.0.0",
        testName: "Robots.txt and XML Sitemap Availability",
        category: "technical_health",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Missing Robots.txt and XML Sitemap",
        summary: "Neither a standard robots.txt file nor an XML sitemap could be located.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "TCH-06",
    name: "Failed or Blocked Resources and Server Errors",
    version: "1.0.0",
    category: "technical_health",
    categoryName: "Technical Health & Crawlability",
    maxPoints: 2,
    description: "Tracks failed in-scope scripts, styles, images, and server 5xx anomalies.",
    businessImpactSummary: "Failed scripts or stylesheets break visual layouts, shopping cart interactions, and tracking.",
    remediationAdvice: "Audit developer console network logs and resolve broken asset URLs.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "TCH-06",
          testVersion: "1.0.0",
          testName: "Failed or Blocked Resources and Server Errors",
          category: "technical_health",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Resources Unobservable",
          summary: "No page data available to evaluate failed or blocked resources.",
          timestamp: now,
          confidence: "LOW",
        };
      }
      const failedResourcesCount = ctx.pages.reduce(
        (sum, p) => sum + p.resources.filter((r) => r.isFailed).length,
        0
      );

      if (failedResourcesCount === 0) {
        return {
          testId: "TCH-06",
          testVersion: "1.0.0",
          testName: "Failed or Blocked Resources and Server Errors",
          category: "technical_health",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "All Critical Resources Loaded Cleanly",
          summary: "No failed in-scope stylesheets, scripts, or critical image assets were detected.",
          timestamp: now,
          confidence: "HIGH",
        };
      }

      if (failedResourcesCount <= 3) {
        return {
          testId: "TCH-06",
          testVersion: "1.0.0",
          testName: "Failed or Blocked Resources and Server Errors",
          category: "technical_health",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Isolated Resource Loading Failures",
          summary: `${failedResourcesCount} page resources failed to load cleanly during scan.`,
          timestamp: now,
          confidence: "MEDIUM",
          sampleEvidence: [`Failed resources: ${failedResourcesCount}`],
        };
      }

      return {
        testId: "TCH-06",
        testVersion: "1.0.0",
        testName: "Failed or Blocked Resources and Server Errors",
        category: "technical_health",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Multiple Failed or Blocked Page Resources",
        summary: `${failedResourcesCount} assets failed to load across crawled pages.`,
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
];
