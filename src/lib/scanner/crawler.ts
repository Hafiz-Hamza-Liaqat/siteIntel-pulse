import {
  PageObservation,
  ScanCoverage,
  LinkObservation,
} from "@/types";
import { parsePageHtml } from "./html-parser";
import { CrawlBudgetTracker, CrawlerBudgets } from "./budget";
import { validateUrlSafety } from "./dns-safety";
import { normalizeAndValidateUrl } from "./url-validator";

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

  constructor(budgets?: Partial<CrawlerBudgets>, abortSignal?: AbortSignal) {
    this.tracker = new CrawlBudgetTracker(budgets);
    this.abortSignal = abortSignal;
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
   * Safely fetches a single page with SSRF check, timeouts, and byte limits.
   */
  private async safeFetchPage(
    targetUrl: string,
    depth: number,
    source: "entry" | "sitemap" | "internal_link"
  ): Promise<PageObservation | null> {
    // SSRF Re-validation before network connection
    const dnsCheck = await validateUrlSafety(targetUrl);
    if (!dnsCheck.isSafe) {
      return null;
    }

    const startTime = Date.now();
    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": this.tracker.budgets.userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: this.abortSignal || AbortSignal.timeout(this.tracker.budgets.requestTimeoutMs),
        redirect: "follow",
      });

      const responseTimeMs = Date.now() - startTime;
      const headersRecord: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersRecord[key.toLowerCase()] = val;
      });

      // Streaming / text limit enforcement (max 2 MiB)
      const text = await response.text();
      const byteLength = Buffer.byteLength(text, "utf8");

      this.tracker.recordPageFetched(byteLength);

      const pageObservation = parsePageHtml(
        text.slice(0, this.tracker.budgets.maxPageBytes),
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
   * Fetches and parses robots.txt for sitemap declarations.
   */
  private async fetchRobotsTxt(origin: string, baseHostname: string) {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const dnsCheck = await validateUrlSafety(robotsUrl);
      if (!dnsCheck.isSafe) return;

      const res = await fetch(robotsUrl, {
        headers: { "User-Agent": this.tracker.budgets.userAgent },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const text = await res.text();
        this.robotsTxtContent = text;
        const lines = text.split("\n");
        for (const line of lines) {
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
      // Non-fatal if robots.txt is not available
    }
  }

  /**
   * Fetches an XML sitemap and extracts URLs.
   */
  private async fetchSitemapXml(sitemapUrl: string, baseHostname: string) {
    try {
      const dnsCheck = await validateUrlSafety(sitemapUrl);
      if (!dnsCheck.isSafe) return;

      const res = await fetch(sitemapUrl, {
        headers: { "User-Agent": this.tracker.budgets.userAgent },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const text = await res.text();
        // Regex extract <loc> URLs
        const locMatches = text.match(/<loc>(.*?)<\/loc>/gi);
        if (locMatches) {
          const normBaseHost = baseHostname.toLowerCase().replace(/^www\./, "");
          for (const match of locMatches) {
            const rawUrl = match.replace(/<\/?loc>/gi, "").trim();
            try {
              const locUrl = new URL(rawUrl);
              const locHost = locUrl.hostname.toLowerCase().replace(/^www\./, "");
              if (locHost === normBaseHost && !this.sitemapUrls.includes(rawUrl)) {
                this.sitemapUrls.push(rawUrl);
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  /**
   * Checks HTTP status for a bounded sample of external links.
   */
  private async testExternalLinksSample(links: LinkObservation[]): Promise<LinkObservation[]> {
    const tested: LinkObservation[] = [];
    const sample = links.slice(0, this.tracker.budgets.maxExternalLinks);

    for (const link of sample) {
      if (!this.tracker.canTestMoreExternalLinks()) break;
      this.tracker.recordExternalLinkTested();

      try {
        const dnsCheck = await validateUrlSafety(link.targetUrl);
        if (!dnsCheck.isSafe) {
          tested.push({ ...link, isBroken: true, statusCode: 403 });
          continue;
        }

        const res = await fetch(link.targetUrl, {
          method: "HEAD",
          headers: { "User-Agent": this.tracker.budgets.userAgent },
          signal: AbortSignal.timeout(4000),
        });

        tested.push({
          ...link,
          statusCode: res.status,
          isBroken: res.status >= 400,
          isRedirect: res.status >= 300 && res.status < 400,
        });
      } catch {
        tested.push({
          ...link,
          isBroken: true,
          statusCode: 0,
        });
      }
    }

    return tested;
  }
}
