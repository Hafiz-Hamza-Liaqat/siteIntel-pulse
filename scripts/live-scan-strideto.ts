import fs from "node:fs/promises";
import path from "node:path";
import { SafeCrawler } from "../src/lib/scanner/crawler";
import { assessmentRegistry } from "../src/lib/catalogue/registry";
import { projectOwnerReport } from "../src/lib/reports/owner-projection";
import { projectExpertReport } from "../src/lib/reports/expert-projection";
import { generateReportHtml } from "../src/lib/reports/pdf-generator";
import { generateExpertReportHtml } from "../src/lib/reports/expert-pdf-generator";
import { exportFindingsCsv, exportRemediationCsv, exportInventoryCsv, exportManifestJson } from "../src/lib/reports/expert-export";
import { jobManager } from "../src/lib/scanner/job-manager";
import { scanDb } from "../src/lib/persistence/db";
import { chromium } from "playwright";

async function main() {
  console.log("================================================================================");
  console.log("   SiteIntel Pulse — Genuine Bounded Live Assessment: https://strideto.com");
  console.log("================================================================================");
  console.log("   PROVENANCE: GENUINE LIVE OUTBOUND NETWORK OBSERVATION");
  console.log("   Target: https://strideto.com");
  console.log("   Engine: SafeCrawler with SSRF DNS Protection & Bounded Budgets");
  console.log("================================================================================");

  const scanStartTime = new Date();
  const startTimeMs = Date.now();

  const scanRequest = {
    targetUrl: "https://strideto.com",
    reportType: "owner" as const,
    platformName: "StrideTo",
    businessCategory: "ecommerce" as const,
    targetMarket: "Global",
    preferredLanguage: "en",
    businessGoal: "E-Commerce brand and marketplace for premium lifestyle products",
    targetAudience: "Online shoppers, fitness & lifestyle enthusiasts",
    competitors: ["https://nike.com", "https://adidas.com"],
    maxPages: 10,
    maxDepth: 2,
  };

  console.log(`\n[Stage 1: Scan Intake & Registration]`);
  console.log(`  Target:             ${scanRequest.targetUrl}`);
  console.log(`  Scan Timestamp:     ${scanStartTime.toISOString()}`);
  console.log(`  Scope Bounds:       Max ${scanRequest.maxPages} pages, Max Depth ${scanRequest.maxDepth}`);

  const submission = await jobManager.submitScan(scanRequest);
  if (!submission.job) {
    throw new Error(`Job submission failed: ${submission.error}`);
  }
  const job = submission.job;
  console.log(`  Scan Job ID:        ${job.id}`);

  // Stage 2: Genuine Bounded Network Crawl
  console.log(`\n[Stage 2: Live Network Crawling & Evidence Discovery]`);
  const crawler = new SafeCrawler({
    maxPages: scanRequest.maxPages,
    maxDepth: scanRequest.maxDepth,
  });

  const crawlResult = await crawler.crawlWebsite(scanRequest.targetUrl, (stage, discovered, tested) => {
    console.log(`  Crawler Progress:   ${stage} (Discovered: ${discovered}, Tested: ${tested})`);
  });

  const crawlEndTimeMs = Date.now();
  console.log(`\n  Crawl Duration:     ${crawlEndTimeMs - startTimeMs} ms`);
  console.log(`  Pages Discovered:   ${crawlResult.coverage.discoveredPages}`);
  console.log(`  Pages Tested:       ${crawlResult.coverage.testedPages}`);
  console.log(`  Total Data Fetched: ${crawlResult.coverage.totalBytesFetched} bytes`);
  console.log(`  Robots.txt Status:  ${crawlResult.robotsTxt ? `Observed (${crawlResult.robotsTxt.length} bytes)` : "Not Found / Inaccessible"}`);
  console.log(`  Sitemaps Found:     ${crawlResult.sitemapUrls.length}`);
  console.log(`  External Tested:    ${crawlResult.externalLinksTested.length}`);

  if (crawlResult.pages.length === 0) {
    throw new Error("Live crawl retrieved 0 pages from https://strideto.com");
  }

  console.log(`\n[Stage 3: Pages Discovered & Crawled]`);
  crawlResult.pages.forEach((p, idx) => {
    console.log(`  Page ${idx + 1}: ${p.requestedUrl}`);
    console.log(`    Final URL:        ${p.finalUrl}`);
    console.log(`    HTTP Status:      ${p.statusCode}`);
    console.log(`    Response Time:    ${p.responseTimeMs} ms`);
    console.log(`    Title:            "${p.title || 'Untitled'}"`);
    console.log(`    Word Count:       ${p.visibleWordCount}`);
    console.log(`    H1 Elements:      ${JSON.stringify(p.headings?.h1 || [])}`);
    console.log(`    Internal Links:   ${p.links.filter(l => l.isInternal).length}`);
    console.log(`    External Links:   ${p.links.filter(l => !l.isInternal).length}`);
    console.log(`    Images / Scripts: ${p.resources.filter(r => r.type === "image").length} img, ${p.resources.filter(r => r.type === "script").length} scripts`);
  });

  // Stage 4: Catalogue Evaluation Against Live Evidence
  console.log(`\n[Stage 4: Catalogue Evaluation Against Live Evidence]`);
  const parsedStart = new URL(crawlResult.pages[0].finalUrl || scanRequest.targetUrl);
  const evalContext = {
    targetUrl: scanRequest.targetUrl,
    domain: parsedStart.hostname,
    businessCategory: scanRequest.businessCategory,
    pages: crawlResult.pages,
    robotsTxt: crawlResult.robotsTxt,
    sitemapUrls: crawlResult.sitemapUrls,
    externalLinksTested: crawlResult.externalLinksTested,
    competitors: scanRequest.competitors,
  };

  const assessmentResults = assessmentRegistry.evaluateAll(evalContext);
  console.log(`  Catalogue Rules:    ${assessmentResults.length} rules evaluated (Version 1.0.0)`);

  const passed = assessmentResults.filter(r => r.status === "PASS").length;
  const warnings = assessmentResults.filter(r => r.status === "WARNING").length;
  const failed = assessmentResults.filter(r => r.status === "FAIL").length;
  const notDetected = assessmentResults.filter(r => r.status === "NOT_DETECTED").length;
  const unknown = assessmentResults.filter(r => r.status === "UNKNOWN" || r.status === "NOT_TESTED" || r.status === "BLOCKED" || r.status === "NOT_APPLICABLE").length;
  console.log(`  Findings Breakdown: PASS: ${passed}, WARNING: ${warnings}, FAIL: ${failed}, NOT_DETECTED: ${notDetected}, OTHER: ${unknown}`);

  // Stage 5: Dual Projections (Owner & Expert)
  console.log(`\n[Stage 5: Dual Projections (Owner & Expert)]`);
  const ownerReport = projectOwnerReport(job.id, scanRequest, crawlResult, assessmentResults);
  const expertReport = projectExpertReport(job.id, scanRequest, crawlResult, assessmentResults);

  await scanDb.saveReport(ownerReport);
  await scanDb.saveExpertReport(expertReport);

  console.log(`  Owner Report ID:    ${ownerReport.reportId}`);
  console.log(`  Owner Score:        ${ownerReport.executiveSnapshot.overallScore.score} / 100 (${ownerReport.executiveSnapshot.overallScore.ratingBand})`);
  console.log(`  Owner Provisional:  ${ownerReport.executiveSnapshot.overallScore.isProvisional ? "YES (Provisional)" : "NO (Fully Assessed)"}`);
  console.log(`  Coverage %:         ${ownerReport.executiveSnapshot.coverage.coveragePercentage}% (${ownerReport.executiveSnapshot.coverage.weightedPointsEvaluated} / 100 pts)`);

  const totalEstHours = expertReport.remediationRegister.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  console.log(`\n  Expert Report ID:   ${expertReport.metadata.reportId}`);
  console.log(`  Diagnostic Findings:${expertReport.findings.length}`);
  console.log(`  URL Inventory:      ${expertReport.urlInventory.length}`);
  console.log(`  Remediation Tasks:  ${expertReport.remediationRegister.length}`);
  console.log(`  Est. Total Hours:   ${totalEstHours} hours`);

  console.log("\n  --- Category Score & Coverage Ledger (Live strideto.com) ---");
  for (const cat of ownerReport.executiveSnapshot.categoryScores) {
    const status = cat.isEligibleForOverall ? "ELIGIBLE (≥60%)" : "PROVISIONAL (<60%)";
    console.log(
      `  • ${cat.categoryName.padEnd(38)} Allocated: ${String(cat.allocatedWeight).padStart(2)} pts | Tested: ${String(cat.testedPoints).padStart(2)} pts (${String(cat.coveragePercentage).padStart(4)}% cov) | Earned: ${String(cat.earnedPoints).padStart(4)} / ${String(cat.testedPoints).padStart(2)} pts | Score: ${String(cat.scorePercentage).padStart(3)}% | ${status}`
    );
  }

  // Stage 6: Multi-Format Exports
  console.log(`\n[Stage 6: Multi-Format Export Generation]`);
  const testResultsDir = path.resolve(process.cwd(), "test-results");
  await fs.mkdir(testResultsDir, { recursive: true });

  // 1. Findings CSV
  const findingsCsv = exportFindingsCsv(expertReport);
  await fs.writeFile(path.join(testResultsDir, "strideto-findings.csv"), findingsCsv, "utf8");
  console.log(`  Generated findings CSV:    ${Buffer.byteLength(findingsCsv)} bytes`);

  // 2. Inventory CSV
  const inventoryCsv = exportInventoryCsv(expertReport);
  await fs.writeFile(path.join(testResultsDir, "strideto-inventory.csv"), inventoryCsv, "utf8");
  console.log(`  Generated inventory CSV:   ${Buffer.byteLength(inventoryCsv)} bytes`);

  // 3. Remediation CSV
  const remediationCsv = exportRemediationCsv(expertReport);
  await fs.writeFile(path.join(testResultsDir, "strideto-remediation.csv"), remediationCsv, "utf8");
  console.log(`  Generated remediation CSV: ${Buffer.byteLength(remediationCsv)} bytes`);

  // 4. JSON Dump
  const jsonDump = JSON.stringify(expertReport, null, 2);
  await fs.writeFile(path.join(testResultsDir, "strideto-expert.json"), jsonDump, "utf8");
  console.log(`  Generated expert JSON:     ${Buffer.byteLength(jsonDump)} bytes`);

  // 5. Verification Manifest
  const manifestJson = exportManifestJson(expertReport);
  await fs.writeFile(path.join(testResultsDir, "strideto-manifest.json"), manifestJson, "utf8");
  console.log(`  Generated SHA-256 Manifest: ${manifestJson.length} bytes`);

  // 6. Owner PDF & Expert PDF via Playwright
  console.log(`\n[Stage 7: Playwright PDF Generation for strideto.com]`);
  const browser = await chromium.launch({ headless: true });
  try {
    // Owner PDF
    const ownerPage = await browser.newPage();
    const ownerHtml = generateReportHtml(ownerReport);
    await ownerPage.setContent(ownerHtml, { waitUntil: "networkidle" });
    const ownerPdfPath = path.join(testResultsDir, "strideto-owner-report.pdf");
    await ownerPage.pdf({ path: ownerPdfPath, format: "A4", printBackground: true });
    const ownerStat = await fs.stat(ownerPdfPath);
    console.log(`  Owner Report PDF:   ${ownerPdfPath} (${ownerStat.size} bytes)`);

    // Expert PDF
    const expertPage = await browser.newPage();
    const expertHtml = generateExpertReportHtml(expertReport);
    await expertPage.setContent(expertHtml, { waitUntil: "networkidle" });
    const expertPdfPath = path.join(testResultsDir, "strideto-expert-report.pdf");
    await expertPage.pdf({ path: expertPdfPath, format: "A4", printBackground: true });
    const expertStat = await fs.stat(expertPdfPath);
    console.log(`  Expert Report PDF:  ${expertPdfPath} (${expertStat.size} bytes)`);
  } finally {
    await browser.close();
  }

  console.log(`\n================================================================================`);
  console.log(`   LIVE SCAN FOR https://strideto.com COMPLETED SUCCESSFULLY`);
  console.log(`   Total Duration: ${Date.now() - startTimeMs} ms`);
  console.log(`================================================================================`);
}

main().catch(err => {
  console.error("FATAL ERROR in live scan:", err);
  process.exit(1);
});
