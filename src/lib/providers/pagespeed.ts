import { PageSpeedResult } from "./types";

export class PageSpeedProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PAGESPEED_API_KEY;
  }

  /**
   * Fetches PageSpeed Insights data for mobile or desktop.
   * If no API key is configured or the request fails, returns transparent fallback
   * or deterministic heuristic calculation based on measured page observations.
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
        },
        cruxFieldData: mockOverride.cruxFieldData,
        diagnostics: mockOverride.diagnostics ?? {
          totalByteWeight: 1200000,
          renderBlockingResourcesCount: 2,
          criticalPathLatencyMs: 450,
        },
        providerName: "Mock PageSpeed Fixture",
        source: "Deterministic Mock Fixture",
        measuredAt: now,
      };
    }

    if (!this.apiKey) {
      // Unconfigured provider state
      return {
        isAvailable: false,
        strategy,
        performanceScore: undefined,
        labMetrics: undefined,
        cruxFieldData: undefined, // Honest: no field data without API
        diagnostics: undefined,
        providerName: "Google PageSpeed Insights API v5",
        unconfiguredReason: "PAGESPEED_API_KEY environment variable is not configured. Lab and Core Web Vitals field data were not collected.",
        source: "PageSpeed API key not configured (Lab & Field data unavailable)",
        measuredAt: now,
      };
    }

    try {
      const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      apiUrl.searchParams.set("url", targetUrl);
      apiUrl.searchParams.set("strategy", strategy);
      apiUrl.searchParams.set("key", this.apiKey);

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
      };

      // Extract CrUX field data if present
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
      };
    } catch (err: any) {
      return {
        isAvailable: false,
        strategy,
        source: `PageSpeed request failed: ${err?.message || "Timeout"}`,
        measuredAt: now,
      };
    }
  }
}

export const pageSpeedProvider = new PageSpeedProvider();
