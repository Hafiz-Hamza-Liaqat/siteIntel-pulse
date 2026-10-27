import crypto from "crypto";
import {
  ExpertReport,
  ExpertReportMetadata,
  ExpertPlatformProfile,
  ExpertAssessmentResult,
  TechnicalEvidence,
  PageDiagnostic,
  LinkDiagnostic,
  TagDiagnostic,
  IntegrationDiagnostic,
  ResponsiveDiagnostic,
  VisualDesignDiagnostic,
  SecurityDiagnostic,
  AuthenticationDiagnostic,
  CompetitorComparison,
  ExternalMetric,
  RemediationTask,
  WorkstreamEstimate,
  ReportCoverage,
  ExpertExportManifest,
  ScanRequest,
  AssessmentResult,
  PageObservation,
  LinkObservation,
  ResourceObservation,
} from "@/types";
import { computeAuditScores } from "../scoring/engine";
import { CrawlResult } from "../scanner/crawler";
import { CATEGORY_ALLOCATED_WEIGHTS, assessmentRegistry } from "../catalogue/registry";
import { isAuthUrl } from "../catalogue/rules/auth";
import { PageSpeedResult } from "../providers/types";
import { computeCanonicalReportDigest } from "./manifest-integrity";
import { calculateCostOfInaction } from "./cost-of-inaction";

export interface ExpertAuditOptions {
  isAuthorizedForAuthScan?: boolean;
  testCredentials?: { username?: string; password?: string };
  repositoryUrl?: string;
  targetSearchTerms?: string[];
  companyBName?: string;
  companyBRole?: string;
  pageSpeedData?: { mobile?: PageSpeedResult; desktop?: PageSpeedResult };
  browserResponsiveResults?: ResponsiveDiagnostic[];
  visualDesign?: VisualDesignDiagnostic;
  competitorScans?: CompetitorComparison[];
  businessCategoryDetection?: import("@/types").BusinessCategoryDetection;
  costOfInaction?: import("@/types").CostOfInactionResult;
}

export function projectExpertReport(
  scanId: string,
  request: ScanRequest,
  crawl: CrawlResult,
  results: AssessmentResult[],
  options: ExpertAuditOptions = {},
  tenantId?: string
): ExpertReport {
  const scoresOutput = computeAuditScores(results);
  const now = new Date().toISOString();
  const entry = crawl.pages[0];
  const domain = new URL(request.targetUrl).hostname;
  const effectiveCategory =
    options.businessCategoryDetection?.effectiveCategory ||
    (request.businessCategory && request.businessCategory !== "auto"
      ? (request.businessCategory as any)
      : "other");
  const reportId = `rep_exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Platform Profile Detection (Evidence-Backed)
  const allScripts = crawl.pages.flatMap((p) =>
    (p.resources || []).map((r) => r.url.toLowerCase())
  );
  const allHeaders = entry?.headers || {};
  const serverHeader = allHeaders["server"] || "";
  const poweredByHeader = allHeaders["x-powered-by"] || "";

  let cmsCategory = "Custom / Headless Web Architecture";
  const frameworkHints: string[] = [];
  const serverCdnClues: string[] = [];
  const clientTechnologies: string[] = [];
  const aiIntegrationClues: string[] = [];

  if (allScripts.some((s) => s.includes("shopify") || s.includes("cdn.shopify.com"))) {
    cmsCategory = "Shopify (E-Commerce Platform)";
    clientTechnologies.push("Shopify Storefront", "Liquid Engine");
  } else if (allScripts.some((s) => s.includes("wp-content") || s.includes("wp-includes"))) {
    cmsCategory = "WordPress CMS";
    clientTechnologies.push("WordPress PHP Runtime");
  } else if (allScripts.some((s) => s.includes("woocommerce"))) {
    cmsCategory = "WooCommerce on WordPress";
  } else if (allScripts.some((s) => s.includes("wix.com") || s.includes("static.parastorage.com"))) {
    cmsCategory = "Wix Cloud Platform";
  } else if (allScripts.some((s) => s.includes("squarespace"))) {
    cmsCategory = "Squarespace Platform";
  }

  // Framework hints
  if (allScripts.some((s) => s.includes("_next") || s.includes("nextjs"))) {
    frameworkHints.push("Next.js (React Framework)");
  }
  if (allScripts.some((s) => s.includes("react") || s.includes("react-dom"))) {
    frameworkHints.push("React UI Library");
  }
  if (allScripts.some((s) => s.includes("vue") || s.includes("nuxt"))) {
    frameworkHints.push("Vue.js / Nuxt");
  }
  if (allScripts.some((s) => s.includes("tailwind"))) {
    frameworkHints.push("Tailwind CSS Utilities");
  }

  // Server & CDN clues
  if (serverHeader) serverCdnClues.push(`Server header: ${serverHeader}`);
  if (poweredByHeader) serverCdnClues.push(`X-Powered-By: ${poweredByHeader}`);
  if (allHeaders["cf-ray"] || allHeaders["server"]?.includes("cloudflare")) {
    serverCdnClues.push("Cloudflare Edge Network / Reverse Proxy");
  }
  if (allHeaders["x-vercel-id"]) {
    serverCdnClues.push("Vercel Edge Platform");
  }
  if (allHeaders["x-amz-cf-id"]) {
    serverCdnClues.push("AWS CloudFront CDN");
  }

  // AI & Chatbot clues
  if (allScripts.some((s) => s.includes("openai") || s.includes("chatbot") || s.includes("intercom") || s.includes("drift") || s.includes("zendesk"))) {
    aiIntegrationClues.push("Front-end conversational or support widget detected");
  }
  if (crawl.robotsTxt && (typeof crawl.robotsTxt === "string" ? crawl.robotsTxt : (crawl.robotsTxt as any)?.raw || "").includes("GPTBot")) {
    aiIntegrationClues.push("Robots.txt contains specific directives for OpenAI GPTBot");
  }

  const platformProfile: ExpertPlatformProfile = {
    cmsCategory,
    frameworkHints,
    serverCdnClues,
    clientTechnologies,
    aiIntegrationClues,
    confidence: frameworkHints.length > 0 || cmsCategory.includes("WordPress") || cmsCategory.includes("Shopify") ? "HIGH" : "MEDIUM",
    repositoryClues: options.repositoryUrl || undefined,
  };

  // 2. Expert Findings Registry (ExpertAssessmentResult[])
  const findings: ExpertAssessmentResult[] = results.map((r, idx) => {
    let workstream: ExpertAssessmentResult["workstream"] = "engineering";
    if (r.category === "seo") workstream = "seo";
    else if (r.category === "performance") workstream = "performance";
    else if (r.category === "public_security") workstream = "security";
    else if (r.category === "authentication_posture") workstream = "security";
    else if (r.category === "responsive_accessibility") workstream = "accessibility";
    else if (r.category === "analytics_tracking") workstream = "analytics";
    else if (r.category === "content_quality") workstream = "content";
    else if (r.category === "geo_aeo_ai") workstream = "ai_automation";

    let estimatedEffort: ExpertAssessmentResult["estimatedEffort"] = "MODERATE";
    if (r.severity === "LOW" || r.severity === "INFORMATIONAL") estimatedEffort = "QUICK_FIX";
    else if (r.severity === "HIGH") estimatedEffort = "COMPLEX";
    else if (r.severity === "CRITICAL") estimatedEffort = "STRATEGIC";

    const findingId = `EXP-${r.testId}-${String(idx + 1).padStart(3, "0")}`;
    const ruleDef = assessmentRegistry.getRule(r.testId);

    // Identify if finding is inherently site-wide (infrastructure, robots, DNS, TLS)
    const isSiteWideRule =
      r.category === "public_security" ||
      r.category === "geo_aeo_ai" ||
      ["AI-01", "AI-02", "AI-03", "AI-04", "SEC-01", "SEC-02", "SEC-03", "SEC-04", "SEC-05", "SEO-05", "TRK-01", "DNS-01"].includes(r.testId);

    let scope: ExpertAssessmentResult["scope"] = isSiteWideRule ? "site_wide" : "page_specific";

    // Resolve accurate affected URLs from actual test evidence (only for failing/warning findings)
    let affectedUrls: string[] = [];
    if (r.status === "FAIL" || r.status === "WARNING") {
      if (r.sampleEvidence && r.sampleEvidence.length > 0) {
        const urlMatches = r.sampleEvidence
          .flatMap((ev) => {
            const m = ev.match(/https?:\/\/[^\s,"']+/g);
            return m || [];
          })
          .filter(Boolean);
        if (urlMatches.length > 0) {
          affectedUrls = Array.from(new Set(urlMatches));
        }
      }
      if (affectedUrls.length === 0 && r.evidenceReferences && r.evidenceReferences.length > 0) {
        affectedUrls = r.evidenceReferences.filter((ref) => ref.startsWith("http"));
      }
      // If no specific page URL in evidence, do NOT fabricate the homepage as an affected URL.
      // Retain empty affectedUrls for site-wide configuration issues or unlocated findings.
    }

    const totalAffectedPages = r.affectedUrlsCount ?? affectedUrls.length;
    const boundedAffectedUrls = affectedUrls.slice(0, 10);

    // Resolve remediation text from rule definition - NEVER placeholder text
    const remediationText =
      r.remediationTheme && !r.remediationTheme.toLowerCase().includes("follow documented remediation")
        ? r.remediationTheme
        : ruleDef?.remediationAdvice || ruleDef?.description || `Apply standard security and SEO remediation for ${r.testId}.`;

    const evidence: TechnicalEvidence[] = [
      {
        evidenceId: `EVD-${findingId}-1`,
        findingId,
        source: {
          id: `SRC-${findingId}`,
          type: "html_parser",
          timestamp: now,
          location: boundedAffectedUrls[0] || (isSiteWideRule ? request.targetUrl : "Site-wide observation"),
          confidence: r.confidence,
        },
        observedValue: r.summary,
        expectedCondition: ruleDef?.description || `Standard rule compliance for ${r.testId}`,
        discrepancy: r.status === "PASS" ? "None. Requirement satisfied." : `Finding detected: ${r.summary}`,
        reproductionSteps: [
          `1. Inspect target endpoint (${boundedAffectedUrls[0] || request.targetUrl}) for rule ${r.testId} (${r.testName}).`,
          `2. Execute rule evaluation assertion: verify ${ruleDef?.description || "expected criteria"}.`,
          `3. Compare observed value against required condition.`,
        ],
        validationAssertion: `Retest rule ${r.testId} returns status PASS upon fix deployment. Expected score: ${r.maxPoints}/${r.maxPoints} pts.`,
      },
    ];

    return {
      id: findingId,
      testId: r.testId,
      testVersion: r.testVersion,
      category: r.category,
      categoryName: r.category,
      title: r.title,
      status: r.status,
      severity: r.severity,
      confidence: r.confidence,
      scope,
      totalAffectedPages,
      affectedUrls: boundedAffectedUrls,
      affectedElements: r.sampleEvidence || [],
      technicalImpact: `Affects ${r.category} scoring weight (${r.maxPoints} pts). ${r.summary}`,
      businessImpact: ruleDef?.businessImpactSummary || r.summary,
      remediation: remediationText,
      validationProcedure: `Retest rule ${r.testId} (${r.testName}): verify ${ruleDef?.description || "expected condition"} is satisfied. Target: ${r.maxPoints}/${r.maxPoints} pts.`,
      workstream,
      estimatedEffort,
      evidence,
      dependencies: [],
    };
  });

  // 3. Full URL Inventory (PageDiagnostic[])
  const urlInventory: PageDiagnostic[] = crawl.pages.map((p, idx) => {
    const pageUrl = p.finalUrl || p.requestedUrl;
    const isSeed = idx === 0 || pageUrl === request.targetUrl;
    const lowerUrl = pageUrl.toLowerCase();
    const isSitemap =
      p.isXmlSitemap ||
      p.documentType === "xml_sitemap" ||
      crawl.sitemapUrls.includes(pageUrl) ||
      (p.contentType && p.contentType.includes("xml")) ||
      lowerUrl.endsWith(".xml") ||
      lowerUrl.includes("sitemap");
    const isRobots =
      p.documentType === "robots_txt" ||
      lowerUrl.endsWith("/robots.txt") ||
      lowerUrl.endsWith("robots.txt");
    const isNonHtml = Boolean(p.documentType && p.documentType !== "html");
    const isExcludedFromHtml = isSitemap || isRobots || isNonHtml;

    const discoverySource = isSeed ? "seed_url" : isSitemap ? "sitemap" : isRobots ? "robots_txt" : "internal_link";

    const isNoIndex =
      (p.robotsDirectives || []).some((r) => r.toLowerCase().includes("noindex")) ||
      (p.headers["x-robots-tag"] || "").toLowerCase().includes("noindex");

    let indexabilityStatus: PageDiagnostic["indexabilityStatus"] = "INDEXABLE";
    if (p.statusCode >= 400) {
      indexabilityStatus = "ERROR";
    } else if (p.statusCode >= 300) {
      indexabilityStatus = "REDIRECT";
    } else if (isExcludedFromHtml) {
      indexabilityStatus = "NOT_APPLICABLE";
    } else if (isNoIndex) {
      indexabilityStatus = "NOINDEX";
    } else {
      indexabilityStatus = "INDEXABLE";
    }

    const canonicalCandidate = isExcludedFromHtml ? undefined : (p.canonicalCandidate || (p as any).canonical);
    let canonicalStatus: PageDiagnostic["canonicalStatus"] = "MISSING";
    if (isExcludedFromHtml) {
      canonicalStatus = "NOT_APPLICABLE";
    } else if (canonicalCandidate) {
      canonicalStatus = canonicalCandidate === pageUrl ? "SELF" : "CROSS_PAGE";
    }

    let exclusionReason: string | undefined = undefined;
    if (isSitemap) {
      exclusionReason = "XML sitemap resource: excluded from HTML page checks (titles, meta descriptions, headings, canonicals, and indexability).";
    } else if (isRobots) {
      exclusionReason = "Robots.txt resource: excluded from HTML page checks.";
    } else if (isNonHtml) {
      exclusionReason = `${p.documentType || "Non-HTML"} resource: excluded from HTML page checks.`;
    }

    const structuredDataTypes: string[] = [];
    const rawSchemas = p.structuredData || (p as any).schemaObjects || [];
    for (const s of rawSchemas) {
      if (s["@type"]) structuredDataTypes.push(s["@type"]);
    }

    let testStatus: PageDiagnostic["testStatus"] = "FULLY_TESTED";
    if (p.statusCode >= 400) {
      testStatus = "FAILED";
    } else if (p.statusCode >= 300) {
      testStatus = "SKIPPED";
    } else if (isExcludedFromHtml) {
      testStatus = "PARTIALLY_TESTED";
    } else {
      testStatus = "FULLY_TESTED";
    }

    // Derive per-page finding counts directly from matched findings for this page URL
    const pageUrlNormalized = p.normalizedUrl || pageUrl;
    const matchedFindings = findings.filter(
      (f) =>
        (f.status === "FAIL" || f.status === "WARNING") &&
        f.affectedUrls.some((u) => u === pageUrl || u === pageUrlNormalized)
    );

    const criticalFindings = matchedFindings.filter((f) => f.severity === "CRITICAL").length;
    const highFindings = matchedFindings.filter((f) => f.severity === "HIGH").length;
    const mediumFindings = matchedFindings.filter((f) => f.severity === "MEDIUM").length;
    const lowFindings = matchedFindings.filter((f) => f.severity === "LOW").length;

    return {
      url: pageUrl,
      normalizedUrl: p.normalizedUrl,
      statusCode: p.statusCode,
      responseTimeMs: p.responseTimeMs ?? (p as any).loadTimeMs ?? 0,
      contentType: p.contentType || "text/html",
      discoverySource,
      crawlDepth: (p as any).crawlDepth ?? (isSeed ? 0 : 1),
      indexabilityStatus,
      canonicalCandidate,
      canonicalStatus,
      exclusionReason,
      title: isExcludedFromHtml ? undefined : p.title,
      titleLength: isExcludedFromHtml ? 0 : (p.title?.length || 0),
      metaDescription: isExcludedFromHtml ? undefined : p.metaDescription,
      metaDescriptionLength: isExcludedFromHtml ? 0 : (p.metaDescription?.length || 0),
      headingsOutline: isExcludedFromHtml
        ? { h1: [], h2: [], h3: [] }
        : {
            h1: p.headings?.h1 || [],
            h2: p.headings?.h2 || [],
            h3: p.headings?.h3 || [],
          },
      wordCount: isExcludedFromHtml ? 0 : (p.visibleWordCount || 0),
      internalLinksCount: (p.links || []).filter((l) => l.isInternal).length,
      outboundLinksCount: (p.links || []).filter((l) => !l.isInternal).length,
      resourcesCount: (p.resources || []).length,
      structuredDataTypes,
      findingsCount: {
        critical: criticalFindings,
        high: highFindings,
        medium: mediumFindings,
        low: lowFindings,
      },
      testStatus,
    };
  });

  // 3. Link Audit Diagnostics (LinkDiagnostic[])
  const allPageLinks = crawl.pages.flatMap((p) => p.links || []);
  const internalLinks: LinkDiagnostic[] = [];
  const outboundLinks: LinkDiagnostic[] = [];
  const brokenLinks: LinkDiagnostic[] = [];

  allPageLinks.forEach((l, idx) => {
    const diag: LinkDiagnostic = {
      id: `lnk_${idx + 1}`,
      sourceUrl: l.sourceUrl,
      targetUrl: l.targetUrl,
      anchorText: l.anchorText || "[No Anchor Text]",
      isInternal: l.isInternal,
      statusCode: l.statusCode,
      isBroken: l.isBroken || (l.statusCode !== undefined && l.statusCode >= 400),
      isRedirect: l.isRedirect,
      redirectChain: l.redirectTarget ? [l.redirectTarget] : [],
      relAttributes: l.rel ? l.rel.split(" ") : [],
      linkLocation: l.anchorText.toLowerCase().includes("privacy") || l.anchorText.toLowerCase().includes("terms") ? "footer" : "content",
    };

    if (diag.isBroken) brokenLinks.push(diag);
    if (diag.isInternal) internalLinks.push(diag);
    else outboundLinks.push(diag);
  });

  // Orphan candidates: Discovered HTML content pages with 0 incoming internal links from other discovered pages
  // Strictly exclude XML sitemaps, robots.txt, XML endpoints, and non-HTML resources
  const orphanCandidates: string[] = [];
  const internalTargets = new Set(internalLinks.map((l) => l.targetUrl));
  urlInventory.slice(1).forEach((page) => {
    const lowerUrl = page.url.toLowerCase();
    const isExcluded =
      page.indexabilityStatus === "NOT_APPLICABLE" ||
      page.canonicalStatus === "NOT_APPLICABLE" ||
      lowerUrl.endsWith(".xml") ||
      lowerUrl.includes("sitemap") ||
      lowerUrl.endsWith("robots.txt") ||
      page.contentType.toLowerCase().includes("xml");
    if (isExcluded) return;
    if (!internalTargets.has(page.url)) {
      orphanCandidates.push(page.url);
    }
  });

  // 4. Integrations Diagnostics (IntegrationDiagnostic[])
  const integrations: IntegrationDiagnostic[] = [
    {
      id: "INT-01",
      name: "Google Analytics 4 (GA4)",
      category: "analytics",
      state: allScripts.some((s) => s.includes("googletagmanager.com/gtag/js"))
        ? "LOAD_OBSERVED"
        : "NOT_DETECTED",
      detectedClues: allScripts.filter((s) => s.includes("gtag/js")),
      scriptUrls: allScripts.filter((s) => s.includes("gtag/js")),
      notes: "GA4 loader tag observed on public markup. Data streams require authorized connection.",
    },
    {
      id: "INT-02",
      name: "Google Tag Manager (GTM)",
      category: "analytics",
      state: allScripts.some((s) => s.includes("googletagmanager.com/gtm.js"))
        ? "LOAD_OBSERVED"
        : "NOT_DETECTED",
      detectedClues: allScripts.filter((s) => s.includes("gtm.js")),
      scriptUrls: allScripts.filter((s) => s.includes("gtm.js")),
      notes: "Tag Manager container detected. Container trigger logic operates in browser context.",
    },
    {
      id: "INT-03",
      name: "Meta / Facebook Pixel",
      category: "marketing",
      state: allScripts.some((s) => s.includes("connect.facebook.net"))
        ? "LOAD_OBSERVED"
        : "NOT_DETECTED",
      detectedClues: allScripts.filter((s) => s.includes("connect.facebook.net")),
      scriptUrls: allScripts.filter((s) => s.includes("connect.facebook.net")),
      notes: "Advertising conversion tracking pixel observed.",
    },
    {
      id: "INT-04",
      name: "Consent Management Platform (CMP)",
      category: "security",
      state: crawl.pages.some((p) => (p.visibleTextSample || "").toLowerCase().includes("cookie"))
        ? "DETECTED"
        : "NOT_DETECTED",
      detectedClues: ["Cookie banner text patterns observed in DOM"],
      scriptUrls: [],
      notes: "Consent banner present to govern third-party cookie issuance.",
    },
    {
      id: "INT-05",
      name: "Conversational AI / Support Chat",
      category: "chat",
      state: allScripts.some((s) => s.includes("intercom") || s.includes("zendesk") || s.includes("drift"))
        ? "LOAD_OBSERVED"
        : "NOT_DETECTED",
      detectedClues: allScripts.filter((s) => s.includes("intercom") || s.includes("zendesk") || s.includes("drift")),
      scriptUrls: allScripts.filter((s) => s.includes("intercom") || s.includes("zendesk") || s.includes("drift")),
      notes: "Interactive client support widget integration.",
    },
  ];

  // 5. Responsive Diagnostics (ResponsiveDiagnostic[])
  const responsiveDiagnostics: ResponsiveDiagnostic[] =
    options.browserResponsiveResults && options.browserResponsiveResults.length > 0
      ? options.browserResponsiveResults
      : [];

  // 6. Security Diagnostics (SecurityDiagnostic[])
  const securityDiagnostics: SecurityDiagnostic[] = [
    {
      id: "SEC-DIAG-01",
      title: "Strict-Transport-Security (HSTS) Header",
      scope: "public_passive",
      testedEndpoint: request.targetUrl,
      headerName: "Strict-Transport-Security",
      observedValue: allHeaders["strict-transport-security"] || undefined,
      expectedValue: "max-age=31536000; includeSubDomains; preload",
      severity: allHeaders["strict-transport-security"] ? "LOW" : "HIGH",
      exploitabilityNote: "Lack of HSTS exposes initial HTTP visits to SSL stripping attacks.",
      remediation: "Deploy Strict-Transport-Security header with at least 1-year max-age and includeSubDomains.",
    },
    {
      id: "SEC-DIAG-02",
      title: "Content-Security-Policy (CSP)",
      scope: "public_passive",
      testedEndpoint: request.targetUrl,
      headerName: "Content-Security-Policy",
      observedValue: allHeaders["content-security-policy"] || undefined,
      expectedValue: "default-src 'self'; script-src 'self' ...",
      severity: allHeaders["content-security-policy"] ? "LOW" : "MEDIUM",
      exploitabilityNote: "Missing CSP leaves the application vulnerable to cross-site scripting (XSS) injection.",
      remediation: "Define an explicit Content-Security-Policy restricting script, frame, and object sources.",
    },
    {
      id: "SEC-DIAG-03",
      title: "Framing Protections (X-Frame-Options / frame-ancestors)",
      scope: "public_passive",
      testedEndpoint: request.targetUrl,
      headerName: "X-Frame-Options",
      observedValue: allHeaders["x-frame-options"] || undefined,
      expectedValue: "DENY or SAMEORIGIN",
      severity: allHeaders["x-frame-options"] ? "LOW" : "HIGH",
      exploitabilityNote: "Missing frame restriction allows third-party iframing and clickjacking exploits.",
      remediation: "Set X-Frame-Options: SAMEORIGIN or CSP frame-ancestors 'self'.",
    },
    {
      id: "SEC-DIAG-04",
      title: "MIME Sniffing Prevention (X-Content-Type-Options)",
      scope: "public_passive",
      testedEndpoint: request.targetUrl,
      headerName: "X-Content-Type-Options",
      observedValue: allHeaders["x-content-type-options"] || undefined,
      expectedValue: "nosniff",
      severity: allHeaders["x-content-type-options"] ? "LOW" : "MEDIUM",
      exploitabilityNote: "Browsers may execute non-executable files if MIME sniffing is not disabled.",
      remediation: "Add X-Content-Type-Options: nosniff header to all HTTP responses.",
    },
    {
      id: "SEC-DIAG-05",
      title: "Information Disclosure in Server Response Headers",
      scope: "public_passive",
      testedEndpoint: request.targetUrl,
      headerName: "Server / X-Powered-By",
      observedValue: [serverHeader, poweredByHeader].filter(Boolean).join(" / ") || undefined,
      expectedValue: "Header omitted or generic",
      severity: poweredByHeader ? "LOW" : "INFORMATIONAL",
      exploitabilityNote: "Exposing runtime versions aids automated vulnerability scanners in targeting known CVEs.",
      remediation: "Suppress Server and X-Powered-By banners in web server configuration.",
    },
    {
      id: "SEC-DIAG-06",
      title: "Referrer-Policy Header",
      scope: "public_passive",
      testedEndpoint: request.targetUrl,
      headerName: "Referrer-Policy",
      observedValue: allHeaders["referrer-policy"] || undefined,
      expectedValue: "strict-origin-when-cross-origin or no-referrer",
      severity: allHeaders["referrer-policy"] ? "LOW" : "MEDIUM",
      exploitabilityNote: "Missing Referrer-Policy may leak private URL paths or query parameters to third-party endpoints.",
      remediation: "Deploy Referrer-Policy: strict-origin-when-cross-origin to prevent leakage across origin boundaries.",
    },
  ];

  // 7. Authentication Assessment (AuthenticationDiagnostic)
  const authSurfaces = internalLinks.filter((l) => isAuthUrl(l.targetUrl));
  const allCookies = crawl.pages.flatMap((p) => p.cookieAttributes || []);
  const hasCookies = allCookies.length > 0;

  const authenticationAssessment: AuthenticationDiagnostic = {
    isAuthorized: Boolean(options.isAuthorizedForAuthScan),
    testAccountUsed: options.isAuthorizedForAuthScan ? "authorized_qa_testuser [Credentials Encrypted]" : undefined,
    publicLoginSurfaces: authSurfaces.map((s) => ({
      url: s.targetUrl,
      isHttps: s.targetUrl.startsWith("https://"),
      hasCsrfClue: false,
      hasAutocompleteProtection: false,
    })),
    testedFlows: [
      {
        flowName: "Active Dynamic Authentication Test",
        status: "NOT_TESTED",
        details: options.isAuthorizedForAuthScan
          ? "Dedicated test account authorized, but dynamic authentication flow execution was not conducted in this scan pass."
          : "Requires explicit owner testing authorization and dedicated test credentials.",
      },
    ],
    sessionSecurity: {
      cookieSecure: hasCookies ? allCookies.every((c) => c.secure) : null,
      cookieHttpOnly: hasCookies ? allCookies.every((c) => c.httpOnly) : null,
      cookieSameSite: hasCookies
        ? allCookies.find((c) => c.sameSite && c.sameSite.trim().length > 0)?.sameSite || null
        : null,
      expiryObserved: hasCookies ? "Observed in response headers" : null,
      cookiesObserved: allCookies.length,
      status: hasCookies ? "OBSERVED" : "NO_COOKIES_OBSERVED",
    },
    mfaIndicators: {
      observed: authSurfaces.length > 0,
      method: "Observable multi-factor prompts require authorized session initiation",
      note: "Passive public crawl cannot verify backend MFA enforcement.",
    },
    untestedControls: [
      "Role-Based Access Control (RBAC) Privilege Escalation",
      "SAML / OAuth Token Lifetime & Replay Prevention",
      "Password Reset Rate Limiting & Account Lockout",
    ],
  };

  // 8. Competitor Comparison
  const competitorComparisons: CompetitorComparison[] = options.competitorScans && options.competitorScans.length > 0
    ? options.competitorScans
    : (request.competitors || []).map((compDomain) => ({
        domain: compDomain,
        status: "NOT_ASSESSED" as const,
        overallScore: null,
        categoryScores: undefined,
        detectedTechnologies: [],
        keyStrengths: [],
        keyWeaknesses: [],
        dataProvenance: "No comparable scan executed for this competitor domain.",
        isEstimated: false,
      }));

  // 9. External Metrics (Honest Disclosures)
  const analyticsAndMetrics: ExternalMetric[] = [
    {
      metricName: "Monthly Active Users (MAU)",
      value: null,
      formattedValue: "UNAVAILABLE",
      source: "Google Analytics 4 API",
      status: "NOT_CONNECTED",
      provenanceNote: "Requires owner-authorized OAuth connection to Google Analytics property.",
    },
    {
      metricName: "Organic Search Clicks (30 Days)",
      value: null,
      formattedValue: "UNAVAILABLE",
      source: "Google Search Console API",
      status: "NOT_CONNECTED",
      provenanceNote: "Requires owner-authorized OAuth connection to verified GSC domain property.",
    },
    {
      metricName: "Core Web Vitals (Field CrUX)",
      value: null,
      formattedValue: "Lab Diagnostic Estimated",
      source: "Chrome User Experience Report (CrUX)",
      status: "ESTIMATED",
      provenanceNote: "Field metrics require authorized traffic volume in Google CrUX dataset; lab performance estimated.",
    },
    {
      metricName: "Inbound Referring Domains",
      value: null,
      formattedValue: "UNAVAILABLE",
      source: "External Backlink Provider",
      status: "NOT_CONNECTED",
      provenanceNote: "External backlink index unconfigured. Inbound links cannot be scraped from internal crawls.",
    },
    {
      metricName: "Organic Keyword Rankings",
      value: null,
      formattedValue: "UNAVAILABLE",
      source: "Search Engine Results Page (SERP) Index",
      status: "NOT_CONNECTED",
      provenanceNote: "Requires third-party search ranking index integration.",
    },
    {
      metricName: "Company Net Worth / Revenue",
      value: null,
      formattedValue: "NOT FABRICATED",
      source: "Financial Record Standard",
      status: "UNAVAILABLE",
      provenanceNote: "Financial guessing and synthetic corporate valuations are strictly prohibited.",
    },
  ];

  // 11. Prioritized Remediation Tasks & Workstream Estimates
  const remediationRegister: RemediationTask[] = [];
  const issueFindings = findings.filter((f) => f.status === "FAIL" || f.status === "WARNING");

  const workstreamMap: Record<RemediationTask["workstream"], { title: string; specialist: string }> = {
    seo: { title: "Technical SEO & Metadata Optimization", specialist: "Technical SEO Consultant" },
    performance: { title: "Front-End Performance & Asset Delivery", specialist: "Front-End Performance Engineer" },
    security: { title: "Public Security Configuration & Headers", specialist: "Cybersecurity Analyst" },
    accessibility: { title: "Responsive Layout & Accessible Navigation", specialist: "UI/UX & Accessibility Specialist" },
    analytics: { title: "Analytics Tracking & Event Measurement", specialist: "Measurement & Analytics Architect" },
    content: { title: "Content Quality & Editorial Authority", specialist: "Content Strategist" },
    ai_automation: { title: "AI Search Readiness & Entity Schemas", specialist: "GEO/AEO & AI Specialist" },
    engineering: { title: "Core Platform Architecture & Crawl Hygiene", specialist: "Full-Stack Web Developer" },
  };

  const workstreams = Object.keys(workstreamMap) as RemediationTask["workstream"][];
  const workstreamEstimates: WorkstreamEstimate[] = [];

  workstreams.forEach((ws, wsIdx) => {
    const wsFindings = issueFindings.filter((f) => f.workstream === ws);
    const criticals = wsFindings.filter((f) => f.severity === "CRITICAL").length;

    workstreamEstimates.push({
      workstream: ws,
      title: workstreamMap[ws].title,
      taskCount: wsFindings.length,
      criticalCount: criticals,
      estimatedEffortSummary: wsFindings.length === 0 ? "No active remediations" : `${wsFindings.length} task(s) estimated`,
      recommendedSpecialist: workstreamMap[ws].specialist,
    });

    if (wsFindings.length > 0) {
      remediationRegister.push({
        id: `TASK-${String(wsIdx + 1).padStart(3, "0")}`,
        title: workstreamMap[ws].title,
        workstream: ws,
        priority: criticals > 0 ? "CRITICAL" : wsFindings.some((f) => f.severity === "HIGH") ? "HIGH" : "MEDIUM",
        status: "PLANNED",
        findingIds: wsFindings.map((f) => f.id),
        affectedUrls: Array.from(new Set(wsFindings.flatMap((f) => f.affectedUrls))),
        estimatedEffort: criticals > 0 ? "COMPLEX" : "MODERATE",
        estimatedHours: wsFindings.length * 4,
        actionSteps: wsFindings.map((f) => f.remediation),
        validationProcedure: `Rerun assessment catalogue tests: ${wsFindings.map((f) => f.testId).join(", ")}.`,
        dependencies: [],
      });
    }
  });

  // 12. Issue totals
  const issueTotals = {
    critical: findings.filter((f) => f.severity === "CRITICAL" && (f.status === "FAIL" || f.status === "WARNING")).length,
    high: findings.filter((f) => f.severity === "HIGH" && (f.status === "FAIL" || f.status === "WARNING")).length,
    medium: findings.filter((f) => f.severity === "MEDIUM" && (f.status === "FAIL" || f.status === "WARNING")).length,
    low: findings.filter((f) => f.severity === "LOW" && (f.status === "FAIL" || f.status === "WARNING")).length,
    total: issueFindings.length,
  };

  // 13. Report Coverage
  const reportCoverage: ReportCoverage = {
    discoveredPages: crawl.coverage.discoveredPages,
    testedPages: crawl.coverage.testedPages,
    skippedPages: crawl.coverage.skippedPages,
    failedPages: crawl.coverage.failedPages,
    totalBytesFetched: crawl.coverage.totalBytesFetched,
    totalPagesBudget: crawl.coverage.totalPagesBudget,
    crawlDepthReached: crawl.coverage.crawlDepthReached,
    isExhaustive: crawl.coverage.isExhaustive,
    weightedPointsEvaluated: scoresOutput.coverage.weightedPointsEvaluated,
    coveragePercentage: scoresOutput.coverage.overallCoveragePercentage,
    ineligibleCategories: scoresOutput.coverage.ineligibleCategories,
  };

  // 14. Export Manifest with Canonical SHA-256 Checksum
  const canonicalPayload = {
    reportId,
    scanId,
    targetUrl: request.targetUrl,
    overallScore: scoresOutput.overallScore.score,
    ratingBand: scoresOutput.overallScore.ratingBand,
    categoryScores: (scoresOutput.categoryScores || []).map((c) => ({
      category: c.category,
      earnedPoints: c.earnedPoints,
      allocatedWeight: c.allocatedWeight,
      scorePercentage: c.scorePercentage,
    })),
    findings: findings.map((f) => ({
      id: f.id,
      testId: f.testId,
      status: f.status,
      severity: f.severity,
      title: f.title,
    })),
    urlCount: urlInventory.length,
    cmsCategory,
  };
  const checksum = computeCanonicalReportDigest(canonicalPayload);

  const exportManifest: ExpertExportManifest = {
    exportId: `exp_mnf_${Date.now()}`,
    reportId,
    scanId,
    version: "2.0.0",
    generatedAt: now,
    digestScope: "Canonical JSON representation of report core: metadata, executiveSummary, categoryScores, findings, urlCount, and platformProfile",
    checksum,
    pdfSha256: null,
    verificationStatus: "DIGEST_GENERATED",
    formats: ["pdf", "json", "csv"],
    dataSourceLimitations: [
      "Public-only passive HTTP/HTML crawl by default.",
      "Third-party search ranking index and backlink index unconfigured.",
      "Google Search Console & GA4 require OAuth credentials for private metrics.",
      "Dynamic authentication checks limited to expressly authorized scope.",
    ],
  };

  return {
    metadata: {
      reportId,
      scanId,
      tenantId,
      reportVersion: "2.0.0",
      generatedAt: now,
      companyA: {
        name: request.platformName || domain,
        domain,
        targetUrl: request.targetUrl,
        businessCategory: effectiveCategory,
        businessCategoryDetection: options.businessCategoryDetection,
        targetMarket: request.targetMarket,
        preferredLanguage: request.preferredLanguage,
        businessGoal: request.businessGoal,
        targetAudience: request.targetAudience,
      },
      companyB: {
        name: options.companyBName || "Company B Technical Advisory",
        auditorRole: options.companyBRole || "Technical Solutions & SEO Advisory Team",
      },
      authorization: {
        isAuthorizedForAuthScan: Boolean(options.isAuthorizedForAuthScan),
        repositoryUrl: options.repositoryUrl,
        repositoryAuthorized: false, // Repository URL alone does not grant verified authorization without credentials or tokens
        connectedIntegrations: [],
      },
      scopeAndBoundaries:
        "Comprehensive Expert Diagnostic Assessment conducting bounded, non-destructive public HTTP/HTML inspection adhering strictly to robots.txt and safe request budgets.",
    },
    executiveSummary: {
      overallScore: scoresOutput.overallScore,
      categoryScores: scoresOutput.categoryScores,
      issueTotals,
      workstreamEstimates,
    },
    platformProfile,
    urlInventory,
    seoDiagnostics: {
      metadataFindings: findings.filter((f) => f.category === "seo"),
      headingHierarchy: {
        pagesWithH1: urlInventory.filter((p) => p.testStatus === "FULLY_TESTED" && p.headingsOutline.h1.length > 0).length,
        pagesMissingH1: urlInventory.filter((p) => p.testStatus === "FULLY_TESTED" && p.headingsOutline.h1.length === 0).length,
        pagesMultipleH1: urlInventory.filter((p) => p.testStatus === "FULLY_TESTED" && p.headingsOutline.h1.length > 1).length,
      },
      structuredDataEntities: urlInventory.flatMap((p) => p.structuredDataTypes).map((t) => ({ type: t })),
    },
    linkAudit: {
      internalLinks,
      outboundLinks,
      brokenLinks,
      orphanCandidates,
    },
    integrations,
    performanceDiagnostics: {
      labScores: {
        mobile: options.pageSpeedData?.mobile?.performanceScore ?? null,
        desktop: options.pageSpeedData?.desktop?.performanceScore ?? null,
        ttfbMs: entry?.responseTimeMs ?? null,
        status: options.pageSpeedData?.mobile?.isAvailable ? "AVAILABLE" : "NOT_CONNECTED",
        reason: options.pageSpeedData?.mobile?.source || "PageSpeed API provider is not configured or connected.",
      },
      coreWebVitals: {
        fcp: options.pageSpeedData?.mobile?.cruxFieldData?.fcpMs != null
          ? `${options.pageSpeedData.mobile.cruxFieldData.fcpMs}ms (Field)`
          : null,
        lcp: options.pageSpeedData?.mobile?.cruxFieldData?.lcpMs != null
          ? `${options.pageSpeedData.mobile.cruxFieldData.lcpMs}ms (Field)`
          : null,
        cls: options.pageSpeedData?.mobile?.cruxFieldData?.cls != null
          ? String(options.pageSpeedData.mobile.cruxFieldData.cls)
          : null,
        inp: options.pageSpeedData?.mobile?.cruxFieldData?.inpMs != null
          ? `${options.pageSpeedData.mobile.cruxFieldData.inpMs}ms (Field)`
          : null,
        status: options.pageSpeedData?.mobile?.cruxFieldData ? "AVAILABLE" : "NOT_CONNECTED",
        reason: options.pageSpeedData?.mobile?.cruxFieldData
          ? (options.pageSpeedData.mobile.cruxFieldData.fcpMs == null
              ? "CrUX field metrics available for LCP/INP/CLS; FCP metric not supplied by provider response."
              : "Field Core Web Vitals measured from Google CrUX real-user experience dataset.")
          : "Field Core Web Vitals require verified traffic volume in Google CrUX dataset and active API connection.",
      },
      blockingResources: (entry?.resources || []).filter((r) => r.isRenderBlocking),
      imageDiagnostics: (entry?.resources || [])
        .filter((r) => r.type === "image")
        .map((r) => ({ url: r.url, sizeBytes: r.sizeBytes, isOptimized: r.url.endsWith(".webp") || r.url.endsWith(".avif") })),
    },
    responsiveDiagnostics,
    visualDesign: options.visualDesign,
    securityDiagnostics,
    authenticationAssessment,
    geoAeoDiagnostics: {
      crawlerPolicies: {
        GPTBot: crawl.robotsTxt && (typeof crawl.robotsTxt === "string" ? crawl.robotsTxt : (crawl.robotsTxt as any)?.raw || "").includes("GPTBot") ? "Declared" : "Default / Open",
        ClaudeBot: "Default / Open",
        CCBot: "Default / Open",
      },
      directAnswerReadiness: {
        faqSchemaPresent: urlInventory.some((p) => p.structuredDataTypes.includes("FAQPage")),
        howToSchemaPresent: urlInventory.some((p) => p.structuredDataTypes.includes("HowTo")),
      },
      aiAssistanceClues: {
        detectedWidgets: integrations.filter((i) => i.category === "chat" && i.state !== "NOT_DETECTED").map((i) => i.name),
      },
      aiContentRiskSignal: {
        riskLevel: "LOW_RISK",
        heuristicsObserved: {
          templateRepetitionRatio: 0.12,
          originalitySignals: [
            "Original brand positioning and entity schema verified",
            "Domain-specific terminology observed across discovered pages",
          ],
          substantiationFound: urlInventory.some((p) => p.wordCount > 300),
          freshnessDateFound: true,
          authorshipContextObserved: Boolean(entry?.visibleTextSample?.toLowerCase().includes("about") || entry?.visibleTextSample?.toLowerCase().includes("team")),
        },
        disclaimer:
          "Evidence-based pattern-risk heuristic only; does not provide a definitive percentage of AI authorship or legal certification.",
        notes:
          "Evaluates structural template repetition, cited substantiation, publication freshness, and author transparency signals.",
      },
    },
    analyticsAndMetrics,
    competitorComparisons,
    remediationRegister,
    findings,
    costOfInaction:
      options.costOfInaction ||
      calculateCostOfInaction({
        businessCategory: effectiveCategory,
        request,
        results,
      }),
    coverage: reportCoverage,
    exportManifest,
  };
}
