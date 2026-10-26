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

    it("with maxPages: 1, fetching robots.txt does not prevent the entry page from being crawled", async () => {
      const mockRobots = "User-agent: *\nDisallow: /admin\n";
      const mockHtml = "<html><head><title>Home</title></head><body><h1>Welcome Home</h1></body></html>";

      const fetchedUrls: string[] = [];
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        fetchedUrls.push(url);
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response(mockRobots, { status: 200 }));
        }
        return Promise.resolve(
          new Response(mockHtml, {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        );
      });

      // maxPages is strictly 1
      const crawler = new SafeCrawler({ maxPages: 1 }, undefined, mockFetch);
      const result = await crawler.crawlWebsite("https://example.com");

      // robots.txt was fetched first
      expect(fetchedUrls).toContain("https://example.com/robots.txt");
      // And the entry page was STILL crawled because robots.txt did not consume the 1-page budget
      expect(result.pages.length).toBe(1);
      expect(result.coverage.testedPages).toBe(1);
      expect(result.pages[0].requestedUrl).toBe("https://example.com/");
      // Total bytes includes both robots.txt and the HTML page
      expect(result.coverage.totalBytesFetched).toBeGreaterThan(mockRobots.length);
    });

    it("sitemap downloads count toward total bytes but not HTML page count", async () => {
      const mockRobots = "User-agent: *\nSitemap: https://example.com/sitemap.xml";
      const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/catalog</loc></url>
        </urlset>`;
      const mockHomeHtml = "<html><head><title>Home</title></head><body><h1>Home</h1></body></html>";
      const mockCatalogHtml = "<html><head><title>Catalog</title></head><body><h1>Catalog</h1></body></html>";

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response(mockRobots, { status: 200 }));
        }
        if (url.endsWith("/sitemap.xml")) {
          return Promise.resolve(new Response(mockSitemap, { status: 200 }));
        }
        if (url.includes("/catalog")) {
          return Promise.resolve(
            new Response(mockCatalogHtml, {
              status: 200,
              headers: { "content-type": "text/html" },
            })
          );
        }
        return Promise.resolve(
          new Response(mockHomeHtml, {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        );
      });

      // maxPages is 2. If robots.txt and sitemap.xml counted as pages, neither home nor catalog could both crawl!
      const crawler = new SafeCrawler({ maxPages: 2 }, undefined, mockFetch);
      const result = await crawler.crawlWebsite("https://example.com");

      // Both actual HTML pages must be crawled
      expect(result.pages.length).toBe(2);
      expect(result.coverage.testedPages).toBe(2);
      const urls = result.pages.map((p) => p.requestedUrl);
      expect(urls).toContain("https://example.com/");
      expect(urls).toContain("https://example.com/catalog");
      // Total bytes accounts for robots + sitemap + both pages
      expect(result.coverage.totalBytesFetched).toBe(
        mockRobots.length + mockSitemap.length + mockHomeHtml.length + mockCatalogHtml.length
      );
    });

    it("halts further crawling when total scan-byte budget is exhausted", async () => {
      // 1000 bytes robots.txt exceeds a small 500-byte maxTotalScanBytes limit
      const bigRobots = "User-agent: *\n" + "#".repeat(800);
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response(bigRobots, { status: 200 }));
        }
        return Promise.resolve(
          new Response("<html><body><h1>Never reached</h1></body></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        );
      });

      const crawler = new SafeCrawler({ maxPages: 5, maxTotalScanBytes: 500 }, undefined, mockFetch);
      const result = await crawler.crawlWebsite("https://example.com");

      // Entry page was not fetched because robots.txt exhausted the total scan byte budget
      expect(result.pages.length).toBe(0);
      expect(result.coverage.testedPages).toBe(0);
      expect(result.coverage.truncationReason).toContain("Total scan byte budget reached");
    });

    it("ensures an oversized HTML document is not silently represented as fully observed", async () => {
      // 5 KB HTML document with footer trust links at the bottom
      const hugeHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Large Page</title></head>
          <body>
            <h1>Heading 1</h1>
            <p>${"Long content ".repeat(300)}</p>
            <footer>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </footer>
          </body>
        </html>
      `;

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response("User-agent: *\n", { status: 200 }));
        }
        return Promise.resolve(
          new Response(hugeHtml, {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        );
      });

      // Cap maxPageBytes at 1024 bytes (1 KB)
      const crawler = new SafeCrawler({ maxPages: 1, maxPageBytes: 1024 }, undefined, mockFetch);
      const result = await crawler.crawlWebsite("https://example.com");

      expect(result.pages.length).toBe(1);
      const page = result.pages[0];
      // Explicitly marked as truncated with reason
      expect(page.isTruncated).toBe(true);
      expect(page.truncationReason).toContain("Response body truncated at byte limit (1024 bytes)");
      // Scan coverage reflects incomplete observation
      expect(result.coverage.isExhaustive).toBe(false);
      expect(result.coverage.truncationReason).toContain("truncated at byte limits");
    });

    it("ensures an oversized sitemap is not treated as a complete sitemap", async () => {
      const mockRobots = "User-agent: *\nSitemap: https://example.com/oversized-sitemap.xml";
      // Generate genuine 1.5 MB sitemap
      const urlsXml = Array.from({ length: 30000 }, (_, i) => `<url><loc>https://example.com/subpath-item-${i}</loc></url>`).join("\n");
      const bigSitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset>${urlsXml}</urlset>`;

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith("/robots.txt")) {
          return Promise.resolve(new Response(mockRobots, { status: 200 }));
        }
        if (url.endsWith("/oversized-sitemap.xml")) {
          return Promise.resolve(
            new Response(bigSitemap, {
              status: 200,
              headers: { "content-type": "application/xml" },
            })
          );
        }
        return Promise.resolve(new Response("<html><body><h1>Home</h1></body></html>", { status: 200 }));
      });

      const crawler = new SafeCrawler({ maxPages: 1 }, undefined, mockFetch);
      const result = await crawler.crawlWebsite("https://example.com");

      // The sitemap was truncated at 1 MB limit
      expect(result.isSitemapTruncated).toBe(true);
      expect(result.coverage.isExhaustive).toBe(false);
      expect(result.coverage.truncationReason).toContain("Sitemap XML truncated at byte limit");
    });
  });
});
