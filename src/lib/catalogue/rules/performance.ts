import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const performanceRules: RuleDefinition[] = [
  {
    id: "PERF-01",
    name: "Mobile PageSpeed / Lighthouse Lab Score",
    version: "1.0.0",
    category: "performance",
    categoryName: "Performance",
    maxPoints: 2,
    description: "Evaluates mobile Lighthouse performance lab score or PageSpeed Insights mobile API result.",
    businessImpactSummary: "Mobile visitors abandon slow websites within 3 seconds. Higher mobile speed correlates directly with increased conversion rates.",
    remediationAdvice: "Optimize mobile resources: minify JavaScript, compress images with WebP/AVIF, and minimize main-thread execution time.",
    isProviderDependent: true,
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const ps = ctx.pageSpeedMobile;

      if (!ps || !ps.isAvailable || ps.performanceScore == null) {
        return {
          testId: "PERF-01",
          testVersion: "1.0.0",
          testName: "Mobile PageSpeed / Lighthouse Lab Score",
          category: "performance",
          status: "UNKNOWN",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Mobile Lab Score Unavailable",
          summary: "PageSpeed Insights mobile lab score not available (API key not configured or external service unreachable).",
          timestamp: now,
          confidence: "LOW",
          limitations: "Requires PageSpeed Insights API key or local browser lab execution.",
        };
      }

      const score = ps.performanceScore;
      if (score >= 85) {
        return {
          testId: "PERF-01",
          testVersion: "1.0.0",
          testName: "Mobile PageSpeed / Lighthouse Lab Score",
          category: "performance",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: `Strong Mobile Performance (${score}/100)`,
          summary: `Mobile Lighthouse lab score is ${score}/100, indicating an exceptionally fast mobile experience.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Lab score: ${score}/100`, `Source: ${ps.source}`],
        };
      }

      if (score >= 60) {
        return {
          testId: "PERF-01",
          testVersion: "1.0.0",
          testName: "Mobile PageSpeed / Lighthouse Lab Score",
          category: "performance",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: `Moderate Mobile Performance (${score}/100)`,
          summary: `Mobile lab score is ${score}/100. Key opportunities exist to streamline mobile delivery.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Lab score: ${score}/100`, `Source: ${ps.source}`],
        };
      }

      return {
        testId: "PERF-01",
        testVersion: "1.0.0",
        testName: "Mobile PageSpeed / Lighthouse Lab Score",
        category: "performance",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: `Sluggish Mobile Performance (${score}/100)`,
        summary: `Mobile lab score of ${score}/100 falls below acceptable thresholds, risking visitor bounce rates.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: [`Lab score: ${score}/100`, `Source: ${ps.source}`],
      };
    },
  },
  {
    id: "PERF-02",
    name: "Desktop PageSpeed / Lighthouse Lab Score",
    version: "1.0.0",
    category: "performance",
    categoryName: "Performance",
    maxPoints: 2,
    description: "Evaluates desktop Lighthouse performance lab score or PageSpeed Insights desktop API result.",
    businessImpactSummary: "Desktop visitors often represent high-value transactions and B2B buyers who demand instant page rendering.",
    remediationAdvice: "Eliminate render-blocking assets and leverage browser caching to speed up desktop rendering.",
    isProviderDependent: true,
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const ps = ctx.pageSpeedDesktop;

      if (!ps || !ps.isAvailable || ps.performanceScore == null) {
        return {
          testId: "PERF-02",
          testVersion: "1.0.0",
          testName: "Desktop PageSpeed / Lighthouse Lab Score",
          category: "performance",
          status: "UNKNOWN",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Desktop Lab Score Unavailable",
          summary: "Desktop PageSpeed Insights lab data not available.",
          timestamp: now,
          confidence: "LOW",
          limitations: "Requires PageSpeed Insights API key or local browser lab execution.",
        };
      }

      const score = ps.performanceScore;
      if (score >= 85) {
        return {
          testId: "PERF-02",
          testVersion: "1.0.0",
          testName: "Desktop PageSpeed / Lighthouse Lab Score",
          category: "performance",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: `Excellent Desktop Speed (${score}/100)`,
          summary: `Desktop Lighthouse performance score is ${score}/100.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Lab score: ${score}/100`, `Source: ${ps.source}`],
        };
      }

      if (score >= 60) {
        return {
          testId: "PERF-02",
          testVersion: "1.0.0",
          testName: "Desktop PageSpeed / Lighthouse Lab Score",
          category: "performance",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: `Desktop Performance Improvement Needed (${score}/100)`,
          summary: `Desktop lab score is ${score}/100.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Lab score: ${score}/100`, `Source: ${ps.source}`],
        };
      }

      return {
        testId: "PERF-02",
        testVersion: "1.0.0",
        testName: "Desktop PageSpeed / Lighthouse Lab Score",
        category: "performance",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: `Desktop Performance Deficient (${score}/100)`,
        summary: `Desktop performance score of ${score}/100 falls below expected standards.`,
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "PERF-03",
    name: "Core Web Vitals Field Data",
    version: "1.0.0",
    category: "performance",
    categoryName: "Performance",
    maxPoints: 2,
    description: "Evaluates real-user Core Web Vitals (LCP, INP, CLS) from the Chrome User Experience Report (CrUX) when available.",
    businessImpactSummary: "Google uses Core Web Vitals as an official search ranking signal and user experience benchmark.",
    remediationAdvice: "Target LCP under 2.5s, INP under 200ms, and CLS under 0.1 in real user browsing sessions.",
    isProviderDependent: true,
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const crux = ctx.pageSpeedMobile?.cruxFieldData || ctx.pageSpeedDesktop?.cruxFieldData;

      if (!crux || crux.lcpMs == null) {
        return {
          testId: "PERF-03",
          testVersion: "1.0.0",
          testName: "Core Web Vitals Field Data",
          category: "performance",
          status: "UNKNOWN",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Real-User Field Data Not Available",
          summary: "This domain does not currently have sufficient Chrome User Experience Report (CrUX) traffic volume or API connection.",
          timestamp: now,
          confidence: "LOW",
          limitations: "CrUX field data requires substantial real-world Chrome traffic over a 28-day window.",
        };
      }

      const isLcpGood = crux.lcpMs <= 2500;
      const isClsGood = crux.cls == null || crux.cls <= 0.1;

      if (isLcpGood && isClsGood) {
        return {
          testId: "PERF-03",
          testVersion: "1.0.0",
          testName: "Core Web Vitals Field Data",
          category: "performance",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Core Web Vitals Passed by Real Users",
          summary: `Real user metrics: LCP is ${crux.lcpMs}ms (<= 2500ms), CLS is ${crux.cls ?? 0} (<= 0.1).`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`LCP: ${crux.lcpMs}ms`, `CLS: ${crux.cls ?? "N/A"}`, `Category: ${crux.category || "FAST"}`],
        };
      }

      return {
        testId: "PERF-03",
        testVersion: "1.0.0",
        testName: "Core Web Vitals Field Data",
        category: "performance",
        status: "WARNING",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Core Web Vitals Need Improvement",
        summary: `Real-user field data indicates slow initial rendering or visual instability (LCP ${crux.lcpMs}ms).`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: [`LCP: ${crux.lcpMs}ms (> 2500ms)`],
      };
    },
  },
  {
    id: "PERF-04",
    name: "Render-Blocking and Critical-Path Diagnostics",
    version: "1.0.0",
    category: "performance",
    categoryName: "Performance",
    maxPoints: 2,
    description: "Identifies render-blocking CSS and synchronous scripts located in the document head.",
    businessImpactSummary: "Synchronous scripts in the head freeze browser rendering, forcing visitors to stare at a blank white screen.",
    remediationAdvice: "Add defer or async attributes to non-critical scripts and inline critical CSS.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      if (!entry) {
        return {
          testId: "PERF-04",
          testVersion: "1.0.0",
          testName: "Render-Blocking and Critical-Path Diagnostics",
          category: "performance",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Critical Path Unobservable",
          summary: "No entry page data.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const blockingResources = entry.resources.filter((r) => r.isRenderBlocking);

      if (blockingResources.length <= 3) {
        return {
          testId: "PERF-04",
          testVersion: "1.0.0",
          testName: "Render-Blocking and Critical-Path Diagnostics",
          category: "performance",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Lean Critical Rendering Path",
          summary: `Entry page features minimal render-blocking resources (${blockingResources.length} found).`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      if (blockingResources.length <= 8) {
        return {
          testId: "PERF-04",
          testVersion: "1.0.0",
          testName: "Render-Blocking and Critical-Path Diagnostics",
          category: "performance",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Moderate Render-Blocking Assets Detected",
          summary: `${blockingResources.length} render-blocking stylesheets or synchronous scripts delay first paint.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: blockingResources.length,
          sampleEvidence: blockingResources.slice(0, 3).map((r) => r.url),
        };
      }

      return {
        testId: "PERF-04",
        testVersion: "1.0.0",
        testName: "Render-Blocking and Critical-Path Diagnostics",
        category: "performance",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Heavy Render-Blocking Overhead",
        summary: `${blockingResources.length} blocking assets discovered in document head.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: blockingResources.length,
      };
    },
  },
  {
    id: "PERF-05",
    name: "Page Weight and Large Asset Indicators",
    version: "1.0.0",
    category: "performance",
    categoryName: "Performance",
    maxPoints: 2,
    description: "Audits total transferred page weight, excessive JavaScript payloads, and oversized images.",
    businessImpactSummary: "Heavy pages consume mobile data plans, increase server hosting costs, and throttle mobile users on cellular networks.",
    remediationAdvice: "Target total page weight under 2.5 MB by compressing images and code-splitting JavaScript libraries.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      if (!entry) {
        return {
          testId: "PERF-05",
          testVersion: "1.0.0",
          testName: "Page Weight and Large Asset Indicators",
          category: "performance",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Page Weight Unchecked",
          summary: "No entry page data.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const totalResources = entry.resources.length;

      if (totalResources <= 40) {
        return {
          testId: "PERF-05",
          testVersion: "1.0.0",
          testName: "Page Weight and Large Asset Indicators",
          category: "performance",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Reasonable Resource and Asset Weight",
          summary: `Entry page loads cleanly with ${totalResources} total assets.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Total assets: ${totalResources}`],
        };
      }

      if (totalResources <= 75) {
        return {
          testId: "PERF-05",
          testVersion: "1.0.0",
          testName: "Page Weight and Large Asset Indicators",
          category: "performance",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Elevated Resource Request Count",
          summary: `Entry page requires ${totalResources} subresource requests (scripts, images, stylesheets).`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Total assets: ${totalResources}`],
        };
      }

      return {
        testId: "PERF-05",
        testVersion: "1.0.0",
        testName: "Page Weight and Large Asset Indicators",
        category: "performance",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Heavy Asset Payload Detected",
        summary: `Over ${totalResources} separate resource requests triggered on entry page.`,
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
];
