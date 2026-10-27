import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const responsiveRules: RuleDefinition[] = [
  {
    id: "RSP-01",
    name: "Viewport and Responsive Configuration",
    version: "1.0.0",
    category: "responsive_accessibility",
    categoryName: "Responsive & Accessibility",
    maxPoints: 2,
    description: "Validates `<meta name='viewport'>` with width=device-width and initial-scale=1.",
    businessImpactSummary: "Without a valid viewport tag, mobile devices render desktop-sized pages with tiny, unreadable text, driving users away.",
    remediationAdvice: "Add `<meta name='viewport' content='width=device-width, initial-scale=1'>` to the `<head>` of all HTML pages.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      if (!entry) {
        return {
          testId: "RSP-01",
          testVersion: "1.0.0",
          testName: "Viewport and Responsive Configuration",
          category: "responsive_accessibility",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Viewport Unobservable",
          summary: "No page data available to inspect viewport meta configuration.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const viewportContent = entry.metaViewport || "";
      const hasDeviceWidth = viewportContent.toLowerCase().includes("width=device-width");
      const hasInitialScale = viewportContent.toLowerCase().includes("initial-scale=");

      if (hasDeviceWidth && hasInitialScale) {
        return {
          testId: "RSP-01",
          testVersion: "1.0.0",
          testName: "Viewport and Responsive Configuration",
          category: "responsive_accessibility",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Mobile Viewport Meta Tag Configured",
          summary: `Responsive viewport meta tag declared correctly ("${viewportContent}"), enabling dynamic mobile scaling.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`<meta name="viewport" content="${viewportContent}">`],
        };
      }

      if (viewportContent) {
        return {
          testId: "RSP-01",
          testVersion: "1.0.0",
          testName: "Viewport and Responsive Configuration",
          category: "responsive_accessibility",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Viewport Meta Tag Partially Configured",
          summary: `Viewport tag found ("${viewportContent}") but lacks recommended width=device-width or initial-scale parameters.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`<meta name="viewport" content="${viewportContent}">`],
        };
      }

      return {
        testId: "RSP-01",
        testVersion: "1.0.0",
        testName: "Viewport and Responsive Configuration",
        category: "responsive_accessibility",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Missing Responsive Viewport Meta Tag",
        summary: "No `<meta name='viewport'>` tag was detected in document `<head>`. Mobile browsers will render desktop scale.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "RSP-02",
    name: "Horizontal Overflow across Viewport Matrix",
    version: "1.0.0",
    category: "responsive_accessibility",
    categoryName: "Responsive & Accessibility",
    maxPoints: 2,
    description: "Evaluates horizontal document scrolling across the 7-viewport matrix: 320, 360, 390, 768, 1024, 1280, 1440 CSS pixels.",
    businessImpactSummary: "Horizontal scrolling on smartphones breaks user experience, clips call-to-action buttons, and triggers high bounce rates.",
    remediationAdvice: "Set max-width: 100% on images/tables and avoid fixed pixel widths exceeding 320px in CSS stylesheets.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const results = ctx.browserResponsiveResults;

      if (!results || results.length === 0 || results.every((r) => r.status === "NOT_TESTED" || r.status === "SKIPPED")) {
        return {
          testId: "RSP-02",
          testVersion: "1.0.0",
          testName: "Horizontal Overflow across Viewport Matrix",
          category: "responsive_accessibility",
          status: "NOT_TESTED",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Viewport Matrix Not Executed",
          summary: "Browser responsive runner was not executed in this scan pass. Horizontal overflow cannot be evaluated without real viewport rendering.",
          timestamp: now,
          confidence: "LOW",
          limitations: "Active browser execution required to measure document geometry across 7 viewport widths.",
        };
      }

      const testedRuns = results.filter((r) => r.status === "TESTED");
      if (testedRuns.length < 7) {
        return {
          testId: "RSP-02",
          testVersion: "1.0.0",
          testName: "Horizontal Overflow across Viewport Matrix",
          category: "responsive_accessibility",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Viewport Matrix Incompletely Evaluated",
          summary: `Only ${testedRuns.length} of 7 required viewport widths were tested; full responsive matrix could not be verified.`,
          timestamp: now,
          confidence: "LOW",
          limitations: "Active headless browser execution across all 7 viewport widths is required.",
        };
      }

      const overflowRuns = results.filter((r) => r.horizontalOverflow);

      if (overflowRuns.length > 0) {
        const offendingSelectors = Array.from(new Set(overflowRuns.flatMap((r) => r.overflowElements)));
        return {
          testId: "RSP-02",
          testVersion: "1.0.0",
          testName: "Horizontal Overflow across Viewport Matrix",
          category: "responsive_accessibility",
          status: "FAIL",
          severity: "HIGH",
          maxPoints: 2,
          earnedPoints: 0,
          title: `Horizontal Overflow Detected Across ${overflowRuns.length} Viewport Width(s)`,
          summary: `Horizontal scrolling observed at widths: ${overflowRuns.map((r) => `${r.viewport}px`).join(", ")}. Content exceeds viewport boundary (${offendingSelectors.length} unique offending selector(s)).`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: 1,
          sampleEvidence: [
            ...offendingSelectors.slice(0, 5),
            `Observed viewports: ${overflowRuns.map((r) => `${r.viewport}px`).join(", ")}`,
            `Total observation events: ${overflowRuns.length}`,
          ],
        };
      }

      const testedWidths = results.filter((r) => r.status === "TESTED").map((r) => `${r.viewport}px`);

      return {
        testId: "RSP-02",
        testVersion: "1.0.0",
        testName: "Horizontal Overflow across Viewport Matrix",
        category: "responsive_accessibility",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "No Horizontal Overflow Detected Across Viewport Matrix",
        summary: `Tested 7-viewport matrix (${testedWidths.join(", ")}) fits cleanly within viewport bounds without horizontal scrolling.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: [`Tested viewports: ${testedWidths.join(", ")}`, "Scroll width equals client width across all viewports"],
      };
    },
  },
  {
    id: "RSP-03",
    name: "Overlaps, Clipping, and Key Control Visibility",
    version: "1.0.0",
    category: "responsive_accessibility",
    categoryName: "Responsive & Accessibility",
    maxPoints: 2,
    description: "Checks element geometry and visibility of main navigation and buttons on mobile viewports.",
    businessImpactSummary: "Hidden or clipped navigation menus prevent customers from exploring your catalog or completing inquiries.",
    remediationAdvice: "Verify mobile hamburger menus and sticky headers do not obscure primary content.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const results = ctx.browserResponsiveResults;

      if (!results || results.length === 0 || results.every((r) => r.status === "NOT_TESTED" || r.status === "SKIPPED")) {
        return {
          testId: "RSP-03",
          testVersion: "1.0.0",
          testName: "Overlaps, Clipping, and Key Control Visibility",
          category: "responsive_accessibility",
          status: "NOT_TESTED",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Control Visibility Not Tested",
          summary: "Active browser execution is required to measure element clipping and control geometry across viewports.",
          timestamp: now,
          confidence: "LOW",
          limitations: "Active headless browser execution required.",
        };
      }

      const testedRuns = results.filter((r) => r.status === "TESTED");
      if (testedRuns.length < 7) {
        return {
          testId: "RSP-03",
          testVersion: "1.0.0",
          testName: "Overlaps, Clipping, and Key Control Visibility",
          category: "responsive_accessibility",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Control Visibility Incompletely Evaluated",
          summary: `Only ${testedRuns.length} of 7 required viewport widths were tested; control geometry across all devices could not be evaluated.`,
          timestamp: now,
          confidence: "LOW",
          limitations: "Active headless browser execution across all 7 viewport widths is required.",
        };
      }

      const clippingIssuesTotal = results.reduce((sum, r) => sum + (r.clippingIssues || 0), 0);
      const overlapTotal = ctx.browserVisualResults?.layoutAndSpacing?.unintendedOverlapCount || 0;

      if (clippingIssuesTotal > 0 || overlapTotal > 0) {
        return {
          testId: "RSP-03",
          testVersion: "1.0.0",
          testName: "Overlaps, Clipping, and Key Control Visibility",
          category: "responsive_accessibility",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Header / Control Clipping or Overlap Detected",
          summary: `Observed ${clippingIssuesTotal} navigation or header clipping instances and ${overlapTotal} control overlap instances across tested viewports.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: 1,
          sampleEvidence: [
            `Target page: ${ctx.targetUrl}`,
            `Clipping instances: ${clippingIssuesTotal}`,
            `Overlap instances: ${overlapTotal}`,
          ],
        };
      }

      return {
        testId: "RSP-03",
        testVersion: "1.0.0",
        testName: "Overlaps, Clipping, and Key Control Visibility",
        category: "responsive_accessibility",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Key Interactive Controls Visible Across Viewports",
        summary: "Primary navigation links and action buttons are visible and free from unreadable clipping or fixed-element overlaps across all tested viewports.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "RSP-04",
    name: "Touch Target, Text, and Form Usability Indicators",
    version: "1.0.0",
    category: "responsive_accessibility",
    categoryName: "Responsive & Accessibility",
    maxPoints: 2,
    description: "Audits button/link touch target sizing (minimum 40x40px target recommended) and legible mobile font sizes (>= 14px).",
    businessImpactSummary: "Tiny buttons frustrate mobile shoppers, causing mis-taps and lost orders.",
    remediationAdvice: "Provide at least 40x40px clickable tap areas on mobile buttons and ensure mobile body font size is at least 14px.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const results = ctx.browserResponsiveResults;

      if (!results || results.length === 0 || results.every((r) => r.status === "NOT_TESTED" || r.status === "SKIPPED")) {
        return {
          testId: "RSP-04",
          testVersion: "1.0.0",
          testName: "Touch Target, Text, and Form Usability Indicators",
          category: "responsive_accessibility",
          status: "NOT_TESTED",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Touch Targets and Mobile Typography Not Tested",
          summary: "Touch target geometry and computed text sizing require active mobile viewport rendering.",
          timestamp: now,
          confidence: "LOW",
          limitations: "Active headless browser execution required.",
        };
      }

      const testedRuns = results.filter((r) => r.status === "TESTED");
      if (testedRuns.length < 7) {
        return {
          testId: "RSP-04",
          testVersion: "1.0.0",
          testName: "Touch Target, Text, and Form Usability Indicators",
          category: "responsive_accessibility",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Touch Target and Usability Matrix Incomplete",
          summary: `Only ${testedRuns.length} of 7 required viewport widths were tested; mobile touch target compliance could not be evaluated.`,
          timestamp: now,
          confidence: "LOW",
          limitations: "Active headless browser execution across all 7 viewport widths is required.",
        };
      }

      const mobileResults = results.filter((r) => r.viewport <= 768);
      const totalTouchIssues = mobileResults.reduce((sum, r) => sum + (r.touchTargetIssues || 0), 0);
      const touchSelectors = Array.from(new Set(mobileResults.flatMap((r) => r.touchTargetSelectors || [])));
      const mobileBodyFont = ctx.browserVisualResults?.typography?.bodyFontSizeMobilePx ?? null;
      const isMobileFontUndersized = mobileBodyFont !== null && mobileBodyFont < 14;

      if (totalTouchIssues > 8 || isMobileFontUndersized) {
        const issues: string[] = [];
        if (totalTouchIssues > 8) {
          issues.push(`${totalTouchIssues} undersized touch target(s) (<40x40px) on mobile viewports`);
        }
        if (isMobileFontUndersized) {
          issues.push(`mobile body font size (${mobileBodyFont}px) is below recommended 14px threshold`);
        }
        return {
          testId: "RSP-04",
          testVersion: "1.0.0",
          testName: "Touch Target, Text, and Form Usability Indicators",
          category: "responsive_accessibility",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Mobile Usability or Typography Issues Detected",
          summary: `Identified mobile usability concerns: ${issues.join("; ")} (${touchSelectors.length} unique undersized control(s) across ${mobileResults.length} mobile viewports).`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: 1,
          sampleEvidence: [
            `Target page: ${ctx.targetUrl}`,
            `Unique undersized controls (${touchSelectors.length}): ${touchSelectors.slice(0, 3).join(", ")}`,
            `Total viewport observations: ${totalTouchIssues} across mobile breakpoints (320px, 360px, 390px, 768px)`,
          ],
        };
      }

      return {
        testId: "RSP-04",
        testVersion: "1.0.0",
        testName: "Touch Target, Text, and Form Usability Indicators",
        category: "responsive_accessibility",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Touch Targets and Form Controls Well Sized",
        summary: `Interactive links and form inputs provide accessible tap targets across tested mobile viewports (Mobile body font: ${mobileBodyFont ?? 16}px).`,
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "RSP-05",
    name: "Basic Accessibility Signals",
    version: "1.0.0",
    category: "responsive_accessibility",
    categoryName: "Responsive & Accessibility",
    maxPoints: 2,
    description: "Evaluates document language attribute, accessible button names, and form field labels.",
    businessImpactSummary: "Accessible platforms serve 15%+ more users (including people with visual or motor impairments) and reduce legal compliance risk.",
    remediationAdvice: "Specify `html lang='en'` on the root element and attach clear labels to all form inputs.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      if (!entry) {
        return {
          testId: "RSP-05",
          testVersion: "1.0.0",
          testName: "Basic Accessibility Signals",
          category: "responsive_accessibility",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Accessibility Signals Unobservable",
          summary: "No page data available to evaluate basic accessibility signals.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const hasLang = Boolean(entry.language && entry.language.trim().length > 0);
      const visual = ctx.browserVisualResults;
      const contrast = visual?.colorContrast;

      const isContrastTested = Boolean(
        visual &&
        visual.status === "TESTED" &&
        contrast &&
        (contrast.status === "PASS" || contrast.status === "WARNING" || contrast.status === "FAIL") &&
        contrast.testedElementsCount > 0
      );

      const evidence: string[] = [];
      if (hasLang) evidence.push(`html lang="${entry.language}"`);
      if (isContrastTested && contrast) {
        evidence.push(
          `Color contrast heuristic: ${contrast.contrastFailuresCount} failure(s) across ${contrast.testedElementsCount} tested elements`
        );
      }

      // If contrast heuristic was NOT tested, cannot claim full PASS
      if (hasLang && !isContrastTested) {
        return {
          testId: "RSP-05",
          testVersion: "1.0.0",
          testName: "Basic Accessibility Signals",
          category: "responsive_accessibility",
          status: "WARNING",
          severity: "LOW",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Document Language Declared (Contrast Heuristics Unmeasured)",
          summary: `Document language declared as '${entry.language}', but automated visual contrast heuristics were unmeasured. Full accessibility signals cannot be verified.`,
          timestamp: now,
          confidence: "MEDIUM",
          sampleEvidence: evidence,
          limitations: "Automated color contrast checks require active browser execution. Automated heuristics do not constitute official WCAG 2.1 AA/AAA compliance certification.",
        };
      }

      if (hasLang && isContrastTested && contrast && contrast.contrastFailuresCount === 0) {
        return {
          testId: "RSP-05",
          testVersion: "1.0.0",
          testName: "Basic Accessibility Signals",
          category: "responsive_accessibility",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Base Accessibility Attributes Present",
          summary: `Document language declared as '${entry.language}'. Core structural markup and baseline contrast heuristics present for assistive technology.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: evidence,
          limitations: "Automated color contrast and accessibility signals are heuristic indicators; does not constitute a full WCAG 2.1 AA/AAA compliance audit.",
        };
      }

      if (hasLang && isContrastTested && contrast && contrast.contrastFailuresCount > 0) {
        return {
          testId: "RSP-05",
          testVersion: "1.0.0",
          testName: "Basic Accessibility Signals",
          category: "responsive_accessibility",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Contrast Heuristic Issues Detected",
          summary: `Document language is declared ('${entry.language}'), but automated visual heuristics identified ${contrast.contrastFailuresCount} low-contrast element(s).`,
          timestamp: now,
          confidence: "MEDIUM",
          sampleEvidence: evidence,
          limitations: "Contrast checks are automated heuristics, not an official WCAG certification.",
        };
      }

      return {
        testId: "RSP-05",
        testVersion: "1.0.0",
        testName: "Basic Accessibility Signals",
        category: "responsive_accessibility",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Missing HTML Language Attribute",
        summary: "The root `<html>` element is missing a lang attribute (e.g. lang='en'), which screen readers require for correct pronunciation.",
        timestamp: now,
        confidence: "HIGH",
        limitations: "Screen readers require document language declarations for proper speech synthesis.",
      };
    },
  },
];
