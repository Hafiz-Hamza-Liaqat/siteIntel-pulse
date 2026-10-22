import { RuleDefinition, RuleEvaluationContext } from "./types";
import { AssessmentCategory, AssessmentResult } from "@/types";
import { technicalHealthRules } from "./rules/technical-health";
import { seoRules } from "./rules/seo";
import { performanceRules } from "./rules/performance";
import { responsiveRules } from "./rules/responsive";
import { securityRules } from "./rules/security";
import { authRules } from "./rules/auth";
import { contentRules } from "./rules/content";
import { aiRules } from "./rules/ai";
import { analyticsRules } from "./rules/analytics";
import { conversionRules } from "./rules/conversion";
import { competitorRules } from "./rules/competitor";

export const ALL_ASSESSMENT_RULES: RuleDefinition[] = [
  ...technicalHealthRules,    // 6 rules, 12 pts
  ...seoRules,                // 9 rules, 18 pts
  ...performanceRules,        // 5 rules, 10 pts
  ...responsiveRules,         // 5 rules, 10 pts
  ...securityRules,           // 6 rules, 12 pts
  ...authRules,               // 4 rules, 8 pts
  ...contentRules,            // 5 rules, 10 pts
  ...aiRules,                 // 4 rules, 8 pts
  ...analyticsRules,          // 5 rules, 5 pts
  ...conversionRules,         // 4 rules, 4 pts
  ...competitorRules,         // 3 rules, 3 pts
];

export const CATEGORY_ALLOCATED_WEIGHTS: Record<AssessmentCategory, { name: string; weight: number }> = {
  technical_health: { name: "Technical Health and Crawlability", weight: 12 },
  seo: { name: "Technical and On-Page SEO", weight: 18 },
  performance: { name: "Performance", weight: 10 },
  responsive_accessibility: { name: "Responsive Experience & Accessibility", weight: 10 },
  public_security: { name: "Public Security Configuration", weight: 12 },
  authentication_posture: { name: "Observable Authentication Posture", weight: 8 },
  content_quality: { name: "Content Quality and Trust", weight: 10 },
  geo_aeo_ai: { name: "GEO / AEO and AI-Search Readiness", weight: 8 },
  analytics_tracking: { name: "Analytics and Tracking Readiness", weight: 5 },
  conversion_marketing: { name: "Conversion and Marketing Experience", weight: 4 },
  competitor_comparison: { name: "Competitive Comparison Readiness", weight: 3 },
};

export class AssessmentRegistry {
  private rulesMap = new Map<string, RuleDefinition>();

  constructor() {
    for (const rule of ALL_ASSESSMENT_RULES) {
      if (this.rulesMap.has(rule.id)) {
        throw new Error(`Duplicate rule ID registered: ${rule.id}`);
      }
      this.rulesMap.set(rule.id, rule);
    }
  }

  getAllRules(): RuleDefinition[] {
    return ALL_ASSESSMENT_RULES;
  }

  getRule(id: string): RuleDefinition | undefined {
    return this.rulesMap.get(id);
  }

  getRulesByCategory(category: AssessmentCategory): RuleDefinition[] {
    return ALL_ASSESSMENT_RULES.filter((r) => r.category === category);
  }

  getCategoryWeight(category: AssessmentCategory): number {
    return CATEGORY_ALLOCATED_WEIGHTS[category]?.weight || 0;
  }

  evaluateAll(ctx: RuleEvaluationContext): AssessmentResult[] {
    const results: AssessmentResult[] = [];
    for (const rule of ALL_ASSESSMENT_RULES) {
      try {
        const res = rule.evaluate(ctx);
        results.push(res);
      } catch (err: any) {
        results.push({
          testId: rule.id,
          testVersion: rule.version,
          testName: rule.name,
          category: rule.category,
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: rule.maxPoints,
          earnedPoints: 0,
          title: `${rule.name} (Evaluation Error)`,
          summary: `Rule execution error: ${err?.message || "Unknown error"}`,
          timestamp: new Date().toISOString(),
          confidence: "LOW",
        });
      }
    }
    return results;
  }

  verifyCatalogueIntegrity(): {
    isValid: boolean;
    totalPoints: number;
    count: number;
    categoryBreakdown: Record<string, { count: number; points: number; expectedPoints: number }>;
  } {
    let totalPoints = 0;
    const categoryBreakdown: Record<string, { count: number; points: number; expectedPoints: number }> = {};

    for (const cat of Object.keys(CATEGORY_ALLOCATED_WEIGHTS) as AssessmentCategory[]) {
      categoryBreakdown[cat] = {
        count: 0,
        points: 0,
        expectedPoints: CATEGORY_ALLOCATED_WEIGHTS[cat].weight,
      };
    }

    for (const rule of ALL_ASSESSMENT_RULES) {
      totalPoints += rule.maxPoints;
      if (categoryBreakdown[rule.category]) {
        categoryBreakdown[rule.category].count += 1;
        categoryBreakdown[rule.category].points += rule.maxPoints;
      }
    }

    const isSum100 = totalPoints === 100;
    const isCount56 = ALL_ASSESSMENT_RULES.length === 56;
    const allCategoriesMatch = Object.values(categoryBreakdown).every(
      (b) => b.points === b.expectedPoints
    );

    return {
      isValid: isSum100 && isCount56 && allCategoriesMatch,
      totalPoints,
      count: ALL_ASSESSMENT_RULES.length,
      categoryBreakdown,
    };
  }
}

export const assessmentRegistry = new AssessmentRegistry();
