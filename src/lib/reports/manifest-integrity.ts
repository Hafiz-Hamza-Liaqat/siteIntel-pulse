import crypto from "node:crypto";
import type { ExpertReport } from "@/types";

/**
 * Manifest Integrity Module
 * 
 * Provides deterministic cryptographic integrity hashing and verification for SiteIntel Pulse
 * Expert Diagnostic Reports, separating data model integrity from binary PDF rendering hashes.
 */

export interface CanonicalAuditPayload {
  reportId: string;
  scanId: string;
  targetUrl: string;
  overallScore: number;
  ratingBand: string;
  categoryScores: Array<{
    category: string;
    earnedPoints: number;
    allocatedWeight: number;
    scorePercentage: number;
  }>;
  findings: Array<{
    id: string;
    testId: string;
    status: string;
    severity: string;
    title: string;
  }>;
  urlCount: number;
  cmsCategory: string;
}

/**
 * Extracts the canonical audit payload from an ExpertReport.
 */
export function extractCanonicalPayload(report: ExpertReport): CanonicalAuditPayload {
  return {
    reportId: report.metadata.reportId,
    scanId: report.metadata.scanId,
    targetUrl: report.metadata.companyA.targetUrl,
    overallScore: report.executiveSummary.overallScore.score,
    ratingBand: report.executiveSummary.overallScore.ratingBand,
    categoryScores: (report.executiveSummary.categoryScores || []).map((c) => ({
      category: c.category,
      earnedPoints: c.earnedPoints,
      allocatedWeight: c.allocatedWeight,
      scorePercentage: c.scorePercentage,
    })),
    findings: (report.findings || []).map((f) => ({
      id: f.id,
      testId: f.testId,
      status: f.status,
      severity: f.severity,
      title: f.title,
    })),
    urlCount: report.urlInventory?.length || 0,
    cmsCategory: report.platformProfile?.cmsCategory || "Unknown",
  };
}

/**
 * Computes a deterministic SHA-256 digest of the canonical report audit core.
 */
export function computeCanonicalReportDigest(payload: CanonicalAuditPayload): string {
  // Deterministic JSON stringification
  const serialized = JSON.stringify(payload);
  const hash = crypto.createHash("sha256").update(serialized, "utf8").digest("hex");
  return `sha256:${hash}`;
}

/**
 * Verifies whether the report's export manifest checksum matches its current canonical data.
 */
export function verifyReportDigest(report: ExpertReport): {
  isValid: boolean;
  expectedChecksum: string;
  actualChecksum: string;
} {
  const actualChecksum = report.exportManifest?.checksum || "";
  if (!actualChecksum.startsWith("sha256:")) {
    return {
      isValid: false,
      expectedChecksum: "",
      actualChecksum,
    };
  }

  const payload = extractCanonicalPayload(report);
  const expectedChecksum = computeCanonicalReportDigest(payload);

  const isValid =
    actualChecksum.length === expectedChecksum.length &&
    crypto.timingSafeEqual(Buffer.from(actualChecksum), Buffer.from(expectedChecksum));

  return {
    isValid,
    expectedChecksum,
    actualChecksum,
  };
}

/**
 * Computes a separate SHA-256 digest of binary artifact bytes (such as generated PDF buffers).
 */
export function computePdfDigest(pdfBuffer: Buffer | Uint8Array): string {
  const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  return `sha256:${hash}`;
}
