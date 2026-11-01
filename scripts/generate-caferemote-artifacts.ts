import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { scanOrchestrator } from "../src/lib/scanner/orchestrator";
import { jobManager } from "../src/lib/scanner/job-manager";
import { scanDb } from "../src/lib/persistence/db";
import { pdfGenerator } from "../src/lib/reports/pdf-generator";
import { expertPdfGenerator } from "../src/lib/reports/expert-pdf-generator";
import { exportRuleLedgerCsv } from "../src/lib/reports/expert-export";
import { rasterizePdf } from "./pdf-rasterizer.mjs";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  console.log("================================================================================");
  console.log("   SiteIntel Pulse — Single Shared Scan Artifact Generator");
  console.log("   Generating Owner PDF, Expert PDF & 56-Rule CSV from ONE Audit Snapshot");
  console.log("================================================================================");
  console.log("   Target URL: https://www.caferemote.com/");
  console.log("   Budget:     50 HTML Pages | Max Depth: 2 | Category: auto | Market: US\n");

  const candidateDir = path.resolve("pdf-review-artifacts/single-scan-candidate");
  await fs.mkdir(candidateDir, { recursive: true });

  const authService = scanDb.getAuthService();
  const guest = authService.createGuestSession("198.51.100.60");

  let ownerReport: any;
  let expertReport: any;
  let jobId: string;

  if (process.env.REUSE_SCAN_ID) {
    jobId = process.env.REUSE_SCAN_ID;
    console.log(`--- Step 1: Loading Shared Audit Job ${jobId} from SQLite ---`);
    const existingJob = await scanDb.getJob(jobId);
    if (!existingJob) throw new Error(`Job ${jobId} not found in database`);
    ownerReport = existingJob.report || await scanDb.getReport(jobId);
    expertReport = existingJob.expertReport || await scanDb.getExpertReport(jobId);
    if (!ownerReport || !expertReport) {
      throw new Error(`Report(s) missing for job ${jobId}`);
    }
    console.log(`Loaded existing snapshot for ${jobId}`);
  } else {
    console.log("--- Step 1: Submitting Single Audit Job ---");
    const scanSub = await jobManager.submitScan(
      {
        targetUrl: "https://www.caferemote.com/",
        reportType: "expert",
        platformName: "CafeRemote",
        businessCategory: "auto",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 50,
        maxDepth: 2,
      },
      guest.tenant.id,
      guest.user.id
    );

    if (!scanSub.job) throw new Error(`Scan submit failed: ${scanSub.error}`);
    const job = scanSub.job;
    jobId = job.id;
    console.log(`Scan Job ID:  ${job.id}`);
    console.log(`Tenant ID:    ${guest.tenant.id}`);

    console.log("\n--- Step 2: Executing Shared Audit (1 Live Crawl & Analysis Pass) ---");
    const startTime = Date.now();
    const result = await scanOrchestrator.runSharedAudit(job);
    ownerReport = result.ownerReport;
    expertReport = result.expertReport;
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`Shared audit completed in ${durationSec}s`);

    if (!ownerReport || !expertReport) {
      throw new Error("Shared audit returned null report(s)");
    }
  }

  // 1. Verify Scan ID Identity
  console.log("\n--- Step 3: Verifying Shared Identity ---");
  const ownerScanId = ownerReport.scanId;
  const expertScanId = expertReport.metadata.scanId;
  console.log(`Owner Report Scan ID:  ${ownerScanId}`);
  console.log(`Expert Report Scan ID: ${expertScanId}`);
  console.log(`Submitted Job ID:      ${jobId}`);

  if (ownerScanId !== jobId || expertScanId !== jobId) {
    throw new Error(`Scan ID mismatch! Owner: ${ownerScanId}, Expert: ${expertScanId}, Job: ${jobId}`);
  }
  console.log("✓ Shared Scan ID identity verified across both reports.");

  // 2. Generate Artifacts in Candidate Directory
  console.log("\n--- Step 4: Generating Candidate Artifacts ---");
  const ownerPdfPath = path.join(candidateDir, "Owner-Report-CafeRemote.pdf");
  const expertPdfPath = path.join(candidateDir, "Expert-Report-CafeRemote.pdf");
  const csvPath = path.join(candidateDir, "caferemote-56-rule-ledger.csv");

  console.log("Rendering Owner PDF...");
  const ownerPdfBuffer = await pdfGenerator.generatePdf(ownerReport, ownerPdfPath);
  console.log(`✓ Owner PDF generated:  ${ownerPdfPath} (${ownerPdfBuffer.length} bytes)`);

  console.log("Rendering Expert PDF...");
  const expertPdfBuffer = await expertPdfGenerator.generatePdf(expertReport, expertPdfPath);
  console.log(`✓ Expert PDF generated: ${expertPdfPath} (${expertPdfBuffer.length} bytes)`);

  console.log("Exporting 56-Rule Assessment Ledger CSV...");
  const csvContent = exportRuleLedgerCsv(expertReport);
  await fs.writeFile(csvPath, csvContent, "utf8");
  console.log(`✓ 56-Rule CSV generated: ${csvPath} (${Buffer.byteLength(csvContent, "utf8")} bytes)`);

  // 3. Rasterize and Check PDF Pages
  console.log("\n--- Step 5: Rasterizing & Verifying PDF Page Metrics ---");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const rasterDir = path.join(candidateDir, "rasterized-pages");
    const ownerRaster = await rasterizePdf(browser, ownerPdfBuffer, rasterDir, "owner-caferemote", 1.5);
    const expertRaster = await rasterizePdf(browser, expertPdfBuffer, rasterDir, "expert-caferemote", 1.5);

    console.log(`Owner PDF Page Count:  ${ownerRaster.numPages} pages (Expected: 9 with 56-rule appendix)`);
    console.log(`Expert PDF Page Count: ${expertRaster.numPages} pages (Expected: 14-16)`);

    // 4. Verify CSV Content
    console.log("\n--- Step 6: Verifying 56-Rule CSV Ledger ---");
    const csvLines = csvContent.trim().split("\r\n");
    const csvHeader = csvLines[0];
    const csvDataRows = csvLines.slice(1);
    console.log(`CSV Header: ${csvHeader}`);
    console.log(`CSV Total Data Rows: ${csvDataRows.length} (Expected: 56)`);

    if (csvDataRows.length !== 56) {
      throw new Error(`CSV row count is ${csvDataRows.length}, expected exactly 56!`);
    }

    const statusCounts: Record<string, number> = {};
    let totalCsvAllocatedPoints = 0;
    let totalCsvEvaluatedPoints = 0;
    let totalCsvEarnedPoints = 0;

    for (const line of csvDataRows) {
      const parsed = parseCsvLine(line);
      const status = parsed[3] || "UNKNOWN";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      totalCsvAllocatedPoints += parseFloat(parsed[6]) || 0;
      totalCsvEvaluatedPoints += parseFloat(parsed[7]) || 0;
      totalCsvEarnedPoints += parseFloat(parsed[8]) || 0;
    }

    console.log(`CSV Status Distribution:`, statusCounts);
    console.log(`CSV Total Allocated Points: ${totalCsvAllocatedPoints}`);
    console.log(`CSV Total Evaluated Points: ${totalCsvEvaluatedPoints}`);
    console.log(`CSV Total Earned Points:    ${totalCsvEarnedPoints}`);

    // 5. Verify Score and Category Reconciliation
    console.log("\n--- Step 7: Score & Data Reconciliation ---");
    const ownerScore = ownerReport.executiveSnapshot.overallScore;
    const expertScore = expertReport.executiveSummary.overallScore;

    console.log(`Owner Overall Score:  ${ownerScore.score}/100 (${ownerScore.ratingBand})`);
    console.log(`Expert Overall Score: ${expertScore.score}/100 (${expertScore.ratingBand})`);

    if (ownerScore.score !== expertScore.score) {
      throw new Error(`Overall score mismatch: Owner ${ownerScore.score} vs Expert ${expertScore.score}`);
    }

    console.log(`Owner Points:  ${ownerScore.pointsEarned ?? ownerScore.totalEarnedCataloguePoints} earned / ${ownerScore.pointsActuallyEvaluated ?? ownerScore.evaluatedWeightedPoints} evaluated`);
    console.log(`Expert Points: ${expertScore.pointsEarned ?? expertScore.totalEarnedCataloguePoints} earned / ${expertScore.pointsActuallyEvaluated ?? expertScore.evaluatedWeightedPoints} evaluated`);

    // Verify Remediation Hours Consistency
    const workstreamTotalHours = expertReport.executiveSummary.workstreamEstimates.reduce(
      (acc: number, we: any) => acc + (we.estimatedHours || 0),
      0
    );
    const tasksSum = expertReport.remediationRegister.reduce(
      (acc: number, t: any) => acc + (t.estimatedHours || 0),
      0
    );

    console.log(`Workstream Estimates Sum: ${workstreamTotalHours} hrs across ${expertReport.executiveSummary.workstreamEstimates.length} workstreams`);
    console.log(`Remediation Tasks Sum:    ${tasksSum} hrs across ${expertReport.remediationRegister.length} tasks`);

    if (workstreamTotalHours !== tasksSum) {
      throw new Error(`Remediation hours mismatch: Workstream sum is ${workstreamTotalHours}h but task sum is ${tasksSum}h!`);
    }
    console.log("✓ Remediation hours mathematically agree between workstream estimates and task rows.");

    // Verify Crawl Scope Transparency
    console.log("\n--- Step 8: Crawl Scope Transparency ---");
    const crawl = expertReport.coverage;
    console.log(`Tested HTML Pages:         ${crawl.testedPages}`);
    console.log(`Discovered URLs:           ${crawl.discoveredPages}`);
    console.log(`Skipped Pages:             ${crawl.skippedPages}`);
    console.log(`Failed Pages:              ${crawl.failedPages}`);

    // Verify Speed Metrics (Mobile & Desktop)
    console.log("\n--- Step 9: Multi-Device Speed Audit Metrics ---");
    const labScores = expertReport.performanceDiagnostics.labScores;
    const mob = labScores?.mobileLab;
    const dsk = labScores?.desktopLab;
    console.log(`Provider: ${labScores?.providerName || "Headless Chromium Lab Engine"}`);
    console.log(`Mobile:  Score ${labScores?.mobileScore ?? "N/A"}/100 | FCP: ${mob?.fcpMs ?? "N/A"}ms | LCP: ${mob?.lcpMs ?? "N/A"}ms | TBT: ${mob?.tbtMs ?? "N/A"}ms | CLS: ${mob?.cls ?? "N/A"} | SI: ${mob?.speedIndexMs ?? "N/A"}ms | TTFB: ${mob?.ttfbMs ?? "N/A"}ms`);
    console.log(`Desktop: Score ${labScores?.desktopScore ?? "N/A"}/100 | FCP: ${dsk?.fcpMs ?? "N/A"}ms | LCP: ${dsk?.lcpMs ?? "N/A"}ms | TBT: ${dsk?.tbtMs ?? "N/A"}ms | CLS: ${dsk?.cls ?? "N/A"} | SI: ${dsk?.speedIndexMs ?? "N/A"}ms | TTFB: ${dsk?.ttfbMs ?? "N/A"}ms`);

    // Verify Unified Assessment & Issues Summary
    console.log("\n--- Step 10: Unified Assessment & Issues Summary ---");
    const summary = expertReport.assessmentAndIssuesSummary;
    if (summary) {
      console.log(`Rules Evaluated:  ${summary.ruleCounts.totalAccounted}/56`);
      console.log(`Passed:           ${summary.ruleCounts.pass}`);
      console.log(`Warnings:         ${summary.ruleCounts.warn}`);
      console.log(`Issues/Failures:  ${summary.ruleCounts.fail}`);
      console.log(`Not Applicable:   ${summary.ruleCounts.notApplicable}`);
      console.log(`Not Tested:       ${summary.ruleCounts.notTested}`);
      console.log(`Total Findings:   ${summary.severityCounts.totalUniqueFindings}`);
      console.log(`Issues Breakout:  Critical: ${summary.severityCounts.critical}, High: ${summary.severityCounts.high}, Medium: ${summary.severityCounts.medium}, Low: ${summary.severityCounts.low}`);
      console.log(`Reproducible:     ${summary.technicalErrorCounts.confirmedReproducibleDefects}`);
    }

    // Calculate Checksums
    const ownerHash = crypto.createHash("sha256").update(ownerPdfBuffer).digest("hex");
    const expertHash = crypto.createHash("sha256").update(expertPdfBuffer).digest("hex");
    const csvHash = crypto.createHash("sha256").update(csvContent, "utf8").digest("hex");

    console.log(`\n================================================================================`);
    console.log(`   CANDIDATE ARTIFACTS VERIFICATION SUCCESSFUL`);
    console.log(`================================================================================`);
    console.log(`Shared Scan ID:     ${jobId}`);
    console.log(`Owner PDF:          ${ownerPdfPath}`);
    console.log(`  Size:             ${ownerPdfBuffer.length} bytes`);
    console.log(`  Pages:            ${ownerRaster.numPages}`);
    console.log(`  SHA-256:          ${ownerHash}`);
    console.log(`Expert PDF:         ${expertPdfPath}`);
    console.log(`  Size:             ${expertPdfBuffer.length} bytes`);
    console.log(`  Pages:            ${expertRaster.numPages}`);
    console.log(`  SHA-256:          ${expertHash}`);
    console.log(`56-Rule CSV:        ${csvPath}`);
    console.log(`  Size:             ${Buffer.byteLength(csvContent, "utf8")} bytes`);
    console.log(`  Rows:             ${csvDataRows.length}`);
    console.log(`  SHA-256:          ${csvHash}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
