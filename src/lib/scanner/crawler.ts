import {
  PageObservation,
  ScanCoverage,
  LinkObservation,
} from "@/types";
import { parsePageHtml } from "./html-parser";
import { CrawlBudgetTracker, CrawlerBudgets } from "./budget";
import { validateUrlSafety } from "./dns-safety";
import { normalizeAndValidateUrl } from "./url-validator";
import { pinnedFetch, readBoundedText, PinnedFetchOptions } from "./pinned-transport";

export interface CrawlResult {
  pages: PageObservation[];
  coverage: ScanCoverage;
  robotsTxt?: string;
  sitemapUrls: string[];
  externalLinksTested: LinkObservation[];
  discoveredPageUrls: string[];
}

export class SafeCrawler {
  private tracker: CrawlBudgetTracker;
  private visitedUrls = new Set<string>();
  private queue: Array<{ url: string; depth: number; source: "entry" | "sitemap" | "internal_link" }> = [];
  private abortSignal?: AbortSignal;
  private sitemapUrls: string[] = [];
  private robotsTxtContent?: string;
  private fetchFn: (url: string, options?: PinnedFetchOptions) => Promise<Response>;

  constructor(
    budgets?: Partial<CrawlerBudgets>,
    abortSignal?: AbortSignal,
    fetchFn?: (url: string, options?: PinnedFetchOptions) => Promise<Response>
  ) {
    this.tracker = new CrawlBudgetTracker(budgets);
    this.abortSignal = abortSignal;
    this.fetchFn = fetchFn || pinnedFetch;
  }

  /**
   * Main crawl entry point for a target public URL.
   */
  async crawlWebsite(
    startUrl: string,
    onProgress?: (stage: string, discovered: number, tested: number) => void
  ): Promise<CrawlResult> {
    const pages: PageObservation[] = [];
    const externalLinksToTest: LinkObservation[] = [];
    const discoveredUrls = new Set<string>();

    const normalizedStart = normalizeAndValidateUrl(startUrl);
    if (!normalizedStart.isValid || !normalizedStart.normalizedUrl) {
      throw new Error(normalizedStart.errorMessage || "Invalid start URL");
    }

    const baseOrigin = new URL(normalizedStart.normalizedUrl).origin;
    const baseHostname = new URL(normalizedStart.normalizedUrl).hostname.toLowerCase();

    // 1. Discover robots.txt and sitemaps
    onProgress?.("Discovering robots.txt and sitemaps", 1, 0);
    await this.fetchRobotsTxt(baseOrigin, baseHostname);

    // 2. Queue start URL
    this.queue.push({ url: normalizedStart.normalizedUrl, depth: 0, source: "entry" });
    discoveredUrls.add(normalizedStart.normalizedUrl);

    // Add sitemap discovered URLs to discovery queue (up to maxPages)
    for (const sUrl of this.sitemapUrls) {
      if (discoveredUrls.size >= this.tracker.budgets.maxPages * 2) break;
      if (!discoveredUrls.has(sUrl)) {
        discoveredUrls.add(sUrl);
        this.queue.push({ url: sUrl, depth: 1, source: "sitemap" });
      }
    }

    let testedCount = 0;
    let failedCount = 0;
    let maxDepthReached = 0;

    // 3. Process crawl queue within budget bounds
    while (this.queue.length > 0 && this.tracker.canFetchMorePages()) {
      if (this.abortSignal?.aborted) {
        this.tracker.markTruncated("Scan canceled by user.");
        break;
      }

      const item = this.queue.shift()!;
      if (this.visitedUrls.has(item.url)) continue;
      this.visitedUrls.add(item.url);

      if (item.depth > this.tracker.budgets.maxDepth) continue;
      if (item.depth > maxDepthReached) maxDepthReached = item.depth;

      onProgress?.(
        `Crawling page ${testedCount + 1}: ${new URL(item.url).pathname}`,
        discoveredUrls.size,
        testedCount
      );

      // Fetch and inspect page safely
      const pageResult = await this.safeFetchPage(item.url, item.depth, item.source);
      if (pageResult) {
        pages.push(pageResult);
        testedCount += 1;

        // Discover and enqueue internal links if within depth limit
        if (item.depth < this.tracker.budgets.maxDepth) {
          for (const link of pageResult.links) {
            if (link.isInternal) {
              const cleanTarget = link.targetUrl.split("#")[0];
              if (!discoveredUrls.has(cleanTarget)) {
                discoveredUrls.add(cleanTarget);
                this.queue.push({ url: cleanTarget, depth: item.depth + 1, source: "internal_link" });
              }
            } else if (!link.isInternal && externalLinksToTest.length < 25) {
              externalLinksToTest.push(link);
            }
          }
        }
      } else {
        failedCount += 1;
      }
    }

    // 4. Test a bounded subset of external links
    onProgress?.("Validating external links hygiene", discoveredUrls.size, testedCount);
    const testedExternalLinks = await this.testExternalLinksSample(externalLinksToTest);

    const stats = this.tracker.getStats();

    // 5. Build ScanCoverage
    const coverage: ScanCoverage = {
      discoveredPages: discoveredUrls.size,
      testedPages: pages.length,
      skippedPages: Math.max(0, discoveredUrls.size - pages.length - failedCount),
      failedPages: failedCount,
      inaccessiblePages: failedCount,
      totalBytesFetched: stats.totalBytesFetched,
      totalPagesBudget: this.tracker.budgets.maxPages,
      crawlDepthReached: maxDepthReached,
      externalLinksTested: testedExternalLinks.length,
      resourcesTested: pages.reduce((acc, p) => acc + p.resources.length, 0),
      isExhaustive: false, // Honest transparency: bounded crawl is not exhaustive
      truncationReason: stats.truncationReason,
      weightedPointsEvaluated: 0, // Populated after scoring
      totalWeightedPoints: 100,
      coveragePercentage: 0, // Populated after scoring
    };

    return {
      pages,
      coverage,
      robotsTxt: this.robotsTxtContent,
      sitemapUrls: this.sitemapUrls,
      externalLinksTested: testedExternalLinks,
      discoveredPageUrls: Array.from(discoveredUrls),
    };
  }

  /**
   * Safely fetches a single page with destination-pinned egress, hop-by-hop redirect
   * boundary validation, and streaming byte limits.
   */
  private async safeFetchPage(
    targetUrl: string,
    depth: number,
    source: "entry" | "sitemap" | "internal_link"
  ): Promise<PageObservation | null> {
    const startTime = Date.now();
    try {
      const response = await this.fetchFn(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": this.tracker.budgets.userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeoutMs: this.tracker.budgets.requestTimeoutMs,
        abortSignal: this.abortSignal,
        maxBytes: this.tracker.budgets.maxPageBytes,
        redirect: "follow",
        maxRedirects: 5,
      });

      const responseTimeMs = Date.now() - startTime;
      const headersRecord: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersRecord[key.toLowerCase()] = val;
      });

      // Stream bounded read: reads up to maxPageBytes and cancels underlying stream immediately
      const { text, bytesRead } = await readBoundedText(
        response,
        this.tracker.budgets.maxPageBytes,
        { signal: this.abortSignal, timeoutMs: this.tracker.budgets.requestTimeoutMs }
      );

      this.tracker.recordPageFetched(bytesRead);

      const pageObservation = parsePageHtml(
        text,
        targetUrl,
        response.status,
        responseTimeMs,
        headersRecord
      );

      pageObservation.discoveredAtDepth = depth;
      pageObservation.discoverySource = source;
      pageObservation.finalUrl = response.url || targetUrl;

      return pageObservation;
    } catch {
      return null;
    }
  }

  /**
   * Fetches and parses robots.txt for sitemap declarations with destination-pinned egress.
   * Strictly enforces sitemap file budgets before issuing sitemap requests.
   */
  private async fetchRobotsTxt(origin: string, baseHostname: string) {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const res = await this.fetchFn(robotsUrl, {
        headers: { "User-Agent": this.tracker.budgets.userAgent },
        timeoutMs: 5000,
        abortSignal: this.abortSignal,
        maxBytes: 128 * 1024, // 128 KB bounded limit for robots.txt
        redirect: "follow",
        maxRedirects: 3,
      });

      if (res.ok) {
        const { text, bytesRead } = await readBoundedText(res, 128 * 1024, {
          signal: this.abortSignal,
          timeoutMs: 5000,
        });
        this.tracker.recordPageFetched(bytesRead);
        this.robotsTxtContent = text;
        const lines = text.split("\n");
        for (const line of lines) {
          if (!this.tracker.canFetchMoreSitemaps()) break;
          const trimmed = line.trim();
          if (trimmed.toLowerCase().startsWith("sitemap:")) {
            const sitemapUrl = trimmed.slice(8).trim();
            if (sitemapUrl) {
              await this.fetchSitemapXml(sitemapUrl, baseHostname);
            }
          }
        }
      }
    } catch {
      // Non-fatal if robots.txt is not available or blocked by safety boundary
    }
  }

  /**
   * Fetches an XML sitemap and extracts URLs with destination-pinned egress.
   * Strictly bounds sitemap file counts, discovery counts, body byte limits, and time limits.
   */
  private async fetchSitemapXml(sitemapUrl: string, baseHostname: string) {
    // 1. Enforce sitemap file request limit before issuing request
    if (!this.tracker.canFetchMoreSitemaps()) return;

    // 2. Reject invalid URLs, unsupported schemes, and off-domain hosts
    let parsed: URL;
    try {
      parsed = new URL(sitemapUrl);
    } catch {
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return;
    }

    const normBaseHost = baseHostname.toLowerCase().replace(/^www\./, "");
    const sitemapHost = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (sitemapHost !== normBaseHost) {
      return;
    }

    // 3. Increment sitemap fetched count before issuing request
    this.tracker.recordSitemapFetched();

    try {
      const res = await this.fetchFn(sitemapUrl, {
        headers: { "User-Agent": this.tracker.budgets.userAgent },
        timeoutMs: 8000,
        abortSignal: this.abortSignal,
        maxBytes: 1024 * 1024, // 1 MB bounded limit for sitemap XML
        redirect: "follow",
        maxRedirects: 3,
      });

      if (res.ok) {
        const { text, bytesRead } = await readBoundedText(res, 1024 * 1024, {
          signal: this.abortSignal,
          timeoutMs: 8000,
        });
        this.tracker.recordPageFetched(bytesRead);
        // Regex extract <loc> URLs
        const locMatches = text.match(/<loc>(.*?)<\/loc>/gi);
        if (locMatches) {
          for (const match of locMatches) {
            // Enforce sitemap URL discovery limit before processing/queueing
            if (!this.tracker.canDiscoverMoreSitemapUrls()) break;

            const rawUrl = match.replace(/<\/?loc>/gi, "").trim();
            try {
              const locUrl = new URL(rawUrl);
              if (locUrl.protocol !== "http:" && locUrl.protocol !== "https:") continue;
              const locHost = locUrl.hostname.toLowerCase().replace(/^www\./, "");
              if (locHost === normBaseHost && !this.sitemapUrls.includes(rawUrl)) {
                this.sitemapUrls.push(rawUrl);
                this.tracker.recordSitemapUrlDiscovered();
              }
            } catch {}
          }
        }
      }
    } catch {
      // Non-fatal if sitemap is not available or blocked by safety boundary
    }
  }

  /**
   * Checks HTTP status for a bounded sample of external links with destination-pinned egress.
   */
  private async testExternalLinksSample(links: LinkObservation[]): Promise<LinkObservation[]> {
    const tested: LinkObservation[] = [];
    const sample = links.slice(0, this.tracker.budgets.maxExternalLinks);

    for (const link of sample) {
      if (!this.tracker.canTestMoreExternalLinks()) break;
      this.tracker.recordExternalLinkTested();

      try {
        const res = await this.fetchFn(link.targetUrl, {
          method: "HEAD",
          headers: { "User-Agent": this.tracker.budgets.userAgent },
          timeoutMs: 4000,
          abortSignal: this.abortSignal,
          maxBytes: 8 * 1024,
          redirect: "follow",
          maxRedirects: 3,
        });

        const isRedirect = (res as any).redirectChain?.length > 0 || (res.status >= 300 && res.status < 400);

        tested.push({
          ...link,
          statusCode: res.status,
          isBroken: res.status >= 400,
          isRedirect,
        });
      } catch (err: any) {
        const isSsrfBlock =
          err?.message?.includes("Destination safety boundary") ||
          err?.message?.includes("Prohibited");
        tested.push({
          ...link,
          isBroken: true,
          statusCode: isSsrfBlock ? 403 : 0,
        });
      }
    }

    return tested;
  }
}
