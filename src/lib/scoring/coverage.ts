import { AssessmentCategory } from "@/types";
import { ScoreLedger } from "./ledger";
import { CATEGORY_ALLOCATED_WEIGHTS } from "../catalogue/registry";

export interface CoverageAnalysis {
  weightedPointsEvaluated: number;
  totalCataloguePoints: number;
  overallCoveragePercentage: number;
  isOverallScoreEligible: boolean;
  assessmentStatus: "FULLY_ASSESSED" | "PROVISIONAL" | "INSUFFICIENT_EVIDENCE";
  provisionalReason?: string;
  ineligibleCategories: string[];
  categoryCoverages: Record<
    AssessmentCategory,
    {
      evaluatedPoints: number;
      allocatedWeight: number;
      coveragePercentage: number;
      isCategoryEligible: boolean;
    }
  >;
}

export function calculateCoverage(ledger: ScoreLedger): CoverageAnalysis {
  let weightedPointsEvaluated = 0;
  const categoryCoverages = {} as CoverageAnalysis["categoryCoverages"];
  const ineligibleCategories: string[] = [];

  const categories = Object.keys(CATEGORY_ALLOCATED_WEIGHTS) as AssessmentCategory[];

  for (const cat of categories) {
    const allocatedWeight = CATEGORY_ALLOCATED_WEIGHTS[cat].weight;
    const entries = ledger.getEntriesByCategory(cat);

    // Sum tested points for applicable evaluated tests
    let catEvaluatedPoints = 0;
    for (const e of entries) {
      if (e.isApplicable && e.isEvaluated) {
        catEvaluatedPoints += e.maxPoints;
      }
    }

    const catCoveragePct = allocatedWeight > 0 ? (catEvaluatedPoints / allocatedWeight) * 100 : 0;
    const roundedCoverage = Math.round(catCoveragePct * 10) / 10;
    const isCategoryEligible = roundedCoverage >= 60;

    if (!isCategoryEligible) {
      ineligibleCategories.push(
        `${CATEGORY_ALLOCATED_WEIGHTS[cat].name} (${roundedCoverage}% vs 60% min)`
      );
    }

    weightedPointsEvaluated += catEvaluatedPoints;

    categoryCoverages[cat] = {
      evaluatedPoints: catEvaluatedPoints,
      allocatedWeight,
      coveragePercentage: roundedCoverage,
      isCategoryEligible,
    };
  }

  const overallCoveragePercentage = Math.round((weightedPointsEvaluated / 100) * 1000) / 10;

  // Determine overall eligibility and status
  let assessmentStatus: CoverageAnalysis["assessmentStatus"] = "FULLY_ASSESSED";
  let isOverallEligible = true;
  let provisionalReason: string | undefined = undefined;

  if (overallCoveragePercentage < 40) {
    assessmentStatus = "INSUFFICIENT_EVIDENCE";
    isOverallEligible = false;
    provisionalReason = `Evaluated catalogue coverage (${overallCoveragePercentage}%) is below 40%, which represents insufficient evidence for a conclusive baseline.`;
  } else if (overallCoveragePercentage < 70 || ineligibleCategories.length > 0) {
    assessmentStatus = "PROVISIONAL";
    isOverallEligible = false;
    const reasons: string[] = [];
    if (overallCoveragePercentage < 70) {
      reasons.push(
        `Overall catalogue coverage (${overallCoveragePercentage}%) is below the 70% threshold required for a fully assessed score`
      );
    }
    if (ineligibleCategories.length > 0) {
      reasons.push(
        `Low coverage (<60%) in ${ineligibleCategories.length} category(ies): ${ineligibleCategories.join("; ")}`
      );
    }
    provisionalReason = reasons.join(". ") + ".";
  }

  return {
    weightedPointsEvaluated,
    totalCataloguePoints: 100,
    overallCoveragePercentage,
    isOverallScoreEligible: isOverallEligible,
    assessmentStatus,
    provisionalReason,
    ineligibleCategories,
    categoryCoverages,
  };
}
