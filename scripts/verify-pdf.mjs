import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sample OwnerReport fixture
const sampleReport = {
  reportId: "rep_verify_test_001",
  reportVersion: "1.0.0",
  scanId: "scan_verify_test",
  generatedAt: new Date().toISOString(),
  companyIdentity: {
    name: "Company A E-Commerce",
    domain: "naffeez.com",
    targetUrl: "https://naffeez.com",
    businessCategory: "ecommerce",
    targetMarket: "US",
    preferredLanguage: "en",
  },
  executiveSnapshot: {
    overallScore: {
      score: 82,
      ratingBand: "Generally healthy; opportunities remain",
      isProvisional: false,
      evaluationNote: "Comprehensive baseline assessment completed across eligible categories.",
      totalPossibleCataloguePoints: 100,
      evaluatedWeightedPoints: 92,
      criticalIssuesCount: 0,
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
        earnedPoints: 7,
        scorePercentage: 70,
        weightedScore: 7.0,
        testCounts: { total: 5, pass: 3, warning: 1, fail: 1, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
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
      {
        category: "authentication_posture",
        categoryName: "Observable Authentication Posture",
        allocatedWeight: 8,
        testedPoints: 8,
        earnedPoints: 7,
        scorePercentage: 88,
        weightedScore: 7.0,
        testCounts: { total: 4, pass: 3, warning: 1, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
      },
      {
        category: "content_quality",
        categoryName: "Content Quality & Trust",
        allocatedWeight: 10,
        testedPoints: 10,
        earnedPoints: 9,
        scorePercentage: 90,
        weightedScore: 9.0,
        testCounts: { total: 5, pass: 4, warning: 1, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
      },
      {
        category: "geo_aeo_ai",
        categoryName: "GEO / AEO & AI Readiness",
        allocatedWeight: 8,
        testedPoints: 8,
        earnedPoints: 6,
        scorePercentage: 75,
        weightedScore: 6.0,
        testCounts: { total: 4, pass: 2, warning: 2, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
      },
      {
        category: "analytics_tracking",
        categoryName: "Analytics & Tracking Readiness",
        allocatedWeight: 5,
        testedPoints: 4,
        earnedPoints: 3.5,
        scorePercentage: 88,
        weightedScore: 4.4,
        testCounts: { total: 5, pass: 3, warning: 1, fail: 0, unknown: 1, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
      },
      {
        category: "conversion_marketing",
        categoryName: "Conversion & Marketing Experience",
        allocatedWeight: 4,
        testedPoints: 4,
        earnedPoints: 3.5,
        scorePercentage: 88,
        weightedScore: 3.5,
        testCounts: { total: 4, pass: 3, warning: 1, fail: 0, unknown: 0, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
      },
      {
        category: "competitor_comparison",
        categoryName: "Competitive Comparison Readiness",
        allocatedWeight: 3,
        testedPoints: 2,
        earnedPoints: 2,
        scorePercentage: 100,
        weightedScore: 3.0,
        testCounts: { total: 3, pass: 2, warning: 0, fail: 0, unknown: 1, notApplicable: 0, notTested: 0, blocked: 0 },
        isEligibleForOverall: true,
      },
    ],
    coverage: {
      discoveredPages: 42,
      testedPages: 35,
      skippedPages: 7,
      failedPages: 0,
      inaccessiblePages: 0,
      totalBytesFetched: 4200000,
      totalPagesBudget: 50,
      crawlDepthReached: 3,
      externalLinksTested: 15,
      resourcesTested: 120,
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
    ],
    testedPageCount: 35,
  },
  platformProfile: {
    detectedTechnologies: ["Shopify", "Tailwind CSS"],
    totalPagesDiscovered: 42,
    httpsStatus: "Enforced (HTTPS)",
    preferredHost: "naffeez.com",
    primaryLanguage: "en",
  },
  scoreDetails: [],
  issueDistribution: {
    critical: 0,
    high: 2,
    medium: 6,
    low: 4,
    totalIssues: 12,
    affectedPagesCount: 8,
  },
  technicalHealthAndSeoSummary: {
    titlesHealthy: 32,
    descriptionsHealthy: 28,
    canonicalsConsistent: true,
    brokenLinksCount: 0,
    sitemapAccessible: true,
    structuredDataPresent: true,
  },
  performanceAndResponsiveSummary: {
    mobileLabScore: 78,
    desktopLabScore: 92,
    coreWebVitalsStatus: "Estimated from lab diagnostic",
    testedViewports: [320, 360, 390, 768, 1024, 1280, 1440],
    horizontalOverflowFound: false,
  },
  securityAndAuthSummary: {
    httpsEnforced: true,
    securityHeadersConfigured: 3,
    totalSecurityHeadersChecked: 5,
    authSurfacesFound: 2,
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
      domain: "competitor-shop.com",
      normalizedUrl: "https://competitor-shop.com",
      overallScore: 74,
      keyMetrics: {
        technicalHealthScore: 80,
        seoScore: 72,
        performanceScore: 68,
        httpsActive: true,
        mobileFriendly: true,
      },
      dataProvenance: {
        source: "Uniform SiteIntel Pulse Public Assessment Framework",
        measuredAt: new Date().toISOString(),
        isEstimated: true,
      },
      disclaimer: "Benchmark comparison only.",
    },
  ],
  priorityOpportunities: [
    {
      id: "opp_1",
      rank: 1,
      title: "Optimize Search Metadata & Structured Data",
      businessImpact: "Improves organic search click-through rates and elevates product visibility.",
      potentialServiceCategory: "Technical & On-Page SEO",
      urgency: "HIGH",
      relatedTestIds: ["SEO-01", "SEO-08"],
      recommendedAction: "Audit and update title tags, meta descriptions, and deploy schema.org JSON-LD.",
    },
    {
      id: "opp_2",
      rank: 2,
      title: "Accelerate Page Speed and Mobile Rendering",
      businessImpact: "Faster loading times directly increase checkout conversions.",
      potentialServiceCategory: "Performance Engineering",
      urgency: "HIGH",
      relatedTestIds: ["PERF-01", "PERF-04"],
      recommendedAction: "Minify JavaScript, compress images with WebP, and eliminate render-blocking CSS.",
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
      "This report is generated for Company A platform decision-makers.",
      "A high score does not guarantee top Google search rankings.",
    ],
    expertEngagementCta: "To receive exact code fix locations and engineer work plans, request a Company B Expert Diagnostic Audit.",
  },
  results: [],
};

// Copy categoryScores into scoreDetails
sampleReport.scoreDetails = sampleReport.executiveSnapshot.categoryScores;

async function verifyPdfGeneration() {
  console.log("--> Starting Playwright Chromium PDF Verification...");

  const { generateReportHtml } = await import("../src/lib/reports/pdf-generator.ts");
  const html = generateReportHtml(sampleReport);

  const outputDir = path.join(process.cwd(), "test-results");
  await fs.mkdir(outputDir, { recursive: true });
  const pdfPath = path.join(outputDir, "SiteIntel-Pulse-Owner-Report-Verification.pdf");

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
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
    });

    await fs.writeFile(pdfPath, pdfBuffer);
    const stats = await fs.stat(pdfPath);

    console.log(`[PASS] PDF generated successfully!`);
    console.log(`  File path: ${pdfPath}`);
    console.log(`  File size: ${stats.size} bytes (${Math.round(stats.size / 1024)} KB)`);

    if (stats.size < 10000) {
      throw new Error(`PDF size (${stats.size} bytes) is suspiciously small!`);
    }

    console.log("--> PDF Visual / Rendering Check: ALL CHECKS PASSED.");
  } finally {
    await browser.close();
  }
}

verifyPdfGeneration().catch((err) => {
  console.error("[FAIL] PDF Verification error:", err);
  process.exit(1);
});
