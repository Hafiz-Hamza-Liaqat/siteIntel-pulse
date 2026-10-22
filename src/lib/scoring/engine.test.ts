import { describe, it, expect } from "vitest";
import { computeAuditScores } from "./engine";
import { AssessmentResult } from "@/types";

describe("Scoring Engine", () => {
  it("calculates 100% score when all applicable tests pass", () => {
    const mockResults: AssessmentResult[] = [
      {
        testId: "TCH-01",
        testVersion: "1.0.0",
        testName: "HTTPS Availability",
        category: "technical_health",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Pass",
        summary: "Pass",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      },
      {
        testId: "SEO-01",
        testVersion: "1.0.0",
        testName: "Titles",
        category: "seo",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Pass",
        summary: "Pass",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      },
    ];

    const output = computeAuditScores(mockResults);
    expect(output.overallScore.score).toBe(100);
    expect(output.overallScore.ratingBand).toBe("Strong observed baseline");
    // With only 2 tests, coverage is under 70%, so it should be provisional
    expect(output.overallScore.isProvisional).toBe(true);
    expect(output.overallScore.evaluationNote).toContain("Provisional");
  });

  it("awards half points for WARNING and zero for FAIL", () => {
    const mockResults: AssessmentResult[] = [
      {
        testId: "TCH-01",
        testVersion: "1.0.0",
        testName: "HTTPS",
        category: "technical_health",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Warning",
        summary: "Warning",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      },
      {
        testId: "TCH-02",
        testVersion: "1.0.0",
        testName: "Hostnames",
        category: "technical_health",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Fail",
        summary: "Fail",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      },
    ];

    const output = computeAuditScores(mockResults);
    const techScore = output.categoryScores.find((c) => c.category === "technical_health");
    expect(techScore).toBeDefined();
    expect(techScore?.testedPoints).toBe(4);
    expect(techScore?.earnedPoints).toBe(1);
    expect(techScore?.scorePercentage).toBe(25); // 1 / 4 = 25%
  });

  it("excludes NOT_APPLICABLE from denominator", () => {
    const mockResults: AssessmentResult[] = [
      {
        testId: "CMP-01",
        testVersion: "1.0.0",
        testName: "Competitor Definition",
        category: "competitor_comparison",
        status: "NOT_APPLICABLE",
        severity: "INFORMATIONAL",
        maxPoints: 1,
        earnedPoints: 0,
        title: "N/A",
        summary: "N/A",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      },
    ];

    const output = computeAuditScores(mockResults);
    const cmpScore = output.categoryScores.find((c) => c.category === "competitor_comparison");
    expect(cmpScore?.testedPoints).toBe(0);
    expect(cmpScore?.earnedPoints).toBe(0);
  });

  it("does not count UNKNOWN as pass and flags critical issues", () => {
    const mockResults: AssessmentResult[] = [
      {
        testId: "SEC-01",
        testVersion: "1.0.0",
        testName: "HTTPS",
        category: "public_security",
        status: "FAIL",
        severity: "CRITICAL",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Critical Insecure HTTP",
        summary: "Critical failure",
        timestamp: new Date().toISOString(),
        confidence: "HIGH",
      },
      {
        testId: "PERF-03",
        testVersion: "1.0.0",
        testName: "CWV",
        category: "performance",
        status: "UNKNOWN",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Unknown",
        summary: "Unknown",
        timestamp: new Date().toISOString(),
        confidence: "LOW",
      },
    ];

    const output = computeAuditScores(mockResults);
    expect(output.overallScore.criticalIssuesCount).toBe(1);
    const perfScore = output.categoryScores.find((c) => c.category === "performance");
    expect(perfScore?.testedPoints).toBe(0);
    expect(perfScore?.testCounts.unknown).toBe(1);
  });
});
