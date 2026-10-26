import { AssessmentResult, DimensionScorecard, DiagnosticDimensionId, Confidence } from "@/types";

interface DimensionRuleMap {
  id: DiagnosticDimensionId;
  name: string;
  description: string;
  ruleIds: string[];
}

export const DIAGNOSTIC_DIMENSIONS: DimensionRuleMap[] = [
  {
    id: "design_ux",
    name: "Design & UX",
    description: "Evaluates layout balance, typography hierarchy, visual consistency, interactive touch target sizing, and observable conversion ergonomics.",
    ruleIds: ["RESP-01", "RESP-02", "RESP-03", "RESP-04", "RESP-05", "RESP-06", "CONV-01", "CONV-02"],
  },
  {
    id: "development_health",
    name: "Development & Engineering Health",
    description: "Inspects markup validity, document structure, console hygiene, transport encryption, HTTP security headers, and authentication security.",
    ruleIds: [
      "TECH-01", "TECH-02", "TECH-03", "TECH-04", "TECH-05", "TECH-06", "TECH-07",
      "SEC-01", "SEC-02", "SEC-03", "SEC-04", "SEC-05",
      "AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04",
    ],
  },
  {
    id: "responsive_accessibility",
    name: "Responsiveness & Accessibility",
    description: "Tests viewport adaptiveness across mobile, tablet, and desktop breakpoints alongside fundamental image alt text and semantic landmarks.",
    ruleIds: ["RESP-01", "RESP-02", "RESP-03", "RESP-04", "RESP-05", "RESP-06", "SEO-05"],
  },
  {
    id: "performance_speed",
    name: "Performance & Speed",
    description: "Measures render-blocking resources, payload efficiency, server latency, and lab/field Core Web Vitals delivery speed.",
    ruleIds: ["PERF-01", "PERF-02", "PERF-03", "PERF-04", "PERF-05", "TECH-02"],
  },
  {
    id: "seo",
    name: "SEO (Search Engine Optimization)",
    description: "Covers metadata hygiene, canonical consistency, robots crawlability, XML sitemaps, internal link integrity, and structured schema markup.",
    ruleIds: ["SEO-01", "SEO-02", "SEO-03", "SEO-04", "SEO-05", "SEO-06", "SEO-07", "SEO-08", "TECH-05"],
  },
  {
    id: "geo",
    name: "GEO (Generative Engine Optimization)",
    description: "Analyzes AI crawler crawl access policies, rich schema grounding, knowledge graph presence, and platform transparency for generative discovery.",
    ruleIds: ["AI-01", "AI-02", "AI-03", "SEO-07", "CONT-01"],
  },
  {
    id: "aeo",
    name: "AEO (Answer Engine Optimization)",
    description: "Assesses direct question answering capability, FAQ schema readiness, conversational intent alignment, and concise answer formulations.",
    ruleIds: ["AI-03", "AI-02", "CONT-01", "SEO-01", "SEO-04"],
  },
  {
    id: "content_trust",
    name: "Content Quality & Trust",
    description: "Reviews business purpose clarity, value proposition articulation, freshness, depth, contact credibility, and legal transparency signals.",
    ruleIds: ["CONT-01", "CONT-02", "CONT-03", "CONT-04", "CONT-05", "AI-04"],
  },
  {
    id: "marketing_monetization",
    name: "Marketing & Monetization",
    description: "Evaluates call-to-action discoverability, conversion funnels, analytics event tracking, marketing tag infrastructure, and social share previews.",
    ruleIds: ["CONV-01", "CONV-02", "CONV-03", "CONV-04", "CONV-05", "DATA-01", "DATA-02", "DATA-03", "DATA-04"],
  },
];

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
      const res = resultsByTestId.get(ruleId);
      const ruleMax = res ? res.maxPoints : 2;
      maxPossiblePoints += ruleMax;

      if (!res) {
        missingRules.push(`${ruleId} (unassessed)`);
        continue;
      }

      const isEvaluated =
        res.status === "PASS" ||
        res.status === "WARNING" ||
        res.status === "FAIL" ||
        res.status === "NOT_DETECTED";

      if (isEvaluated) {
        evaluatedCount += 1;
        evaluatedPoints += res.maxPoints;
        earnedPoints += res.earnedPoints;
      } else {
        missingRules.push(`${res.testId} (${res.status})`);
      }
    }

    const score = evaluatedPoints > 0 ? Math.round((earnedPoints / evaluatedPoints) * 100) : 0;
    const coveragePercentage =
      maxPossiblePoints > 0 ? Math.round((evaluatedPoints / maxPossiblePoints) * 100) : 0;

    let ratingBand = "Needs improvement";
    if (coveragePercentage < 50) {
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
    if (coveragePercentage < 60) {
      confidence = "LOW";
    } else if (coveragePercentage < 85) {
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
