import { PageSpeedResult } from "./types";
import { runLocalLabAudit } from "../scanner/lab-audit-runner";

export class PageSpeedProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PAGESPEED_API_KEY;
  }

  /**
   * Fetches PageSpeed Insights data for both mobile and desktop in one coordinated call.
   * Priority:
   * 1. Google PageSpeed Insights API if PAGESPEED_API_KEY is configured.
   * 2. Local Headless Chromium Lab Audit fallback (SSRF destination-pinned).
   * 3. Transparent NOT_TESTED state if neither can run. Never fabricates.
   */
  async getBothStrategies(
    targetUrl: string,
    mockOverride?: { mobile?: Partial<PageSpeedResult>; desktop?: Partial<PageSpeedResult> }
  ): Promise<{ mobile: PageSpeedResult; desktop: PageSpeedResult }> {
    if (mockOverride) {
      const mobile = await this.getPageSpeedData(targetUrl, "mobile", mockOverride.mobile);
      const desktop = await this.getPageSpeedData(targetUrl, "desktop", mockOverride.desktop);
      return { mobile, desktop };
    }

    if (this.apiKey) {
      try {
        const [mobile, desktop] = await Promise.all([
          this.fetchGooglePageSpeed(targetUrl, "mobile"),
          this.fetchGooglePageSpeed(targetUrl, "desktop"),
        ]);
        if (mobile.isAvailable && desktop.isAvailable) {
          return { mobile, desktop };
        }
      } catch (err) {
        console.warn("[PageSpeedProvider] Google PageSpeed API failed, attempting local lab audit fallback:", err);
      }
    }

    // Local headless Chromium fallback
    try {
      const localRes = await runLocalLabAudit(targetUrl);
      if (localRes.mobile.isAvailable || localRes.desktop.isAvailable) {
        return { mobile: localRes.mobile, desktop: localRes.desktop };
      }
      return { mobile: localRes.mobile, desktop: localRes.desktop };
    } catch (err: any) {
      const now = new Date().toISOString();
      const failReason = `Neither Google PageSpeed API (PAGESPEED_API_KEY unconfigured) nor Local Headless Chromium could run: ${err?.message || "Execution error"}`;
      return {
        mobile: {
          isAvailable: false,
          strategy: "mobile",
          providerName: "Google PageSpeed / Local Lab Engine",
          unconfiguredReason: failReason,
          source: "Unconfigured / Execution Error",
          measuredAt: now,
        },
        desktop: {
          isAvailable: false,
          strategy: "desktop",
          providerName: "Google PageSpeed / Local Lab Engine",
          unconfiguredReason: failReason,
          source: "Unconfigured / Execution Error",
          measuredAt: now,
        },
      };
    }
  }

  /**
   * Fetches PageSpeed data for a single strategy ("mobile" | "desktop").
   */
  async getPageSpeedData(
    targetUrl: string,
    strategy: "mobile" | "desktop" = "mobile",
    mockOverride?: Partial<PageSpeedResult>
  ): Promise<PageSpeedResult> {
    const now = new Date().toISOString();

    if (mockOverride) {
      return {
        isAvailable: true,
        strategy,
        performanceScore: mockOverride.performanceScore ?? 78,
        labMetrics: mockOverride.labMetrics ?? {
          speedIndexMs: 2100,
          fcpMs: 1200,
          lcpMs: 2400,
          tbtMs: 150,
          ttfbMs: 320,
          cls: 0.05,
        },
        cruxFieldData: mockOverride.cruxFieldData,
        diagnostics: mockOverride.diagnostics ?? {
          totalByteWeight: 1200000,
          renderBlockingResourcesCount: 2,
          criticalPathLatencyMs: 450,
        },
        providerName: mockOverride.providerName || "Mock PageSpeed Fixture",
        measurementMethod: mockOverride.measurementMethod || "Mock Diagnostic Probe",
        source: mockOverride.source || "Deterministic Mock Fixture",
        measuredAt: now,
      };
    }

    if (this.apiKey) {
      try {
        const res = await this.fetchGooglePageSpeed(targetUrl, strategy);
        if (res.isAvailable) return res;
      } catch (err) {
        console.warn(`[PageSpeedProvider] Google PageSpeed ${strategy} failed, attempting local fallback:`, err);
      }
    }

    // Local headless fallback
    try {
      const local = await runLocalLabAudit(targetUrl);
      return local[strategy];
    } catch (err: any) {
      return {
        isAvailable: false,
        strategy,
        providerName: "Google PageSpeed / Local Lab Engine",
        unconfiguredReason: `PAGESPEED_API_KEY is not configured and local lab audit could not execute: ${err?.message || "Unavailable"}`,
        source: "Lab data unavailable",
        measuredAt: now,
      };
    }
  }

  private async fetchGooglePageSpeed(
    targetUrl: string,
    strategy: "mobile" | "desktop"
  ): Promise<PageSpeedResult> {
    const now = new Date().toISOString();
    const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    apiUrl.searchParams.set("url", targetUrl);
    apiUrl.searchParams.set("strategy", strategy);
    apiUrl.searchParams.set("key", this.apiKey!);

    const res = await fetch(apiUrl.toString(), {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return {
        isAvailable: false,
        strategy,
        source: `PageSpeed API returned HTTP ${res.status}`,
        measuredAt: now,
      };
    }

    const data = await res.json();
    const lighthouse = data?.lighthouseResult;
    const categories = lighthouse?.categories;
    const perfScore = categories?.performance?.score != null ? Math.round(categories.performance.score * 100) : undefined;

    const labMetrics: PageSpeedResult["labMetrics"] = {
      speedIndexMs: lighthouse?.audits?.["speed-index"]?.numericValue,
      fcpMs: lighthouse?.audits?.["first-contentful-paint"]?.numericValue,
      lcpMs: lighthouse?.audits?.["largest-contentful-paint"]?.numericValue,
      tbtMs: lighthouse?.audits?.["total-blocking-time"]?.numericValue,
      ttfbMs: lighthouse?.audits?.["server-response-time"]?.numericValue,
      cls: lighthouse?.audits?.["cumulative-layout-shift"]?.numericValue,
    };

    const crux = data?.loadingExperience?.metrics;
    let cruxFieldData: PageSpeedResult["cruxFieldData"] = undefined;
    if (crux) {
      cruxFieldData = {
        fcpMs: crux.FIRST_CONTENTFUL_PAINT_MS?.percentile,
        lcpMs: crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
        inpMs: crux.INTERACTION_TO_NEXT_PAINT?.percentile,
        cls: crux.CUMULATIVE_LAYOUT_SHIFT_SCORE ? crux.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : undefined,
        category: data?.loadingExperience?.overall_category,
        lcpPercentile: crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
        inpPercentile: crux.INTERACTION_TO_NEXT_PAINT?.percentile,
        clsPercentile: crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile,
      };
    }

    return {
      isAvailable: true,
      strategy,
      performanceScore: perfScore,
      labMetrics,
      cruxFieldData,
      diagnostics: {
        totalByteWeight: lighthouse?.audits?.["total-byte-weight"]?.numericValue,
        renderBlockingResourcesCount: lighthouse?.audits?.["render-blocking-resources"]?.details?.items?.length || 0,
        criticalPathLatencyMs: lighthouse?.audits?.["server-response-time"]?.numericValue,
      },
      providerName: "Google PageSpeed Insights API v5",
      source: "Google PageSpeed Insights API v5",
      measuredAt: now,
      measurementMethod: "Google PageSpeed Insights API v5",
    };
  }
}

export const pageSpeedProvider = new PageSpeedProvider();
