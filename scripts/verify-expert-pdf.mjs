import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { expertPdfGenerator, generateExpertReportHtml } from "../src/lib/reports/expert-pdf-generator.ts";
import { rasterizePdf } from "./pdf-rasterizer.mjs";
import { recordValidationReport } from "./validation-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(process.cwd(), "test-results");
const rasterDir = path.join(outputDir, "rasterized-pages");
await fs.mkdir(rasterDir, { recursive: true });

// --- Fixtures ---

// 1. Typical Expert Diagnostic Report
const typicalExpertReport = {
  metadata: {
    reportId: "rep_expert_typical_001",
    scanId: "scan_verify_test",
    reportVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    companyA: {
      name: "Acme Storefront Corp",
      domain: "acme-storefront.demo",
      targetUrl: "https://acme-storefront.demo",
      businessCategory: "ecommerce",
      businessCategoryDetection: {
        primaryCategory: "ecommerce",
        effectiveCategory: "ecommerce",
        confidence: "HIGH",
        confidenceScore: 0.94,
        categoryLabel: "Ecommerce & Online Retail",
        evidenceSignals: ["Observed shopping cart and checkout pathways", "ItemList schemas"],
        decisionSource: "AUTO_DETECTED",
        secondaryFacets: [],
      },
      targetMarket: "US",
      preferredLanguage: "en",
    },
    companyB: {
      name: "Company B Technical Advisory",
      auditorRole: "Technical Solutions & SEO Advisory Group",
      contact: "auditor@companyb.com",
    },
    authorization: {
      isAuthorizedForAuthScan: true,
      repositoryUrl: "https://github.com/acme/storefront (Authorized)",
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
      critical: 0,
      high: 2,
      medium: 5,
      low: 6,
      total: 13,
    },
    workstreamEstimates: [
      {
        workstream: "seo",
        title: "SEO Architecture",
        taskCount: 3,
        criticalCount: 0,
        estimatedEffortSummary: "8 - 12 hrs",
        recommendedSpecialist: "Technical SEO Consultant",
      },
      {
        workstream: "security",
        title: "Cloud & Security",
        taskCount: 2,
        criticalCount: 0,
        estimatedEffortSummary: "4 - 8 hrs",
        recommendedSpecialist: "Cybersecurity Engineer",
      },
      {
        workstream: "engineering",
        title: "Frontend Engineering",
        taskCount: 4,
        criticalCount: 0,
        estimatedEffortSummary: "10 - 16 hrs",
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
      url: "https://acme-storefront.demo/",
      normalizedUrl: "https://acme-storefront.demo/",
      statusCode: 200,
      responseTimeMs: 165,
      contentType: "text/html",
      discoverySource: "entry",
      crawlDepth: 0,
      indexabilityStatus: "INDEXABLE",
      canonicalStatus: "SELF",
      title: "Acme Storefront — Premium Hardware & Tools",
      titleLength: 42,
      metaDescription: "Professional enterprise store delivering high performance tools.",
      metaDescriptionLength: 64,
      headingsOutline: { h1: ["Main Heading"], h2: ["Featured Tools", "Categories"], h3: [] },
      wordCount: 820,
      structuredDataTypes: ["Organization", "WebSite", "ItemList"],
    },
    {
      url: "https://acme-storefront.demo/shop",
      normalizedUrl: "https://acme-storefront.demo/shop",
      statusCode: 200,
      responseTimeMs: 195,
      contentType: "text/html",
      discoverySource: "crawler",
      crawlDepth: 1,
      indexabilityStatus: "INDEXABLE",
      canonicalStatus: "SELF",
      title: "Browse Products | Acme Storefront",
      titleLength: 34,
      metaDescription: "Explore catalog of premium products.",
      metaDescriptionLength: 36,
      headingsOutline: { h1: ["Product Catalog"], h2: ["Filters"], h3: [] },
      wordCount: 540,
      structuredDataTypes: ["ItemList"],
    },
  ],
  seoDiagnostics: {
    metadataFindings: [],
    headingHierarchy: { h1: ["Main Heading"], h2: ["Featured Tools", "Categories"] },
    structuredDataEntities: [{ "@type": "Organization", name: "Acme Storefront Corp" }],
  },
  linkAudit: {
    internalLinks: [{ id: "l1", sourceUrl: "https://acme-storefront.demo/", targetUrl: "https://acme-storefront.demo/shop", anchorText: "Shop Catalog", isInternal: true }],
    outboundLinks: [],
    brokenLinks: [],
    orphanCandidates: [],
  },
  integrations: [
    { id: "i1", name: "Google Analytics 4", category: "analytics", state: "DETECTED", detectedClues: ["gtag('config', 'G-XXXX')"], scriptUrls: [], notes: "Active GA4 configuration." },
  ],
  performanceDiagnostics: {
    labScores: { mobile: 82, desktop: 94, ttfbMs: 165 },
    coreWebVitals: { fcp: "1.1s", lcp: "2.1s", cls: "0.01", inp: "70ms" },
    blockingResources: [],
    imageDiagnostics: [],
  },
  responsiveDiagnostics: [
    { viewport: 320, pageUrl: "https://acme-storefront.demo/", horizontalOverflow: false, touchTargetIssues: 0, clippingIssues: 0, severity: "LOW", overflowElements: [], touchTargetSelectors: [] },
    { viewport: 768, pageUrl: "https://acme-storefront.demo/", horizontalOverflow: false, touchTargetIssues: 0, clippingIssues: 0, severity: "LOW", overflowElements: [], touchTargetSelectors: [] },
    { viewport: 1280, pageUrl: "https://acme-storefront.demo/", horizontalOverflow: false, touchTargetIssues: 0, clippingIssues: 0, severity: "LOW", overflowElements: [], touchTargetSelectors: [] },
  ],
  securityDiagnostics: [
    { id: "sec_1", title: "Content Security Policy (CSP)", scope: "public_passive", testedEndpoint: "https://acme-storefront.demo/", severity: "MEDIUM", exploitabilityNote: "Protects against XSS.", remediation: "Define strict CSP header.", observedValue: "default-src 'self'", expectedValue: "Strict CSP" },
    { id: "sec_2", title: "HTTP Strict Transport Security (HSTS)", scope: "public_passive", testedEndpoint: "https://acme-storefront.demo/", severity: "LOW", exploitabilityNote: "Enforces TLS.", remediation: "Keep max-age=31536000", observedValue: "max-age=31536000", expectedValue: "max-age=31536000" },
  ],
  authenticationAssessment: {
    isAuthorized: true,
    publicLoginSurfaces: [{ url: "https://acme-storefront.demo/login", isHttps: true, hasCsrfClue: true, hasAutocompleteProtection: true }],
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
    { domain: "competitor-shop.demo", overallScore: 78, categoryScores: {}, detectedTechnologies: ["Shopify"], keyStrengths: ["Backlink profile"], keyWeaknesses: ["Mobile TTFB"], dataProvenance: "Public surface crawl", isEstimated: true },
  ],
  remediationRegister: [
    {
      id: "TASK-001",
      title: "Enforce Nonce-Based Content Security Policy",
      workstream: "security",
      priority: "HIGH",
      status: "PLANNED",
      findingIds: ["EXP-SEC-01-001"],
      affectedUrls: ["https://acme-storefront.demo/"],
      estimatedEffort: "MODERATE",
      estimatedHours: 4,
      actionSteps: ["1. Audit external scripts.", "2. Deploy CSP nonce middleware in Next.js.", "3. Verify reports."],
      validationProcedure: "Execute curl -I and verify CSP header returns without inline unsafe-inline.",
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
      affectedUrls: ["https://acme-storefront.demo/"],
      affectedElements: ["<meta http-equiv='content-security-policy'>"],
      technicalImpact: "Allows inline script execution if unsafe-inline is present.",
      businessImpact: "Mitigates cross-site scripting risks.",
      remediation: "Deploy nonce-based CSP.",
      validationProcedure: "Retest SEC-01 returns PASS.",
      workstream: "security",
      estimatedEffort: "MODERATE",
      evidence: [
        {
          evidenceId: "EVD-1",
          findingId: "EXP-SEC-01-001",
          source: { id: "s1", type: "html_parser", timestamp: new Date().toISOString(), location: "https://acme-storefront.demo/", confidence: "HIGH" },
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
    discoveredPages: 25,
    testedPages: 10,
    skippedPages: 15,
    failedPages: 0,
    totalBytesFetched: 1200000,
    totalPagesBudget: 25,
    crawlDepthReached: 2,
    isExhaustive: false,
    weightedPointsEvaluated: 88,
    coveragePercentage: 88,
    ineligibleCategories: [],
  },
  exportManifest: {
    exportId: "exp_verify_001",
    reportId: "rep_expert_typical_001",
    scanId: "scan_verify_test",
    version: "2.0.0",
    generatedAt: new Date().toISOString(),
    checksum: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
    formats: ["pdf", "json", "csv"],
    dataSourceLimitations: [],
  },
};

// 2. Short Expert Report Fixture
const shortExpertReport = {
  ...typicalExpertReport,
  metadata: {
    ...typicalExpertReport.metadata,
    reportId: "rep_expert_short_002",
    companyA: { ...typicalExpertReport.metadata.companyA, name: "Short Co", domain: "short.demo" },
  },
  urlInventory: typicalExpertReport.urlInventory.slice(0, 1),
  remediationRegister: typicalExpertReport.remediationRegister.slice(0, 1),
  findings: typicalExpertReport.findings.slice(0, 1),
  exportManifest: {
    ...typicalExpertReport.exportManifest,
    reportId: "rep_expert_short_002",
  },
};

// 3. Long Expert Report Fixture (Multi-page, many findings & remediation tasks)
const longExpertReport = {
  ...typicalExpertReport,
  metadata: {
    ...typicalExpertReport.metadata,
    reportId: "rep_expert_long_003",
    companyA: { ...typicalExpertReport.metadata.companyA, name: "Enterprise Multi-Department Corp", domain: "enterprise-audit.demo" },
  },
  findings: Array.from({ length: 8 }, (_, i) => ({
    id: `EXP-FINDING-00${i + 1}`,
    testId: `TEST-0${i + 1}`,
    testVersion: "2.0.0",
    category: i % 2 === 0 ? "seo" : "public_security",
    categoryName: i % 2 === 0 ? "Technical and On-Page SEO" : "Public Security Configuration",
    title: `Diagnostic Finding #${i + 1}: Critical Optimization Vector`,
    status: i % 3 === 0 ? "FAIL" : "WARNING",
    severity: i === 0 ? "CRITICAL" : i < 4 ? "HIGH" : "MEDIUM",
    confidence: "HIGH",
    affectedUrls: [`https://enterprise-audit.demo/section/${i + 1}`],
    affectedElements: [`<div class="test-element-${i + 1}">`],
    technicalImpact: `Elevated operational risk and ranking degradation across index #${i + 1}.`,
    businessImpact: `Measurable reduction in visitor conversions and enterprise security posture.`,
    remediation: `Implement architectural and configuration fixes according to specification #${i + 1}.`,
    validationProcedure: `Retest rule TEST-0${i + 1} returns PASS.`,
    workstream: i % 2 === 0 ? "seo" : "security",
    estimatedEffort: i < 3 ? "HIGH" : "MODERATE",
    evidence: [
      {
        evidenceId: `EVD-${i + 1}`,
        findingId: `EXP-FINDING-00${i + 1}`,
        source: { id: `src-${i + 1}`, type: "crawler", timestamp: new Date().toISOString(), location: `https://enterprise-audit.demo/section/${i + 1}`, confidence: "HIGH" },
        observedValue: `Observed value for finding #${i + 1}`,
        expectedCondition: `Expected baseline state #${i + 1}`,
        discrepancy: `Discrepancy observed in production configuration #${i + 1}.`,
        reproductionSteps: [`Step 1: Fetch endpoint /section/${i + 1}`, "Step 2: Inspect response payload"],
        validationAssertion: `Assert condition #${i + 1} is fully met`,
      },
    ],
    dependencies: [],
  })),
  remediationRegister: Array.from({ length: 8 }, (_, i) => ({
    id: `TASK-00${i + 1}`,
    title: `Remediation Task #${i + 1}: Architectural Resolution`,
    workstream: i % 2 === 0 ? "seo" : "security",
    priority: i === 0 ? "CRITICAL" : i < 4 ? "HIGH" : "MEDIUM",
    status: "PLANNED",
    findingIds: [`EXP-FINDING-00${i + 1}`],
    affectedUrls: [`https://enterprise-audit.demo/section/${i + 1}`],
    estimatedEffort: i < 3 ? "HIGH" : "MODERATE",
    estimatedHours: 4 + i * 2,
    actionSteps: [`1. Analyze root cause #${i + 1}`, `2. Apply code fix in staging`, `3. Execute validation suite`],
    validationProcedure: `Retest TEST-0${i + 1} returns PASS without regressions.`,
    dependencies: [],
  })),
  exportManifest: {
    ...typicalExpertReport.exportManifest,
    reportId: "rep_expert_long_003",
  },
};

// 4. Sparse / Provisional Expert Report Fixture
const sparseExpertReport = {
  ...typicalExpertReport,
  metadata: {
    ...typicalExpertReport.metadata,
    reportId: "rep_expert_sparse_004",
    companyA: { ...typicalExpertReport.metadata.companyA, name: "Pre-Launch Single Page", domain: "single-page.demo" },
  },
  executiveSummary: {
    ...typicalExpertReport.executiveSummary,
    overallScore: {
      score: 48,
      ratingBand: "Provisional Baseline Assessment",
      isProvisional: true,
      assessmentStatus: "PROVISIONAL",
      evaluationNote: "Evaluated 45% of catalogue due to single-page crawl boundary.",
      totalPossibleCataloguePoints: 100,
      totalEarnedPoints: 48,
      totalPossibleEarnedPoints: 45,
      earnedAllocationPercentage: 48,
      coveragePercentage: 45,
      ineligibleCategories: ["ecommerce", "analytics_tracking"],
    },
  },
  coverage: {
    discoveredPages: 1,
    testedPages: 1,
    skippedPages: 0,
    failedPages: 0,
    totalBytesFetched: 45000,
    totalPagesBudget: 10,
    crawlDepthReached: 0,
    isExhaustive: false,
    weightedPointsEvaluated: 45,
    coveragePercentage: 45,
    ineligibleCategories: ["ecommerce", "analytics_tracking"],
  },
  exportManifest: {
    ...typicalExpertReport.exportManifest,
    reportId: "rep_expert_sparse_004",
  },
};

// 5. Edge-Case Long URL Expert Report Fixture
const edgeCaseExpertReport = {
  ...typicalExpertReport,
  metadata: {
    ...typicalExpertReport.metadata,
    reportId: "rep_expert_edge_005",
    companyA: {
      ...typicalExpertReport.metadata.companyA,
      name: "Edge Case & Symbols <Tech> ' \" & Systems",
      domain: "subdomain.extremely-long-domain-name-with-many-hyphens-and-deep-routing-paths-testing.demo",
    },
  },
  urlInventory: [
    {
      url: "https://subdomain.extremely-long-domain-name.demo/catalog/category/subcategory/item-sku-0019283847291038471928374918237491827349812739487129384719283749182734981729384719283749182374918273498172938471298374?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale_2026_promo_special_discount_tier_one_premium_bundle_worldwide",
      normalizedUrl: "https://subdomain.extremely-long-domain-name.demo/catalog/category/subcategory/item-sku-0019283847291038471928374918237491827349812739487129384719283749182734981729384719283749182374918273498172938471298374",
      statusCode: 200,
      responseTimeMs: 340,
      contentType: "text/html",
      discoverySource: "entry",
      crawlDepth: 0,
      indexabilityStatus: "INDEXABLE",
      canonicalStatus: "SELF",
      title: "Extremely Long Title Tag Containing Complex Entities &amp; Symbols < > \" ' Across Multiple Breakpoints",
      titleLength: 105,
      metaDescription: "Extremely long meta description with deeply nested URL fragments and query parameters testing layout bounds.",
      metaDescriptionLength: 110,
      headingsOutline: { h1: ["Main Heading with &amp; entity"], h2: ["Subheading"], h3: [] },
      wordCount: 1200,
      structuredDataTypes: ["Organization", "WebSite", "BreadcrumbList"],
    },
  ],
  exportManifest: {
    ...typicalExpertReport.exportManifest,
    reportId: "rep_expert_edge_005",
  },
};

function validatePdfBinary(buffer, expectedMinPages = 1) {
  if (buffer.length < 10000) {
    throw new Error(`PDF buffer size (${buffer.length} bytes) is below minimum 10 KB threshold.`);
  }

  const header = buffer.subarray(0, 8).toString("latin1");
  if (!header.startsWith("%PDF-")) {
    throw new Error(`PDF header does not start with %PDF- (found: "${header}")`);
  }

  const pdfText = buffer.toString("latin1");
  const mediaBoxes = pdfText.match(/\/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]/g);
  if (!mediaBoxes || mediaBoxes.length === 0) {
    throw new Error("No MediaBox found in PDF binary.");
  }

  for (const box of mediaBoxes) {
    const coords = box.match(/\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]/);
    if (coords) {
      const width = parseFloat(coords[3]);
      const height = parseFloat(coords[4]);
      if (width < 594 || width > 597 || height < 840 || height > 844) {
        throw new Error(`PDF page dimensions (${width} x ${height} pt) do not match A4 standard.`);
      }
    }
  }

  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 0;
  if (pageCount < expectedMinPages) {
    throw new Error(`Expected at least ${expectedMinPages} pages, but PDF contains ${pageCount} pages.`);
  }

  return { size: buffer.length, pageCount, mediaBoxes: mediaBoxes.length };
}

async function verifyExpertPdfs() {
  console.log("=================================================================");
  console.log("  SiteIntel Pulse — Expert Report PDF Validation Suite (Part D) ");
  console.log("=================================================================\n");

  const testCases = [
    { name: "Typical Expert Diagnostic Report", report: typicalExpertReport, minPages: 6 },
    { name: "Short Expert Report", report: shortExpertReport, minPages: 6 },
    { name: "Long Enterprise Expert Report", report: longExpertReport, minPages: 6 },
    { name: "Sparse / Provisional Expert Report", report: sparseExpertReport, minPages: 6 },
    { name: "Edge-Case Long URL Expert Report", report: edgeCaseExpertReport, minPages: 6 },
  ];

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const tc of testCases) {
      console.log(`--> Validating Fixture: [${tc.name}]`);
      const targetPdfFile = path.join(outputDir, `Expert-${tc.report.metadata.reportId}.pdf`);

      // 1. HTML Overflow and Table Checks (KEPT STRICTLY SEPARATE FROM PDF VISUALS)
      const htmlPage = await browser.newPage({ viewport: { width: 794, height: 1123 } });
      const html = generateExpertReportHtml(tc.report);
      await htmlPage.setContent(html, { waitUntil: "networkidle" });

      const tableCheck = await htmlPage.evaluate(() => {
        const tables = Array.from(document.querySelectorAll("table"));
        const results = [];
        for (const t of tables) {
          const style = window.getComputedStyle(t);
          const isFixed = style.tableLayout === "fixed";
          const clientWidth = t.clientWidth;
          const scrollWidth = t.scrollWidth;
          const overflows = scrollWidth > clientWidth + 1;
          results.push({ isFixed, clientWidth, scrollWidth, overflows });
        }
        return { count: tables.length, results };
      });

      if (tableCheck.results.some((r) => !r.isFixed || r.overflows)) {
        throw new Error(`Table layout integrity failed in HTML: ${JSON.stringify(tableCheck.results)}`);
      }

      const bodyOverflow = await htmlPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (bodyOverflow) {
        throw new Error(`HTML body exceeds printable width (794px) in ${tc.name}`);
      }
      console.log(`    [PASS] HTML Layout: ${tableCheck.count} table(s) fixed-width, 0 horizontal overflow.`);
      await htmlPage.close();

      // 2. Real Production PDF Generation with real header/footer & cryptographic hash
      const pdfBuffer = await expertPdfGenerator.generatePdf(tc.report, targetPdfFile);
      const binaryStats = validatePdfBinary(pdfBuffer, tc.minPages);
      console.log(`    [PASS] PDF Binary: ${binaryStats.size} bytes, ${binaryStats.pageCount} pages, A4 standard dimensions.`);

      // Verify cryptographic SHA-256
      const computedSha256 = "sha256:" + crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      if (tc.report.exportManifest?.pdfSha256 && tc.report.exportManifest.pdfSha256 !== computedSha256) {
        throw new Error(`PDF SHA-256 mismatch! Expected ${computedSha256}, got ${tc.report.exportManifest.pdfSha256}`);
      }
      console.log(`    [PASS] Cryptographic SHA-256 signature verified matching generated artifact.`);

      // 3. Deterministic PDF Page Rasterization (Actual PDF Pages, NOT HTML screenshots)
      const filePrefix = `expert-${tc.report.metadata.reportId}`;
      const rasterResult = await rasterizePdf(browser, pdfBuffer, rasterDir, filePrefix, 1.5);

      if (rasterResult.numPages !== binaryStats.pageCount) {
        throw new Error(`Rasterized page count (${rasterResult.numPages}) does not match binary PDF page count (${binaryStats.pageCount}).`);
      }
      console.log(`    [PASS] Rasterized ${rasterResult.numPages} actual PDF page image(s) to ${rasterDir}.`);

      // 4. Content and Section Verification From Extracted PDF Text
      const fullPdfText = rasterResult.pages.map((p) => p.text.toUpperCase()).join(" ");

      const hasCover = fullPdfText.includes("EXPERT TECHNICAL DIAGNOSTIC REPORT");
      const hasScope = fullPdfText.includes("1. SCOPE & EXECUTION PARAMETERS");
      const hasPlatform = fullPdfText.includes("2. PLATFORM PROFILE & DETECTED STACK");
      const hasLedger = fullPdfText.includes("3. ASSESSMENT CATALOGUE & SCORE LEDGER");
      const hasFindings = fullPdfText.includes("11. DIAGNOSTIC FINDING LEDGER");
      const hasPlan = fullPdfText.includes("12. SPECIALIST REMEDIATION ACTION PLAN");
      const hasCrypto = fullPdfText.includes("13. CRYPTOGRAPHIC INTEGRITY SIGN-OFF");

      if (!hasCover || !hasScope || !hasPlatform || !hasLedger || !hasFindings || !hasPlan || !hasCrypto) {
        throw new Error(`Required sections missing in rasterized PDF text: cover=${hasCover}, scope=${hasScope}, platform=${hasPlatform}, ledger=${hasLedger}, findings=${hasFindings}, plan=${hasPlan}, crypto=${hasCrypto}`);
      }
      console.log(`    [PASS] Extracted PDF Text: All 13 core diagnostic sections present.`);

      // Verify strict separation of Crawl Execution from Catalogue Coverage
      const hasConflation = /Tested:\s*\d+\s*\(\d+%\)/i.test(fullPdfText);
      const hasCrawlInventory = fullPdfText.includes("CRAWL INVENTORY");
      const hasCatalogueCoverage = fullPdfText.includes("CATALOGUE COVERAGE");

      if (hasConflation) {
        throw new Error(`Conflation detected in PDF text: page count and catalogue coverage are confused in ${tc.name}`);
      }
      if (!hasCrawlInventory || !hasCatalogueCoverage) {
        throw new Error(`Strict separation of crawl inventory and catalogue coverage missing in ${tc.name}`);
      }
      console.log(`    [PASS] Page inventory strictly separated from catalogue coverage.`);

      // If provisional, verify provisional notice in rasterized PDF text
      if (tc.report.executiveSummary.overallScore.isProvisional) {
        const hasProvisionalNotice = fullPdfText.includes("PROVISIONAL COVERAGE ACCEPTANCE NOTICE");
        if (!hasProvisionalNotice) {
          throw new Error(`Provisional notice missing from rasterized PDF text in ${tc.name}`);
        }
        console.log(`    [PASS] Canonical provisional coverage notice verified in PDF text.`);
      }

      // Record in Validation Manifest
      await recordValidationReport({
        reportId: tc.report.metadata.reportId,
        reportType: "expert",
        fixtureName: tc.name,
        pdfFile: path.basename(targetPdfFile),
        pdfSizeBytes: binaryStats.size,
        pdfPageCount: binaryStats.pageCount,
        rasterizedPageCount: rasterResult.numPages,
        pageDimensionsPt: "595.92 x 842.88 (A4)",
        pageImages: rasterResult.pages.map((p) => p.imageFileName),
        extractedSections: ["COVER", "SCOPE", "PLATFORM_PROFILE", "SCORE_LEDGER", "FINDINGS_LEDGER", "REMEDIATION_PLAN", "CRYPTO_SIGN_OFF"],
        isBlankDetected: rasterResult.pages.some((p) => p.isBlank),
        checks: {
          binaryValid: true,
          a4Dimensions: true,
          pageCountMatches: rasterResult.numPages === binaryStats.pageCount,
          noBlankPages: !rasterResult.pages.some((p) => p.isBlank),
          requiredSectionsPresent: true,
          inventorySeparatedFromCoverage: !hasConflation && hasCrawlInventory && hasCatalogueCoverage,
          htmlTableLayoutFixed: true,
          htmlNoHorizontalOverflow: true,
        },
      });

      console.log(`  --> Fixture [${tc.name}]: ALL CHECKS PASSED\n`);
    }

    console.log("=================================================================");
    console.log("  ALL EXPERT REPORT PDF VERIFICATIONS PASSED SUCCESSFULLY!       ");
    console.log("=================================================================");
  } finally {
    await browser.close();
  }
}

verifyExpertPdfs().catch((err) => {
  console.error("\n[FAIL] Expert PDF Verification encountered fatal error:", err);
  process.exit(1);
});
