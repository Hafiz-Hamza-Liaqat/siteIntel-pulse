import { AssessmentResult } from "@/types";

export interface ScoreLedgerEntry {
  testId: string;
  category: string;
  status: AssessmentResult["status"];
  severity: AssessmentResult["severity"];
  maxPoints: number;
  earnedPoints: number;
  isApplicable: boolean;
  isEvaluated: boolean;
  timestamp: string;
}

export class ScoreLedger {
  private entries: ScoreLedgerEntry[] = [];

  constructor(results?: AssessmentResult[]) {
    if (results) {
      results.forEach((r) => this.record(r));
    }
  }

  record(result: AssessmentResult) {
    const isApplicable = result.status !== "NOT_APPLICABLE";
    const isEvaluated =
      result.status === "PASS" ||
      result.status === "WARNING" ||
      result.status === "FAIL" ||
      result.status === "NOT_DETECTED";

    // Non-pass/warning tests can NEVER earn points
    let earnedPoints = result.earnedPoints;
    if (
      result.status === "FAIL" ||
      result.status === "NOT_DETECTED" ||
      result.status === "UNKNOWN" ||
      result.status === "NOT_TESTED" ||
      result.status === "BLOCKED" ||
      result.status === "NOT_APPLICABLE"
    ) {
      earnedPoints = 0;
    }

    this.entries.push({
      testId: result.testId,
      category: result.category,
      status: result.status,
      severity: result.severity,
      maxPoints: result.maxPoints,
      earnedPoints,
      isApplicable,
      isEvaluated,
      timestamp: result.timestamp,
    });
  }

  getAllEntries(): ReadonlyArray<ScoreLedgerEntry> {
    return Object.freeze([...this.entries]);
  }

  getEntriesByCategory(category: string): ScoreLedgerEntry[] {
    return this.entries.filter((e) => e.category === category);
  }
}
