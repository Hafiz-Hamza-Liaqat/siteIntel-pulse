import { describe, it, expect } from "vitest";
import { assessmentRegistry, CATEGORY_ALLOCATED_WEIGHTS, ALL_ASSESSMENT_RULES } from "../catalogue/registry";

describe("Scoring Invariants & Catalogue Integrity", () => {
  it("has exactly 56 assessment rules", () => {
    expect(ALL_ASSESSMENT_RULES.length).toBe(56);
  });

  it("has category weights summing to exactly 100 points", () => {
    const totalWeight = Object.values(CATEGORY_ALLOCATED_WEIGHTS).reduce(
      (sum, c) => sum + c.weight,
      0
    );
    expect(totalWeight).toBe(100);
  });

  it("has rule maxPoints summing to exactly 100 points", () => {
    const totalMaxPoints = ALL_ASSESSMENT_RULES.reduce((sum, r) => sum + r.maxPoints, 0);
    expect(totalMaxPoints).toBe(100);
  });

  it("matches declared category weights exactly with individual rule allocations", () => {
    const integrity = assessmentRegistry.verifyCatalogueIntegrity();
    expect(integrity.isValid).toBe(true);
    expect(integrity.totalPoints).toBe(100);
    expect(integrity.count).toBe(56);

    for (const [cat, data] of Object.entries(integrity.categoryBreakdown)) {
      expect(data.points).toBe(data.expectedPoints);
    }
  });

  it("guarantees unique test IDs across all 56 rules", () => {
    const ids = ALL_ASSESSMENT_RULES.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
