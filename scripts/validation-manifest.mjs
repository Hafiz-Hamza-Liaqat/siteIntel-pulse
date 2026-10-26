import fs from "node:fs/promises";
import path from "node:path";

const manifestPath = path.resolve("test-results/pdf-validation-manifest.json");

export async function recordValidationReport(reportEntry) {
  let manifest = {
    generatedAt: new Date().toISOString(),
    engineVersion: "2.0.0",
    summary: {
      totalPdfsValidated: 0,
      totalPdfPagesRasterized: 0,
      allChecksPassed: true,
    },
    reports: [],
  };

  try {
    const existing = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(existing);
  } catch {
    // If doesn't exist yet, start with default template
  }

  // Remove previous entry with same reportId if re-running
  manifest.reports = manifest.reports.filter((r) => r.reportId !== reportEntry.reportId);
  manifest.reports.push(reportEntry);

  manifest.summary.totalPdfsValidated = manifest.reports.length;
  manifest.summary.totalPdfPagesRasterized = manifest.reports.reduce((sum, r) => sum + (r.rasterizedPageCount || 0), 0);
  manifest.summary.allChecksPassed = manifest.reports.every((r) => r.checks && Object.values(r.checks).every(Boolean));
  manifest.generatedAt = new Date().toISOString();

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
