import { describe, it, expect } from "vitest";
import { computeAuditScores } from "../scoring/engine";
import {
  computeDimensionScorecards,
  DIAGNOSTIC_DIMENSIONS,
  REGISTERED_RULES_MAP,
} from "../scoring/dimension-scorecards";
import { calculateCostOfInaction, formatCurrency, getCurrencySymbol, SUPPORTED_CURRENCIES } from "./cost-of-inaction";
import { parsePageHtml } from "../scanner/html-parser";
import { performanceRules } from "../catalogue/rules/performance";
import { ALL_ASSESSMENT_RULES } from "../catalogue/registry";
import { AssessmentResult, ScanRequest } from "@/types";

describe("Assessment Catalogue Expansion & Report Reliability Suite", () => {
  describe("Phase A.1: Content-Type-Aware Parsing & XML Sitemap Isolation", () => {
    it("distinguishes XML sitemaps and suppresses HTML titles, headings, and forms", () => {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
</urlset>`;

      const obs = parsePageHtml(
        sitemapXml,
        "https://example.com/sitemap.xml",
        200,
        150,
        { "content-type": "application/xml" }
      );

      expect(obs.documentType).toBe("xml_sitemap");
      expect(obs.isXmlSitemap).toBe(true);
      expect(obs.title).toBeUndefined();
      expect(obs.metaDescription).toBeUndefined();
      expect(obs.canonicalCandidate).toBeUndefined();
      expect(obs.headings.h1).toHaveLength(0);
      expect(obs.visibleWordCount).toBe(0);
      expect(obs.forms).toHaveLength(0);
    });

    it("distinguishes robots.txt and suppresses HTML content properties", () => {
      const robotsTxt = `User-agent: *\nDisallow: /admin\nSitemap: https://example.com/sitemap.xml`;
      const obs = parsePageHtml(
        robotsTxt,
        "https://example.com/robots.txt",
        200,
        100,
        { "content-type": "text/plain" }
      );

      expect(obs.documentType).toBe("robots_txt");
      expect(obs.title).toBeUndefined();
      expect(obs.visibleWordCount).toBe(0);
    });

    it("parses legitimate HTML documents with full title, headings, and visible text", () => {
      const html = `<!DOCTYPE html><html lang="en"><head><title>Test Store</title><meta name="description" content="Quality goods online."></head><body><h1>Welcome</h1><p>Browse our catalog of high quality items.</p></body></html>`;
      const obs = parsePageHtml(
        html,
        "https://example.com/",
        200,
        120,
        { "content-type": "text/html; charset=utf-8" }
      );

      expect(obs.documentType).toBe("html");
      expect(obs.title).toBe("Test Store");
      expect(obs.metaDescription).toBe("Quality goods online.");
      expect(obs.headings.h1).toEqual(["Welcome"]);
      expect(obs.visibleWordCount).toBeGreaterThan(0);
    });
  });

  describe("Phase A.2: Scoring Semantics Reconciliation", () => {
    it("transparently exposes total points allocated (100), points evaluated, points earned, and normalized score using real rule IDs", () => {
      // Simulate an assessment using real registered rule IDs
      const mockResults: AssessmentResult[] = [
        {
          testId: "TCH-01",
          testVersion: "1.0.0",
          testName: "Status Code",
          category: "technical_health",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 12,
          earnedPoints: 12,
          title: "Status Code OK",
          summary: "Entry returned 200 OK",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "SEO-01",
          testVersion: "1.0.0",
          testName: "Title",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 18,
          earnedPoints: 15.5,
          title: "SEO Healthy",
          summary: "Metadata mostly complete",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "RSP-01",
          testVersion: "1.0.0",
          testName: "Viewport",
          category: "responsive_accessibility",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 10,
          earnedPoints: 9,
          title: "Responsive Passed",
          summary: "Mobile viewports tested",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "SEC-01",
          testVersion: "1.0.0",
          testName: "HTTPS",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 12,
          earnedPoints: 11,
          title: "HTTPS Enforced",
          summary: "Valid TLS configuration",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "AUTH-01",
          testVersion: "1.0.0",
          testName: "Login",
          category: "authentication_posture",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 8,
          earnedPoints: 6,
          title: "Auth Inspected",
          summary: "Session cookies secure",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "CNT-01",
          testVersion: "1.0.0",
          testName: "Purpose",
          category: "content_quality",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 12,
          earnedPoints: 10,
          title: "Content Quality",
          summary: "Clear value prop",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "ANA-01",
          testVersion: "1.0.0",
          testName: "Analytics",
          category: "analytics_tracking",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 10,
          earnedPoints: 4,
          title: "Analytics Observed",
          summary: "GTM container present",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
      ];

      const scoreOutput = computeAuditScores(mockResults);
      const { overallScore, categoryScores } = scoreOutput;

      expect(overallScore.totalPointsAllocated).toBe(100);
      expect(overallScore.pointsActuallyEvaluated).toBe(82);
      expect(overallScore.pointsEarned).toBe(67.5);
      expect(overallScore.normalizedScore).toBe(82);
      expect(overallScore.score).toBe(82);
      expect(overallScore.catalogueCoveragePercentage).toBe(82);

      const techCat = categoryScores.find((c) => c.category === "technical_health");
      expect(techCat?.allocatedWeight).toBe(12);
      expect(techCat?.testedPoints).toBe(12);
      expect(techCat?.earnedPoints).toBe(12);
      expect(techCat?.scorePercentage).toBe(100);
    });
  });

  describe("Phase A.3 & A.4: Performance Score Handling & Evidence Model", () => {
    it("returns NOT_TESTED when PageSpeed Insights API is unconfigured (never passes or fabricates scores)", () => {
      const perf01 = performanceRules.find((r) => r.id === "PERF-01")!;
      const result = perf01.evaluate({
        pages: [],
        url: "https://example.com",
        pageSpeedMobile: {
          isAvailable: false,
          strategy: "mobile",
          unconfiguredReason: "PAGESPEED_API_KEY environment variable is not configured.",
          source: "PageSpeed API key not configured",
          measuredAt: new Date().toISOString(),
        },
      } as any);

      expect(result.status).toBe("NOT_TESTED");
      expect(result.earnedPoints).toBe(0);
      expect(result.title).toContain("Not Configured");
      expect(result.sampleEvidence).toContain("Provider status: NOT_CONFIGURED");
    });

    it("evaluates live lab score and includes lab metrics and CrUX field percentiles when available", () => {
      const perf01 = performanceRules.find((r) => r.id === "PERF-01")!;
      const result = perf01.evaluate({
        pages: [],
        url: "https://example.com",
        pageSpeedMobile: {
          isAvailable: true,
          strategy: "mobile",
          performanceScore: 88,
          labMetrics: {
            speedIndexMs: 1850,
            fcpMs: 1100,
            lcpMs: 2200,
            tbtMs: 120,
            ttfbMs: 280,
          },
          cruxFieldData: {
            lcpMs: 2150,
            inpMs: 140,
            cls: 0.04,
            category: "FAST",
          },
          providerName: "Google PageSpeed Insights API v5",
          source: "Google PageSpeed Insights API v5",
          measuredAt: new Date().toISOString(),
        },
      } as any);

      expect(result.status).toBe("PASS");
      expect(result.earnedPoints).toBe(2);
      expect(result.sampleEvidence?.some((e) => e.includes("Speed Index 1850ms"))).toBe(true);
      expect(result.sampleEvidence?.some((e) => e.includes("CrUX p75"))).toBe(true);
    });
  });

  describe("Phase B: Non-Additive Diagnostic Dimension Scorecards Integrity", () => {
    it("guard test: ensures every dimension rule ID exists in the live catalogue registry", () => {
      const allRegisteredIds = new Set(ALL_ASSESSMENT_RULES.map((r) => r.id));
      expect(allRegisteredIds.size).toBe(56);

      for (const dim of DIAGNOSTIC_DIMENSIONS) {
        for (const ruleId of dim.ruleIds) {
          expect(allRegisteredIds.has(ruleId)).toBe(true);
          const ruleDef = REGISTERED_RULES_MAP.get(ruleId);
          expect(ruleDef).toBeDefined();
          expect(ruleDef?.maxPoints).toBeGreaterThan(0);
        }
      }
    });

    it("asserts exact expected rule IDs for each of the 9 diagnostic dimensions", () => {
      const dimMap = new Map(DIAGNOSTIC_DIMENSIONS.map((d) => [d.id, d.ruleIds]));

      expect(dimMap.get("design_ux")).toEqual([
        "RSP-01", "RSP-02", "RSP-03", "RSP-04", "RSP-05", "CRO-01", "CRO-02", "CRO-03",
      ]);

      expect(dimMap.get("development_health")).toEqual([
        "TCH-01", "TCH-02", "TCH-03", "TCH-04", "TCH-05", "TCH-06",
        "SEC-01", "SEC-02", "SEC-03", "SEC-04", "SEC-05", "SEC-06",
        "AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04",
      ]);

      expect(dimMap.get("responsive_accessibility")).toEqual([
        "RSP-01", "RSP-02", "RSP-03", "RSP-04", "RSP-05", "SEO-06",
      ]);

      expect(dimMap.get("performance_speed")).toEqual([
        "PERF-01", "PERF-02", "PERF-03", "PERF-04", "PERF-05", "TCH-06",
      ]);

      expect(dimMap.get("seo")).toEqual([
        "SEO-01", "SEO-02", "SEO-03", "SEO-04", "SEO-05", "SEO-06", "SEO-07", "SEO-08", "SEO-09", "TCH-05",
      ]);

      expect(dimMap.get("geo")).toEqual([
        "AI-01", "AI-02", "AI-03", "SEO-08", "CNT-01",
      ]);

      expect(dimMap.get("aeo")).toEqual([
        "AI-03", "AI-04", "CNT-01", "CNT-02", "SEO-01", "SEO-03",
      ]);

      expect(dimMap.get("content_trust")).toEqual([
        "CNT-01", "CNT-02", "CNT-03", "CNT-04", "CNT-05", "CRO-04",
      ]);

      expect(dimMap.get("marketing_monetization")).toEqual([
        "CRO-01", "CRO-02", "CRO-03", "CRO-04", "ANA-01", "ANA-02", "ANA-03", "ANA-04", "ANA-05",
      ]);
    });

    it("calculates accurate denominators from registered rule maxPoints (e.g. 1 pt rules for ANA and CRO)", () => {
      // In marketing_monetization: 4 CRO rules (1 pt each) + 5 ANA rules (1 pt each) = 9 max points
      const marketingDim = DIAGNOSTIC_DIMENSIONS.find((d) => d.id === "marketing_monetization")!;
      const totalAllocated = marketingDim.ruleIds.reduce((sum, id) => {
        return sum + (REGISTERED_RULES_MAP.get(id)?.maxPoints || 0);
      }, 0);
      expect(totalAllocated).toBe(9); // Strictly 9 points, proving NO guessed default of 2 points!

      // Evaluate 3 rules: CRO-01 (1 pt, pass), CRO-02 (1 pt, pass), ANA-01 (1 pt, fail)
      const sampleResults: AssessmentResult[] = [
        {
          testId: "CRO-01",
          testVersion: "1.0.0",
          testName: "Primary CTA",
          category: "conversion_marketing",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "CTA Visible",
          summary: "Clear primary CTA observed",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "CRO-02",
          testVersion: "1.0.0",
          testName: "Conversion Pathway",
          category: "conversion_marketing",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Pathway Functional",
          summary: "Direct purchase link",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "ANA-01",
          testVersion: "1.0.0",
          testName: "GA4 Script Load",
          category: "analytics_tracking",
          status: "FAIL",
          severity: "HIGH",
          maxPoints: 1,
          earnedPoints: 0,
          title: "No GA4",
          summary: "Missing GA4 measurement tag",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
      ];

      const cards = computeDimensionScorecards(sampleResults, 1);
      const mktCard = cards.find((c) => c.id === "marketing_monetization")!;

      expect(mktCard.evaluatedTestsCount).toBe(3);
      expect(mktCard.totalTestsCount).toBe(9);
      // Evaluated points: 1 + 1 + 1 = 3 evaluated out of 9 total possible points
      // Coverage = Math.round((3 / 9) * 100) = 33%
      expect(mktCard.coveragePercentage).toBe(33);
      // Earned: 1 + 1 + 0 = 2 out of 3 evaluated = Math.round((2 / 3) * 100) = 67%
      expect(mktCard.score).toBe(67);
      // Coverage < 50% => Provisional / Incomplete
      expect(mktCard.ratingBand).toBe("Provisional / Incomplete");
      expect(mktCard.confidence).toBe("LOW");
      expect(mktCard.missingEvidenceNotes).toContain("Missing/unassessed signals");
      expect(mktCard.missingEvidenceNotes).toContain("unassessed");
    });

    it("verifies missing rules remain explicitly unassessed and are not treated as false passes or fails", () => {
      const cards = computeDimensionScorecards([], 1);
      expect(cards).toHaveLength(9);

      for (const card of cards) {
        expect(card.evaluatedTestsCount).toBe(0);
        expect(card.coveragePercentage).toBe(0);
        expect(card.score).toBe(0);
        expect(card.ratingBand).toBe("Unassessed");
        expect(card.confidence).toBe("LOW");
        expect(card.missingEvidenceNotes).toContain("unassessed");
      }
    });

    it("ensures UNKNOWN, NOT_TESTED, BLOCKED, and NOT_APPLICABLE do not count as evaluated points or artificially inflate dimension coverage", () => {
      // Dimension performance_speed has ruleIds: PERF-01..05 (2 pts each) and TCH-06 (2 pts) = 12 total points
      const mixedResults: AssessmentResult[] = [
        {
          testId: "PERF-01",
          testVersion: "1.0.0",
          testName: "Render-blocking resources",
          category: "performance",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Critical assets optimized",
          summary: "No render-blocking scripts found",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "PERF-02",
          testVersion: "1.0.0",
          testName: "Speed Index / FCP",
          category: "performance",
          status: "UNKNOWN", // Non-evaluable: e.g. truncated or ambiguous stream
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Speed index unknown",
          summary: "Stream truncated before completion",
          timestamp: new Date().toISOString(),
          confidence: "LOW",
        },
        {
          testId: "PERF-03",
          testVersion: "1.0.0",
          testName: "LCP / Core Web Vitals",
          category: "performance",
          status: "NOT_TESTED", // Non-evaluable: e.g. PageSpeed provider unconfigured
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "LCP Not Tested",
          summary: "Provider unconfigured",
          timestamp: new Date().toISOString(),
          confidence: "LOW",
        },
        {
          testId: "PERF-04",
          testVersion: "1.0.0",
          testName: "TTFB / Server Latency",
          category: "performance",
          status: "BLOCKED", // Non-evaluable: e.g. blocked by SSRF firewall / robots
          severity: "HIGH",
          maxPoints: 2,
          earnedPoints: 0,
          title: "TTFB Blocked",
          summary: "Egress firewall blocked socket",
          timestamp: new Date().toISOString(),
          confidence: "LOW",
        },
        {
          testId: "PERF-05",
          testVersion: "1.0.0",
          testName: "Payload efficiency",
          category: "performance",
          status: "NOT_APPLICABLE", // Non-evaluable: not applicable for this surface
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Payload N/A",
          summary: "Surface exempt from payload limits",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        // TCH-06 is left omitted / unassessed
      ];

      const cards = computeDimensionScorecards(mixedResults, 1);
      const perfCard = cards.find((c) => c.id === "performance_speed")!;

      // Only PERF-01 is evaluable (PASS)
      // UNKNOWN, NOT_TESTED, BLOCKED, NOT_APPLICABLE MUST NOT count towards evaluatedTestsCount!
      expect(perfCard.evaluatedTestsCount).toBe(1);
      expect(perfCard.totalTestsCount).toBe(6);

      // Evaluated points: exactly 2 points (PERF-01) out of 12 total possible points
      // Coverage = Math.round((2 / 12) * 100) = 17%
      // Crucial: UNKNOWN, NOT_TESTED, BLOCKED did NOT artificially inflate coverage to 50% or 67%!
      expect(perfCard.coveragePercentage).toBe(17);

      // Earned points: 2 out of 2 evaluated = 100%
      expect(perfCard.score).toBe(100);

      // Coverage < 50% correctly triggers Provisional rating band and LOW confidence
      expect(perfCard.ratingBand).toBe("Provisional / Incomplete");
      expect(perfCard.confidence).toBe("LOW");

      // Verify detailed execution status counts are preserved
      expect(perfCard.statusCounts).toEqual({
        pass: 1,
        warning: 0,
        fail: 0,
        not_detected: 0,
        unknown: 1,
        not_tested: 1,
        blocked: 1,
        not_applicable: 1,
        unassessed: 1,
      });

      // Verify missing evidence notes clearly list non-evaluable rules with their statuses
      expect(perfCard.missingEvidenceNotes).toContain("unknown");
      expect(perfCard.missingEvidenceNotes).toContain("not tested");
      expect(perfCard.missingEvidenceNotes).toContain("blocked");
    });
  });

  describe("Phase B: Cost of Inaction Calculator v1", () => {
    it("reports INSUFFICIENT_INPUTS when traffic metrics are not supplied", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
        } as ScanRequest,
      });

      expect(coi.status).toBe("INSUFFICIENT_INPUTS");
      expect(coi.scenarios).toBeUndefined();
      expect(coi.methodologyNotes).toContain("Inputs insufficient");
      expect(coi.formula).toBeDefined();
    });

    it("calculates conservative, base, and upside scenarios for ecommerce with explicit owner inputs", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 50000,
          averageOrderValue: 90,
          grossMarginPct: 40,
          currency: "USD",
        } as ScanRequest,
        results: [
          {
            testId: "CRO-01",
            testVersion: "1.0.0",
            testName: "Checkout CTA",
            category: "conversion_marketing",
            status: "FAIL",
            severity: "HIGH",
            maxPoints: 1,
            earnedPoints: 0,
            title: "Friction in checkout",
            summary: "Missing clear payment CTAs",
            timestamp: new Date().toISOString(),
            confidence: "HIGH",
          },
        ],
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.businessModel).toBe("ecommerce");
      expect(coi.currency).toBe("USD");
      expect(coi.confidence).toBe("HIGH");
      expect(coi.inputSource).toBe("Owner Provided Commercial Inputs");

      // Conservative: 50000 * 0.002 * 90 * 0.40 = 3600 / mo
      expect(coi.scenarios?.conservative.monthlyOpportunity).toBe(3600);
      expect(coi.scenarios?.conservative.annualOpportunity).toBe(3600 * 12);
      expect(coi.scenarios?.conservative.conversionRateDeltaPct).toBe(0.2);

      // Base: 50000 * 0.005 * 90 * 0.40 = 9000 / mo
      expect(coi.scenarios?.base.monthlyOpportunity).toBe(9000);
      expect(coi.scenarios?.base.annualOpportunity).toBe(9000 * 12);
      expect(coi.scenarios?.base.conversionRateDeltaPct).toBe(0.5);

      // Upside: 50000 * 0.010 * 90 * 0.40 = 18000 / mo
      expect(coi.scenarios?.upside.monthlyOpportunity).toBe(18000);
      expect(coi.scenarios?.upside.annualOpportunity).toBe(18000 * 12);
      expect(coi.scenarios?.upside.conversionRateDeltaPct).toBe(1.0);

      expect(coi.disclaimers[0]).toContain("NOT verified historical lost revenue");
    });

    it("verifies zero gross margin (grossMarginPct: 0) does not silently use a 100% multiplier and distinguishes revenue from profit", () => {
      const coiZeroMargin = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 50000,
          averageOrderValue: 100,
          grossMarginPct: 0, // Explicit zero gross margin
          currency: "USD",
        } as ScanRequest,
      });

      expect(coiZeroMargin.status).toBe("ESTIMATED");
      expect(coiZeroMargin.grossMarginPct).toBe(0);

      // Top-line revenue opportunity is still 50000 * 0.005 * 100 = 25000 / mo
      expect(coiZeroMargin.scenarios?.base.monthlyRevenueOpportunity).toBe(25000);
      expect(coiZeroMargin.scenarios?.base.annualRevenueOpportunity).toBe(25000 * 12);

      // Gross profit opportunity MUST be 0 (0% margin) and NOT silently fall back to 100% ($25,000)
      expect(coiZeroMargin.scenarios?.base.monthlyGrossProfitOpportunity).toBe(0);
      expect(coiZeroMargin.scenarios?.base.annualGrossProfitOpportunity).toBe(0);
      expect(coiZeroMargin.scenarios?.base.monthlyOpportunity).toBe(0);
      expect(coiZeroMargin.scenarios?.base.annualOpportunity).toBe(0);

      // Conservative & Upside must also be 0 gross profit
      expect(coiZeroMargin.scenarios?.conservative.monthlyOpportunity).toBe(0);
      expect(coiZeroMargin.scenarios?.upside.monthlyOpportunity).toBe(0);

      // When monthly opportunity is zero, payback period is not calculable (null, rendered as N/A)
      expect(coiZeroMargin.scenarios?.base.paybackMonths).toBeNull();
      expect(coiZeroMargin.scenarios?.conservative.paybackMonths).toBeNull();
      expect(coiZeroMargin.scenarios?.upside.paybackMonths).toBeNull();

      // Check assumptions note zero margin explicitly
      expect(coiZeroMargin.assumptions.some((a) => a.includes("Zero gross margin (0%)"))).toBe(true);

      // Contrast with omitted gross margin where default 100% gross revenue is applied
      const coiOmittedMargin = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 50000,
          averageOrderValue: 100,
          currency: "USD",
        } as ScanRequest,
      });
      expect(coiOmittedMargin.grossMarginPct).toBeUndefined();
      expect(coiOmittedMargin.scenarios?.base.monthlyOpportunity).toBe(25000);
      expect(coiOmittedMargin.scenarios?.base.paybackMonths).not.toBeNull();
    });

    it("labels scenario assumptions explicitly when owner traffic is supplied but commercial value is omitted", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 20000,
        } as ScanRequest,
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.confidence).toBe("MEDIUM");
      expect(coi.inputSource).toBe("Owner Traffic with Labeled Baseline Assumptions");
      expect(coi.assumptions.some((a) => a.includes("[Default Scenario Assumption") || a.includes("[Labeled Scenario Assumption]"))).toBe(true);
    });

    it("calculates lead generation model using leadConversionRatePct, leadToCustomerRatePct, and customerValue", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "local_service",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 10000,
          customerValue: 1200,
          leadConversionRatePct: 4.0,
          leadToCustomerRatePct: 20.0,
          grossMarginPct: 50,
          currency: "USD",
        } as ScanRequest,
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.businessModel).toBe("lead_gen");
      expect(coi.confidence).toBe("HIGH");
      // Conservative: 10000 * 0.002 * 0.20 * 1200 * 0.50 = 2400 / mo
      expect(coi.scenarios?.conservative.monthlyOpportunity).toBe(2400);
      expect(coi.scenarios?.base.monthlyOpportunity).toBe(6000);
      expect(coi.scenarios?.upside.monthlyOpportunity).toBe(12000);
    });

    it("explicitly tracks before/after modeled conversion rates and treats lift as an absolute percentage-point increase", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 30000,
          averageOrderValue: 80,
          leadConversionRatePct: 2.25, // Current baseline conversion rate (2.25%)
          currency: "EUR",
        } as ScanRequest,
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.currency).toBe("EUR");

      // Verify baseline rate is preserved across all scenarios
      expect(coi.scenarios?.conservative.baselineConversionRatePct).toBe(2.25);
      expect(coi.scenarios?.base.baselineConversionRatePct).toBe(2.25);
      expect(coi.scenarios?.upside.baselineConversionRatePct).toBe(2.25);

      // Verify modeled conversion rates are absolute additions:
      // Conservative: 2.25% + 0.20% = 2.45%
      expect(coi.scenarios?.conservative.conversionRateDeltaPct).toBe(0.2);
      expect(coi.scenarios?.conservative.modeledConversionRatePct).toBe(2.45);

      // Base: 2.25% + 0.50% = 2.75%
      expect(coi.scenarios?.base.conversionRateDeltaPct).toBe(0.5);
      expect(coi.scenarios?.base.modeledConversionRatePct).toBe(2.75);

      // Upside: 2.25% + 1.00% = 3.25%
      expect(coi.scenarios?.upside.conversionRateDeltaPct).toBe(1.0);
      expect(coi.scenarios?.upside.modeledConversionRatePct).toBe(3.25);

      // Verify currency symbol in assumptions uses EUR symbol (€), not "EUR $"
      expect(coi.assumptions.some((a) => a.includes("€80"))).toBe(true);
      expect(coi.assumptions.some((a) => a.includes("EUR $"))).toBe(false);

      // Verify distinctions between owner provided and default scenario assumptions
      expect(coi.assumptions.some((a) => a.startsWith("[Owner Provided]"))).toBe(true);
      expect(coi.assumptions.some((a) => a.startsWith("[Illustrative Scenario Assumption]"))).toBe(true);
    });

    it("verifies unavailable payback and zero opportunity yield null payback period (displayed as N/A)", () => {
      // 0 monthly opportunity from 0 margin
      const zeroOpp = calculateCostOfInaction({
        businessCategory: "saas",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 10000,
          subscriptionRevenue: 50,
          grossMarginPct: 0,
        } as ScanRequest,
      });

      expect(zeroOpp.scenarios?.base.monthlyOpportunity).toBe(0);
      expect(zeroOpp.scenarios?.base.paybackMonths).toBeNull();
      expect(zeroOpp.scenarios?.conservative.paybackMonths).toBeNull();
      expect(zeroOpp.scenarios?.upside.paybackMonths).toBeNull();
    });
  });

  describe("Phase A.5: Unified Currency Formatting Across Engine, UI, and PDF", () => {
    it("formats all 7 supported currencies with standardized symbols", () => {
      expect(SUPPORTED_CURRENCIES).toEqual(["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"]);
      expect(getCurrencySymbol("USD")).toBe("$");
      expect(getCurrencySymbol("EUR")).toBe("€");
      expect(getCurrencySymbol("GBP")).toBe("£");
      expect(getCurrencySymbol("CAD")).toBe("CA$");
      expect(getCurrencySymbol("AUD")).toBe("A$");
      expect(getCurrencySymbol("JPY")).toBe("¥");
      expect(getCurrencySymbol("CHF")).toBe("CHF ");
      // Defaults to $
      expect(getCurrencySymbol(undefined)).toBe("$");
      expect(getCurrencySymbol("UNKNOWN")).toBe("$");
    });

    it("formats currency amounts for whole numbers and zero across currencies", () => {
      expect(formatCurrency(0, "USD")).toBe("$0");
      expect(formatCurrency(0, "EUR")).toBe("€0");
      expect(formatCurrency(0, "GBP")).toBe("£0");
      expect(formatCurrency(0, "CAD")).toBe("CA$0");
      expect(formatCurrency(0, "AUD")).toBe("A$0");
      expect(formatCurrency(0, "JPY")).toBe("¥0");
      expect(formatCurrency(0, "CHF")).toBe("CHF 0");

      expect(formatCurrency(5000, "USD")).toBe("$5,000");
      expect(formatCurrency(5000, "EUR")).toBe("€5,000");
      expect(formatCurrency(5000, "GBP")).toBe("£5,000");
      expect(formatCurrency(5000, "CAD")).toBe("CA$5,000");
      expect(formatCurrency(5000, "AUD")).toBe("A$5,000");
      expect(formatCurrency(500000, "JPY")).toBe("¥500,000");
      expect(formatCurrency(5000, "CHF")).toBe("CHF 5,000");
    });

    it("preserves decimal precision for fractional owner inputs without silent whole-number truncation", () => {
      // Decimal input without explicit decimals option preserves 2 decimal places
      expect(formatCurrency(85.5, "USD")).toBe("$85.50");
      expect(formatCurrency(1250.75, "EUR")).toBe("€1,250.75");
      expect(formatCurrency(49.99, "GBP")).toBe("£49.99");
      expect(formatCurrency(99.5, "CAD")).toBe("CA$99.50");
      expect(formatCurrency(19.95, "AUD")).toBe("A$19.95");
      expect(formatCurrency(120.5, "CHF")).toBe("CHF 120.50");

      // Custom decimal options
      expect(formatCurrency(85.5, "USD", { decimals: 0 })).toBe("$86");
      expect(formatCurrency(85, "USD", { decimals: 2 })).toBe("$85.00");
    });

    it("reflects owner-provided decimal inputs directly in Cost of Inaction assumptions", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 20000,
          averageOrderValue: 85.5,
          currency: "USD",
        } as ScanRequest,
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.assumptions.some((a) => a.includes("$85.50"))).toBe(true);
    });
  });

  describe("Phase A.6: Financial Opportunity Separation & Zero Margin Handling", () => {
    it("clearly separates monthly/annual revenue opportunity from gross-profit opportunity", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 40000,
          averageOrderValue: 100,
          grossMarginPct: 40,
          currency: "USD",
        } as ScanRequest,
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.grossMarginPct).toBe(40);

      const base = coi.scenarios!.base;
      // Revenue: 40,000 * 0.005 * 100 = $20,000 / mo, $240,000 / yr
      expect(base.monthlyRevenueOpportunity).toBe(20000);
      expect(base.annualRevenueOpportunity).toBe(240000);

      // Gross profit: 40% of revenue = $8,000 / mo, $96,000 / yr
      expect(base.monthlyGrossProfitOpportunity).toBe(8000);
      expect(base.annualGrossProfitOpportunity).toBe(96000);

      // Primary opportunity tracks gross profit when margin is provided
      expect(base.monthlyOpportunity).toBe(8000);
      expect(base.annualOpportunity).toBe(96000);

      // Payback is calculated from gross profit
      expect(base.paybackMonths).not.toBeNull();
      expect(base.paybackMonths).toBeGreaterThan(0);
    });

    it("leaves gross-profit opportunity undefined when gross margin is omitted and labels primary metric as revenue", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 40000,
          averageOrderValue: 100,
          currency: "EUR",
        } as ScanRequest,
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.grossMarginPct).toBeUndefined();

      const base = coi.scenarios!.base;
      // Revenue opportunity is fully populated
      expect(base.monthlyRevenueOpportunity).toBe(20000);
      expect(base.annualRevenueOpportunity).toBe(240000);

      // Gross profit opportunity is undefined because no margin was specified
      expect(base.monthlyGrossProfitOpportunity).toBeUndefined();
      expect(base.annualGrossProfitOpportunity).toBeUndefined();

      // Primary opportunity represents top-line revenue
      expect(base.monthlyOpportunity).toBe(20000);
      expect(base.annualOpportunity).toBe(240000);

      // Formula and assumptions disclose top-line revenue model
      expect(coi.formula).toContain("Gross Revenue Opportunity");
      expect(coi.assumptions.some((a) => a.includes("represents top-line revenue opportunity"))).toBe(true);
    });

    it("verifies explicit zero gross margin produces strictly zero gross profit and null payback without erasing revenue opportunity", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 50000,
          averageOrderValue: 100,
          grossMarginPct: 0,
          currency: "GBP",
        } as ScanRequest,
      });

      expect(coi.status).toBe("ESTIMATED");
      expect(coi.grossMarginPct).toBe(0);

      for (const key of ["conservative", "base", "upside"] as const) {
        const scenario = coi.scenarios![key];
        // Revenue opportunity must be preserved and non-zero
        expect(scenario.monthlyRevenueOpportunity).toBeGreaterThan(0);
        expect(scenario.annualRevenueOpportunity).toBeGreaterThan(0);

        // Gross profit opportunity must be strictly zero
        expect(scenario.monthlyGrossProfitOpportunity).toBe(0);
        expect(scenario.annualGrossProfitOpportunity).toBe(0);
        expect(scenario.monthlyOpportunity).toBe(0);
        expect(scenario.annualOpportunity).toBe(0);

        // Payback must be null (rendered as N/A, never 0 or immediate)
        expect(scenario.paybackMonths).toBeNull();
      }
    });
  });

  describe("Phase A.7: Core 100-Point Catalogue Independence & Diagnostic Dimension Invariants", () => {
    it("verifies 100-point core score is completely independent of diagnostic dimension overlays (non-additive)", () => {
      const catalogueRules = ALL_ASSESSMENT_RULES;
      expect(catalogueRules).toHaveLength(56);

      const mockResults: AssessmentResult[] = catalogueRules.map((rule) => ({
        testId: rule.id,
        testVersion: "1.0.0",
        testName: rule.name,
        category: rule.category,
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: rule.maxPoints,
        earnedPoints: rule.maxPoints,
        title: rule.name,
        summary: "Passed",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      }));

      const auditScores = computeAuditScores(mockResults);

      expect(auditScores.overallScore.totalPossibleCataloguePoints).toBe(100);
      expect(auditScores.overallScore.score).toBe(100);
      expect(auditScores.overallScore.evaluatedWeightedPoints).toBe(100);

      const scorecards = computeDimensionScorecards(mockResults, 20);

      expect(scorecards).toHaveLength(9);
      for (const card of scorecards) {
        expect(card.isNonAdditiveView).toBe(true);
        expect(card.score).toBe(100);
      }

      // Re-assert that scorecards did NOT mutate or change auditScores in any way
      expect(auditScores.overallScore.totalPossibleCataloguePoints).toBe(100);
      expect(auditScores.overallScore.score).toBe(100);
    });
  });
});
