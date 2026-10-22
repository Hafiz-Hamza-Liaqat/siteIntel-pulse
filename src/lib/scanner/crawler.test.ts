import { describe, it, expect, vi, beforeEach } from "vitest";
import { SafeCrawler } from "./crawler";
import * as dnsSafety from "./dns-safety";

describe("SafeCrawler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dnsSafety, "validateUrlSafety").mockResolvedValue({
      isSafe: true,
      resolvedIps: ["93.184.216.34"],
    });
  });

  it("crawls an entry page and discovers links within budget", async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Mock Page</title></head>
        <body>
          <h1>Welcome</h1>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </body>
      </html>
    `;

    // Mock global fetch
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        url,
        text: () => Promise.resolve(mockHtml),
        headers: new Headers({ "content-type": "text/html" }),
      });
    });

    const crawler = new SafeCrawler({ maxPages: 2, maxDepth: 1 });
    const result = await crawler.crawlWebsite("https://example.com");

    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.coverage.testedPages).toBeGreaterThanOrEqual(1);
    expect(result.coverage.discoveredPages).toBeGreaterThanOrEqual(2);
    expect(result.coverage.isExhaustive).toBe(false);
  });

  it("aborts when AbortSignal is triggered", async () => {
    const controller = new AbortController();
    controller.abort();

    const crawler = new SafeCrawler({ maxPages: 5 }, controller.signal);
    const result = await crawler.crawlWebsite("https://example.com");

    expect(result.coverage.truncationReason).toContain("canceled by user");
  });

  it("discovers sitemap URLs across apex and www subdomains", async () => {
    const mockRobots = `
      User-agent: *
      Allow: /
      Sitemap: https://www.example.com/sitemap.xml
    `;
    const mockSitemap = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://www.example.com/page-1</loc></url>
        <url><loc>https://www.example.com/page-2</loc></url>
      </urlset>
    `;
    const mockHtml = "<html><head><title>Test</title></head><body><h1>Content</h1></body></html>";

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("robots.txt")) {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(mockRobots) });
      }
      if (url.endsWith("sitemap.xml")) {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(mockSitemap) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        url,
        text: () => Promise.resolve(mockHtml),
        headers: new Headers({ "content-type": "text/html" }),
      });
    });

    const crawler = new SafeCrawler({ maxPages: 5, maxDepth: 1 });
    const result = await crawler.crawlWebsite("https://example.com");

    expect(result.sitemapUrls).toContain("https://www.example.com/page-1");
    expect(result.sitemapUrls).toContain("https://www.example.com/page-2");
    expect(result.coverage.discoveredPages).toBeGreaterThanOrEqual(3);
  });
});
