import { describe, it, expect } from "vitest";
import { parsePageHtml } from "./html-parser.ts";
import { assessmentRegistry } from "@/lib/catalogue/registry.ts";
import { PageObservation } from "@/types";
import { RuleEvaluationContext } from "@/lib/catalogue/types.ts";

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
    const sitemapPage: PageObservation = {
      id: "p_sitemap",
      requestedUrl: "https://example.com/sitemap.xml",
      normalizedUrl: "https://example.com/sitemap.xml",
      finalUrl: "https://example.com/sitemap.xml",
      statusCode: 200,
      responseTimeMs: 80,
      contentType: "application/xml",
      isXmlSitemap: true,
      documentType: "xml_sitemap",
      redirectHistory: [],
      robotsDirectives: [],
      headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
      visibleWordCount: 0,
      doctype: "xml",
      encoding: "UTF-8",
      links: [],
      resources: [],
      structuredData: [],
      openGraph: {},
      headers: {},
      cookieAttributes: [],
      templateConfidence: "HIGH",
      discoveredAtDepth: 1,
      discoverySource: "sitemap",
      consoleErrors: [],
    };

    const regularHtmlPage: PageObservation = {
      id: "p_root",
      requestedUrl: "https://example.com/",
      normalizedUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      statusCode: 200,
      responseTimeMs: 150,
      contentType: "text/html",
      documentType: "html",
      redirectHistory: [],
      robotsDirectives: ["index", "follow"],
      headings: { h1: ["Welcome"], h2: [], h3: [], h4: [], h5: [], h6: [] },
      visibleWordCount: 500,
      doctype: "html",
      encoding: "UTF-8",
      links: [],
      resources: [],
      structuredData: [],
      openGraph: {},
      headers: {},
      cookieAttributes: [],
      templateConfidence: "HIGH",
      discoveredAtDepth: 0,
      discoverySource: "entry",
      consoleErrors: [],
    };

    const ctx: RuleEvaluationContext = {
      targetUrl: "https://example.com",
      domain: "example.com",
      businessCategory: "saas",
      pages: [regularHtmlPage, sitemapPage],
      sitemapUrls: ["https://example.com/sitemap.xml"],
      externalLinksTested: [],
    };

    const tch03 = assessmentRegistry.getRule("TCH-03")!.evaluate(ctx);
    // TCH-03 checks indexable pages without noindex. It should evaluate only HTML pages (1 page), not sitemap.xml.
    expect(tch03.status).toBe("PASS");
  });
});
