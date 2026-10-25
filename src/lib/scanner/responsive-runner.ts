import { chromium, Browser, Page } from "playwright";
import { ResponsiveDiagnostic, VisualDesignDiagnostic } from "@/types";
import { validateHostSafety, DnsSafetyCheckResult } from "./dns-safety";
import { normalizeAndValidateUrl } from "./url-validator";

export const RESPONSIVE_VIEWPORT_WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440] as const;

export interface ResponsiveRunnerResult {
  isBrowserAvailable: boolean;
  runnerStatus: "SUCCESS" | "SKIPPED" | "FAILED" | "TIMEOUT";
  failureReason?: string;
  viewportResults: ResponsiveDiagnostic[];
  visualDesign: VisualDesignDiagnostic;
  summary: {
    horizontalOverflowFound: boolean | null;
    responsiveStatus: "PASS" | "FAIL" | "WARNING" | "NOT_TESTED";
    testedWidths: number[];
    totalTouchTargetIssues: number;
    totalClippingIssues: number;
    totalContrastIssues: number;
  };
}

/**
 * Executes a real headless Chromium evaluation across the 7 required viewport widths:
 * 320, 360, 390, 768, 1024, 1280, and 1440 pixels.
 *
 * Enforces destination boundary protection on all page navigations and subresource requests
 * via asynchronous DNS safety validation on every intercepted request.
 */
export async function runResponsiveAudit(
  targetUrl: string,
  options: { timeoutMs?: number; abortSignal?: AbortSignal } = {}
): Promise<ResponsiveRunnerResult> {
  const timeoutMs = options.timeoutMs ?? 20000;
  const testedWidths = [...RESPONSIVE_VIEWPORT_WIDTHS];

  // 1. Initial SSRF URL validation
  const urlCheck = normalizeAndValidateUrl(targetUrl);
  if (!urlCheck.isValid) {
    return createSkippedResult(
      `Target URL failed safe destination validation: ${urlCheck.errorMessage}`,
      testedWidths
    );
  }

  // Pre-flight DNS destination validation on initial target URL
  try {
    const targetParsed = new URL(targetUrl);
    const preflight = await validateHostSafety(targetParsed.hostname);
    if (!preflight.isSafe) {
      return createSkippedResult(
        `Target host failed destination boundary safety validation: ${preflight.rejectionReason}`,
        testedWidths
      );
    }
  } catch (err: any) {
    return createSkippedResult(
      `Target URL parsing or DNS resolution failed: ${err?.message || "Invalid URL"}`,
      testedWidths
    );
  }

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: false,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SiteIntelPulse/1.0",
    });

    const page = await context.newPage();

    // 2. Strict Destination Boundary Enforcement on All Outbound Subrequests & Redirects
    const dnsCache = new Map<string, DnsSafetyCheckResult>();
    const blockedRequests: Array<{ url: string; reason: string }> = [];

    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      try {
        const parsed = new URL(requestUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          // Allow data: or blob: for embedded assets
          if (parsed.protocol === "data:" || parsed.protocol === "blob:") {
            return route.continue();
          }
          blockedRequests.push({ url: requestUrl, reason: "Non-HTTP/HTTPS protocol prohibited" });
          return route.abort("blockedbyclient");
        }

        const host = parsed.hostname;
        let safety = dnsCache.get(host);
        if (!safety) {
          safety = await validateHostSafety(host);
          dnsCache.set(host, safety);
        }

        if (!safety.isSafe) {
          blockedRequests.push({
            url: requestUrl,
            reason: safety.rejectionReason || "Target host failed destination boundary safety validation",
          });
          return route.abort("blockedbyclient");
        }

        return route.continue();
      } catch (err: any) {
        blockedRequests.push({ url: requestUrl, reason: err?.message || "Route validation error" });
        return route.abort("blockedbyclient");
      }
    });

    // 3. Navigate to target URL at desktop viewport first
    await page.setViewportSize({ width: 1280, height: 800 });

    let response;
    try {
      response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
    } catch (gotoErr: any) {
      await browser.close();
      const isBlocked = blockedRequests.length > 0;
      const failReason = isBlocked
        ? `Navigation blocked by destination safety boundary: ${blockedRequests[0]?.reason || "SSRF destination prohibited"}`
        : `Navigation failed: ${gotoErr?.message || "Page load error"}`;

      return createSkippedResult(failReason, testedWidths);
    }

    if (!response || response.status() >= 400) {
      await browser.close();
      return createSkippedResult(
        `Target responded with status ${response ? response.status() : "no response"}`,
        testedWidths
      );
    }

    // Allow dynamic layout/hydration to settle
    await page.waitForTimeout(500);

    const viewportResults: ResponsiveDiagnostic[] = [];
    let anyOverflow = false;
    let totalTouchTargetIssues = 0;
    let totalClippingIssues = 0;
    let totalAccessibleNameIssues = 0;
    let totalOverlapIssues = 0;

    let mobileTypography: { bodyFontSize: number; h1Size: number; h2Size: number; hierarchyOk: boolean } | null = null;
    let desktopTypography: { bodyFontSize: number; h1Size: number; h2Size: number; hierarchyOk: boolean } | null = null;

    // 4. Measure across the 7 required viewport widths
    for (const width of RESPONSIVE_VIEWPORT_WIDTHS) {
      if (options.abortSignal?.aborted) {
        throw new Error("Responsive audit canceled by user.");
      }

      const height = width <= 390 ? 844 : width <= 768 ? 1024 : 900;
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);

      // Evaluate document geometry, overlap, and element metrics in page context
      const metrics = await page.evaluate((viewportWidth) => {
        const docEl = document.documentElement;
        const body = document.body;

        const clientWidth = docEl.clientWidth || window.innerWidth;
        const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
        const hasOverflow = scrollWidth > clientWidth + 3; // 3px subpixel threshold

        const overflowElements: string[] = [];
        if (hasOverflow) {
          const allEls = document.querySelectorAll("body *");
          for (const el of allEls) {
            const rect = el.getBoundingClientRect();
            if (rect.right > clientWidth + 4 && rect.width > 10) {
              const id = el.id ? `#${el.id}` : "";
              const cls = el.className && typeof el.className === "string"
                ? `.${el.className.trim().split(/\s+/)[0]}`
                : "";
              const selector = `${el.tagName.toLowerCase()}${id}${cls}`;
              if (!overflowElements.includes(selector)) {
                overflowElements.push(selector);
                if (overflowElements.length >= 4) break;
              }
            }
          }
        }

        // Touch target sizing check (evaluated on mobile screens <= 768px)
        const isMobileScreen = viewportWidth <= 768;
        const touchTargetSelectors: string[] = [];
        let touchIssuesCount = 0;

        if (isMobileScreen) {
          const interactives = document.querySelectorAll("a, button, input[type='button'], input[type='submit'], select");
          for (const el of interactives) {
            const rect = el.getBoundingClientRect();
            // Check only visible controls
            if (rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40)) {
              touchIssuesCount++;
              if (touchTargetSelectors.length < 3) {
                const text = (el.textContent || "").trim().slice(0, 20);
                const tag = el.tagName.toLowerCase();
                touchTargetSelectors.push(`${tag}("${text}") [${Math.round(rect.width)}x${Math.round(rect.height)}px]`);
              }
            }
          }
        }

        // Accessible name checks on interactive buttons
        let accessibleNameCount = 0;
        const buttons = document.querySelectorAll("button, a[role='button']");
        for (const btn of buttons) {
          const hasText = Boolean(btn.textContent && btn.textContent.trim().length > 0);
          const hasAria = Boolean(btn.getAttribute("aria-label") || btn.getAttribute("aria-labelledby"));
          const hasTitle = Boolean(btn.getAttribute("title"));
          const hasImg = Boolean(btn.querySelector("img[alt]"));
          if (!hasText && !hasAria && !hasTitle && !hasImg) {
            accessibleNameCount++;
          }
        }

        // Clipping of primary navigation and header controls
        let clippingCount = 0;
        const headers = document.querySelectorAll("header, nav, [role='banner']");
        for (const h of headers) {
          const rect = h.getBoundingClientRect();
          if (rect.width > clientWidth + 4 || rect.right > clientWidth + 4) {
            clippingCount++;
          }
        }

        // Check for unintended overlaps (fixed/sticky elements intersecting interactive controls)
        let overlapCount = 0;
        const fixedOrSticky: Element[] = [];
        const allEls = document.querySelectorAll("body *");
        for (const el of allEls) {
          const style = window.getComputedStyle(el);
          if (style.position === "fixed" || style.position === "sticky") {
            fixedOrSticky.push(el);
          }
        }

        const interactives = document.querySelectorAll("a, button, input[type='button'], input[type='submit']");
        for (const fixedEl of fixedOrSticky) {
          const fRect = fixedEl.getBoundingClientRect();
          if (fRect.width === 0 || fRect.height === 0 || fRect.bottom < 0 || fRect.top > window.innerHeight) continue;
          for (const btn of interactives) {
            if (fixedEl.contains(btn)) continue;
            const bRect = btn.getBoundingClientRect();
            if (bRect.width === 0 || bRect.height === 0) continue;
            const overlaps = !(
              bRect.right < fRect.left ||
              bRect.left > fRect.right ||
              bRect.bottom < fRect.top ||
              bRect.top > fRect.bottom
            );
            if (overlaps) {
              overlapCount++;
            }
          }
        }

        // Measure typography at current viewport
        const firstP = document.querySelector("p");
        const pStyle = firstP ? window.getComputedStyle(firstP) : null;
        const bodyFontSize = pStyle ? parseFloat(pStyle.fontSize) : 16;

        const h1El = document.querySelector("h1");
        const h2El = document.querySelector("h2");
        const h1Size = h1El ? parseFloat(window.getComputedStyle(h1El).fontSize) : 28;
        const h2Size = h2El ? parseFloat(window.getComputedStyle(h2El).fontSize) : 22;
        const hierarchyOk = h1Size >= h2Size && h2Size >= bodyFontSize;

        return {
          hasOverflow,
          scrollWidth,
          clientWidth,
          overflowElements,
          touchIssuesCount,
          touchTargetSelectors,
          accessibleNameCount,
          clippingCount,
          overlapCount,
          bodyFontSize,
          h1Size,
          h2Size,
          hierarchyOk,
        };
      }, width);

      if (metrics.hasOverflow) {
        anyOverflow = true;
      }
      totalTouchTargetIssues += metrics.touchIssuesCount;
      totalClippingIssues += metrics.clippingCount;
      totalAccessibleNameIssues += metrics.accessibleNameCount;
      totalOverlapIssues += metrics.overlapCount;

      // Capture mobile typography at 390px (or 360px if 390 hasn't run)
      if (width === 390 || (width <= 390 && !mobileTypography)) {
        mobileTypography = {
          bodyFontSize: metrics.bodyFontSize,
          h1Size: metrics.h1Size,
          h2Size: metrics.h2Size,
          hierarchyOk: metrics.hierarchyOk,
        };
      }

      // Capture desktop typography at 1280px (or 1440px)
      if (width === 1280 || (width >= 1280 && !desktopTypography)) {
        desktopTypography = {
          bodyFontSize: metrics.bodyFontSize,
          h1Size: metrics.h1Size,
          h2Size: metrics.h2Size,
          hierarchyOk: metrics.hierarchyOk,
        };
      }

      viewportResults.push({
        viewport: width,
        pageUrl: targetUrl,
        status: "TESTED",
        horizontalOverflow: metrics.hasOverflow,
        overflowElements: metrics.overflowElements,
        touchTargetIssues: metrics.touchIssuesCount,
        touchTargetSelectors: metrics.touchTargetSelectors,
        clippingIssues: metrics.clippingCount,
        accessibleNameIssues: metrics.accessibleNameCount,
        screenshotAvailable: false,
        severity: metrics.hasOverflow ? "HIGH" : metrics.touchIssuesCount > 5 ? "MEDIUM" : "INFORMATIONAL",
        notes: metrics.hasOverflow
          ? `Horizontal overflow detected at ${width}px: scrollWidth ${metrics.scrollWidth}px exceeds clientWidth ${metrics.clientWidth}px.`
          : `Layout contained cleanly within ${width}px viewport bounds.`,
      });
    }

    // 5. Evaluate Visual Design & Heuristic UI Quality Metrics
    const visualDesignData = await evaluateVisualQuality(page, {
      mobileTypography,
      desktopTypography,
      totalTouchTargetIssues,
      totalAccessibleNameIssues,
      totalClippingIssues,
      totalOverlapIssues,
    });

    await browser.close();

    const responsiveStatus = anyOverflow
      ? "FAIL"
      : totalTouchTargetIssues > 8 || totalClippingIssues > 0
      ? "WARNING"
      : "PASS";

    return {
      isBrowserAvailable: true,
      runnerStatus: "SUCCESS",
      viewportResults,
      visualDesign: {
        ...visualDesignData,
        testedViewportWidths: testedWidths,
      },
      summary: {
        horizontalOverflowFound: anyOverflow,
        responsiveStatus,
        testedWidths,
        totalTouchTargetIssues,
        totalClippingIssues,
        totalContrastIssues: visualDesignData.colorContrast.contrastFailuresCount,
      },
    };
  } catch (err: any) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    return createSkippedResult(
      `Browser responsive execution halted: ${err?.message || "Execution timeout or Chromium initialization failure"}`,
      testedWidths
    );
  }
}

/**
 * Inspects color contrast heuristics, typography across viewports, broken images, and theme tokens.
 * Explicitly states that contrast checks are automated heuristics and not WCAG certification.
 */
async function evaluateVisualQuality(
  page: Page,
  measurements: {
    mobileTypography: { bodyFontSize: number; h1Size: number; h2Size: number; hierarchyOk: boolean } | null;
    desktopTypography: { bodyFontSize: number; h1Size: number; h2Size: number; hierarchyOk: boolean } | null;
    totalTouchTargetIssues: number;
    totalAccessibleNameIssues: number;
    totalClippingIssues: number;
    totalOverlapIssues: number;
  }
): Promise<Omit<VisualDesignDiagnostic, "testedViewportWidths">> {
  try {
    const pageHeuristics = await page.evaluate(() => {
      // Helper: parse rgb/rgba to [r, g, b]
      const parseRgb = (colorStr: string): [number, number, number] | null => {
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (match) {
          return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
        }
        return null;
      };

      // WCAG 2.1 relative luminance formula for automated heuristic
      const getLuminance = (r: number, g: number, b: number): number => {
        const a = [r, g, b].map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      };

      const getContrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
        const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
        const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      };

      // 1. Color Contrast Sampling
      let testedElementsCount = 0;
      let contrastFailuresCount = 0;
      const failingSelectors: string[] = [];
      let sampleRatioStr = "4.5:1";

      const textEls = document.querySelectorAll("p, h1, h2, h3, a, button, span");
      for (const el of textEls) {
        if (testedElementsCount >= 25) break;
        const text = (el.textContent || "").trim();
        if (text.length < 4) continue;

        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          continue;
        }

        const textColor = parseRgb(style.color);
        let bgColor = parseRgb(style.backgroundColor);

        // If background is transparent, look up parent
        let parent = el.parentElement;
        while (!bgColor && parent && parent !== document.documentElement) {
          const pStyle = window.getComputedStyle(parent);
          if (pStyle.backgroundColor && pStyle.backgroundColor !== "rgba(0, 0, 0, 0)" && pStyle.backgroundColor !== "transparent") {
            bgColor = parseRgb(pStyle.backgroundColor);
            break;
          }
          parent = parent.parentElement;
        }

        if (!bgColor) {
          bgColor = [255, 255, 255]; // default white background
        }

        if (textColor && bgColor) {
          testedElementsCount++;
          const ratio = getContrastRatio(textColor, bgColor);
          const fontSize = parseFloat(style.fontSize) || 16;
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && (style.fontWeight === "bold" || parseInt(style.fontWeight, 10) >= 700));
          const requiredRatio = isLargeText ? 3.0 : 4.5;

          if (ratio < requiredRatio) {
            contrastFailuresCount++;
            if (failingSelectors.length < 3) {
              const tag = el.tagName.toLowerCase();
              failingSelectors.push(`${tag}("${text.slice(0, 15)}...") [ratio ${ratio.toFixed(1)}:1 < ${requiredRatio}:1]`);
            }
          }
          sampleRatioStr = `${ratio.toFixed(1)}:1`;
        }
      }

      // 2. Layout, Clipping & Broken Images
      let brokenImagesCount = 0;
      const brokenImageUrls: string[] = [];
      const images = document.querySelectorAll("img");
      for (const img of images) {
        if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith("data:")) {
          brokenImagesCount++;
          if (brokenImageUrls.length < 3) {
            brokenImageUrls.push(img.src);
          }
        }
      }

      // 3. Theme & Dark Mode: distinguish site support from browser engine media query support
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      const themeColor = themeMeta ? themeMeta.getAttribute("content") : null;
      const htmlClasses = document.documentElement.className || "";
      const bodyClasses = document.body ? document.body.className || "" : "";

      let siteHasDarkMediaRules = false;
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules || [])) {
              if (rule.type === CSSRule.MEDIA_RULE) {
                const mediaText = (rule as CSSMediaRule).media.mediaText.toLowerCase();
                if (mediaText.includes("prefers-color-scheme") && mediaText.includes("dark")) {
                  siteHasDarkMediaRules = true;
                  break;
                }
              }
            }
          } catch {
            // cross-origin stylesheet security barrier
          }
          if (siteHasDarkMediaRules) break;
        }
      } catch {}

      const hasDarkClasses =
        htmlClasses.toLowerCase().includes("dark") ||
        bodyClasses.toLowerCase().includes("dark") ||
        document.documentElement.getAttribute("data-theme")?.toLowerCase() === "dark";

      // Site dark mode requires actual site tokens or CSS media query rules, not just browser engine capability
      const siteSupportsDarkMode = Boolean(themeColor || hasDarkClasses || siteHasDarkMediaRules);
      const prefersColorSchemeObserved = Boolean(themeColor || siteHasDarkMediaRules);

      return {
        colorContrast: {
          testedElementsCount,
          contrastFailuresCount,
          sampleRatio: sampleRatioStr,
          failingSelectors,
        },
        brokenImagesCount,
        brokenImageUrls,
        themeColor,
        siteSupportsDarkMode,
        prefersColorSchemeObserved,
      };
    });

    const mob = measurements.mobileTypography || { bodyFontSize: 16, h1Size: 28, h2Size: 22, hierarchyOk: true };
    const desk = measurements.desktopTypography || { bodyFontSize: 16, h1Size: 32, h2Size: 24, hierarchyOk: true };

    const typographyOk = mob.bodyFontSize >= 14 && desk.bodyFontSize >= 14 && mob.hierarchyOk && desk.hierarchyOk;

    const layoutIssuesTotal =
      measurements.totalClippingIssues +
      pageHeuristics.brokenImagesCount +
      measurements.totalOverlapIssues;

    const controlIssuesTotal =
      measurements.totalTouchTargetIssues +
      measurements.totalAccessibleNameIssues;

    return {
      status: "TESTED" as const,
      colorContrast: {
        status: pageHeuristics.colorContrast.contrastFailuresCount === 0 ? ("PASS" as const) : ("WARNING" as const),
        testedElementsCount: pageHeuristics.colorContrast.testedElementsCount,
        contrastFailuresCount: pageHeuristics.colorContrast.contrastFailuresCount,
        sampleRatio: pageHeuristics.colorContrast.sampleRatio,
        failingSelectors: pageHeuristics.colorContrast.failingSelectors,
      },
      typography: {
        status: typographyOk ? ("PASS" as const) : ("WARNING" as const),
        bodyFontSizeMobilePx: mob.bodyFontSize,
        bodyFontSizeDesktopPx: desk.bodyFontSize,
        headingHierarchyMaintained: mob.hierarchyOk && desk.hierarchyOk,
        notes: `Mobile body font: ${mob.bodyFontSize}px, Desktop body font: ${desk.bodyFontSize}px. Hierarchy: ${mob.hierarchyOk && desk.hierarchyOk ? "Maintained" : "Inconsistent"}.`,
      },
      layoutAndSpacing: {
        status: layoutIssuesTotal === 0 ? ("PASS" as const) : ("WARNING" as const),
        unintendedOverlapCount: measurements.totalOverlapIssues,
        clippingCount: measurements.totalClippingIssues,
        brokenImagesCount: pageHeuristics.brokenImagesCount,
        brokenImageUrls: pageHeuristics.brokenImageUrls,
      },
      controlsAndConsistency: {
        status: controlIssuesTotal <= 8 ? ("PASS" as const) : ("WARNING" as const),
        touchTargetDefectsCount: measurements.totalTouchTargetIssues,
        accessibleNameDefectsCount: measurements.totalAccessibleNameIssues,
        defectiveSelectors: [],
      },
      themeAdaptability: {
        themeColorMeta: pageHeuristics.themeColor,
        supportsDarkMode: pageHeuristics.siteSupportsDarkMode,
        prefersColorSchemeObserved: pageHeuristics.prefersColorSchemeObserved,
        observableThemeVariant: pageHeuristics.siteSupportsDarkMode ? "Adaptive / Dark Mode Capable" : "Light Default",
      },
      limitations: "Automated visual heuristic measurement; contrast checks are heuristics and do not constitute official WCAG certification.",
    };
  } catch {
    return {
      status: "SKIPPED",
      colorContrast: { status: "NOT_TESTED", testedElementsCount: 0, contrastFailuresCount: 0, failingSelectors: [] },
      typography: { status: "NOT_TESTED", headingHierarchyMaintained: true },
      layoutAndSpacing: { status: "NOT_TESTED", unintendedOverlapCount: 0, clippingCount: 0, brokenImagesCount: 0, brokenImageUrls: [] },
      controlsAndConsistency: { status: "NOT_TESTED", touchTargetDefectsCount: 0, accessibleNameDefectsCount: 0, defectiveSelectors: [] },
      themeAdaptability: { supportsDarkMode: false, prefersColorSchemeObserved: false },
      limitations: "Visual inspection skipped due to evaluation error.",
    };
  }
}

function createSkippedResult(reason: string, testedWidths: number[]): ResponsiveRunnerResult {
  return {
    isBrowserAvailable: false,
    runnerStatus: "SKIPPED",
    failureReason: reason,
    viewportResults: testedWidths.map((w) => ({
      viewport: w,
      pageUrl: "",
      status: "NOT_TESTED",
      horizontalOverflow: false,
      overflowElements: [],
      touchTargetIssues: 0,
      touchTargetSelectors: [],
      clippingIssues: 0,
      accessibleNameIssues: 0,
      screenshotAvailable: false,
      severity: "INFORMATIONAL",
      notes: "Browser viewport execution was not conducted in this run.",
    })),
    visualDesign: {
      status: "NOT_TESTED",
      colorContrast: { status: "NOT_TESTED", testedElementsCount: 0, contrastFailuresCount: 0, failingSelectors: [] },
      typography: { status: "NOT_TESTED", headingHierarchyMaintained: true },
      layoutAndSpacing: { status: "NOT_TESTED", unintendedOverlapCount: 0, clippingCount: 0, brokenImagesCount: 0, brokenImageUrls: [] },
      controlsAndConsistency: { status: "NOT_TESTED", touchTargetDefectsCount: 0, accessibleNameDefectsCount: 0, defectiveSelectors: [] },
      themeAdaptability: { supportsDarkMode: false, prefersColorSchemeObserved: false },
      testedViewportWidths: [],
      limitations: "Visual quality assessment requires active browser execution.",
    },
    summary: {
      horizontalOverflowFound: null,
      responsiveStatus: "NOT_TESTED",
      testedWidths: [],
      totalTouchTargetIssues: 0,
      totalClippingIssues: 0,
      totalContrastIssues: 0,
    },
  };
}
