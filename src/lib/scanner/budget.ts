export interface CrawlerBudgets {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  maxRedirectHops: number;
  requestTimeoutMs: number;
  maxPageBytes: number;
  maxTotalScanBytes: number;
  maxExternalLinks: number;
  maxSitemapsFetched: number;
  maxSitemapUrls: number;
  userAgent: string;
}

export const DEFAULT_BUDGETS: CrawlerBudgets = {
  maxPages: 50,
  maxDepth: 3,
  concurrency: 3,
  maxRedirectHops: 5,
  requestTimeoutMs: 10000,
  maxPageBytes: 2 * 1024 * 1024, // 2 MiB per page
  maxTotalScanBytes: 50 * 1024 * 1024, // 50 MiB per scan
  maxExternalLinks: 25,
  maxSitemapsFetched: 5, // Strict maximum of 5 sitemap files fetched per scan
  maxSitemapUrls: 100, // Strict maximum of 100 sitemap URLs discovered
  userAgent: "SiteIntelPulse-Bot/1.0 (+https://siteintel-pulse.local/bot-policy)",
};

export class CrawlBudgetTracker {
  private pagesFetched = 0;
  private totalBytesFetched = 0;
  private externalLinksTested = 0;
  private sitemapsFetched = 0;
  private sitemapUrlsDiscovered = 0;
  private isTruncated = false;
  private truncationReason?: string;
  readonly budgets: CrawlerBudgets;

  constructor(customBudgets?: Partial<CrawlerBudgets>) {
    this.budgets = {
      ...DEFAULT_BUDGETS,
      ...customBudgets,
      // Enforce hard cap of 100 pages
      maxPages: Math.min(customBudgets?.maxPages ?? DEFAULT_BUDGETS.maxPages, 100),
    };
  }

  canFetchMorePages(): boolean {
    if (this.isTruncated) return false;
    if (this.pagesFetched >= this.budgets.maxPages) {
      this.isTruncated = true;
      this.truncationReason = `Page budget limit reached (${this.budgets.maxPages} pages)`;
      return false;
    }
    if (this.totalBytesFetched >= this.budgets.maxTotalScanBytes) {
      this.isTruncated = true;
      this.truncationReason = `Total scan byte budget reached (${Math.round(this.budgets.maxTotalScanBytes / (1024 * 1024))} MiB)`;
      return false;
    }
    return true;
  }

  canTestMoreExternalLinks(): boolean {
    return this.externalLinksTested < this.budgets.maxExternalLinks;
  }

  canFetchMoreSitemaps(): boolean {
    if (this.isTruncated) return false;
    return this.sitemapsFetched < this.budgets.maxSitemapsFetched;
  }

  canDiscoverMoreSitemapUrls(): boolean {
    if (this.isTruncated) return false;
    return this.sitemapUrlsDiscovered < this.budgets.maxSitemapUrls;
  }

  recordPageFetched(bytes: number) {
    this.pagesFetched += 1;
    this.totalBytesFetched += bytes;
    if (this.totalBytesFetched >= this.budgets.maxTotalScanBytes) {
      this.isTruncated = true;
      this.truncationReason = `Total scan byte budget reached (${Math.round(this.budgets.maxTotalScanBytes / (1024 * 1024))} MiB)`;
    }
  }

  recordExternalLinkTested() {
    this.externalLinksTested += 1;
  }

  recordSitemapFetched() {
    this.sitemapsFetched += 1;
  }

  recordSitemapUrlDiscovered() {
    this.sitemapUrlsDiscovered += 1;
  }

  markTruncated(reason: string) {
    this.isTruncated = true;
    this.truncationReason = reason;
  }

  getStats() {
    return {
      pagesFetched: this.pagesFetched,
      totalBytesFetched: this.totalBytesFetched,
      externalLinksTested: this.externalLinksTested,
      sitemapsFetched: this.sitemapsFetched,
      sitemapUrlsDiscovered: this.sitemapUrlsDiscovered,
      isTruncated: this.isTruncated,
      truncationReason: this.truncationReason,
      maxPagesBudget: this.budgets.maxPages,
    };
  }
}
