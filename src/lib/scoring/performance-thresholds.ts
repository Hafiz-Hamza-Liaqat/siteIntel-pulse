/**
 * Centrally defined performance metrics, official Lighthouse v10 log-normal
 * scoring curves, metric thresholds, and units.
 *
 * Source: Google Lighthouse v10 Scoring Calculator & Web Vitals specifications.
 */

export interface LabPerformanceMetrics {
  fcpMs: number;
  lcpMs: number;
  cls?: number;
  tbtMs: number;
  speedIndexMs: number;
  ttfbMs: number;
}

export interface MetricThreshold {
  good: number;
  poor: number;
  unit: string;
  category: "lab" | "field";
  label: string;
}

export const PERFORMANCE_THRESHOLDS: Record<string, MetricThreshold> = {
  fcp: { good: 1800, poor: 3000, unit: "ms", category: "lab", label: "First Contentful Paint" },
  lcp: { good: 2500, poor: 4000, unit: "ms", category: "lab", label: "Largest Contentful Paint" },
  cls: { good: 0.1, poor: 0.25, unit: "", category: "lab", label: "Cumulative Layout Shift" },
  tbt: { good: 200, poor: 600, unit: "ms", category: "lab", label: "Total Blocking Time" },
  speedIndex: { good: 3400, poor: 5800, unit: "ms", category: "lab", label: "Speed Index" },
  ttfb: { good: 800, poor: 1800, unit: "ms", category: "lab", label: "Time to First Byte" },
  inp: { good: 200, poor: 500, unit: "ms", category: "field", label: "Interaction to Next Paint" },
};

/**
 * Log-normal cumulative distribution function evaluation used by Google Lighthouse.
 */
function logNormalScore(value: number, median: number, p10: number): number {
  if (value <= 0) return 100;
  // Compute location (mu) and scale (sigma) parameters from median and 10th percentile
  // median = exp(mu), so mu = ln(median)
  // p10 corresponds to z = -1.28155, p10 = exp(mu - 1.28155 * sigma)
  // sigma = (ln(median) - ln(p10)) / 1.28155
  const mu = Math.log(median);
  const sigma = Math.max(0.01, (Math.log(median) - Math.log(p10)) / 1.2815515655446004);
  const z = (Math.log(value) - mu) / sigma;

  // Standard normal CDF approximation (Abramowitz & Stegun)
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2.0);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = z > 0 ? 1.0 - p : p;

  // Inverted: lower value gives higher score
  const score = Math.round((1.0 - cdf) * 100);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculates genuine Lighthouse v10 performance score (0-100) from real measured lab metrics.
 * Weights:
 * - FCP: 10% (median 3000ms, p10 1800ms)
 * - LCP: 25% (median 4000ms, p10 2500ms)
 * - TBT: 30% (median 600ms, p10 200ms)
 * - CLS: 25% (median 0.25, p10 0.1)
 * - Speed Index: 10% (median 5800ms, p10 3400ms)
 */
export function calculateLighthousePerformanceScore(metrics: LabPerformanceMetrics): {
  overallScore: number;
  metricScores: {
    fcp: number;
    lcp: number;
    cls?: number;
    tbt: number;
    speedIndex: number;
  };
} {
  const fcpScore = logNormalScore(metrics.fcpMs, 3000, 1800);
  const lcpScore = logNormalScore(metrics.lcpMs, 4000, 2500);
  const tbtScore = logNormalScore(metrics.tbtMs, 600, 200);
  const siScore = logNormalScore(metrics.speedIndexMs, 5800, 3400);

  let weightedSum = 0;
  let totalWeight = 0;

  // FCP: 10%
  weightedSum += fcpScore * 0.10;
  totalWeight += 0.10;

  // LCP: 25%
  weightedSum += lcpScore * 0.25;
  totalWeight += 0.25;

  // TBT: 30%
  weightedSum += tbtScore * 0.30;
  totalWeight += 0.30;

  // Speed Index: 10%
  weightedSum += siScore * 0.10;
  totalWeight += 0.10;

  // CLS: 25% (included only when genuinely observed, preserving valid 0.000)
  let clsScore: number | undefined = undefined;
  if (metrics.cls != null) {
    clsScore = logNormalScore(metrics.cls, 0.25, 0.1);
    weightedSum += clsScore * 0.25;
    totalWeight += 0.25;
  }

  const overallScore = totalWeight > 0 ? Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight))) : 0;

  return {
    overallScore,
    metricScores: {
      fcp: fcpScore,
      lcp: lcpScore,
      cls: clsScore,
      tbt: tbtScore,
      speedIndex: siScore,
    },
  };
}

/**
 * Returns standardized rating band for any performance metric.
 */
export function getMetricRating(
  metricName: "fcp" | "lcp" | "cls" | "tbt" | "speedIndex" | "ttfb" | "inp",
  value: number | null | undefined
): "GOOD" | "NEEDS_IMPROVEMENT" | "POOR" | "NOT_TESTED" {
  if (value === null || value === undefined) return "NOT_TESTED";
  const threshold = PERFORMANCE_THRESHOLDS[metricName];
  if (!threshold) return "NOT_TESTED";

  if (value <= threshold.good) return "GOOD";
  if (value <= threshold.poor) return "NEEDS_IMPROVEMENT";
  return "POOR";
}

/**
 * Returns user-facing badge colors for performance rating bands.
 */
export function getMetricRatingStyle(rating: "GOOD" | "NEEDS_IMPROVEMENT" | "POOR" | "NOT_TESTED"): {
  bg: string;
  color: string;
  label: string;
} {
  switch (rating) {
    case "GOOD":
      return { bg: "#D1FAE5", color: "#065F46", label: "Good" };
    case "NEEDS_IMPROVEMENT":
      return { bg: "#FEF3C7", color: "#92400E", label: "Needs Improvement" };
    case "POOR":
      return { bg: "#FEE2E2", color: "#991B1B", label: "Poor" };
    case "NOT_TESTED":
    default:
      return { bg: "#F1F5F9", color: "#64748B", label: "Not Evaluated" };
  }
}
