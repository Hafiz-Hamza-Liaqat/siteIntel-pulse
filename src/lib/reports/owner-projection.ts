import {
  OwnerReport,
  ScanRequest,
  PageObservation,
  AssessmentResult,
  OpportunityTheme,
  CompetitorAssessment,
  ResponsiveDiagnostic,
} from "@/types";
import { computeAuditScores } from "../scoring/engine";
import { CrawlResult } from "../scanner/crawler";
import { isAuthUrl } from "../catalogue/rules/auth";
import { PageSpeedResult } from "../providers/types";

export interface OwnerProjectionOptions {
  pageSpeedData?: { mobile?: PageSpeedResult; desktop?: PageSpeedResult };
  browserResponsiveResults?: ResponsiveDiagnostic[];
  competitorScans?: CompetitorAssessment[];
}

export function projectOwnerReport(
  scanId: string,
  request: ScanRequest,
  crawl: CrawlResult,
  results: AssessmentResult[],
  tenantId?: string,
  options?: OwnerProjectionOptions
): OwnerReport {
  const scoresOutput = computeAuditScores(results);
  const now = new Date().toISOString();
  const entry = crawl.pages[0];
  const domain = new URL(request.targetUrl).hostname;

  // 1. Identify Technology Clues (Non-invasive public heuristics)
  const detectedTechnologies: string[] = [];
  const allHtml = crawl.pages.map((p) => p.visibleTextSample || "").join(" ");
  const allScripts = crawl.pages.flatMap((p) => (p.resources || []).map((r) => r.url.toLowerCase()));

  if (allScripts.some((s) => s.includes("shopify") || s.includes("cdn.shopify.com"))) {
    detectedTechnologies.push("Shopify");
  }
  if (allScripts.some((s) => s.includes("wp-content") || s.includes("wp-includes"))) {
    detectedTechnologies.push("WordPress");
  }
  if (allScripts.some((s) => s.includes("_next") || s.includes("nextjs"))) {
    detectedTechnologies.push("Next.js");
  }
  if (allScripts.some((s) => s.includes("woocommerce"))) {
    detectedTechnologies.push("WooCommerce");
  }
  if (allScripts.some((s) => s.includes("static.parastorage.com") || s.includes("wix.com"))) {
    detectedTechnologies.push("Wix");
  }
  if (allScripts.some((s) => s.includes("squarespace"))) {
    detectedTechnologies.push("Squarespace");
  }
  if (detectedTechnologies.length === 0) {
    detectedTechnologies.push("Modern Web Architecture (Custom / Headless)");
  }

  // 2. Derive Priority Opportunity Themes (Top 3 - 7 Actionable Business Themes)
  const priorityOpportunities: OpportunityTheme[] = [];
  let rank = 1;

  // Check critical or high issues first
  const failResults = results.filter((r) => r.status === "FAIL" || r.status === "WARNING");

  // Technical SEO Opportunity
  const seoIssues = failResults.filter((r) => r.category === "seo");
  if (seoIssues.length > 0) {
    priorityOpportunities.push({
      id: "opp_seo",
      rank: rank++,
      title: "Optimize Search Metadata & Structured Data",
      businessImpact: "Improves organic search click-through rates and ensures key product/service pages rank prominently on Google.",
      potentialServiceCategory: "Technical & On-Page SEO",
      urgency: seoIssues.some((r) => r.severity === "HIGH") ? "HIGH" : "MEDIUM",
      relatedTestIds: seoIssues.map((r) => r.testId),
      recommendedAction: "Audit and update title tags, meta descriptions, and deploy schema.org JSON-LD to unlock rich search snippets.",
    });
  }

  // Security & Trust Opportunity
  const secIssues = failResults.filter((r) => r.category === "public_security");
  if (secIssues.length > 0) {
    priorityOpportunities.push({
      id: "opp_sec",
      rank: rank++,
      title: "Harden Security Headers & Transport Security",
      businessImpact: "Protects brand reputation against spoofing, clickjacking, and browser security warnings.",
      potentialServiceCategory: "Web Security & Cloud Infrastructure",
      urgency: secIssues.some((r) => r.severity === "CRITICAL" || r.severity === "HIGH") ? "HIGH" : "MEDIUM",
      relatedTestIds: secIssues.map((r) => r.testId),
      recommendedAction: "Deploy Strict-Transport-Security (HSTS), Content-Security-Policy, and secure cookie attributes.",
    });
  }

  const isJobBoard = request.businessCategory === "job_board" || (request.businessCategory as any) === "jobs_marketplace";

  // Mobile / Performance Opportunity
  const perfIssues = failResults.filter((r) => r.category === "performance" || r.category === "responsive_accessibility");
  if (perfIssues.length > 0) {
    const isHighUrgency = perfIssues.some((r) => r.severity === "CRITICAL" || r.severity === "HIGH");
    priorityOpportunities.push({
      id: "opp_perf",
      rank: rank++,
      title: "Accelerate Page Speed and Mobile Rendering",
      businessImpact: isJobBoard
        ? "Faster loading times directly increase job application conversions, reduce candidate bounce rates, and improve listing engagement."
        : "Faster loading times directly increase customer conversions and lower visitor bounce rates.",
      potentialServiceCategory: "Performance Engineering & Frontend Optimization",
      urgency: isHighUrgency ? "HIGH" : "MEDIUM",
      relatedTestIds: perfIssues.map((r) => r.testId),
      recommendedAction: isJobBoard
        ? "Minify JavaScript, compress job listing media with WebP format, and eliminate render-blocking CSS stylesheets."
        : "Minify JavaScript, compress images with WebP format, and eliminate render-blocking CSS stylesheets.",
    });
  }

  // AI & Knowledge Readiness Opportunity
  const aiIssues = results.filter((r) => r.category === "geo_aeo_ai" && r.status !== "PASS");
  if (aiIssues.length > 0) {
    priorityOpportunities.push({
      id: "opp_ai",
      rank: rank++,
      title: "Enhance AI-Search (AEO / GEO) Discoverability",
      businessImpact: "Ensures your platform is recognized and cited by generative AI engines like ChatGPT, Claude, and Perplexity.",
      potentialServiceCategory: "AI Search Optimization & Content Strategy",
      urgency: "MEDIUM",
      relatedTestIds: aiIssues.map((r) => r.testId),
      recommendedAction: "Publish structured FAQ sections with direct answers and declare Organization entity schemas.",
    });
  }

  // Analytics Opportunity
  const anaIssues = failResults.filter((r) => r.category === "analytics_tracking");
  if (anaIssues.length > 0) {
    priorityOpportunities.push({
      id: "opp_ana",
      rank: rank++,
      title: "Streamline Analytics & Consent Compliance",
      businessImpact: "Provides reliable attribution data for marketing spend while ensuring compliance with global privacy regulations.",
      potentialServiceCategory: "Analytics & Tag Management Implementation",
      urgency: "MEDIUM",
      relatedTestIds: anaIssues.map((r) => r.testId),
      recommendedAction: "Verify Google Analytics 4 event tags and implement an accessible cookie consent management mechanism.",
    });
  }

  // 3. Issue Distribution Breakdown
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const r of results) {
    if (r.status === "FAIL" || r.status === "WARNING") {
      if (r.severity === "CRITICAL") criticalCount++;
      else if (r.severity === "HIGH") highCount++;
      else if (r.severity === "MEDIUM") mediumCount++;
      else if (r.severity === "LOW") lowCount++;
    }
  }

  const affectedPagesCount = results.reduce((acc, r) => acc + (r.affectedUrlsCount || 0), 0);

  // 4. Competitor Assessments (Grounded in owner-supplied domains)
  const competitorSnapshot: CompetitorAssessment[] = options?.competitorScans && options.competitorScans.length > 0
    ? options.competitorScans
    : (request.competitors || []).map((cDomain) => ({
        domain: cDomain,
        normalizedUrl: `https://${cDomain}`,
        status: "NOT_ASSESSED" as const,
        overallScore: null,
        ratingBand: "NOT_ASSESSED",
        keyMetrics: {
          technicalHealthScore: null,
          seoScore: null,
          performanceScore: null,
          httpsActive: null,
          mobileFriendly: null,
        },
        dataProvenance: {
          source: "SiteIntel Pulse Public Assessment Framework",
          measuredAt: now,
          isEstimated: false,
        },
        disclaimer: "Competitor comparison has not been executed. Real comparison requires a dedicated competitor scan.",
      }));

  // 5. Build Owner Report
  const report: OwnerReport = {
    reportId: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reportVersion: "1.0.0",
    scanId,
    tenantId,
    generatedAt: now,
    companyIdentity: {
      name: request.platformName || domain.replace(/^www\./, "").split(".")[0].toUpperCase(),
      domain,
      targetUrl: request.targetUrl,
      businessCategory: request.businessCategory,
      targetMarket: request.targetMarket,
      preferredLanguage: request.preferredLanguage,
    },
    executiveSnapshot: {
      overallScore: scoresOutput.overallScore,
      categoryScores: scoresOutput.categoryScores,
      coverage: {
        ...crawl.coverage,
        weightedPointsEvaluated: scoresOutput.coverage.weightedPointsEvaluated,
        coveragePercentage: scoresOutput.coverage.overallCoveragePercentage,
      },
      topOpportunities: priorityOpportunities.slice(0, 5),
      testedPageCount: crawl.pages.length,
    },
    platformProfile: {
      detectedTechnologies: Array.from(new Set(detectedTechnologies)),
      totalPagesDiscovered: crawl.coverage.discoveredPages,
      httpsStatus: entry?.finalUrl.startsWith("https://") ? "Enforced (HTTPS)" : "Unencrypted (HTTP)",
      preferredHost: domain,
      primaryLanguage: entry?.language || request.preferredLanguage,
    },
    scoreDetails: scoresOutput.categoryScores,
    issueDistribution: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      totalIssues: criticalCount + highCount + mediumCount + lowCount,
      affectedPagesCount: Math.max(affectedPagesCount, crawl.coverage.failedPages),
    },
    technicalHealthAndSeoSummary: {
      titlesHealthy: crawl.pages.filter((p) => p.title && p.title.length >= 25 && p.title.length <= 70).length,
      descriptionsHealthy: crawl.pages.filter((p) => p.metaDescription && p.metaDescription.length >= 60).length,
      canonicalsConsistent: crawl.pages.every((p) => Boolean(p.canonicalCandidate || (p as any).canonical)),
      brokenLinksCount: crawl.coverage.failedPages,
      sitemapAccessible: crawl.sitemapUrls.length > 0,
      structuredDataPresent: crawl.pages.some((p) => ((p.structuredData || (p as any).schemaObjects || []).length > 0)),
    },
    performanceAndResponsiveSummary: {
      mobileLabScore: options?.pageSpeedData?.mobile?.performanceScore ?? null,
      desktopLabScore: options?.pageSpeedData?.desktop?.performanceScore ?? null,
      coreWebVitalsStatus: options?.pageSpeedData?.mobile?.cruxFieldData
        ? "Field CrUX metrics available"
        : "NOT_CONNECTED (PageSpeed / CrUX API provider not configured)",
      testedViewports: options?.browserResponsiveResults
        ? options.browserResponsiveResults.filter((r) => r.status === "TESTED" || (!r.status && r.viewport)).map((r) => r.viewport)
        : [],
      horizontalOverflowFound: options?.browserResponsiveResults && options.browserResponsiveResults.length > 0
        ? options.browserResponsiveResults.some((r) => r.horizontalOverflow)
        : null,
      responsiveStatus: options?.browserResponsiveResults && options.browserResponsiveResults.length > 0
        ? "TESTED"
        : "NOT_TESTED",
    },
    securityAndAuthSummary: (() => {
      const EXPECTED_SECURITY_HEADERS = [
        "strict-transport-security",
        "content-security-policy",
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
      ];
      const entryHeaders = entry?.headers || {};
      const presentSecurityHeaders = EXPECTED_SECURITY_HEADERS.filter((h) => Boolean(entryHeaders[h]));
      const allCookies = crawl.pages.flatMap((p) => p.cookieAttributes || []);
      const hasCookies = allCookies.length > 0;
      const cookieIssuesCount = hasCookies
        ? allCookies.filter((c) => !c.secure || !c.httpOnly).length
        : null;

      return {
        httpsEnforced: entry?.finalUrl.startsWith("https://") ?? true,
        securityHeadersConfigured: presentSecurityHeaders.length,
        totalSecurityHeadersChecked: EXPECTED_SECURITY_HEADERS.length,
        authSurfacesFound: crawl.pages.flatMap((p: any) => p.links || []).filter((l: any) => l.targetUrl && isAuthUrl(l.targetUrl)).length,
        publicCookieIssues: cookieIssuesCount,
        cookieAssessmentStatus: hasCookies
          ? (cookieIssuesCount! > 0 ? ("ISSUES_OBSERVED" as const) : ("OBSERVED_CLEAN" as const))
          : ("NO_COOKIES_OBSERVED" as const),
        limitationsNote: "Passive public configuration audit only. Internal passwords, databases, and authenticated controls were not probed.",
      };
    })(),
    contentTrustAiSummary: {
      blogOrResourcePresent: crawl.pages.flatMap((p: any) => p.links || []).some((l: any) => l.targetUrl && (l.targetUrl.includes("blog") || l.targetUrl.includes("faq"))),
      aiCrawlerPolicy: (typeof crawl.robotsTxt === "string" ? crawl.robotsTxt : ((crawl.robotsTxt as any)?.raw || "")).includes("GPTBot") ? "Selective Bot Directives Detected" : "Standard Open AI Crawl Permissions",
      entitySchemaPresent: crawl.pages.some((p: any) =>
        (p.structuredData || p.schemaObjects || []).some((s: any) => {
          const t = String(s["@type"] || "").toLowerCase();
          return t.includes("organization") || t.includes("brand");
        })
      ),
      contactOrTrustSignalsPresent: crawl.pages.flatMap((p: any) => p.links || []).some((l: any) => l.targetUrl && (l.targetUrl.includes("about") || l.targetUrl.includes("contact"))),
    },
    analyticsAndTrackingSummary: {
      ga4Detected: crawl.pages.some((p: any) => (p.resources || []).some((r: any) => r.url && r.url.includes("googletagmanager.com/gtag/js"))),
      gtmDetected: crawl.pages.some((p: any) => (p.resources || []).some((r: any) => r.url && r.url.includes("googletagmanager.com/gtm.js"))),
      advertisingPixelsCount: crawl.pages.flatMap((p: any) => p.resources || []).filter((r: any) => r.url && (r.url.includes("facebook.net") || r.url.includes("googleadservices.com"))).length,
      consentUiDetected: crawl.pages.some((p: any) => (p.visibleTextSample || "").toLowerCase().includes("cookie")),
      measurementAccountConnected: false,
    },
    competitorSnapshot,
    priorityOpportunities: priorityOpportunities.slice(0, 5),
    methodologyAndLimitations: {
      scanScope: "Bounded non-invasive public assessment strictly respecting robots.txt and safe crawl budgets.",
      dataSources: [
        "Public HTML and response header observations",
        "Deterministic 100-point Assessment Catalogue v1.0",
        "Public robots.txt and XML sitemaps",
      ],
      scoreDefinitions: "Scores reflect observable technical baseline quality from 0 to 100 points, categorized into 5 standard health bands.",
      disclaimers: [
        "This report is generated for Company A platform decision-makers and summarizes observable public indicators.",
        "A high score does not guarantee top Google search rankings, sales growth, or absence of internal backend vulnerabilities.",
        "Detailed code-level remediation steps and authenticated deep testing are reserved for the Milestone 2 Expert Audit.",
      ],
      expertEngagementCta: "To receive exact code fix locations, reproduction steps, authenticated security audits, and developer repair work plans, request a Company B Expert Diagnostic Audit.",
    },
    results,
  };

  return report;
}
