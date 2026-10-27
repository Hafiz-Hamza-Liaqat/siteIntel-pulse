import { describe, it, expect } from "vitest";
import { parsePageHtml } from "./html-parser.ts";
import { assessmentRegistry } from "@/lib/catalogue/registry.ts";
import { RuleEvaluationContext, PageInventoryItem } from "@/types";

describe("Document Classification & Evidence Truthfulness", () => {
  it("classifies HTML documents correctly even if URL ends with .xml", () => {
    const htmlPayload = `<!DOCTYPE html>
<html>
<head>
  <title>Real HTML Document</title>
  <meta name="description" content="This is an HTML page mistakenly named file.xml">
</head>
<body>
  <h1>Welcome to our site</h1>
  <p>Some body content here.</p>
</body>
</html>`;

    const parsed = parsePageHtml(htmlPayload, "https://example.com/page.xml", 200, 100, { "content-type": "text/xml" });
    // Body signature overrides extension/header: it contains <!DOCTYPE html> and <html>
    expect(parsed.pageTemplateGuess).not.toBe("sitemap");
    expect(parsed.title).toBe("Real HTML Document");
    expect(parsed.headings.h1).toContain("Welcome to our site");
  });

  it("classifies XML sitemap indexes and urlsets as sitemaps, not HTML content", () => {
    const sitemapPayload = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-10-27</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
  </url>
</urlset>`;

    const parsed = parsePageHtml(sitemapPayload, "https://example.com/sitemap.xml", 200, 100, { "content-type": "text/xml" });
    expect(parsed.pageTemplateGuess).toBe("sitemap");
  });

  it("classifies robots.txt as robots template", () => {
    const robotsPayload = `User-agent: *
Disallow: /admin/
Sitemap: https://example.com/sitemap.xml`;

    const parsed = parsePageHtml(robotsPayload, "https://example.com/robots.txt", 200, 100, { "content-type": "text/plain" });
    expect(parsed.pageTemplateGuess).toBe("robots");
  });

  it("excludes XML sitemaps and robots.txt from HTML meta-tag rules (TCH-03)", () => {
    const sitemapPage: PageInventoryItem = {
      url: "https://example.com/sitemap.xml",
      path: "/sitemap.xml",
      statusCode: 200,
      contentType: "application/xml",
      depth: 1,
      discoveredAt: new Date().toISOString(),
      responseTimeMs: 80,
      byteSize: 1200,
      isInternal: true,
      indexable: true,
      inSitemap: false,
    };

    const regularHtmlPage: PageInventoryItem = {
      url: "https://example.com/",
      path: "/",
      statusCode: 200,
      contentType: "text/html",
      depth: 0,
      discoveredAt: new Date().toISOString(),
      responseTimeMs: 150,
      byteSize: 12500,
      isInternal: true,
      indexable: true,
      inSitemap: true,
    };

    const ctx: RuleEvaluationContext = {
      targetUrl: "https://example.com",
      businessCategory: "saas",
      scannedAt: new Date().toISOString(),
      pages: [regularHtmlPage, sitemapPage],
      headingsByUrl: {},
      links: [],
      assets: [],
      forms: [],
      cookies: [],
      securityHeaders: {},
      technologies: [],
      categoryDetection: {
        detectedCategory: "saas",
        confidence: "HIGH",
        heuristicConfidence: "HIGH",
        primaryConfidence: 0.9,
        signals: [],
        secondaryFacets: [],
      },
    };

    const tch03 = assessmentRegistry.getRule("TCH-03")!.evaluate(ctx);
    // TCH-03 checks indexable pages without noindex. It should evaluate only HTML pages (1 page), not sitemap.xml.
    expect(tch03.status).toBe("PASS");
  });
});
