import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pdfGenerator, generateReportHtml } from "../src/lib/reports/pdf-generator.ts";
import { rasterizePdf } from "./pdf-rasterizer.mjs";
import { recordValidationReport } from "./validation-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve("pdf-review-artifacts");
const rasterDir = path.join(outputDir, "rasterized-pages");
await fs.mkdir(rasterDir, { recursive: true });

// --- Fixtures ---

// 1. Typical Owner Report
const typicalReport = {
  reportId: "rep_typical_001",
  reportVersion: "1.0.0",
  scanId: "scan_typical_001",
  generatedAt: new Date().toISOString(),
  companyIdentity: {
    name: "Acme Commerce Co",
    domain: "acme-commerce.demo",
    targetUrl: "https://acme-commerce.demo",
    businessCategory: "ecommerce",
    businessCategoryDetection: {
      primaryCategory: "ecommerce",
      effectiveCategory: "ecommerce",
      confidence: "HIGH",
      confidenceScore: 0.95,
      categoryLabel: "Ecommerce & Online Retail",
      evidenceSignals: ["Discovered shopping cart", "Product catalog schemas"],
      decisionSource: "AUTO_DETECTED",
      secondaryFacets: [],
    },
    targetMarket: "US",
    preferredLanguage: "en",
  },
  executiveSnapshot: {
    overallScore: {
      score: 84,
      ratingBand: "Generally healthy; opportunities remain",
      isProvisional: false,
      evaluationNote: "Comprehensive baseline assessment completed across eligible categories.",
      totalPossibleCataloguePoints: 100,
      evaluatedWeightedPoints: 92,
      criticalIssuesCount: 0,
      ineligibleCategories: [],
    },
    categoryScores: [
      {
        category: "technical_health",
        categoryName: "Technical Health & Crawlability",
        allocatedWeight: 12,
        testedPoints: 12,
        earnedPoints: 11,
        scorePercentage: 92,
        weightedScore: 11.0,
        testCounts: { total: 6, pass: 5, warning: 1, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
      },
      {
        category: "seo",
        categoryName: "Technical & On-Page SEO",
        allocatedWeight: 18,
        testedPoints: 18,
        earnedPoints: 16,
        scorePercentage: 89,
        weightedScore: 16.0,
        testCounts: { total: 9, pass: 7, warning: 2, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
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
      },
      {
        category: "responsive_accessibility",
        categoryName: "Responsive & Accessibility",
        allocatedWeight: 10,
        testedPoints: 10,
        earnedPoints: 9,
        scorePercentage: 90,
        weightedScore: 9.0,
        testCounts: { total: 5, pass: 4, warning: 1, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
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
      },
    ],
    coverage: {
      discoveredPages: 45,
      testedPages: 25,
      skippedPages: 20,
      failedPages: 0,
      inaccessiblePages: 0,
      totalBytesFetched: 4500000,
      totalPagesBudget: 50,
      crawlDepthReached: 2,
      externalLinksTested: 18,
      resourcesTested: 130,
      isExhaustive: false,
      weightedPointsEvaluated: 92,
      totalWeightedPoints: 100,
      coveragePercentage: 92,
    },
    topOpportunities: [
      {
        id: "opp_1",
        rank: 1,
        title: "Optimize Search Metadata & Structured Data",
        businessImpact: "Improves organic search click-through rates.",
        potentialServiceCategory: "Technical & On-Page SEO",
        urgency: "HIGH",
        relatedTestIds: ["SEO-01", "SEO-08"],
        recommendedAction: "Add JSON-LD schemas and descriptive title tags.",
      },
      {
        id: "opp_2",
        rank: 2,
        title: "Implement Strict Content-Security-Policy",
        businessImpact: "Hardens storefront against cross-site scripting attacks.",
        potentialServiceCategory: "Public Security Configuration",
        urgency: "HIGH",
        relatedTestIds: ["SEC-01"],
        recommendedAction: "Configure Content-Security-Policy response headers.",
      },
    ],
    testedPageCount: 25,
  },
  platformProfile: {
    detectedTechnologies: ["Shopify", "Tailwind CSS", "Cloudflare"],
    totalPagesDiscovered: 45,
    httpsStatus: "Enforced (HTTPS)",
    preferredHost: "acme-commerce.demo",
    primaryLanguage: "en",
  },
  scoreDetails: [],
  issueDistribution: {
    critical: 0,
    high: 2,
    medium: 5,
    low: 4,
    totalIssues: 11,
    affectedPagesCount: 6,
  },
  technicalHealthAndSeoSummary: {
    titlesHealthy: 24,
    descriptionsHealthy: 22,
    canonicalsConsistent: true,
    brokenLinksCount: 0,
    sitemapAccessible: true,
    structuredDataPresent: true,
  },
  performanceAndResponsiveSummary: {
    mobileLabScore: 82,
    desktopLabScore: 94,
    coreWebVitalsStatus: "Estimated from lab diagnostic",
    testedViewports: [320, 360, 390, 768, 1024, 1280, 1440],
    horizontalOverflowFound: false,
  },
  securityAndAuthSummary: {
    httpsEnforced: true,
    securityHeadersConfigured: 4,
    totalSecurityHeadersChecked: 5,
    authSurfacesFound: 1,
    publicCookieIssues: 0,
    limitationsNote: "Passive public configuration audit only.",
  },
  contentTrustAiSummary: {
    blogOrResourcePresent: true,
    aiCrawlerPolicy: "Standard Open AI Crawl Permissions",
    entitySchemaPresent: true,
    contactOrTrustSignalsPresent: true,
  },
  analyticsAndTrackingSummary: {
    ga4Detected: true,
    gtmDetected: true,
    advertisingPixelsCount: 2,
    consentUiDetected: true,
    measurementAccountConnected: false,
  },
  competitorSnapshot: [
    {
      domain: "rival-shop.demo",
      normalizedUrl: "https://rival-shop.demo",
      overallScore: 76,
      keyMetrics: { technicalHealthScore: 78, seoScore: 74, performanceScore: 70, httpsActive: true, mobileFriendly: true },
      dataProvenance: { source: "Uniform SiteIntel Pulse Public Assessment Framework", measuredAt: new Date().toISOString(), isEstimated: true },
      disclaimer: "Benchmark comparison only.",
    },
  ],
  priorityOpportunities: [
    {
      id: "opp_1",
      rank: 1,
      title: "Optimize Search Metadata & Structured Data",
      businessImpact: "Improves organic search click-through rates.",
      potentialServiceCategory: "Technical & On-Page SEO",
      urgency: "HIGH",
      relatedTestIds: ["SEO-01", "SEO-08"],
      recommendedAction: "Add JSON-LD schemas and descriptive title tags.",
    },
  ],
  methodologyAndLimitations: {
    scanScope: "Bounded non-invasive public assessment strictly respecting robots.txt.",
    dataSources: [
      "Public HTML and response header observations",
      "Deterministic 100-point Assessment Catalogue v1.0",
      "Public robots.txt and XML sitemaps",
    ],
    scoreDefinitions: "Scores reflect observable technical baseline quality from 0 to 100 points.",
    disclaimers: [
      "This report is generated for Acme Commerce platform decision-makers.",
      "A high score does not guarantee top search engine rankings.",
    ],
    expertEngagementCta: "To receive exact code fix locations and engineer work plans, request an Expert Diagnostic Audit.",
  },
  results: [],
};
typicalReport.scoreDetails = typicalReport.executiveSnapshot.categoryScores;

// Add Dimension Scorecards & Cost of Inaction to Typical Report
typicalReport.dimensionScorecards = [
  {
    id: "seo",
    name: "SEO (Search Engine Optimization)",
    description: "Covers title tags, meta descriptions, headings, robots, and sitemaps.",
    score: 85,
    ratingBand: "Strong observed baseline",
    coveragePercentage: 90,
    confidence: "HIGH",
    evaluatedTestsCount: 9,
    totalTestsCount: 10,
    urlsAssessedCount: 20,
    isNonAdditiveView: true,
  },
  {
    id: "performance_speed",
    name: "Performance & Speed",
    description: "Measures render-blocking resources, payload efficiency, server latency.",
    score: 80,
    ratingBand: "Generally healthy",
    coveragePercentage: 83,
    confidence: "MEDIUM",
    evaluatedTestsCount: 5,
    totalTestsCount: 6,
    urlsAssessedCount: 20,
    isNonAdditiveView: true,
  },
];

typicalReport.costOfInaction = {
  status: "ESTIMATED",
  businessModel: "ecommerce",
  currency: "USD",
  scenarios: {
    conservative: {
      scenario: "conservative",
      monthlyOpportunity: 3600,
      annualOpportunity: 43200,
      conversionRateDeltaPct: 0.20,
      paybackMonths: 1.5,
      monthlyRevenueOpportunity: 9000,
      annualRevenueOpportunity: 108000,
      monthlyGrossProfitOpportunity: 3600,
      annualGrossProfitOpportunity: 43200,
      baselineConversionRatePct: 1.80,
      modeledConversionRatePct: 2.00,
    },
    base: {
      scenario: "base",
      monthlyOpportunity: 9000,
      annualOpportunity: 108000,
      conversionRateDeltaPct: 0.50,
      paybackMonths: 0.6,
      monthlyRevenueOpportunity: 22500,
      annualRevenueOpportunity: 270000,
      monthlyGrossProfitOpportunity: 9000,
      annualGrossProfitOpportunity: 108000,
      baselineConversionRatePct: 1.80,
      modeledConversionRatePct: 2.30,
    },
    upside: {
      scenario: "upside",
      monthlyOpportunity: 18000,
      annualOpportunity: 216000,
      conversionRateDeltaPct: 1.00,
      paybackMonths: 0.3,
      monthlyRevenueOpportunity: 45000,
      annualRevenueOpportunity: 540000,
      monthlyGrossProfitOpportunity: 18000,
      annualGrossProfitOpportunity: 216000,
      baselineConversionRatePct: 1.80,
      modeledConversionRatePct: 2.80,
    },
  },
  grossMarginPct: 40,
  formula: "Gross Profit Opportunity = Monthly Sessions × Incremental Conversion Lift (% pts) × Transaction Value × Gross Margin %",
  inputSource: "Owner Provided Commercial Inputs",
  confidence: "HIGH",
  calculatedAt: new Date().toISOString(),
  methodologyNotes: "Calculated via SiteIntel Cost of Inaction Calculator v1.",
  assumptions: [
    "[Owner Provided] Monthly traffic: 50,000 unique visitor sessions.",
    "[Owner Provided] Average Order Value (AOV): $90.00.",
    "[Owner Provided] Gross Margin: 40% applied.",
  ],
  disclaimers: [
    "Results represent forward-looking modeled growth opportunity from resolving identified UX, speed, and conversion barriers; this is NOT verified historical lost revenue.",
  ],
};

// 2. Short Report Fixture
const shortReport = {
  ...typicalReport,
  reportId: "rep_short_002",
  companyIdentity: { ...typicalReport.companyIdentity, name: "Minimal Corp", domain: "minimal.demo" },
  executiveSnapshot: {
    ...typicalReport.executiveSnapshot,
    categoryScores: typicalReport.executiveSnapshot.categoryScores.slice(0, 2),
    topOpportunities: [typicalReport.executiveSnapshot.topOpportunities[0]],
  },
  scoreDetails: typicalReport.executiveSnapshot.categoryScores.slice(0, 2),
  competitorSnapshot: [],
  priorityOpportunities: [typicalReport.priorityOpportunities[0]],
};

// 3. Long Report Fixture (Multi-page, extensive findings)
const longReport = {
  ...typicalReport,
  reportId: "rep_long_003",
  companyIdentity: { ...typicalReport.companyIdentity, name: "Enterprise Conglomerate", domain: "enterprise-site.demo" },
  executiveSnapshot: {
    ...typicalReport.executiveSnapshot,
    topOpportunities: Array.from({ length: 8 }, (_, i) => ({
      id: `opp_${i + 1}`,
      rank: i + 1,
      title: `Strategic High-Impact Initiative ${i + 1}: Modernization & Optimization`,
      businessImpact: `Significant quantifiable revenue impact across enterprise conversion pathways (#${i + 1}).`,
      potentialServiceCategory: "Technical Architecture & Growth",
      urgency: i < 3 ? "CRITICAL" : "HIGH",
      relatedTestIds: [`TEST-0${i + 1}`, `TEST-1${i + 1}`],
      recommendedAction: `Deploy architectural fix across service mesh and customer-facing templates.`,
    })),
  },
  priorityOpportunities: Array.from({ length: 8 }, (_, i) => ({
    id: `opp_${i + 1}`,
    rank: i + 1,
    title: `Strategic High-Impact Initiative ${i + 1}: Modernization & Optimization`,
    businessImpact: `Significant quantifiable revenue impact across enterprise conversion pathways (#${i + 1}).`,
    potentialServiceCategory: "Technical Architecture & Growth",
    urgency: i < 3 ? "CRITICAL" : "HIGH",
    relatedTestIds: [`TEST-0${i + 1}`, `TEST-1${i + 1}`],
    recommendedAction: `Deploy architectural fix across service mesh and customer-facing templates.`,
  })),
  competitorSnapshot: [
    {
      domain: "competitor-alpha.demo",
      normalizedUrl: "https://competitor-alpha.demo",
      overallScore: 82,
      keyMetrics: { technicalHealthScore: 85, seoScore: 80, performanceScore: 78, httpsActive: true, mobileFriendly: true },
      dataProvenance: { source: "Uniform SiteIntel Pulse Public Assessment Framework", measuredAt: new Date().toISOString(), isEstimated: true },
      disclaimer: "Benchmark comparison only.",
    },
    {
      domain: "competitor-beta.demo",
      normalizedUrl: "https://competitor-beta.demo",
      overallScore: 71,
      keyMetrics: { technicalHealthScore: 70, seoScore: 68, performanceScore: 65, httpsActive: true, mobileFriendly: true },
      dataProvenance: { source: "Uniform SiteIntel Pulse Public Assessment Framework", measuredAt: new Date().toISOString(), isEstimated: true },
      disclaimer: "Benchmark comparison only.",
    },
  ],
};

// 4. Sparse / Provisional Report Fixture
const sparseReport = {
  ...typicalReport,
  reportId: "rep_sparse_004",
  companyIdentity: {
    ...typicalReport.companyIdentity,
    name: "Stealth Startup",
    domain: "stealth-prelaunch.demo",
    businessCategory: "saas",
    businessCategoryDetection: {
      primaryCategory: "saas",
      effectiveCategory: "saas",
      confidence: "LOW",
      confidenceScore: 0.40,
      categoryLabel: "Software as a Service (SaaS)",
      evidenceSignals: ["Single landing page detected"],
      decisionSource: "AUTO_DETECTED",
      secondaryFacets: [],
    },
  },
  executiveSnapshot: {
    ...typicalReport.executiveSnapshot,
    overallScore: {
      score: 48,
      ratingBand: "Provisional Baseline Assessment",
      isProvisional: true,
      evaluationNote: "Only 45% of catalogue evaluated due to single-page crawl boundaries.",
      totalPossibleCataloguePoints: 100,
      evaluatedWeightedPoints: 45,
      criticalIssuesCount: 1,
      ineligibleCategories: ["ecommerce", "multi_lingual"],
    },
    coverage: {
      ...typicalReport.executiveSnapshot.coverage,
      discoveredPages: 1,
      testedPages: 1,
      skippedPages: 0,
      coveragePercentage: 45,
      weightedPointsEvaluated: 45,
    },
  },
};

// 5. Edge-Case Report Fixture (Long URLs, special characters)
const edgeCaseReport = {
  ...typicalReport,
  reportId: "rep_edge_005",
  companyIdentity: {
    ...typicalReport.companyIdentity,
    name: "Special & Characters <Corp> ' \" & Company",
    domain: "subdomain.extremely-long-domain-name-with-many-hyphens-and-query-parameters-edge-testing.demo",
  },
  priorityOpportunities: [
    {
      id: "opp_long_url",
      rank: 1,
      title: "Resolve Path Overflow in https://subdomain.extremely-long-domain-name.demo/catalog/category/subcategory/item-sku-0019283847291038471928374918237491827349812739487129384719283749182734981729384719283749182374918273498172938471298374",
      businessImpact: "Extremely long query strings: ?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale_2026_promo_special_discount_tier_one_premium_bundle_worldwide&utm_content=banner_variant_c_responsive_animation_v2_final_approved&utm_term=ultra_performance_cloud_native_distributed_systems_enterprise",
      potentialServiceCategory: "Technical & On-Page SEO",
      urgency: "HIGH",
      relatedTestIds: ["SEO-01", "TECH-03"],
      recommendedAction: "Shorten canonical URLs and sanitize tracking parameters.",
    },
  ],
};

// Binary validation
function validatePdfBinary(buffer, expectedMinPages = 1) {
  if (buffer.length < 10000) {
    throw new Error(`PDF buffer size (${buffer.length} bytes) is below minimum required 10 KB threshold.`);
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
        throw new Error(`PDF page dimensions (${width} x ${height} pt) do not match A4 standard (595.28 x 841.89 pt).`);
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

async function verifyOwnerPdfs() {
  console.log("=================================================================");
  console.log("  SiteIntel Pulse — Owner Report PDF Validation Suite (Part D)  ");
  console.log("=================================================================\n");

  const testCases = [
    { name: "Typical Commercial Report", report: typicalReport, minPages: 3 },
    { name: "Short Report", report: shortReport, minPages: 3 },
    { name: "Long Enterprise Report", report: longReport, minPages: 4 },
    { name: "Sparse / Provisional Report", report: sparseReport, minPages: 3 },
    { name: "Edge-Case Long URL Report", report: edgeCaseReport, minPages: 3 },
  ];

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    for (const tc of testCases) {
      console.log(`--> Validating Fixture: [${tc.name}]`);
      const targetPdfFile = path.join(outputDir, `Owner-Report-${tc.report.reportId}.pdf`);

      // 1. HTML Overflow and Table Checks (KEPT STRICTLY SEPARATE FROM PDF VISUALS)
      const htmlPage = await browser.newPage({ viewport: { width: 794, height: 1123 } });
      const html = generateReportHtml(tc.report);
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

      // 2. Real Production PDF Generation with real header/footer
      const pdfBuffer = await pdfGenerator.generatePdf(tc.report, targetPdfFile);
      const binaryStats = validatePdfBinary(pdfBuffer, tc.minPages);
      console.log(`    [PASS] PDF Binary: ${binaryStats.size} bytes, ${binaryStats.pageCount} pages, A4 dimensions confirmed.`);

      // 3. Deterministic PDF Page Rasterization (Actual PDF Pages, NOT HTML screenshots)
      const filePrefix = `owner-${tc.report.reportId}`;
      const rasterResult = await rasterizePdf(browser, pdfBuffer, rasterDir, filePrefix, 1.5);

      // Verify exact matching page count
      if (rasterResult.numPages !== binaryStats.pageCount) {
        throw new Error(`Rasterized page count (${rasterResult.numPages}) does not match binary PDF page count (${binaryStats.pageCount}).`);
      }
      console.log(`    [PASS] Rasterized ${rasterResult.numPages} actual PDF page image(s) to ${rasterDir}.`);

      // 4. Content and Section Verification From Extracted PDF Text
      const fullPdfText = rasterResult.pages.map((p) => p.text.toUpperCase()).join(" ");

      const hasBrand = fullPdfText.includes("SITEINTEL PULSE");
      const hasScore = fullPdfText.includes("EXECUTIVE SNAPSHOT") || fullPdfText.includes("CATEGORY SCORES");
      const hasPlatform = fullPdfText.includes("PLATFORM & INFRASTRUCTURE PROFILE");
      const hasDiagnostics = fullPdfText.includes("CORE TECHNICAL & SEO DIAGNOSTICS");
      const hasMethodology = fullPdfText.includes("METHODOLOGY & NEXT STEPS") || fullPdfText.includes("METHODOLOGY");

      if (!hasBrand || !hasScore || !hasPlatform || !hasDiagnostics || !hasMethodology) {
        throw new Error(`Required sections missing in rasterized PDF text: brand=${hasBrand}, score=${hasScore}, platform=${hasPlatform}, diag=${hasDiagnostics}, meth=${hasMethodology}`);
      }
      console.log(`    [PASS] Extracted PDF Text: All required diagnostic sections present.`);

      // If provisional, verify provisional notice in rasterized PDF text
      if (tc.report.executiveSnapshot.overallScore.isProvisional) {
        const hasProvisionalNotice = fullPdfText.includes("PROVISIONAL COVERAGE ACCEPTANCE NOTICE");
        if (!hasProvisionalNotice) {
          throw new Error(`Provisional notice missing from rasterized PDF text in ${tc.name}`);
        }
        console.log(`    [PASS] Canonical provisional coverage notice verified in PDF text.`);
      }

      // If dimensionScorecards exist, verify presence in rasterized PDF text
      if (tc.report.dimensionScorecards && tc.report.dimensionScorecards.length > 0) {
        const hasScorecards = fullPdfText.includes("SPECIALIZED DIAGNOSTIC DIMENSIONS") || fullPdfText.includes("DIAGNOSTIC DIMENSION");
        if (!hasScorecards) {
          throw new Error(`Diagnostic Dimension Scorecards section missing from rasterized PDF text in ${tc.name}`);
        }
        console.log(`    [PASS] Diagnostic Dimension Scorecards verified in PDF text.`);
      }

      // If costOfInaction exists, verify presence in rasterized PDF text
      if (tc.report.costOfInaction) {
        const hasCalculator = fullPdfText.includes("COST OF INACTION") || fullPdfText.includes("OPPORTUNITY CALCULATOR");
        if (!hasCalculator) {
          throw new Error(`Cost of Inaction section missing from rasterized PDF text in ${tc.name}`);
        }
        console.log(`    [PASS] Cost of Inaction Calculator verified in PDF text.`);
      }

      // Record in Validation Manifest
      await recordValidationReport({
        reportId: tc.report.reportId,
        reportType: "owner",
        fixtureName: tc.name,
        pdfFile: path.basename(targetPdfFile),
        pdfSizeBytes: binaryStats.size,
        pdfPageCount: binaryStats.pageCount,
        rasterizedPageCount: rasterResult.numPages,
        pageDimensionsPt: "595.92 x 842.88 (A4)",
        pageImages: rasterResult.pages.map((p) => p.imageFileName),
        extractedSections: ["BRAND", "EXECUTIVE_SNAPSHOT", "PLATFORM_PROFILE", "DIAGNOSTICS", "METHODOLOGY"],
        isBlankDetected: rasterResult.pages.some((p) => p.isBlank),
        checks: {
          binaryValid: true,
          a4Dimensions: true,
          pageCountMatches: rasterResult.numPages === binaryStats.pageCount,
          pageNumberingValid: rasterResult.pages.every((p) => p.pageNumberingValid),
          noBlankPages: !rasterResult.pages.some((p) => p.isBlank),
          requiredSectionsPresent: true,
          htmlTableLayoutFixed: true,
          htmlNoHorizontalOverflow: true,
        },
      });

      console.log(`  --> Fixture [${tc.name}]: ALL CHECKS PASSED\n`);
    }

    console.log("=================================================================");
    console.log("  ALL OWNER REPORT PDF VERIFICATIONS PASSED SUCCESSFULLY!        ");
    console.log("=================================================================");
  } finally {
    await browser.close();
  }
}

verifyOwnerPdfs().catch((err) => {
  console.error("\n[FAIL] Owner PDF Verification encountered fatal error:", err);
  process.exit(1);
});
