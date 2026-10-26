import path from "node:path";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { scanDb } from "../src/lib/persistence/db.ts";
import { jobManager } from "../src/lib/scanner/job-manager.ts";
import { ScanOrchestrator } from "../src/lib/scanner/orchestrator.ts";
import { pdfGenerator } from "../src/lib/reports/pdf-generator.ts";
import { rasterizePdf } from "./pdf-rasterizer.mjs";

console.log("=================================================================");
console.log("  SiteIntel Pulse — Real Target Audits (End-to-End Pipeline)     ");
console.log("=================================================================\n");

const targets = [
  { name: "CafeRemote", url: "https://www.caferemote.com/" },
  { name: "Naffeez", url: "https://www.naffeez.com/" },
  { name: "STRIDETO", url: "https://www.strideto.com/" },
];

const resultsDir = path.resolve("test-results");
const rasterDir = path.join(resultsDir, "rasterized-pages");
await fs.mkdir(rasterDir, { recursive: true });

const tenantId = "tenant_comp_a";
const userId = "usr_companya_admin";

const orchestrator = new ScanOrchestrator();
const browser = await chromium.launch({ headless: true });
const auditRecords = [];

try {
  for (const t of targets) {
    console.log(`-----------------------------------------------------------------`);
    console.log(`Starting Live Scan for ${t.name}: ${t.url}`);
    console.log(`Configuration: businessCategory="auto", maxPages=5, maxDepth=1`);

    // Submit scan job through jobManager into SQLite
    const submitResult = await jobManager.submitScan(
      {
        targetUrl: t.url,
        reportType: "owner",
        platformName: t.name,
        businessCategory: "auto",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 5,
        maxDepth: 1,
      },
      tenantId,
      userId
    );

    if (submitResult.error || !submitResult.job) {
      throw new Error(`Failed to submit scan for ${t.name}: ${submitResult.error}`);
    }

    const job = submitResult.job;
    console.log(`Scan submitted. Scan ID: ${job.id}`);

    // Execute audit through orchestrator
    const report = await orchestrator.runAudit(job);

    console.log(`Audit finished. Report ID: ${report.reportId}`);

    // Verify report was persisted in database
    const persistedReport = scanDb.getReport(report.reportId, tenantId);
    if (!persistedReport) {
      throw new Error(`Report ${report.reportId} failed to persist in SQLite database!`);
    }

    const detection = report.companyIdentity?.businessCategoryDetection;
    const overall = report.executiveSnapshot?.overallScore;
    const coverage = report.executiveSnapshot?.coverage;

    console.log(`Detection Results:`);
    console.log(`  Primary Category:       ${detection?.primaryCategory}`);
    console.log(`  Effective Category:     ${detection?.effectiveCategory}`);
    console.log(`  Category Label:         ${detection?.categoryLabel}`);
    console.log(`  Confidence:             ${detection?.confidence} (${detection?.confidenceScore})`);
    console.log(`  Decision Source:        ${detection?.decisionSource}`);
    console.log(`  Secondary Facets:       ${JSON.stringify(detection?.secondaryFacets || [])}`);
    console.log(`  Evidence Signals:       ${JSON.stringify(detection?.evidenceSignals || [])}`);
    console.log(`  Overall Score:          ${overall?.score}/100 (${overall?.ratingBand}, provisional: ${overall?.isProvisional})`);
    console.log(`  Pages Tested / Budget:  ${coverage?.testedPages} / ${coverage?.totalPagesBudget} (Discovered: ${coverage?.discoveredPages})`);

    // Extract category-sensitive conversion rules
    const croRuleIds = ["CRO-01", "CRO-02", "CRO-04"];
    const croOutcomes = {};
    for (const ruleId of croRuleIds) {
      const r = (report.results || []).find((res) => res.testId === ruleId);
      if (r) {
        croOutcomes[ruleId] = {
          title: r.title,
          status: r.status,
          earnedPoints: r.earnedPoints,
          maxPoints: r.maxPoints,
          summary: r.summary,
        };
        console.log(`  Conversion Rule [${ruleId}]: ${r.title} => ${r.status} (${r.earnedPoints}/${r.maxPoints} pts)`);
        console.log(`    ${r.summary}`);
      }
    }

    // Generate real PDF for this live scan
    const livePdfPath = path.join(resultsDir, `Live-Scan-${t.name}-${job.id}.pdf`);
    const pdfBuffer = await pdfGenerator.generatePdf(report, livePdfPath);
    console.log(`  Generated Live PDF: ${path.basename(livePdfPath)} (${pdfBuffer.length} bytes)`);

    // Rasterize live PDF pages
    const filePrefix = `live-${t.name.toLowerCase()}-${job.id}`;
    const rasterResult = await rasterizePdf(browser, pdfBuffer, rasterDir, filePrefix, 1.5);
    console.log(`  Rasterized ${rasterResult.numPages} PDF page(s) to ${rasterDir}`);

    auditRecords.push({
      targetName: t.name,
      targetUrl: t.url,
      scanId: job.id,
      reportId: report.reportId,
      generatedAt: report.generatedAt,
      pdfFile: path.basename(livePdfPath),
      pdfSizeBytes: pdfBuffer.length,
      pdfPageCount: rasterResult.numPages,
      rasterizedPages: rasterResult.pages.map((p) => p.imageFileName),
      detection: {
        primaryCategory: detection?.primaryCategory,
        effectiveCategory: detection?.effectiveCategory,
        categoryLabel: detection?.categoryLabel,
        confidence: detection?.confidence,
        confidenceScore: detection?.confidenceScore,
        decisionSource: detection?.decisionSource,
        secondaryFacets: detection?.secondaryFacets || [],
        evidenceSignals: detection?.evidenceSignals || [],
      },
      overallScore: {
        score: overall?.score,
        ratingBand: overall?.ratingBand,
        isProvisional: overall?.isProvisional,
        coveragePercentage: coverage?.coveragePercentage,
      },
      croOutcomes,
    });
  }

  // Save audit records to json
  const recordPath = path.join(resultsDir, "real-site-audits.json");
  await fs.writeFile(recordPath, JSON.stringify(auditRecords, null, 2));
  console.log(`\n=================================================================`);
  console.log(`Saved completed live audit records to: ${recordPath}`);
  console.log(`ALL THREE REAL SITE AUDITS COMPLETED SUCCESSFULLY!`);
  console.log(`=================================================================`);
} finally {
  await browser.close();
}
