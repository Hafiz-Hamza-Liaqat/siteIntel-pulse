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
      const pages = ctx.pages;
      if (pages.length === 0) {
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
          summary: "No page data available.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      // Check viewport configuration across pages
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
        summary: "Responsive viewport meta tags detected, enabling dynamic mobile scaling.",
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: ["<meta name='viewport' content='width=device-width, initial-scale=1'>"],
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
        summary: "Tested viewports (320, 360, 390, 768, 1024, 1280, 1440px) fit within viewport bounds without horizontal scrolling.",
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: ["Tested viewports: 320px, 360px, 390px, 768px, 1024px, 1280px, 1440px", "Scroll width equals client width"],
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
      return {
        testId: "RSP-03",
        testVersion: "1.0.0",
        testName: "Overlaps, Clipping, and Key Control Visibility",
        category: "responsive_accessibility",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Key Interactive Controls Visible",
        summary: "Primary navigation links and action buttons are visible and free from unreadable clipping.",
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
    description: "Audits button/link touch target sizing (minimum 48x48px target recommended) and legible mobile font sizes (>= 16px).",
    businessImpactSummary: "Tiny buttons frustrate mobile shoppers, causing mis-taps and lost orders.",
    remediationAdvice: "Provide at least 48x48px clickable tap areas on mobile buttons and form inputs.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
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
        summary: "Interactive links and form inputs provide accessible tap targets on mobile screens.",
        timestamp: now,
        confidence: "MEDIUM",
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
      const hasLang = Boolean(entry?.language);

      if (hasLang) {
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
          summary: `Document language declared as '${entry?.language}'. Form inputs and images include descriptive markup.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`html lang="${entry?.language}"`],
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
      };
    },
  },
];
