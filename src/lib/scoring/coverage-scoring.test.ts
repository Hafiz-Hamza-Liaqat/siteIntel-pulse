import { describe, it, expect } from "vitest";
import { computeAuditScores } from "./engine";
import { ScoreLedger } from "./ledger";
import { calculateCoverage } from "./coverage";
import { CATEGORY_ALLOCATED_WEIGHTS, assessmentRegistry } from "../catalogue/registry";
import { AssessmentResult } from "@/types";

describe("Coverage & Scoring Integrity Tests (Acceptance Rule Verification)", () => {
  it("enforces exact 100 total catalogue points across 11 categories", () => {
    const categories = Object.keys(CATEGORY_ALLOCATED_WEIGHTS);
    expect(categories.length).toBe(11);

    const totalWeight = Object.values(CATEGORY_ALLOCATED_WEIGHTS).reduce(
      (sum, c) => sum + c.weight,
      0
    );
    expect(totalWeight).toBe(100);
  });

  it("handles the demonstration coverage pattern with low Performance (4/10) and GEO (2/8) as PROVISIONAL", () => {
    const results: AssessmentResult[] = [];
    const timestamp = new Date().toISOString();

    // Technical Health: 5 of 12 earned, 8 tested
    results.push(
      { testId: "TCH-01", testVersion: "1.0.0", testName: "T1", category: "technical_health", status: "PASS", severity: "HIGH", maxPoints: 3, earnedPoints: 3, title: "T1", summary: "T1", timestamp, confidence: "HIGH" },
      { testId: "TCH-02", testVersion: "1.0.0", testName: "T2", category: "technical_health", status: "PASS", severity: "HIGH", maxPoints: 2, earnedPoints: 2, title: "T2", summary: "T2", timestamp, confidence: "HIGH" },
      { testId: "TCH-03", testVersion: "1.0.0", testName: "T3", category: "technical_health", status: "FAIL", severity: "HIGH", maxPoints: 2, earnedPoints: 0, title: "T3", summary: "T3", timestamp, confidence: "HIGH" },
      { testId: "TCH-04", testVersion: "1.0.0", testName: "T4", category: "technical_health", status: "WARNING", severity: "MEDIUM", maxPoints: 1, earnedPoints: 0, title: "T4", summary: "T4", timestamp, confidence: "HIGH" }
    );

    // Performance: only PERF-01 (3 pts) and PERF-05 (1 pt) evaluated = 4/10 evaluated (40% coverage)
    results.push(
      { testId: "PERF-01", testVersion: "1.0.0", testName: "P1", category: "performance", status: "PASS", severity: "HIGH", maxPoints: 3, earnedPoints: 3, title: "P1", summary: "P1", timestamp, confidence: "HIGH" },
      { testId: "PERF-05", testVersion: "1.0.0", testName: "P5", category: "performance", status: "PASS", severity: "LOW", maxPoints: 1, earnedPoints: 1, title: "P5", summary: "P5", timestamp, confidence: "HIGH" },
      { testId: "PERF-02", testVersion: "1.0.0", testName: "P2", category: "performance", status: "UNKNOWN", severity: "MEDIUM", maxPoints: 2, earnedPoints: 0, title: "P2", summary: "P2", timestamp, confidence: "LOW" },
      { testId: "PERF-03", testVersion: "1.0.0", testName: "P3", category: "performance", status: "NOT_TESTED", severity: "MEDIUM", maxPoints: 2, earnedPoints: 0, title: "P3", summary: "P3", timestamp, confidence: "LOW" },
      { testId: "PERF-04", testVersion: "1.0.0", testName: "P4", category: "performance", status: "UNKNOWN", severity: "MEDIUM", maxPoints: 2, earnedPoints: 0, title: "P4", summary: "P4", timestamp, confidence: "LOW" }
    );

    // GEO / AEO / AI: only AI-01 (2 pts) evaluated = 2/8 evaluated (25% coverage)
    results.push(
      { testId: "AI-01", testVersion: "1.0.0", testName: "A1", category: "geo_aeo_ai", status: "PASS", severity: "HIGH", maxPoints: 2, earnedPoints: 2, title: "A1", summary: "A1", timestamp, confidence: "HIGH" },
      { testId: "AI-02", testVersion: "1.0.0", testName: "A2", category: "geo_aeo_ai", status: "NOT_TESTED", severity: "MEDIUM", maxPoints: 2, earnedPoints: 0, title: "A2", summary: "A2", timestamp, confidence: "LOW" },
      { testId: "AI-03", testVersion: "1.0.0", testName: "A3", category: "geo_aeo_ai", status: "NOT_TESTED", severity: "MEDIUM", maxPoints: 2, earnedPoints: 0, title: "A3", summary: "A3", timestamp, confidence: "LOW" },
      { testId: "AI-04", testVersion: "1.0.0", testName: "A4", category: "geo_aeo_ai", status: "NOT_TESTED", severity: "MEDIUM", maxPoints: 2, earnedPoints: 0, title: "A4", summary: "A4", timestamp, confidence: "LOW" }
    );

    const output = computeAuditScores(results);

    // Performance verification
    const perfCat = output.categoryScores.find((c) => c.category === "performance");
    expect(perfCat).toBeDefined();
    expect(perfCat?.allocatedWeight).toBe(10);
    expect(perfCat?.testedPoints).toBe(4); // 3 + 1
    expect(perfCat?.earnedPoints).toBe(4); // 3 + 1
    expect(perfCat?.scorePercentage).toBe(100); // 4 / 4 tested pts = 100%
    expect(perfCat?.coveragePercentage).toBe(40); // 4 / 10 allocated pts = 40%
    expect(perfCat?.earnedAllocationPercentage).toBe(40); // 4 / 10 allocated pts = 40%
    expect(perfCat?.isEligibleForOverall).toBe(false); // 40% < 60% minimum requirement

    // GEO / AEO / AI verification
    const aiCat = output.categoryScores.find((c) => c.category === "geo_aeo_ai");
    expect(aiCat).toBeDefined();
    expect(aiCat?.allocatedWeight).toBe(8);
    expect(aiCat?.testedPoints).toBe(2);
    expect(aiCat?.earnedPoints).toBe(2);
    expect(aiCat?.scorePercentage).toBe(100);
    expect(aiCat?.coveragePercentage).toBe(25); // 2 / 8 = 25%
    expect(aiCat?.isEligibleForOverall).toBe(false); // 25% < 60%

    // Overall Score MUST be labeled PROVISIONAL
    expect(output.overallScore.isProvisional).toBe(true);
    expect(output.overallScore.assessmentStatus).toBe("INSUFFICIENT_EVIDENCE"); // 14 total points < 40
    expect(output.overallScore.evaluationNote).toContain("Insufficient evidence");
  });

  it("verifies exact boundary threshold: 70% overall and 60% per-category for FULLY_ASSESSED", () => {
    // Generate results where every category is tested at exactly 60%
    const results: AssessmentResult[] = [];
    const timestamp = new Date().toISOString();

    const categories = Object.keys(CATEGORY_ALLOCATED_WEIGHTS) as (keyof typeof CATEGORY_ALLOCATED_WEIGHTS)[];

    for (const cat of categories) {
      const weight = CATEGORY_ALLOCATED_WEIGHTS[cat].weight;
      // 60% of weight tested, all passing
      const tested = Math.round(weight * 0.6 * 10) / 10;
      results.push({
        testId: `${cat}-01`,
        testVersion: "1.0.0",
        testName: "Test 1",
        category: cat,
        status: "PASS",
        severity: "HIGH",
        maxPoints: tested,
        earnedPoints: tested,
        title: "Test",
        summary: "Summary",
        timestamp,
        confidence: "HIGH",
      });
    }

    const output60 = computeAuditScores(results);
    // Overall coverage is ~60%, so overall is still < 70% threshold!
    expect(output60.coverage.overallCoveragePercentage).toBeLessThan(70);
    expect(output60.overallScore.isProvisional).toBe(true);
    expect(output60.overallScore.assessmentStatus).toBe("PROVISIONAL");

    // Now raise all categories to 70% tested
    const results70: AssessmentResult[] = [];
    for (const cat of categories) {
      const weight = CATEGORY_ALLOCATED_WEIGHTS[cat].weight;
      const tested = Math.round(weight * 0.7 * 10) / 10;
      results70.push({
        testId: `${cat}-01`,
        testVersion: "1.0.0",
        testName: "Test 1",
        category: cat,
        status: "PASS",
        severity: "HIGH",
        maxPoints: tested,
        earnedPoints: tested,
        title: "Test",
        summary: "Summary",
        timestamp,
        confidence: "HIGH",
      });
    }

    const output70 = computeAuditScores(results70);
    expect(output70.coverage.overallCoveragePercentage).toBeGreaterThanOrEqual(70);
    expect(output70.overallScore.isProvisional).toBe(false);
    expect(output70.overallScore.assessmentStatus).toBe("FULLY_ASSESSED");
    expect(output70.overallScore.evaluationNote).toContain("fully assessed");
  });

  it("marks as PROVISIONAL when overall coverage is high (80%) but ONE category is under 60%", () => {
    const results: AssessmentResult[] = [];
    const timestamp = new Date().toISOString();
    const categories = Object.keys(CATEGORY_ALLOCATED_WEIGHTS) as (keyof typeof CATEGORY_ALLOCATED_WEIGHTS)[];

    for (const cat of categories) {
      const weight = CATEGORY_ALLOCATED_WEIGHTS[cat].weight;
      // Make performance under 60% (e.g. 30%), all others 90%
      const tested = cat === "performance" ? Math.round(weight * 0.3) : Math.round(weight * 0.9);
      results.push({
        testId: `${cat}-01`,
        testVersion: "1.0.0",
        testName: "Test 1",
        category: cat,
        status: "PASS",
        severity: "HIGH",
        maxPoints: tested,
        earnedPoints: tested,
        title: "Test",
        summary: "Summary",
        timestamp,
        confidence: "HIGH",
      });
    }

    const output = computeAuditScores(results);
    expect(output.coverage.overallCoveragePercentage).toBeGreaterThan(70);
    // But Performance is < 60%!
    const perfCat = output.categoryScores.find((c) => c.category === "performance");
    expect(perfCat?.isEligibleForOverall).toBe(false);
    // MUST be provisional due to the ineligible category
    expect(output.overallScore.isProvisional).toBe(true);
    expect(output.overallScore.assessmentStatus).toBe("PROVISIONAL");
    expect(output.overallScore.evaluationNote).toContain("Performance");
  });

  it("never awards points to UNKNOWN, NOT_TESTED, BLOCKED, or NOT_APPLICABLE results", () => {
    const results: AssessmentResult[] = [
      {
        testId: "TEST-01",
        testVersion: "1.0.0",
        testName: "Unknown test",
        category: "technical_health",
        status: "UNKNOWN",
        severity: "HIGH",
        maxPoints: 3,
        earnedPoints: 3, // Erroneously claims points
        title: "Unknown",
        summary: "Unknown test",
        timestamp: new Date().toISOString(),
        confidence: "LOW",
      },
      {
        testId: "TEST-02",
        testVersion: "1.0.0",
        testName: "Blocked test",
        category: "technical_health",
        status: "BLOCKED",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 2, // Erroneously claims points
        title: "Blocked",
        summary: "Blocked test",
        timestamp: new Date().toISOString(),
        confidence: "LOW",
      },
      {
        testId: "TEST-03",
        testVersion: "1.0.0",
        testName: "Not applicable test",
        category: "technical_health",
        status: "NOT_APPLICABLE",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 2,
        title: "N/A",
        summary: "N/A",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      },
    ];

    const ledger = new ScoreLedger(results);
    for (const entry of ledger.getAllEntries()) {
      expect(entry.earnedPoints).toBe(0);
    }

    const output = computeAuditScores(results);
    const tchCat = output.categoryScores.find((c) => c.category === "technical_health");
    expect(tchCat?.earnedPoints).toBe(0);
    expect(tchCat?.testCounts.pass).toBe(0);
    expect(tchCat?.testCounts.unknown).toBe(1);
    expect(tchCat?.testCounts.blocked).toBe(1);
    expect(tchCat?.testCounts.notApplicable).toBe(1);
  });
});
