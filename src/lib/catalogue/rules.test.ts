import { describe, it, expect } from "vitest";
import { assessmentRegistry } from "./registry";
import { RuleEvaluationContext } from "./types";
import { PageObservation } from "@/types";

describe("Catalogue Rules Execution", () => {
  it("evaluates all 56 rules without throwing unhandled exceptions", () => {
    const mockPage: PageObservation = {
      id: "page_entry",
      requestedUrl: "https://example.com/",
      normalizedUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      statusCode: 200,
      responseTimeMs: 320,
      contentType: "text/html",
      redirectHistory: [],
      title: "Company A | Sustainable Organic Clothing Store",
      metaDescription: "Explore our premium certified organic apparel designed for everyday sustainable style.",
      canonicalCandidate: "https://example.com/",
      robotsDirectives: ["index", "follow"],
      headings: {
        h1: ["Ethical Organic Clothing"],
        h2: ["Our Philosophy", "New Arrivals"],
        h3: ["Fair Trade Certified"],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleTextSample: "Welcome to Company A. We build sustainable clothing.",
      visibleWordCount: 350,
      language: "en",
      doctype: "html5",
      encoding: "utf-8",
      links: [
        {
          id: "link_1",
          sourceUrl: "https://example.com/",
          targetUrl: "https://example.com/about",
          isInternal: true,
          anchorText: "About Us",
          isBroken: false,
          isRedirect: false,
        },
        {
          id: "link_2",
          sourceUrl: "https://example.com/",
          targetUrl: "https://example.com/contact",
          isInternal: true,
          anchorText: "Contact Support",
          isBroken: false,
          isRedirect: false,
        },
        {
          id: "link_3",
          sourceUrl: "https://example.com/",
          targetUrl: "https://example.com/privacy",
          isInternal: true,
          anchorText: "Privacy Policy",
          isBroken: false,
          isRedirect: false,
        },
        {
          id: "link_4",
          sourceUrl: "https://example.com/",
          targetUrl: "https://example.com/terms",
          isInternal: true,
          anchorText: "Terms of Service",
          isBroken: false,
          isRedirect: false,
        },
        {
          id: "link_5",
          sourceUrl: "https://example.com/",
          targetUrl: "https://example.com/cart",
          isInternal: true,
          anchorText: "Shop Now",
          isBroken: false,
          isRedirect: false,
        },
      ],
      resources: [
        {
          id: "res_1",
          url: "https://example.com/style.css",
          type: "stylesheet",
          isRenderBlocking: true,
          isThirdParty: false,
          isFailed: false,
        },
      ],
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Company A",
        },
      ],
      openGraph: { "og:title": "Company A" },
      headers: {
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
      },
      cookieAttributes: [{ name: "session_id", secure: true, httpOnly: true, sameSite: "lax" }],
      discoveredAtDepth: 0,
      discoverySource: "entry",
      consoleErrors: [],
      templateConfidence: "HIGH",
    };

    const ctx: RuleEvaluationContext = {
      targetUrl: "https://example.com/",
      domain: "example.com",
      businessCategory: "ecommerce",
      pages: [mockPage],
      robotsTxt: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
      sitemapUrls: ["https://example.com/sitemap.xml"],
      externalLinksTested: [],
      competitors: ["competitor-a.com", "competitor-b.com"],
    };

    const results = assessmentRegistry.evaluateAll(ctx);
    expect(results.length).toBe(56);

    // Verify each result has mandatory fields
    results.forEach((r) => {
      expect(r.testId).toBeDefined();
      expect(r.status).toBeDefined();
      expect(r.category).toBeDefined();
      expect(r.maxPoints).toBeGreaterThan(0);
      expect(r.earnedPoints).toBeGreaterThanOrEqual(0);
      expect(r.earnedPoints).toBeLessThanOrEqual(r.maxPoints);
    });
  });
});
