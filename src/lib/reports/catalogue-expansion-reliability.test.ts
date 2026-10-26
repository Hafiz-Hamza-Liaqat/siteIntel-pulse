import { describe, it, expect } from "vitest";
import { computeAuditScores } from "../scoring/engine";
import { computeDimensionScorecards } from "../scoring/dimension-scorecards";
import { calculateCostOfInaction } from "./cost-of-inaction";
import { parsePageHtml } from "../scanner/html-parser";
import { performanceRules } from "../catalogue/rules/performance";
import { AssessmentResult, PageObservation, ScanRequest } from "@/types";

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
    it("transparently exposes total points allocated (100), points evaluated, points earned, and normalized score", () => {
      // Simulate an assessment where 82 points were evaluated and 67.5 points were earned
      const mockResults: AssessmentResult[] = [
        {
          testId: "TECH-01",
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
          testId: "RESP-01",
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
          testId: "CONT-01",
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
          testId: "DATA-01",
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
      // Normalized score: Math.round((67.5 / 82) * 100) = 82%
      expect(overallScore.normalizedScore).toBe(82);
      expect(overallScore.score).toBe(82);
      expect(overallScore.catalogueCoveragePercentage).toBe(82);

      // Verify that category score exposes explicit points
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

  describe("Phase B: Non-Additive Diagnostic Dimension Scorecards", () => {
    it("computes all 9 diagnostic dimensions with honest coverage and confidence", () => {
      const sampleResults: AssessmentResult[] = [
        {
          testId: "RESP-01",
          testVersion: "1.0.0",
          testName: "Mobile Viewport",
          category: "responsive_accessibility",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Viewport Active",
          summary: "Meta viewport valid",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "SEO-01",
          testVersion: "1.0.0",
          testName: "Title Tag",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Title Tag Present",
          summary: "Length is optimal",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
        {
          testId: "TECH-01",
          testVersion: "1.0.0",
          testName: "HTTP 200",
          category: "technical_health",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "HTTP Status OK",
          summary: "Page responded 200",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
        },
      ];

      const scorecards = computeDimensionScorecards(sampleResults, 5);

      expect(scorecards).toHaveLength(9);
      const dimensionIds = scorecards.map((s) => s.id);
      expect(dimensionIds).toContain("design_ux");
      expect(dimensionIds).toContain("development_health");
      expect(dimensionIds).toContain("responsive_accessibility");
      expect(dimensionIds).toContain("performance_speed");
      expect(dimensionIds).toContain("seo");
      expect(dimensionIds).toContain("geo");
      expect(dimensionIds).toContain("aeo");
      expect(dimensionIds).toContain("content_trust");
      expect(dimensionIds).toContain("marketing_monetization");

      for (const card of scorecards) {
        expect(card.isNonAdditiveView).toBe(true);
        expect(card.score).toBeGreaterThanOrEqual(0);
        expect(card.score).toBeLessThanOrEqual(100);
        expect(card.coveragePercentage).toBeGreaterThanOrEqual(0);
        expect(card.coveragePercentage).toBeLessThanOrEqual(100);
      }
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
    });

    it("calculates conservative, base, and upside scenarios for ecommerce with explicit disclosures", () => {
      const coi = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: {
          targetUrl: "https://example.com",
          reportType: "owner",
          monthlySessions: 50000,
          averageOrderValue: 90,
          grossMarginPct: 40,
        } as ScanRequest,
        results: [
          {
            testId: "CONV-01",
            testVersion: "1.0.0",
            testName: "Checkout",
            category: "conversion_marketing",
            status: "FAIL",
            severity: "HIGH",
            maxPoints: 2,
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
      expect(coi.scenarios?.conservative.monthlyOpportunity).toBeGreaterThan(0);
      expect(coi.scenarios?.base.monthlyOpportunity).toBeGreaterThan(
        coi.scenarios!.conservative.monthlyOpportunity
      );
      expect(coi.scenarios?.upside.monthlyOpportunity).toBeGreaterThan(
        coi.scenarios!.base.monthlyOpportunity
      );
      expect(coi.scenarios?.base.annualOpportunity).toBe(
        coi.scenarios!.base.monthlyOpportunity * 12
      );
      expect(coi.disclaimers[0]).toContain("NOT verified historical lost revenue");
    });
  });
});
