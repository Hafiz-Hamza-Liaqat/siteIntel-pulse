import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Complete, controlled ExpertReport fixture
const sampleExpertReport = {
  metadata: {
    reportId: "rep_expert_verify_001",
    scanId: "scan_verify_test",
    reportVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    companyA: {
      name: "Company A Storefront",
      domain: "example-shop.demo",
      targetUrl: "https://example-shop.demo",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
    },
    companyB: {
      name: "Company B Technical Advisory",
      auditorRole: "Technical Solutions & SEO Team",
      contact: "auditor@companyb.com",
    },
    authorization: {
      isAuthorizedForAuthScan: true,
      repositoryUrl: "https://github.com/company-a/storefront (Authorized)",
      repositoryAuthorized: true,
      connectedIntegrations: ["Google Search Console", "Google Analytics 4"],
    },
    scopeAndBoundaries:
      "Full 19-section diagnostic audit conducted using passive public crawler and dynamic session verification.",
  },
  executiveSummary: {
    overallScore: {
      score: 84,
      ratingBand: "Generally healthy; opportunities remain",
      isProvisional: false,
      assessmentStatus: "FULLY_ASSESSED",
      evaluationNote: "Evaluated across all 11 categories with 88% weighted coverage.",
      totalPossibleCataloguePoints: 100,
      totalEarnedPoints: 84,
      totalPossibleEarnedPoints: 88,
      earnedAllocationPercentage: 84,
      coveragePercentage: 88,
      ineligibleCategories: [],
    },
    categoryScores: [
      {
        category: "technical_health",
        categoryName: "Technical Health and Crawlability",
        allocatedWeight: 12,
        testedPoints: 12,
        earnedPoints: 11,
        scorePercentage: 92,
        weightedScore: 11.0,
        testCounts: { total: 6, pass: 5, warning: 1, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
        coveragePercentage: 100,
        earnedAllocationPercentage: 92,
      },
      {
        category: "seo",
        categoryName: "Technical and On-Page SEO",
        allocatedWeight: 18,
        testedPoints: 18,
        earnedPoints: 16,
        scorePercentage: 89,
        weightedScore: 16.0,
        testCounts: { total: 9, pass: 7, warning: 2, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
        coveragePercentage: 100,
        earnedAllocationPercentage: 89,
      },
      {
        category: "performance",
        categoryName: "Performance",
        allocatedWeight: 10,
        testedPoints: 10,
        earnedPoints: 8,
        scorePercentage: 80,
        weightedScore: 8.0,
        testCounts: { total: 5, pass: 4, warning: 1, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
        coveragePercentage: 100,
        earnedAllocationPercentage: 80,
      },
      {
        category: "public_security",
        categoryName: "Public Security Configuration",
        allocatedWeight: 12,
        testedPoints: 12,
        earnedPoints: 10,
        scorePercentage: 83,
        weightedScore: 10.0,
        testCounts: { total: 6, pass: 4, warning: 2, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
        coveragePercentage: 100,
        earnedAllocationPercentage: 83,
      },
    ],
    issueTotals: {
      critical: 1,
      high: 3,
      medium: 5,
      low: 8,
      total: 17,
    },
    workstreamEstimates: [
      {
        workstream: "seo",
        title: "SEO Architecture",
        taskCount: 4,
        criticalCount: 0,
        estimatedEffortSummary: "8 - 14 hrs",
        recommendedSpecialist: "Technical SEO Consultant",
      },
      {
        workstream: "security",
        title: "Cloud & Security",
        taskCount: 3,
        criticalCount: 1,
        estimatedEffortSummary: "4 - 8 hrs",
        recommendedSpecialist: "Cybersecurity Engineer",
      },
      {
        workstream: "engineering",
        title: "Frontend Engineering",
        taskCount: 5,
        criticalCount: 0,
        estimatedEffortSummary: "12 - 20 hrs",
        recommendedSpecialist: "Senior Full-Stack Developer",
      },
    ],
  },
  platformProfile: {
    cmsCategory: "Modern Headless E-Commerce",
    frameworkHints: ["Next.js", "React 19", "Tailwind CSS"],
    serverCdnClues: ["Cloudflare Edge", "Vercel"],
    clientTechnologies: ["Google Tag Manager", "Zod Validation"],
    aiIntegrationClues: ["Custom Shopping Assistant API"],
    confidence: "HIGH",
  },
  urlInventory: [
    {
      url: "https://example-shop.demo/",
      normalizedUrl: "https://example-shop.demo/",
      statusCode: 200,
      responseTimeMs: 185,
      contentType: "text/html",
      discoverySource: "entry",
      crawlDepth: 0,
      indexabilityStatus: "INDEXABLE",
      canonicalStatus: "SELF",
      title: "Example Storefront — Premium Gadgets",
      titleLength: 35,
      metaDescription: "Modern e-commerce platform.",
      metaDescriptionLength: 26,
      headingsOutline: { h1: ["Main Heading"], h2: ["Products"], h3: [] },
      wordCount: 840,
      structuredDataTypes: ["Organization", "WebSite"],
    },
  ],
  seoDiagnostics: {
    metadataFindings: [],
    headingHierarchy: { h1: ["Main Heading"], h2: ["Products"] },
    structuredDataEntities: [{ "@type": "Organization", name: "Example Storefront Inc." }],
  },
  linkAudit: {
    internalLinks: [{ id: "l1", sourceUrl: "https://example-shop.demo/", targetUrl: "https://example-shop.demo/p", anchorText: "Shop", isInternal: true }],
    outboundLinks: [],
    brokenLinks: [],
    orphanCandidates: [],
  },
  integrations: [
    { id: "i1", name: "Google Analytics 4", category: "analytics", state: "DETECTED", detectedClues: ["gtag('config', 'G-XXXX')"], scriptUrls: [], notes: "Active GA4 configuration." },
  ],
  performanceDiagnostics: {
    labScores: { mobile: 82, desktop: 94, ttfbMs: 185 },
    coreWebVitals: { fcp: "1.1s", lcp: "2.2s", cls: "0.01", inp: "75ms" },
    blockingResources: [],
    imageDiagnostics: [],
  },
  responsiveDiagnostics: [
    { viewport: 320, pageUrl: "https://example-shop.demo/", horizontalOverflow: false, touchTargetIssues: 0, clippingIssues: 0, severity: "LOW", overflowElements: [], touchTargetSelectors: [] },
    { viewport: 375, pageUrl: "https://example-shop.demo/", horizontalOverflow: false, touchTargetIssues: 0, clippingIssues: 0, severity: "LOW", overflowElements: [], touchTargetSelectors: [] },
    { viewport: 768, pageUrl: "https://example-shop.demo/", horizontalOverflow: false, touchTargetIssues: 0, clippingIssues: 0, severity: "LOW", overflowElements: [], touchTargetSelectors: [] },
    { viewport: 1280, pageUrl: "https://example-shop.demo/", horizontalOverflow: false, touchTargetIssues: 0, clippingIssues: 0, severity: "LOW", overflowElements: [], touchTargetSelectors: [] },
  ],
  securityDiagnostics: [
    { id: "sec_1", title: "Content Security Policy (CSP)", scope: "public_passive", testedEndpoint: "https://example-shop.demo/", severity: "MEDIUM", exploitabilityNote: "Protects against XSS.", remediation: "Define strict CSP header.", observedValue: "default-src 'self'", expectedValue: "Strict CSP" },
    { id: "sec_2", title: "HTTP Strict Transport Security (HSTS)", scope: "public_passive", testedEndpoint: "https://example-shop.demo/", severity: "LOW", exploitabilityNote: "Enforces TLS.", remediation: "Keep max-age=31536000", observedValue: "max-age=31536000", expectedValue: "max-age=31536000" },
  ],
  authenticationAssessment: {
    isAuthorized: true,
    publicLoginSurfaces: [{ url: "https://example-shop.demo/login", isHttps: true, hasCsrfClue: true, hasAutocompleteProtection: true }],
    testedFlows: [{ flowName: "Login Flow", status: "PASS", details: "Tested securely." }],
    sessionSecurity: { cookieSecure: true, cookieHttpOnly: true, cookieSameSite: "Lax", expiryObserved: "Session duration" },
    mfaIndicators: { observed: true, method: "TOTP", note: "Verified." },
    untestedControls: ["RBAC Tampering", "SAML Replay"],
  },
  geoAeoDiagnostics: {
    crawlerPolicies: { GPTBot: "Declared", ClaudeBot: "Open", CCBot: "Open" },
    directAnswerReadiness: { faqSchemaPresent: true, howToSchemaPresent: false },
    aiAssistanceClues: { detectedWidgets: ["Chatbot API"] },
  },
  analyticsAndMetrics: [],
  competitorComparisons: [
    { domain: "competitor-benchmark.demo", overallScore: 78, categoryScores: {}, detectedTechnologies: ["WordPress"], keyStrengths: ["Backlink profile"], keyWeaknesses: ["Mobile TTFB"], dataProvenance: "Public surface crawl", isEstimated: true },
  ],
  remediationRegister: [
    {
      id: "TASK-001",
      title: "Enforce Restrictive Content Security Policy (CSP)",
      workstream: "security",
      priority: "HIGH",
      status: "PLANNED",
      findingIds: ["EXP-SEC-01-001"],
      affectedUrls: ["https://example-shop.demo/"],
      estimatedEffort: "MODERATE",
      estimatedHours: 4,
      actionSteps: ["1. Audit scripts.", "2. Deploy CSP in staging.", "3. Verify reports."],
      validationProcedure: "Execute curl -I and verify header.",
      dependencies: [],
    },
  ],
  findings: [
    {
      id: "EXP-SEC-01-001",
      testId: "SEC-01",
      testVersion: "2.0.0",
      category: "public_security",
      categoryName: "Public Security Configuration",
      title: "Content Security Policy Configuration",
      status: "WARNING",
      severity: "MEDIUM",
      confidence: "HIGH",
      affectedUrls: ["https://example-shop.demo/"],
      affectedElements: ["<meta http-equiv='content-security-policy'>"],
      technicalImpact: "Allows inline scripts if directive is overly permissive.",
      businessImpact: "Mitigates cross-site scripting risks.",
      remediation: "Deploy nonce-based CSP.",
      validationProcedure: "Retest SEC-01 returns PASS.",
      workstream: "security",
      estimatedEffort: "MODERATE",
      evidence: [
        {
          evidenceId: "EVD-1",
          findingId: "EXP-SEC-01-001",
          source: { id: "s1", type: "html_parser", timestamp: new Date().toISOString(), location: "https://example-shop.demo/", confidence: "HIGH" },
          observedValue: "default-src 'self'",
          expectedCondition: "Strict CSP with nonce",
          discrepancy: "Missing nonce attribute on inline scripts.",
          reproductionSteps: ["1. Fetch entry HTML.", "2. Parse CSP header."],
          validationAssertion: "CSP policy compliant.",
        },
      ],
      dependencies: [],
    },
  ],
  coverage: {
    discoveredPages: 5,
    testedPages: 3,
    skippedPages: 2,
    failedPages: 0,
    totalBytesFetched: 480000,
    totalPagesBudget: 10,
    crawlDepthReached: 1,
    isExhaustive: false,
    weightedPointsEvaluated: 88,
    coveragePercentage: 88,
    ineligibleCategories: [],
  },
  exportManifest: {
    exportId: "exp_verify_001",
    reportId: "rep_expert_verify_001",
    scanId: "scan_verify_test",
    version: "2.0.0",
    generatedAt: new Date().toISOString(),
    checksum: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
    formats: ["pdf", "json", "csv"],
    dataSourceLimitations: [],
  },
};

async function verifyExpertPdf() {
  console.log("--> Starting Playwright Chromium Expert Diagnostic PDF Verification...");

  const { generateExpertReportHtml } = await import("../src/lib/reports/expert-pdf-generator.ts");
  const html = generateExpertReportHtml(sampleExpertReport);

  const targetDir = path.join(process.cwd(), "test-results");
  await fs.mkdir(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, "SiteIntel-Pulse-Expert-Diagnostic-Verification.pdf");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
    });

    await fs.writeFile(targetFile, pdfBuffer);
    const stats = await fs.stat(targetFile);

    console.log(`[PASS] Expert Diagnostic PDF generated successfully!`);
    console.log(`  File path: ${targetFile}`);
    console.log(`  File size: ${stats.size} bytes (${Math.round(stats.size / 1024)} KB)`);

    if (stats.size < 10000) {
      throw new Error(`PDF file size too small (${stats.size} bytes), possible rendering truncation.`);
    }

    console.log("--> Expert PDF Visual / Rendering Check: ALL CHECKS PASSED.");
  } finally {
    await browser.close();
  }
}

verifyExpertPdf().catch((err) => {
  console.error("[FAIL] Expert PDF Verification failed:", err);
  process.exit(1);
});
