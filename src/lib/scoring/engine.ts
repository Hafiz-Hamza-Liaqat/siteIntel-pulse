import {
  AssessmentCategory,
  AssessmentResult,
  CategoryScore,
  OverallScore,
} from "@/types";
import { ScoreLedger } from "./ledger";
import { calculateCoverage, CoverageAnalysis } from "./coverage";
import { CATEGORY_ALLOCATED_WEIGHTS } from "../catalogue/registry";

export interface ScoreLedgerOutput {
  categoryScores: CategoryScore[];
  overallScore: OverallScore;
  coverage: CoverageAnalysis;
}

export function computeAuditScores(results: AssessmentResult[]): ScoreLedgerOutput {
  const ledger = new ScoreLedger(results);
  const coverage = calculateCoverage(ledger);

  const categoryScores: CategoryScore[] = [];
  let totalEarnedPoints = 0;
  let totalTestedPoints = 0;
  let criticalIssuesCount = 0;

  const categories = Object.keys(CATEGORY_ALLOCATED_WEIGHTS) as AssessmentCategory[];

  for (const cat of categories) {
    const config = CATEGORY_ALLOCATED_WEIGHTS[cat];
    const entries = ledger.getEntriesByCategory(cat);

    let testedPoints = 0;
    let earnedPoints = 0;

    const counts = {
      total: entries.length,
      pass: 0,
      warning: 0,
      fail: 0,
      unknown: 0,
      notApplicable: 0,
      notTested: 0,
      blocked: 0,
    };

    for (const e of entries) {
      if (e.status === "PASS") counts.pass += 1;
      else if (e.status === "WARNING") counts.warning += 1;
      else if (e.status === "FAIL") counts.fail += 1;
      else if (e.status === "NOT_APPLICABLE") counts.notApplicable += 1;
      else if (e.status === "UNKNOWN") counts.unknown += 1;
      else if (e.status === "NOT_TESTED") counts.notTested += 1;
      else if (e.status === "BLOCKED") counts.blocked += 1;

      if (e.severity === "CRITICAL" && (e.status === "FAIL" || e.status === "WARNING")) {
        criticalIssuesCount += 1;
      }

      // Applicable and evaluated tests count towards tested & earned
      if (e.isApplicable && e.isEvaluated) {
        testedPoints += e.maxPoints;
        earnedPoints += e.earnedPoints;
      }
    }

    const catCoverage = coverage.categoryCoverages[cat];
    const isEligible = catCoverage?.isCategoryEligible ?? false;
    const catCoveragePct = catCoverage?.coveragePercentage ?? 0;

    // Score among evaluated tests (e.g. earned 4 out of 4 tested = 100%)
    const scorePercentage = testedPoints > 0 ? Math.round((earnedPoints / testedPoints) * 100) : 0;

    // Points earned relative to full category allocation (e.g. 4 earned out of 10 allocated = 40%)
    const earnedAllocationPercentage =
      config.weight > 0 ? Math.round((earnedPoints / config.weight) * 1000) / 10 : 0;

    // Weighted score is exact earned points (since catalogue weights directly sum to 100)
    const weightedScore = Math.round(earnedPoints * 10) / 10;

    totalEarnedPoints += earnedPoints;
    totalTestedPoints += testedPoints;

    const isCategoryProvisional = !isEligible || catCoveragePct < 80;
    const statusLabel = isCategoryProvisional ? "Evaluated-Subset (Provisional)" : "Fully Assessed";
    const scoreLabel = isCategoryProvisional
      ? `${scorePercentage}% (Evaluated subset, Coverage ${catCoveragePct}%)`
      : `${scorePercentage}%`;

    categoryScores.push({
      category: cat,
      categoryName: config.name,
      allocatedWeight: config.weight,
      testedPoints,
      earnedPoints,
      scorePercentage,
      weightedScore,
      testCounts: counts,
      isEligibleForOverall: isEligible,
      coveragePercentage: catCoveragePct,
      earnedAllocationPercentage,
      allocatedPoints: config.weight,
      pointsEvaluated: testedPoints,
      pointsEarned: earnedPoints,
      normalizedScore: scorePercentage,
      isProvisional: isCategoryProvisional,
      statusLabel,
      scoreLabel,
    });
  }

  // Compute composite overall score among tested points
  const rawComposite =
    totalTestedPoints > 0 ? Math.round((totalEarnedPoints / totalTestedPoints) * 100) : 0;
  const overallScoreValue = Math.min(Math.max(rawComposite, 0), 100);

  // Determine rating band
  let ratingBand: OverallScore["ratingBand"] = "Needs improvement";
  if (overallScoreValue >= 90) {
    ratingBand = "Strong observed baseline";
  } else if (overallScoreValue >= 75) {
    ratingBand = "Generally healthy; opportunities remain";
  } else if (overallScoreValue >= 60) {
    ratingBand = "Needs improvement";
  } else if (overallScoreValue >= 40) {
    ratingBand = "Weak areas need attention";
  } else {
    ratingBand = "Significant improvement required";
  }

  const isProvisional = !coverage.isOverallScoreEligible;
  const roundedEarned = Math.round(totalEarnedPoints * 10) / 10;
  let evaluationNote: string;
  if (coverage.assessmentStatus === "FULLY_ASSESSED") {
    evaluationNote = `Comprehensive baseline assessment fully assessed across all 11 catalogue categories (${coverage.overallCoveragePercentage}% evaluated). Normalized score: ${overallScoreValue}% (${roundedEarned} earned / ${totalTestedPoints} evaluated pts out of 100 total catalogue pts).`;
  } else if (coverage.assessmentStatus === "INSUFFICIENT_EVIDENCE") {
    evaluationNote = `Provisional preliminary score (Insufficient evidence: Only ${coverage.overallCoveragePercentage}% of catalogue points evaluated. Normalized score: ${overallScoreValue}% (${roundedEarned} earned / ${totalTestedPoints} evaluated pts). Score is preliminary and non-conclusive).`;
  } else {
    evaluationNote = `Provisional preliminary score: Normalized ${overallScoreValue}% (${roundedEarned} earned / ${totalTestedPoints} evaluated pts) based on ${coverage.overallCoveragePercentage}% evaluated catalogue points. ${coverage.provisionalReason || ""}`;
  }

  const overallScore: OverallScore = {
    score: overallScoreValue,
    ratingBand,
    isProvisional,
    assessmentStatus: coverage.assessmentStatus,
    evaluationNote,
    totalPossibleCataloguePoints: 100,
    evaluatedWeightedPoints: coverage.weightedPointsEvaluated,
    criticalIssuesCount,
    coveragePercentage: coverage.overallCoveragePercentage,
    totalEarnedCataloguePoints: roundedEarned,
    ineligibleCategories: coverage.ineligibleCategories,
    totalPointsAllocated: 100,
    pointsActuallyEvaluated: totalTestedPoints,
    pointsEarned: roundedEarned,
    catalogueCoveragePercentage: coverage.overallCoveragePercentage,
    normalizedScore: overallScoreValue,
    scoringFormula: `normalizedScore = Math.round((${roundedEarned} / ${totalTestedPoints}) * 100)`,
  };

  return {
    categoryScores,
    overallScore,
    coverage,
  };
}
