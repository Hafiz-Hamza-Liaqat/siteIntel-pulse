import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SafeCrawler } from "./crawler";
import * as dnsSafety from "./dns-safety";
import * as pinnedTransport from "./pinned-transport";

describe("SafeCrawler", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dnsSafety, "validateUrlSafety").mockResolvedValue({
      isSafe: true,
      resolvedIps: ["93.184.216.34"],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("crawls an entry page and discovers links within budget via explicit fetchFn injection", async () => {
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

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        url,
        text: () => Promise.resolve(mockHtml),
        headers: new Headers({ "content-type": "text/html" }),
      });
    });

    const crawler = new SafeCrawler({ maxPages: 2, maxDepth: 1 }, undefined, mockFetch);
    const result = await crawler.crawlWebsite("https://example.com");

    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.coverage.testedPages).toBeGreaterThanOrEqual(1);
    expect(result.coverage.discoveredPages).toBeGreaterThanOrEqual(2);
    expect(result.coverage.isExhaustive).toBe(false);
    expect(mockFetch).toHaveBeenCalled();
  });

  it("aborts when AbortSignal is triggered", async () => {
    const controller = new AbortController();
    controller.abort();

    const crawler = new SafeCrawler({ maxPages: 5 }, controller.signal);
    const result = await crawler.crawlWebsite("https://example.com");

    expect(result.coverage.truncationReason).toContain("canceled by user");
  });

  it("discovers sitemap URLs across apex and www subdomains with injected fetchFn", async () => {
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

    const mockFetch = vi.fn().mockImplementation((url: string) => {
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

    const crawler = new SafeCrawler({ maxPages: 5, maxDepth: 1 }, undefined, mockFetch);
    const result = await crawler.crawlWebsite("https://example.com");

    expect(result.sitemapUrls).toContain("https://www.example.com/page-1");
    expect(result.sitemapUrls).toContain("https://www.example.com/page-2");
    expect(result.coverage.discoveredPages).toBeGreaterThanOrEqual(3);
    expect(mockFetch).toHaveBeenCalled();
  });

  describe("Transport Integrity & Sitemap Budgets", () => {
    it("unconditionally uses pinnedFetch in production even if globalThis.fetch is monkeypatched", async () => {
      const attackerFetch = vi.fn().mockImplementation(() => {
        throw new Error("ATTACKER_GLOBAL_FETCH_SHOULD_NEVER_BE_CALLED");
      });
      globalThis.fetch = attackerFetch as any;

      // Spy on pinnedFetch
      const pinnedFetchSpy = vi.spyOn(pinnedTransport, "pinnedFetch").mockResolvedValue(
        new Response("<html><head><title>Ok</title></head></html>", { status: 200 })
      );

      // Instantiate crawler with no fetchFn argument (default production path)
      const crawler = new SafeCrawler({ maxPages: 1 });
      await crawler.crawlWebsite("https://example.com");

      // pinnedFetch should be used, NOT attackerFetch
      expect(pinnedFetchSpy).toHaveBeenCalled();
      expect(attackerFetch).not.toHaveBeenCalled();
    });

    it("enforces strict maximum sitemap file request limit before issuing requests", async () => {
      // Robots.txt declaring 10 separate sitemap files
      const sitemapDeclarations = Array.from({ length: 10 }, (_, i) => `Sitemap: https://example.com/sitemap-${i}.xml`).join("\n");
      const mockRobots = `User-agent: *\n${sitemapDeclarations}`;

      const fetchedSitemaps: string[] = [];
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response(mockRobots, { status: 200 }));
        }
        if (url.includes("sitemap-")) {
          fetchedSitemaps.push(url);
          return Promise.resolve(new Response("<urlset></urlset>", { status: 200 }));
        }
        return Promise.resolve(new Response("<html><head><title>Ok</title></head></html>", { status: 200 }));
      });

      // Configured maxSitemapsFetched = 3 (strict limit)
      const crawler = new SafeCrawler({ maxPages: 1, maxSitemapsFetched: 3 }, undefined, mockFetch);
      await crawler.crawlWebsite("https://example.com");

      // Exactly 3 sitemap requests should have been made, no excess requests sent
      expect(fetchedSitemaps.length).toBe(3);
      expect(fetchedSitemaps).toEqual([
        "https://example.com/sitemap-0.xml",
        "https://example.com/sitemap-1.xml",
        "https://example.com/sitemap-2.xml",
      ]);
    });

    it("enforces strict maximum on discovered sitemap URLs from oversized sitemaps", async () => {
      const mockRobots = "User-agent: *\nSitemap: https://example.com/huge-sitemap.xml";
      // Generate sitemap with 200 <loc> URLs
      const urlsXml = Array.from({ length: 200 }, (_, i) => `<url><loc>https://example.com/job-${i}</loc></url>`).join("\n");
      const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset>${urlsXml}</urlset>`;

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response(mockRobots, { status: 200 }));
        }
        if (url.endsWith("/huge-sitemap.xml")) {
          return Promise.resolve(new Response(mockSitemap, { status: 200 }));
        }
        return Promise.resolve(new Response("<html><head><title>Ok</title></head></html>", { status: 200 }));
      });

      // Limit maxSitemapUrls to 15
      const crawler = new SafeCrawler({ maxPages: 1, maxSitemapUrls: 15 }, undefined, mockFetch);
      const result = await crawler.crawlWebsite("https://example.com");

      // Strictly bounded at 15 URLs
      expect(result.sitemapUrls.length).toBe(15);
      expect(result.sitemapUrls[0]).toBe("https://example.com/job-0");
      expect(result.sitemapUrls[14]).toBe("https://example.com/job-14");
    });

    it("rejects off-domain and non-HTTP sitemap URLs before issuing requests", async () => {
      const mockRobots = `
        User-agent: *
        Sitemap: javascript:alert(1)
        Sitemap: file:///etc/shadow
        Sitemap: ftp://example.com/sitemap.xml
        Sitemap: https://attacker.com/sitemap.xml
        Sitemap: https://example.com/valid-sitemap.xml
      `;
      const validSitemap = `<urlset><url><loc>https://example.com/valid-page</loc></url></urlset>`;

      const requestedUrls: string[] = [];
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        requestedUrls.push(url);
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response(mockRobots, { status: 200 }));
        }
        if (url.endsWith("/valid-sitemap.xml")) {
          return Promise.resolve(new Response(validSitemap, { status: 200 }));
        }
        return Promise.resolve(new Response("<html><head><title>Ok</title></head></html>", { status: 200 }));
      });

      const crawler = new SafeCrawler({ maxPages: 1 }, undefined, mockFetch);
      const result = await crawler.crawlWebsite("https://example.com");

      // Invalid schemes and off-domain targets must NEVER be fetched
      expect(requestedUrls.some((u) => u.includes("javascript:"))).toBe(false);
      expect(requestedUrls.some((u) => u.includes("file:"))).toBe(false);
      expect(requestedUrls.some((u) => u.includes("ftp:"))).toBe(false);
      expect(requestedUrls.some((u) => u.includes("attacker.com"))).toBe(false);

      // Only the valid on-domain sitemap should be fetched and extracted
      expect(result.sitemapUrls).toEqual(["https://example.com/valid-page"]);
    });
  });
});
