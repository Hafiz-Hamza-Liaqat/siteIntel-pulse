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
});
