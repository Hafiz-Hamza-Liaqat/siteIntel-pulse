import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const analyticsRules: RuleDefinition[] = [
  {
    id: "ANA-01",
    name: "GA4 Identifier / Script Load Signal",
    version: "1.0.0",
    category: "analytics_tracking",
    categoryName: "Analytics & Tracking Readiness",
    maxPoints: 1,
    description: "Detects Google Analytics 4 tracking scripts or measurement ID patterns (G-XXXXXXXXXX).",
    businessImpactSummary: "Without active web analytics, traffic trends, marketing return on ad spend (ROAS), and visitor demographics cannot be measured.",
    remediationAdvice: "Install Google Analytics 4 (GA4) with your unique measurement ID.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "ANA-01",
          testVersion: "1.0.0",
          testName: "GA4 Identifier / Script Load Signal",
          category: "analytics_tracking",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "Analytics Unobservable",
          summary: "No page data available to evaluate GA4 script presence.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const hasGa4 = ctx.pages.some((p) =>
        (p.resources || []).some((r) => r.url.includes("googletagmanager.com/gtag/js") || r.url.includes("google-analytics.com"))
      );

      if (hasGa4) {
        return {
          testId: "ANA-01",
          testVersion: "1.0.0",
          testName: "GA4 Identifier / Script Load Signal",
          category: "analytics_tracking",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Google Analytics 4 Tag Detected",
          summary: "GA4 tracking script detected loading in page resources.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["GA4 / gtag.js detected"],
          limitations: "Detected tag confirms script presence, not that custom events or conversions are firing properly.",
        };
      }

      return {
        testId: "ANA-01",
        testVersion: "1.0.0",
        testName: "GA4 Identifier / Script Load Signal",
        category: "analytics_tracking",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 1,
        earnedPoints: 0.5,
        title: "GA4 Script Not Detected",
        summary: "No Google Analytics 4 script tag was detected in initial page resources.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "ANA-02",
    name: "Google Tag Manager Signal",
    version: "1.0.0",
    category: "analytics_tracking",
    categoryName: "Analytics & Tracking Readiness",
    maxPoints: 1,
    description: "Detects presence of Google Tag Manager (GTM) container loader (gtm.js).",
    businessImpactSummary: "Tag Manager simplifies deployment of marketing pixels without requiring code changes for every marketing campaign.",
    remediationAdvice: "Deploy Google Tag Manager to streamline event tracking and conversion attribution.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "ANA-02",
          testVersion: "1.0.0",
          testName: "Google Tag Manager Signal",
          category: "analytics_tracking",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "GTM Unobservable",
          summary: "No page data available to evaluate Tag Manager presence.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const hasGtm = ctx.pages.some((p) =>
        (p.resources || []).some((r) => r.url.includes("googletagmanager.com/gtm.js"))
      );

      if (hasGtm) {
        return {
          testId: "ANA-02",
          testVersion: "1.0.0",
          testName: "Google Tag Manager Signal",
          category: "analytics_tracking",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Google Tag Manager Container Active",
          summary: "GTM container script observed in page resources.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["googletagmanager.com/gtm.js container present"],
        };
      }

      return {
        testId: "ANA-02",
        testVersion: "1.0.0",
        testName: "Google Tag Manager Signal",
        category: "analytics_tracking",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 1,
        earnedPoints: 0.5,
        title: "Google Tag Manager Not In Use",
        summary: "No GTM container loader detected.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "ANA-03",
    name: "Advertising and Retargeting Pixels",
    version: "1.0.0",
    category: "analytics_tracking",
    categoryName: "Analytics & Tracking Readiness",
    maxPoints: 1,
    description: "Identifies presence of major advertising attribution scripts (Meta Pixel, Google Ads, LinkedIn Insight, TikTok).",
    businessImpactSummary: "Retargeting pixels enable re-engaging visitors who abandoned their shopping carts or inquiry forms.",
    remediationAdvice: "Implement conversion tracking pixels for your active advertising channels.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "ANA-03",
          testVersion: "1.0.0",
          testName: "Advertising and Retargeting Pixels",
          category: "analytics_tracking",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "Ad Pixels Unobservable",
          summary: "No page data available to evaluate advertising pixels.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const hasPixels = ctx.pages.some((p) =>
        (p.resources || []).some(
          (r) =>
            r.url.includes("connect.facebook.net") ||
            r.url.includes("googleadservices.com") ||
            r.url.includes("snap.licdn.com") ||
            r.url.includes("analytics.tiktok.com")
        )
      );

      if (hasPixels) {
        return {
          testId: "ANA-03",
          testVersion: "1.0.0",
          testName: "Advertising and Retargeting Pixels",
          category: "analytics_tracking",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Advertising Pixels Detected",
          summary: "Identified advertising and retargeting tracking scripts.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["Advertising pixel resources detected"],
        };
      }

      return {
        testId: "ANA-03",
        testVersion: "1.0.0",
        testName: "Advertising and Retargeting Pixels",
        category: "analytics_tracking",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 1,
        earnedPoints: 0.5,
        title: "No Ad Retargeting Pixels Observed",
        summary: "No paid advertising pixels (Meta, LinkedIn, Google Ads) detected.",
        timestamp: now,
        confidence: "MEDIUM",
        limitations: "Tag may be loaded dynamically via server-side container or user consent banner.",
      };
    },
  },
  {
    id: "ANA-04",
    name: "Consent UI and Tracking UX Signals",
    version: "1.0.0",
    category: "analytics_tracking",
    categoryName: "Analytics & Tracking Readiness",
    maxPoints: 1,
    description: "Detects cookie consent management UI (OneTrust, Cookiebot, Klaro, Termly) ensuring compliance with GDPR/CCPA.",
    businessImpactSummary: "Operating in the EU/UK or California without a compliant cookie consent banner risks steep regulatory fines.",
    remediationAdvice: "Deploy a Consent Management Platform (CMP) to collect verifiable consent before firing marketing cookies.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "ANA-04",
          testVersion: "1.0.0",
          testName: "Consent UI and Tracking UX Signals",
          category: "analytics_tracking",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "Consent UI Unobservable",
          summary: "No page data available to evaluate cookie consent mechanisms.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const hasConsent = ctx.pages.some((p) => {
        const text = (p.visibleTextSample || "").toLowerCase();
        const hasScript = (p.resources || []).some(
          (r) =>
            r.url.includes("onetrust") ||
            r.url.includes("cookiebot") ||
            r.url.includes("termly") ||
            r.url.includes("iubenda") ||
            r.url.includes("usercentrics")
        );
        return hasScript || text.includes("cookie preferences") || text.includes("accept all cookies") || text.includes("we use cookies");
      });

      if (hasConsent) {
        return {
          testId: "ANA-04",
          testVersion: "1.0.0",
          testName: "Consent UI and Tracking UX Signals",
          category: "analytics_tracking",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Cookie Consent Mechanism Observed",
          summary: "Identified cookie consent banner or consent management platform integration.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["Cookie consent management signal active"],
          limitations: "Observation of UI does not constitute a formal legal compliance audit under GDPR.",
        };
      }

      return {
        testId: "ANA-04",
        testVersion: "1.0.0",
        testName: "Consent UI and Tracking UX Signals",
        category: "analytics_tracking",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 1,
        earnedPoints: 0.5,
        title: "No Cookie Consent Management Banner Observed",
        summary: "Did not detect standard cookie consent management UI on scanned pages.",
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
  {
    id: "ANA-05",
    name: "Measurement Account Connection State",
    version: "1.0.0",
    category: "analytics_tracking",
    categoryName: "Analytics & Tracking Readiness",
    maxPoints: 1,
    description: "Evaluates whether owner-authorized GA4 or Google Search Console API account connection is active.",
    businessImpactSummary: "Connecting official analytics provides real user session counts, conversion funnel data, and exact organic keyword rankings.",
    remediationAdvice: "In Milestone 2, connect your Google Search Console and GA4 accounts for verified organic traffic reporting.",
    isProviderDependent: true,
    evaluate: (): AssessmentResult => {
      const now = new Date().toISOString();
      return {
        testId: "ANA-05",
        testVersion: "1.0.0",
        testName: "Measurement Account Connection State",
        category: "analytics_tracking",
        status: "UNKNOWN",
        severity: "INFORMATIONAL",
        maxPoints: 1,
        earnedPoints: 0,
        title: "Owner Measurement Account Not Connected",
        summary: "Authorized GA4 / Google Search Console account connection is not configured in this public scan.",
        timestamp: now,
        confidence: "HIGH",
        limitations: "Milestone 1 uses non-invasive public observations. Direct API account connection is available in Milestone 2.",
      };
    },
  },
];
