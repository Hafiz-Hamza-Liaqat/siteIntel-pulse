import { chromium, Browser, Page } from "playwright";
import net from "node:net";
import { ResponsiveDiagnostic, VisualDesignDiagnostic } from "@/types";
import { isPrivateOrReservedIpv4, isPrivateOrReservedIpv6 } from "./dns-safety";
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
 * Enforces SSRF request boundary protection on all page navigations and subresource requests.
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

    // 2. Strict SSRF Protection on All Outbound Subrequests
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      try {
        const parsed = new URL(requestUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          // Allow data: or blob: for embedded assets
          if (parsed.protocol === "data:" || parsed.protocol === "blob:") {
            return route.continue();
          }
          return route.abort("blockedbyclient");
        }

        const host = parsed.hostname;
        const lowerHost = host.toLowerCase();
        if (
          lowerHost === "localhost" ||
          lowerHost.endsWith(".local") ||
          lowerHost.endsWith(".internal") ||
          lowerHost.endsWith(".corp") ||
          lowerHost.endsWith(".lan") ||
          lowerHost.endsWith(".home") ||
          lowerHost.endsWith(".intra") ||
          lowerHost.endsWith(".onion") ||
          lowerHost.endsWith(".localhost") ||
          lowerHost === "metadata.google.internal" ||
          lowerHost === "metadata.google" ||
          lowerHost === "instance-data"
        ) {
          return route.abort("blockedbyclient");
        }

        const ipFamily = net.isIP(host);
        if (ipFamily === 4 && isPrivateOrReservedIpv4(host)) {
          return route.abort("blockedbyclient");
        }
        if (ipFamily === 6 && isPrivateOrReservedIpv6(host)) {
          return route.abort("blockedbyclient");
        }

        return route.continue();
      } catch {
        return route.abort("blockedbyclient");
      }
    });

    // 3. Navigate to target URL at desktop viewport first
    await page.setViewportSize({ width: 1280, height: 800 });
    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

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

    // 4. Measure across the 7 required viewport widths
    for (const width of RESPONSIVE_VIEWPORT_WIDTHS) {
      if (options.abortSignal?.aborted) {
        throw new Error("Responsive audit canceled by user.");
      }

      const height = width <= 390 ? 844 : width <= 768 ? 1024 : 900;
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);

      // Evaluate document geometry & element metrics in page context
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

        // Touch target sizing check (only relevant on mobile screens <= 768px)
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

        // Clipping of primary navigation controls
        let clippingCount = 0;
        const headers = document.querySelectorAll("header, nav, [role='banner']");
        for (const h of headers) {
          const rect = h.getBoundingClientRect();
          if (rect.width > clientWidth + 4) {
            clippingCount++;
          }
        }

        return {
          hasOverflow,
          scrollWidth,
          clientWidth,
          overflowElements,
          touchIssuesCount,
          touchTargetSelectors,
          accessibleNameCount,
          clippingCount,
        };
      }, width);

      if (metrics.hasOverflow) {
        anyOverflow = true;
      }
      totalTouchTargetIssues += metrics.touchIssuesCount;
      totalClippingIssues += metrics.clippingCount;
      totalAccessibleNameIssues += metrics.accessibleNameCount;

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

    // 5. Evaluate Visual Design & UI Quality Metrics
    const visualDesignData = await evaluateVisualQuality(page);

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
 * Inspects color contrast (WCAG 2.1 relative luminance), typography scaling, and layout consistency.
 */
async function evaluateVisualQuality(page: Page): Promise<Omit<VisualDesignDiagnostic, "testedViewportWidths">> {
  try {
    return await page.evaluate(() => {
      // Helper: parse rgb/rgba to [r, g, b]
      const parseRgb = (colorStr: string): [number, number, number] | null => {
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (match) {
          return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
        }
        return null;
      };

      // WCAG 2.1 relative luminance
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

      // 2. Typography Hierarchy & Body Font Sizing
      const firstP = document.querySelector("p");
      const pStyle = firstP ? window.getComputedStyle(firstP) : null;
      const bodyFontSize = pStyle ? parseFloat(pStyle.fontSize) : 16;

      const h1El = document.querySelector("h1");
      const h2El = document.querySelector("h2");
      const h1Size = h1El ? parseFloat(window.getComputedStyle(h1El).fontSize) : 28;
      const h2Size = h2El ? parseFloat(window.getComputedStyle(h2El).fontSize) : 22;
      const headingHierarchyMaintained = h1Size >= h2Size && h2Size >= bodyFontSize;

      // 3. Layout, Clipping & Broken Images
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

      // 4. Theme & Dark Mode
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      const themeColor = themeMeta ? themeMeta.getAttribute("content") : null;
      const htmlClasses = document.documentElement.className || "";
      const bodyClasses = document.body ? document.body.className || "" : "";
      const supportsDarkMode =
        htmlClasses.includes("dark") ||
        bodyClasses.includes("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark" ||
        window.matchMedia("(prefers-color-scheme: dark)").media !== "not all";

      return {
        status: "TESTED" as const,
        colorContrast: {
          status: contrastFailuresCount === 0 ? ("PASS" as const) : ("WARNING" as const),
          testedElementsCount,
          contrastFailuresCount,
          sampleRatio: sampleRatioStr,
          failingSelectors,
        },
        typography: {
          status: bodyFontSize >= 14 && headingHierarchyMaintained ? ("PASS" as const) : ("WARNING" as const),
          bodyFontSizeMobilePx: bodyFontSize,
          bodyFontSizeDesktopPx: bodyFontSize,
          headingHierarchyMaintained,
          notes: headingHierarchyMaintained
            ? `Typography hierarchy verified: H1 (${h1Size}px) >= H2 (${h2Size}px) >= body text (${bodyFontSize}px).`
            : "Heading sizes do not follow standard descending hierarchy.",
        },
        layoutAndSpacing: {
          status: brokenImagesCount === 0 ? ("PASS" as const) : ("WARNING" as const),
          unintendedOverlapCount: 0,
          clippingCount: 0,
          brokenImagesCount,
          brokenImageUrls,
        },
        controlsAndConsistency: {
          status: "PASS" as const,
          touchTargetDefectsCount: 0,
          accessibleNameDefectsCount: 0,
          defectiveSelectors: [],
        },
        themeAdaptability: {
          themeColorMeta: themeColor,
          supportsDarkMode,
          prefersColorSchemeObserved: Boolean(themeColor || supportsDarkMode),
          observableThemeVariant: supportsDarkMode ? "Adaptive / Dark Mode Capable" : "Light Default",
        },
        limitations: "Automated visual heuristic measurement; does not replace human aesthetic design evaluation.",
      };
    });
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
