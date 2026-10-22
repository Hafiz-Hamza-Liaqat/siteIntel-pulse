export interface CrawlerBudgets {
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  maxRedirectHops: number;
  requestTimeoutMs: number;
  maxPageBytes: number;
  maxTotalScanBytes: number;
  maxExternalLinks: number;
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
  userAgent: "SiteIntelPulse-Bot/1.0 (+https://siteintel-pulse.local/bot-policy)",
};

export class CrawlBudgetTracker {
  private pagesFetched = 0;
  private totalBytesFetched = 0;
  private externalLinksTested = 0;
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

  markTruncated(reason: string) {
    this.isTruncated = true;
    this.truncationReason = reason;
  }

  getStats() {
    return {
      pagesFetched: this.pagesFetched,
      totalBytesFetched: this.totalBytesFetched,
      externalLinksTested: this.externalLinksTested,
      isTruncated: this.isTruncated,
      truncationReason: this.truncationReason,
      maxPagesBudget: this.budgets.maxPages,
    };
  }
}
