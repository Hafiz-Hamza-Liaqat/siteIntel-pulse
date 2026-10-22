import type { ExpertReport } from "@/types";
import crypto from "node:crypto";

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates CSV representation of all technical diagnostic findings.
 */
export function exportFindingsCsv(report: ExpertReport): string {
  const headers = [
    "Finding ID",
    "Rule ID",
    "Category",
    "Severity",
    "Status",
    "Confidence",
    "Finding Title",
    "Technical Impact",
    "Business Impact",
    "Remediation Advice",
    "Validation Procedure",
    "Workstream",
    "Estimated Effort",
    "Affected Elements Count",
    "Affected Elements Sample",
    "Affected URLs Sample",
  ];

  const rows = report.findings.map((f) => [
    escapeCsvCell(f.id),
    escapeCsvCell(f.testId),
    escapeCsvCell(f.categoryName),
    escapeCsvCell(f.severity),
    escapeCsvCell(f.status),
    escapeCsvCell(f.confidence),
    escapeCsvCell(f.title),
    escapeCsvCell(f.technicalImpact),
    escapeCsvCell(f.businessImpact),
    escapeCsvCell(f.remediation),
    escapeCsvCell(f.validationProcedure),
    escapeCsvCell(f.workstream),
    escapeCsvCell(f.estimatedEffort),
    escapeCsvCell(f.affectedElements.length),
    escapeCsvCell(f.affectedElements.slice(0, 3).join(" | ")),
    escapeCsvCell(f.affectedUrls.slice(0, 3).join(" | ")),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Generates CSV representation of discovered and crawled URL inventory.
 */
export function exportInventoryCsv(report: ExpertReport): string {
  const headers = [
    "Page URL",
    "Status Code",
    "Discovery Source",
    "Crawl Depth",
    "Indexability Status",
    "Canonical Status",
    "Canonical Candidate",
    "Page Title",
    "Title Length",
    "Meta Description Length",
    "H1 Count",
    "Word Count",
    "Response Time (ms)",
    "Content Type",
  ];

  const rows = report.urlInventory.map((p) => [
    escapeCsvCell(p.url),
    escapeCsvCell(p.statusCode),
    escapeCsvCell(p.discoverySource),
    escapeCsvCell(p.crawlDepth),
    escapeCsvCell(p.indexabilityStatus),
    escapeCsvCell(p.canonicalStatus),
    escapeCsvCell(p.canonicalCandidate || ""),
    escapeCsvCell(p.title || ""),
    escapeCsvCell(p.titleLength),
    escapeCsvCell(p.metaDescriptionLength),
    escapeCsvCell(p.headingsOutline.h1.length),
    escapeCsvCell(p.wordCount),
    escapeCsvCell(p.responseTimeMs),
    escapeCsvCell(p.contentType),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Generates CSV representation of actionable remediation tasks grouped by workstream.
 */
export function exportRemediationCsv(report: ExpertReport): string {
  const headers = [
    "Task ID",
    "Workstream",
    "Priority",
    "Estimated Effort",
    "Estimated Hours",
    "Status",
    "Task Title",
    "Action Steps",
    "Validation Procedure",
  ];

  const rows = report.remediationRegister.map((t) => [
    escapeCsvCell(t.id),
    escapeCsvCell(t.workstream),
    escapeCsvCell(t.priority),
    escapeCsvCell(t.estimatedEffort),
    escapeCsvCell(t.estimatedHours || 0),
    escapeCsvCell(t.status),
    escapeCsvCell(t.title),
    escapeCsvCell(t.actionSteps.join(" -> ")),
    escapeCsvCell(t.validationProcedure),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Generates a verification manifest JSON with SHA-256 integrity hash.
 */
export function exportManifestJson(report: ExpertReport): string {
  const contentToHash = JSON.stringify({
    reportId: report.metadata.reportId,
    targetUrl: report.metadata.companyA.targetUrl,
    generatedAt: report.metadata.generatedAt,
    overallScore: report.executiveSummary.overallScore.score,
    findingCount: report.findings.length,
    urlCount: report.urlInventory.length,
  });

  const sha256 = crypto.createHash("sha256").update(contentToHash).digest("hex");

  const manifest = {
    ...report.exportManifest,
    checksum: sha256,
    generatedAt: new Date().toISOString(),
    exportFormatOptions: ["json", "csv_findings", "csv_inventory", "csv_remediation", "pdf"],
    summaryStats: {
      totalDiscoveredUrls: report.urlInventory.length,
      totalFindings: report.findings.length,
      criticalFindings: report.executiveSummary.issueTotals.critical,
      highFindings: report.executiveSummary.issueTotals.high,
      workstreamTasks: report.remediationRegister.length,
      workstreamEstimates: report.executiveSummary.workstreamEstimates,
    },
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Generates full JSON report bundle.
 */
export function exportFullBundleJson(report: ExpertReport): string {
  return JSON.stringify(report, null, 2);
}
