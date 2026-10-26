import { test, expect } from "@playwright/test";

test.describe("Owner Report Workflow & Dashboard", () => {
  test("Intake form validates required target URL", async ({ page }) => {
    await page.goto("/owner-report");

    const submitBtn = page.getByRole("button", { name: /Start Owner Audit/i });
    await submitBtn.click();

    // Check for validation error on empty domain
    await expect(page.locator("text=Website URL or domain is required")).toBeVisible();
  });

  test("Renders complete 13-section Owner Report with mocked audit data", async ({ page, isMobile }) => {
    const mockReport = {
      reportId: "rep_e2e_test_100",
      reportVersion: "1.0.0",
      scanId: "scan_e2e_test",
      generatedAt: new Date().toISOString(),
      companyIdentity: {
        name: "Acme Store",
        domain: "acmestore.test",
        targetUrl: "https://acmestore.test",
        businessCategory: "ecommerce",
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
        ],
        coverage: {
          discoveredPages: 25,
          testedPages: 20,
          skippedPages: 5,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 2500000,
          totalPagesBudget: 50,
          crawlDepthReached: 3,
          externalLinksTested: 10,
          resourcesTested: 80,
          isExhaustive: false,
          weightedPointsEvaluated: 92,
          totalWeightedPoints: 100,
          coveragePercentage: 92,
        },
        topOpportunities: [
          {
            id: "opp_1",
            rank: 1,
            title: "Improve Structured Data Schema",
            businessImpact: "Boosts SERP rich snippet coverage.",
            potentialServiceCategory: "Technical & On-Page SEO",
            urgency: "HIGH",
            relatedTestIds: ["SEO-08"],
            recommendedAction: "Deploy product schema JSON-LD.",
          },
        ],
        testedPageCount: 20,
      },
      platformProfile: {
        detectedTechnologies: ["Next.js", "Tailwind CSS"],
        totalPagesDiscovered: 25,
        httpsStatus: "Enforced (HTTPS)",
        preferredHost: "acmestore.test",
        primaryLanguage: "en",
      },
      scoreDetails: [
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
      ],
      issueDistribution: {
        critical: 0,
        high: 1,
        medium: 3,
        low: 2,
        totalIssues: 6,
        affectedPagesCount: 4,
      },
      technicalHealthAndSeoSummary: {
        titlesHealthy: 18,
        descriptionsHealthy: 16,
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
        advertisingPixelsCount: 1,
        consentUiDetected: true,
        measurementAccountConnected: false,
      },
      competitorSnapshot: [
        {
          domain: "competitor.test",
          normalizedUrl: "https://competitor.test",
          overallScore: 78,
          keyMetrics: {
            technicalHealthScore: 85,
            seoScore: 75,
            performanceScore: 70,
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
          title: "Improve Structured Data Schema",
          businessImpact: "Boosts SERP rich snippet coverage.",
          potentialServiceCategory: "Technical & On-Page SEO",
          urgency: "HIGH",
          relatedTestIds: ["SEO-08"],
          recommendedAction: "Deploy product schema JSON-LD.",
        },
      ],
      dimensionScorecards: [
        {
          id: "seo",
          name: "SEO & Organic Discoverability",
          description: "Technical SEO signals and structured data integrity.",
          score: 85,
          ratingBand: "STRONG",
          coveragePercentage: 90,
          confidence: "HIGH",
          evaluatedTestsCount: 9,
          totalTestsCount: 10,
          urlsAssessedCount: 20,
          isNonAdditiveView: true,
          missingEvidenceNotes: "Missing/unassessed signals: SEO-08",
        },
        {
          id: "performance_speed",
          name: "Performance & Speed",
          description: "Core Web Vitals and resource delivery efficiency.",
          score: 80,
          ratingBand: "ACCEPTABLE",
          coveragePercentage: 83,
          confidence: "MEDIUM",
          evaluatedTestsCount: 5,
          totalTestsCount: 6,
          urlsAssessedCount: 20,
          isNonAdditiveView: true,
          missingEvidenceNotes: "Missing/unassessed signals: PERF-05",
        },
      ],
      costOfInaction: {
        status: "ESTIMATED",
        businessModel: "ecommerce",
        confidence: "MEDIUM",
        scenarios: {
          conservative: {
            scenario: "conservative",
            conversionRateDeltaPct: 0.20,
            annualOpportunity: 4500,
            monthlyOpportunity: 375,
            paybackMonths: 2,
          },
          base: {
            scenario: "base",
            conversionRateDeltaPct: 0.50,
            annualOpportunity: 11250,
            monthlyOpportunity: 938,
            paybackMonths: 1,
          },
          upside: {
            scenario: "upside",
            conversionRateDeltaPct: 1.00,
            annualOpportunity: 22500,
            monthlyOpportunity: 1875,
            paybackMonths: 1,
          },
        },
        currency: "USD",
        assumptions: ["Monthly Sessions: 25,000", "Baseline Conversion Rate: 1.80%", "Average Order Value: $75.00"],
        disclaimers: ["Forward-looking projection for strategic budgeting only.", "Not a guarantee of future financial performance."],
        formula: "Annual Opportunity = Monthly Sessions * Conversion Lift Pct * AOV * 12",
        inputSource: "Owner Provided / Calibrated Baseline",
        calculatedAt: new Date().toISOString(),
        methodologyNotes: "Based on calibrated conversion uplift modeling.",
      },
      methodologyAndLimitations: {
        scanScope: "Bounded non-invasive public assessment strictly respecting robots.txt.",
        dataSources: ["Public HTML", "100-point Assessment Catalogue v1.0"],
        scoreDefinitions: "Scores reflect observable baseline quality from 0 to 100 points.",
        disclaimers: ["Generated for Company A platform decision-makers."],
        expertEngagementCta: "Request a Company B Expert Diagnostic Audit for code-level repairs.",
      },
      results: [],
    };

    // Route matching with regex
    await page.route(/\/api\/scan\/report/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockReport),
      });
    });

    // Navigate with reportId
    await page.goto("/owner-report?reportId=rep_e2e_test_100");

    // Verify Report Viewer header
    await expect(page.getByText("Website Owner Report — Milestone 1")).toBeVisible();
    await expect(page.getByText("Acme Store")).toBeVisible();

    // Verify Overall Score 84
    await expect(page.getByText("84", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Generally healthy; opportunities remain")).toBeVisible();

    // Verify key sections
    await expect(page.getByText("Executive Snapshot & Baseline Health")).toBeVisible();
    await expect(page.getByText("Diagnostic Dimension Scorecards")).toBeVisible();
    await expect(page.getByText("SEO & Organic Discoverability")).toBeVisible();
    await expect(page.getByText("Performance & Speed")).toBeVisible();
    await expect(page.getByText("Non-Additive Diagnostic Views")).toBeVisible();
    await expect(page.getByText("Priority Opportunity Plan (Top Growth Initiatives)")).toBeVisible();
    await expect(page.getByText("Cost of Inaction & Revenue Opportunity Calculator")).toBeVisible();
    await expect(page.getByText("Conservative Scenario")).toBeVisible();
    await expect(page.getByText("Base Opportunity (Target)")).toBeVisible();
    await expect(page.getByText("Competitive Benchmark Snapshot")).toBeVisible();
    await expect(page.getByText("Methodology, Limitations & Next Steps")).toBeVisible();

    // Verify PDF and Print action buttons exist
    await expect(page.getByRole("button", { name: /Download PDF/i })).toBeVisible();
    if (!isMobile) {
      await expect(page.getByRole("button", { name: /Print Report/i })).toBeVisible();
    }

    // Verify Company B CTA banner
    await expect(page.getByText("Need Exact Code Fix Locations & Engineer Work Plans?")).toBeVisible();
    await expect(page.getByRole("link", { name: /Learn About Company B Expert Audit/i })).toBeVisible();
  });
});
