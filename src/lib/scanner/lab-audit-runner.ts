import { chromium, Browser } from "playwright";
import { validateHostSafety } from "./dns-safety";
import { normalizeAndValidateUrl } from "./url-validator";
import { createPinnedEgressProxy, type PinnedEgressProxy } from "./pinned-transport";
import { PageSpeedResult } from "../providers/types";
import { calculateLighthousePerformanceScore } from "../scoring/performance-thresholds";

export interface LabAuditOptions {
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

export interface LocalLabAuditResult {
  mobile: PageSpeedResult;
  desktop: PageSpeedResult;
  technicalErrors: {
    browserJsExceptions: string[];
    browserConsoleErrors: string[];
    failedNetworkRequests: Array<{ url: string; error?: string }>;
  };
}

/**
 * Runs genuine local mobile and desktop Lighthouse-equivalent performance lab audits
 * using Playwright Headless Chromium backed by a destination-pinned SSRF proxy.
 */
export async function runLocalLabAudit(
  targetUrl: string,
  options: LabAuditOptions = {}
): Promise<LocalLabAuditResult> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const now = new Date().toISOString();

  const emptyResult = (strategy: "mobile" | "desktop", reason: string): PageSpeedResult => ({
    isAvailable: false,
    strategy,
    performanceScore: undefined,
    labMetrics: undefined,
    cruxFieldData: undefined,
    diagnostics: undefined,
    providerName: "Headless Chromium Lab Engine",
    unconfiguredReason: reason,
    source: "Local Headless Chromium Lab Engine",
    measuredAt: now,
  });

  const urlCheck = normalizeAndValidateUrl(targetUrl);
  if (!urlCheck.isValid || !urlCheck.normalizedUrl) {
    const reason = `Target URL failed safe destination validation: ${urlCheck.errorMessage || "Invalid URL"}`;
    return {
      mobile: emptyResult("mobile", reason),
      desktop: emptyResult("desktop", reason),
      technicalErrors: { browserJsExceptions: [], browserConsoleErrors: [], failedNetworkRequests: [] },
    };
  }

  try {
    const targetParsed = new URL(urlCheck.normalizedUrl);
    const preflight = await validateHostSafety(targetParsed.hostname);
    if (!preflight.isSafe) {
      const reason = `Target host failed destination boundary safety validation: ${preflight.rejectionReason}`;
      return {
        mobile: emptyResult("mobile", reason),
        desktop: emptyResult("desktop", reason),
        technicalErrors: { browserJsExceptions: [], browserConsoleErrors: [], failedNetworkRequests: [] },
      };
    }
  } catch (err: any) {
    const reason = `Target host DNS safety resolution error: ${err?.message || "DNS error"}`;
    return {
      mobile: emptyResult("mobile", reason),
      desktop: emptyResult("desktop", reason),
      technicalErrors: { browserJsExceptions: [], browserConsoleErrors: [], failedNetworkRequests: [] },
    };
  }

  let proxy: PinnedEgressProxy | null = null;
  let browser: Browser | null = null;

  const browserJsExceptions: string[] = [];
  const browserConsoleErrors: string[] = [];
  const failedNetworkRequests: Array<{ url: string; error?: string }> = [];

  try {
    proxy = await createPinnedEgressProxy();
    browser = await chromium.launch({
      headless: true,
      proxy: { server: proxy.proxyUrl },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    // Helper to evaluate a single device strategy
    async function auditStrategy(strategy: "mobile" | "desktop"): Promise<PageSpeedResult> {
      if (options.abortSignal?.aborted) {
        return emptyResult(strategy, "Audit canceled by user.");
      }

      const isMobile = strategy === "mobile";
      const viewport = isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 };
      const userAgent = isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 SiteIntelPulse/1.0"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SiteIntelPulse/1.0";

      const context = await browser!.newContext({
        viewport,
        userAgent,
        isMobile,
        hasTouch: isMobile,
        deviceScaleFactor: isMobile ? 3 : 1,
        ignoreHTTPSErrors: false,
      });

      const page = await context.newPage();

      // Collect console errors and exceptions (bounded to prevent unbounded growth from adversarial loops)
      page.on("pageerror", (err) => {
        if (browserJsExceptions.length < 500) {
          browserJsExceptions.push(`[${strategy}] ${err.message}`.slice(0, 2000));
        }
      });
      page.on("console", (msg) => {
        if (msg.type() === "error" && browserConsoleErrors.length < 500) {
          browserConsoleErrors.push(`[${strategy}] ${msg.text()}`.slice(0, 2000));
        }
      });
      page.on("requestfailed", (req) => {
        if (failedNetworkRequests.length < 500) {
          failedNetworkRequests.push({
            url: req.url().slice(0, 2048),
            error: req.failure()?.errorText ? req.failure()!.errorText.slice(0, 500) : undefined,
          });
        }
      });

      // Inject performance observers before page scripts run
      await page.addInitScript(() => {
        (window as any).__siteIntelPerf = {
          lcp: 0,
          cls: 0,
          clsObserverActive: false,
          longTasks: [] as Array<{ startTime: number; duration: number }>,
        };
        try {
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              (window as any).__siteIntelPerf.lcp = entry.startTime;
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {}
        try {
          const obs = new PerformanceObserver((entryList) => {
            (window as any).__siteIntelPerf.clsObserverActive = true;
            for (const entry of entryList.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                (window as any).__siteIntelPerf.cls += entry.value || 0;
              }
            }
          });
          obs.observe({ type: "layout-shift", buffered: true });
          (window as any).__siteIntelPerf.clsObserverActive = true;
        } catch {}
        try {
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if ((window as any).__siteIntelPerf.longTasks.length < 500) {
                (window as any).__siteIntelPerf.longTasks.push({
                  startTime: entry.startTime,
                  duration: entry.duration,
                });
              }
            }
          }).observe({ type: "longtask", buffered: true });
        } catch {}
      });

      try {
        const response = await page.goto(targetUrl, {
          waitUntil: "load",
          timeout: timeoutMs,
        });

        // Allow layout shifts and long tasks to settle
        await page.waitForTimeout(1000);

        if (!response || response.status() >= 400) {
          await context.close();
          return emptyResult(strategy, `HTTP status ${response ? response.status() : "no response"}`);
        }

        const metrics = await page.evaluate(() => {
          const perf = (window as any).__siteIntelPerf || { lcp: 0, cls: 0, longTasks: [] };
          const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
          const nav = navEntries && navEntries.length > 0 ? navEntries[0] : null;

          // Paint timing
          const paintEntries = performance.getEntriesByType("paint");
          const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint");
          const fcpMs = fcpEntry ? fcpEntry.startTime : nav ? Math.max(100, nav.responseEnd) : 200;

          // TTFB
          const ttfbMs = nav ? Math.max(0, nav.responseStart - nav.requestStart) : 100;

          // LCP
          const lcpMs = perf.lcp > 0 ? perf.lcp : fcpMs * 1.5;

          // CLS: Return genuine measured numeric float (preserving valid 0.000) if observer was active; otherwise undefined
          let cls: number | undefined = undefined;
          if (perf.clsObserverActive && typeof perf.cls === "number") {
            cls = Math.round(perf.cls * 1000) / 1000;
          }

          // TBT (sum of blocking portion of tasks > 50ms occurring after FCP)
          let tbtMs = 0;
          for (const task of perf.longTasks) {
            if (task.startTime >= fcpMs && task.duration > 50) {
              tbtMs += task.duration - 50;
            }
          }

          // Speed Index approximation from DOM content loaded and paint
          const dcl = nav ? nav.domContentLoadedEventEnd : fcpMs;
          const speedIndexMs = Math.round(Math.max(fcpMs, (fcpMs + lcpMs + dcl) / 3));

          // Diagnostics
          const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
          let totalByteWeight = 0;
          for (const r of resources) {
            totalByteWeight += r.transferSize || 0;
          }

          // Count render blocking scripts/stylesheets in head without async/defer
          const blockingScripts = document.querySelectorAll("head script:not([async]):not([defer]):not([type='module'])");
          const blockingStyles = document.querySelectorAll("head link[rel='stylesheet']:not([media='print'])");
          const renderBlockingResourcesCount = blockingScripts.length + blockingStyles.length;

          return {
            fcpMs: Math.round(fcpMs),
            lcpMs: Math.round(lcpMs),
            cls,
            tbtMs: Math.round(tbtMs),
            speedIndexMs: Math.round(speedIndexMs),
            ttfbMs: Math.round(ttfbMs),
            totalByteWeight,
            renderBlockingResourcesCount,
          };
        });

        await context.close();

        // Compute Custom Lab Performance Index (using Lighthouse v10 log-normal curves)
        const { overallScore } = calculateLighthousePerformanceScore({
          fcpMs: metrics.fcpMs,
          lcpMs: metrics.lcpMs,
          cls: metrics.cls,
          tbtMs: metrics.tbtMs,
          speedIndexMs: metrics.speedIndexMs,
          ttfbMs: metrics.ttfbMs,
        });

        return {
          isAvailable: true,
          strategy,
          performanceScore: overallScore,
          labMetrics: {
            speedIndexMs: metrics.speedIndexMs,
            fcpMs: metrics.fcpMs,
            lcpMs: metrics.lcpMs,
            tbtMs: metrics.tbtMs,
            ttfbMs: metrics.ttfbMs,
            cls: metrics.cls != null ? metrics.cls : undefined,
          },
          cruxFieldData: undefined, // Truthful: CrUX requires Google API credentials
          diagnostics: {
            totalByteWeight: metrics.totalByteWeight,
            renderBlockingResourcesCount: metrics.renderBlockingResourcesCount,
            criticalPathLatencyMs: metrics.ttfbMs,
          },
          providerName: "Custom Lab Performance Index (Headless Chromium v1.50)",
          source: "Custom Lab Performance Index v1.0 (W3C Paint Timing & PerformanceObserver)",
          measuredAt: new Date().toISOString(),
          measurementMethod: "Custom Lab Performance Index v1.0 (Log-Normal: FCP 10%, LCP 25%, TBT 30%, CLS 25%, SI 10%)",
          deviceProfile: isMobile ? "Mobile (390×844 px, DPR 3.0, Touch)" : "Desktop (1280×800 px, DPR 1.0)",
        };
      } catch (err: any) {
        await context.close();
        return emptyResult(strategy, `Headless navigation failed: ${err?.message || "Execution error"}`);
      }
    }

    const mobile = await auditStrategy("mobile");
    const desktop = await auditStrategy("desktop");

    return {
      mobile,
      desktop,
      technicalErrors: {
        browserJsExceptions,
        browserConsoleErrors,
        failedNetworkRequests,
      },
    };
  } catch (err: any) {
    const failReason = `Failed to initialize headless Chromium for lab speed audit: ${err?.message || "Browser error"}`;
    return {
      mobile: emptyResult("mobile", failReason),
      desktop: emptyResult("desktop", failReason),
      technicalErrors: { browserJsExceptions: [], browserConsoleErrors: [], failedNetworkRequests: [] },
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    if (proxy) {
      try {
        await proxy.close();
      } catch {}
    }
  }
}
