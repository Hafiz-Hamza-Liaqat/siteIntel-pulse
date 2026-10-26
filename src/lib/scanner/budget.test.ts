import { describe, it, expect } from "vitest";
import { CrawlBudgetTracker, DEFAULT_BUDGETS } from "./budget";

describe("budget tracker", () => {
  it("initializes with default budgets and allows fetching", () => {
    const tracker = new CrawlBudgetTracker();
    expect(tracker.canFetchMorePages()).toBe(true);
    expect(tracker.budgets.maxPages).toBe(50);
  });

  it("enforces hard maximum limit of 100 pages", () => {
    const tracker = new CrawlBudgetTracker({ maxPages: 250 });
    expect(tracker.budgets.maxPages).toBe(100);
  });

  it("tracks page counts and halts when page budget reached", () => {
    const tracker = new CrawlBudgetTracker({ maxPages: 3 });
    expect(tracker.canFetchMorePages()).toBe(true);

    tracker.recordPageFetched(500);
    tracker.recordPageFetched(500);
    expect(tracker.canFetchMorePages()).toBe(true);

    tracker.recordPageFetched(500);
    expect(tracker.canFetchMorePages()).toBe(false);

    const stats = tracker.getStats();
    expect(stats.isTruncated).toBe(true);
    expect(stats.truncationReason).toContain("Page budget limit reached (3 pages)");
  });

  it("tracks total byte budget and halts when exceeded", () => {
    const tracker = new CrawlBudgetTracker({ maxTotalScanBytes: 1000 });
    tracker.recordPageFetched(600);
    expect(tracker.canFetchMorePages()).toBe(true);

    tracker.recordPageFetched(500); // Exceeds 1000
    expect(tracker.canFetchMorePages()).toBe(false);
    expect(tracker.getStats().isTruncated).toBe(true);
  });

  it("limits external link checks", () => {
    const tracker = new CrawlBudgetTracker({ maxExternalLinks: 2 });
    expect(tracker.canTestMoreExternalLinks()).toBe(true);
    tracker.recordExternalLinkTested();
    expect(tracker.canTestMoreExternalLinks()).toBe(true);
    tracker.recordExternalLinkTested();
    expect(tracker.canTestMoreExternalLinks()).toBe(false);
  });

  it("separates resource bytes from page counts with recordBytesFetched", () => {
    const tracker = new CrawlBudgetTracker({ maxPages: 1, maxTotalScanBytes: 10000 });
    expect(tracker.canFetchMorePages()).toBe(true);

    // Record non-page resource bytes (e.g., robots.txt or sitemap.xml)
    tracker.recordBytesFetched(300);
    tracker.recordBytesFetched(700);

    const statsAfterBytes = tracker.getStats();
    expect(statsAfterBytes.pagesFetched).toBe(0);
    expect(statsAfterBytes.totalBytesFetched).toBe(1000);
    // Page quota is unaffected
    expect(tracker.canFetchMorePages()).toBe(true);

    // Now record an actual page fetch
    tracker.recordPageFetched(500);
    expect(tracker.canFetchMorePages()).toBe(false);
    const statsAfterPage = tracker.getStats();
    expect(statsAfterPage.pagesFetched).toBe(1);
    expect(statsAfterPage.totalBytesFetched).toBe(1500); // 1000 + 500 without double-counting
    // Page budget reached (maxPages: 1)
    expect(statsAfterPage.isTruncated).toBe(true);
  });

  it("halts when recordBytesFetched exhausts total scan byte budget", () => {
    const tracker = new CrawlBudgetTracker({ maxPages: 5, maxTotalScanBytes: 500 });
    tracker.recordBytesFetched(600); // Exceeds 500 maxTotalScanBytes

    expect(tracker.canFetchMorePages()).toBe(false);
    expect(tracker.canFetchMoreSitemaps()).toBe(false);
    expect(tracker.canDiscoverMoreSitemapUrls()).toBe(false);
    const stats = tracker.getStats();
    expect(stats.pagesFetched).toBe(0);
    expect(stats.totalBytesFetched).toBe(600);
    expect(stats.isTruncated).toBe(true);
    expect(stats.truncationReason).toContain("Total scan byte budget reached");
  });
});
