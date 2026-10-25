import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const competitorRules: RuleDefinition[] = [
  {
    id: "CMP-01",
    name: "Competitor and Market Definition",
    version: "1.0.0",
    category: "competitor_comparison",
    categoryName: "Competitive Comparison Readiness",
    maxPoints: 1,
    description: "Evaluates owner-supplied or discovered comparator domains in the relevant market and language context.",
    businessImpactSummary: "Benchmarking against top competitors reveals where your platform lags in technical speed, SEO, or customer trust.",
    remediationAdvice: "Supply 2–3 active competitors in your market category to benchmark relative platform strengths.",
    isContextDependent: true,
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const competitors = ctx.competitors || [];

      if (competitors.length > 0) {
        return {
          testId: "CMP-01",
          testVersion: "1.0.0",
          testName: "Competitor and Market Definition",
          category: "competitor_comparison",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Competitor Benchmarking Context Defined",
          summary: `Identified ${competitors.length} comparator domain(s): ${competitors.join(", ")}.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: competitors,
        };
      }

      return {
        testId: "CMP-01",
        testVersion: "1.0.0",
        testName: "Competitor and Market Definition",
        category: "competitor_comparison",
        status: "NOT_APPLICABLE",
        severity: "INFORMATIONAL",
        maxPoints: 1,
        earnedPoints: 0,
        title: "No Competitor Domains Supplied",
        summary: "No competitor domains were provided in the audit request. Excluded from applicable scoring.",
        timestamp: now,
        confidence: "HIGH",
        limitations: "Optional benchmark context was omitted at intake.",
      };
    },
  },
  {
    id: "CMP-02",
    name: "Comparable Public Health & SEO Measurement",
    version: "1.0.0",
    category: "competitor_comparison",
    categoryName: "Competitive Comparison Readiness",
    maxPoints: 1,
    description: "Applies identical rule versions, device settings, crawl budgets, and scan windows to comparator domains.",
    businessImpactSummary: "Comparing metrics measured under differing rules leads to false conclusions and misallocated budgets.",
    remediationAdvice: "Ensure competitor comparisons use uniform crawl bounds and device viewports.",
    isContextDependent: true,
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const competitors = ctx.competitors || [];

      if (competitors.length === 0) {
        return {
          testId: "CMP-02",
          testVersion: "1.0.0",
          testName: "Comparable Public Health & SEO Measurement",
          category: "competitor_comparison",
          status: "NOT_APPLICABLE",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 0,
          title: "Comparative Measurement Excluded (No Competitors)",
          summary: "No competitor domains were provided at intake. Comparative measurement excluded.",
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "CMP-02",
        testVersion: "1.0.0",
        testName: "Comparable Public Health & SEO Measurement",
        category: "competitor_comparison",
        status: "NOT_TESTED",
        severity: "INFORMATIONAL",
        maxPoints: 1,
        earnedPoints: 0,
        title: "Competitor Scans Not Executed",
        summary: "Comparator domains provided at intake require separate comparable crawls to measure relative metrics. Comparator scans were not executed in this single audit run.",
        timestamp: now,
        confidence: "HIGH",
        limitations: "Competitor comparative metrics remain NOT ASSESSED until dedicated comparative crawls are run.",
      };
    },
  },
  {
    id: "CMP-03",
    name: "External Market Metric Availability and Provenance",
    version: "1.0.0",
    category: "competitor_comparison",
    categoryName: "Competitive Comparison Readiness",
    maxPoints: 1,
    description: "Ensures external traffic, keyword, and backlink metrics carry explicit provenance, source, and estimated labels.",
    businessImpactSummary: "Unverifiable third-party estimates misinform growth strategies and create unrealistic expectations.",
    remediationAdvice: "Label all third-party competitive metrics with data source and measurement date.",
    isProviderDependent: true,
    evaluate: (): AssessmentResult => {
      const now = new Date().toISOString();
      return {
        testId: "CMP-03",
        testVersion: "1.0.0",
        testName: "External Market Metric Availability and Provenance",
        category: "competitor_comparison",
        status: "UNKNOWN",
        severity: "INFORMATIONAL",
        maxPoints: 1,
        earnedPoints: 0,
        title: "External Market Provider Data Not Connected",
        summary: "Third-party estimated traffic and backlink metrics are not connected in this public scan.",
        timestamp: now,
        confidence: "HIGH",
        limitations: "SiteIntel Pulse does not invent estimated search traffic, backlinks, or revenue metrics.",
      };
    },
  },
];
