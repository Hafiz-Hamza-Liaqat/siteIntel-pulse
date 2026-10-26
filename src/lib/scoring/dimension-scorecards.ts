import { AssessmentResult, DimensionScorecard, DiagnosticDimensionId, Confidence } from "@/types";
import { ALL_ASSESSMENT_RULES } from "@/lib/catalogue/registry";

export interface DimensionRuleMap {
  id: DiagnosticDimensionId;
  name: string;
  description: string;
  ruleIds: string[];
}

export const REGISTERED_RULES_MAP = new Map(ALL_ASSESSMENT_RULES.map((r) => [r.id, r]));

export const DIAGNOSTIC_DIMENSIONS: DimensionRuleMap[] = [
  {
    id: "design_ux",
    name: "Design & UX",
    description: "Evaluates layout adaptiveness, horizontal containment, visual controls, touch targets, and observable conversion ergonomics.",
    ruleIds: ["RSP-01", "RSP-02", "RSP-03", "RSP-04", "RSP-05", "CRO-01", "CRO-02", "CRO-03"],
  },
  {
    id: "development_health",
    name: "Development & Engineering Health",
    description: "Inspects markup availability, redirect consistency, internal link integrity, transport encryption, HTTP security headers, and authentication posture.",
    ruleIds: [
      "TCH-01", "TCH-02", "TCH-03", "TCH-04", "TCH-05", "TCH-06",
      "SEC-01", "SEC-02", "SEC-03", "SEC-04", "SEC-05", "SEC-06",
      "AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04",
    ],
  },
  {
    id: "responsive_accessibility",
    name: "Responsiveness & Accessibility",
    description: "Tests viewport adaptiveness across mobile, tablet, and desktop breakpoints alongside fundamental image alt text and semantic accessibility landmarks.",
    ruleIds: ["RSP-01", "RSP-02", "RSP-03", "RSP-04", "RSP-05", "SEO-06"],
  },
  {
    id: "performance_speed",
    name: "Performance & Speed",
    description: "Measures render-blocking resources, payload efficiency, server latency, and lab/field Core Web Vitals delivery speed.",
    ruleIds: ["PERF-01", "PERF-02", "PERF-03", "PERF-04", "PERF-05", "TCH-06"],
  },
  {
    id: "seo",
    name: "SEO (Search Engine Optimization)",
    description: "Covers title tags, meta descriptions, headings, canonical consistency, robots crawlability, XML sitemaps, link hygiene, and structured schema markup.",
    ruleIds: ["SEO-01", "SEO-02", "SEO-03", "SEO-04", "SEO-05", "SEO-06", "SEO-07", "SEO-08", "SEO-09", "TCH-05"],
  },
  {
    id: "geo",
    name: "GEO (Generative Engine Optimization)",
    description: "Analyzes AI crawler access policies, rich schema grounding, knowledge graph presence, and platform transparency for generative discovery.",
    ruleIds: ["AI-01", "AI-02", "AI-03", "SEO-08", "CNT-01"],
  },
  {
    id: "aeo",
    name: "AEO (Answer Engine Optimization)",
    description: "Assesses direct question answering capability, FAQ schema readiness, conversational intent alignment, and clear answer formulations.",
    ruleIds: ["AI-03", "AI-04", "CNT-01", "CNT-02", "SEO-01", "SEO-03"],
  },
  {
    id: "content_trust",
    name: "Content Quality & Trust",
    description: "Reviews business purpose clarity, content structure, trust ownership signals, resource content opportunities, and policy transparency.",
    ruleIds: ["CNT-01", "CNT-02", "CNT-03", "CNT-04", "CNT-05", "CRO-04"],
  },
  {
    id: "marketing_monetization",
    name: "Marketing & Monetization",
    description: "Evaluates call-to-action discoverability, conversion pathways, analytics event infrastructure, tag management, and tracking consent signals.",
    ruleIds: ["CRO-01", "CRO-02", "CRO-03", "CRO-04", "ANA-01", "ANA-02", "ANA-03", "ANA-04", "ANA-05"],
  },
];

// Validate all dimension mappings against live catalogue at initialization time
for (const dim of DIAGNOSTIC_DIMENSIONS) {
  for (const ruleId of dim.ruleIds) {
    if (!REGISTERED_RULES_MAP.has(ruleId)) {
      throw new Error(
        `Diagnostic dimension '${dim.id}' (${dim.name}) references unregistered rule ID '${ruleId}' in catalogue registry.`
      );
    }
  }
}

export function computeDimensionScorecards(
  results: AssessmentResult[],
  assessedUrlsCount: number = 1
): DimensionScorecard[] {
  const resultsByTestId = new Map<string, AssessmentResult>();
  for (const r of results) {
    resultsByTestId.set(r.testId, r);
  }

  return DIAGNOSTIC_DIMENSIONS.map((dim) => {
    let maxPossiblePoints = 0;
    let evaluatedPoints = 0;
    let earnedPoints = 0;
    let evaluatedCount = 0;
    const missingRules: string[] = [];

    for (const ruleId of dim.ruleIds) {
      const ruleDef = REGISTERED_RULES_MAP.get(ruleId);
      if (!ruleDef) {
        throw new Error(
          `Diagnostic dimension '${dim.id}' references unregistered rule ID '${ruleId}'.`
        );
      }
      const ruleMax = ruleDef.maxPoints;
      maxPossiblePoints += ruleMax;

      const res = resultsByTestId.get(ruleId);
      if (!res) {
        missingRules.push(`${ruleId} (unassessed)`);
        continue;
      }

      const isEvaluated =
        res.status === "PASS" ||
        res.status === "WARNING" ||
        res.status === "FAIL" ||
        res.status === "UNKNOWN" ||
        res.status === "NOT_DETECTED";

      if (isEvaluated) {
        evaluatedCount += 1;
        evaluatedPoints += ruleMax;
        earnedPoints += Math.min(res.earnedPoints, ruleMax);
      } else if (res.status === "NOT_TESTED") {
        missingRules.push(`${ruleId} (not tested)`);
      } else if (res.status === "BLOCKED") {
        missingRules.push(`${ruleId} (blocked)`);
      } else if (res.status === "NOT_APPLICABLE") {
        // Explicitly accounted as not applicable for this business model
        missingRules.push(`${ruleId} (not applicable)`);
      }
    }

    const coveragePercentage =
      maxPossiblePoints > 0 ? Math.round((evaluatedPoints / maxPossiblePoints) * 100) : 0;
    const score = evaluatedPoints > 0 ? Math.round((earnedPoints / evaluatedPoints) * 100) : 0;

    let ratingBand: string;
    if (coveragePercentage === 0) {
      ratingBand = "Unassessed";
    } else if (coveragePercentage < 50) {
      ratingBand = "Provisional / Incomplete";
    } else if (score >= 85) {
      ratingBand = "Strong observed baseline";
    } else if (score >= 70) {
      ratingBand = "Generally healthy";
    } else if (score >= 50) {
      ratingBand = "Needs improvement";
    } else {
      ratingBand = "Critical gaps";
    }

    let confidence: Confidence = "HIGH";
    if (coveragePercentage < 50) {
      confidence = "LOW";
    } else if (coveragePercentage < 80) {
      confidence = "MEDIUM";
    }

    const missingEvidenceNotes =
      missingRules.length > 0
        ? `Missing/unassessed signals: ${missingRules.slice(0, 3).join(", ")}${
            missingRules.length > 3 ? ` (+${missingRules.length - 3} more)` : ""
          }`
        : undefined;

    return {
      id: dim.id,
      name: dim.name,
      description: dim.description,
      score,
      ratingBand,
      coveragePercentage,
      confidence,
      evaluatedTestsCount: evaluatedCount,
      totalTestsCount: dim.ruleIds.length,
      urlsAssessedCount: assessedUrlsCount,
      missingEvidenceNotes,
      isNonAdditiveView: true,
    };
  });
}
