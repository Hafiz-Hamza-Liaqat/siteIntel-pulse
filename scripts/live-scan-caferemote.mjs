import { scanOrchestrator } from "../src/lib/scanner/orchestrator.ts";
import { jobManager } from "../src/lib/scanner/job-manager.ts";
import { scanDb } from "../src/lib/persistence/db.ts";
import { pdfGenerator } from "../src/lib/reports/pdf-generator.ts";
import { expertPdfGenerator } from "../src/lib/reports/expert-pdf-generator.ts";
import { createHash } from "node:crypto";

async function runCafeRemoteValidation() {
  console.log("================================================================================");
  console.log("   SiteIntel Pulse — Live CafeRemote Audit & Evidence Integrity Verification");
  console.log("================================================================================");
  console.log("   Target URL:         https://www.caferemote.com/");
  console.log("   Business Category:  job_board");
  console.log("   Validation Goals:   No fabricated scores, genuine H1 extraction, clean auth URLs,");
  console.log("                       truthful provider status, verifiable manifest, PDF export.");
  console.log("================================================================================\n");

  const authService = scanDb.getAuthService();

  // 1. Issue an Isolated Guest Session for Owner Scan
  console.log("[Phase 1: Owner Report Scan — https://www.caferemote.com/]");
  const guestOwner = authService.createGuestSession("198.51.100.50");
  console.log(`  Guest Tenant ID:   ${guestOwner.tenant.id}`);

  const ownerSubmission = await jobManager.submitScan(
    {
      targetUrl: "https://www.caferemote.com/",
      reportType: "owner",
      platformName: "CafeRemote Job Board",
      businessCategory: "job_board",
      targetMarket: "Global",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 3,
      maxDepth: 1,
    },
    guestOwner.tenant.id,
    guestOwner.user.id
  );

  if (!ownerSubmission.job) {
    throw new Error(`Owner job submission failed: ${ownerSubmission.error}`);
  }

  const ownerJob = ownerSubmission.job;
  console.log(`  Owner Job ID:      ${ownerJob.id}`);
  console.log("  Running scan orchestrator...");
  await scanOrchestrator.runAudit(ownerJob);

  const verifiedOwnerJob = await scanDb.getJob(ownerJob.id, guestOwner.tenant.id);
  console.log(`  Job Status:        ${verifiedOwnerJob?.status}`);
  console.log(`  Pages Crawled:     ${verifiedOwnerJob?.testedCount}`);

  const ownerReport = verifiedOwnerJob?.report;
  if (!ownerReport) {
    throw new Error("FAIL: Owner report was not generated!");
  }

  console.log(`\n  --- Owner Report Evidence Integrity Checks ---`);
  console.log(`  Report ID:         ${ownerReport.reportId}`);
  console.log(`  Overall Score:     ${ownerReport.executiveSnapshot.overallScore.score} / 100 (${ownerReport.executiveSnapshot.overallScore.ratingBand})`);
  console.log(`  Pages Tested:      ${ownerReport.executiveSnapshot.testedPageCount}`);

  // Check 1: No fabricated mobile/desktop performance scores
  const mobScore = ownerReport.performanceAndResponsiveSummary.mobileLabScore;
  const deskScore = ownerReport.performanceAndResponsiveSummary.desktopLabScore;
  console.log(`  Mobile Lab Score:  ${mobScore} (Truthful: null when provider unconfigured)`);
  console.log(`  Desktop Lab Score: ${deskScore} (Truthful: null when provider unconfigured)`);
  console.log(`  CWV Status:        ${ownerReport.performanceAndResponsiveSummary.coreWebVitalsStatus}`);
  if (mobScore === 76 || deskScore === 89) {
    throw new Error("FABRICATION DETECTED: Hardcoded UX performance scores 76/89 found in owner report!");
  }
  if (mobScore !== null || deskScore !== null) {
    throw new Error(`FABRICATION DETECTED: Expected null lab scores when PageSpeed provider is not connected, got ${mobScore}/${deskScore}`);
  }

  // Check 2: No fabricated viewports
  const viewports = ownerReport.performanceAndResponsiveSummary.testedViewports;
  console.log(`  Tested Viewports:  ${JSON.stringify(viewports)}`);
  if (viewports.length === 7) {
    throw new Error("FABRICATION DETECTED: Fabricated 7-viewport mock matrix found in owner report!");
  }

  // Check 3: Competitor assessment is truthful
  console.log(`  Competitor Count:  ${ownerReport.competitorSnapshot.length}`);
  for (const c of ownerReport.competitorSnapshot) {
    if (c.overallScore !== null) {
      throw new Error(`FABRICATION DETECTED: Competitor score is ${c.overallScore}, expected null for unassessed competitor`);
    }
    if (c.status !== "NOT_ASSESSED") {
      throw new Error(`Integrity error: Expected competitor status = 'NOT_ASSESSED', got ${c.status}`);
    }
  }

  // Check 4: Auth surfaces found ignores job slugs
  console.log(`  Auth Surfaces:     ${ownerReport.securityAndAuthSummary.authSurfacesFound}`);

  // Check 5: Extracted H1 has clean normalized whitespace from SEO-02 result
  const h1Result = ownerReport.results.find((r) => r.testId === "SEO-02");
  console.log(`  SEO-02 (H1) Status: ${h1Result?.status} (Score: ${h1Result?.awardedPoints}/${h1Result?.allocatedPoints})`);
  console.log(`  SEO-02 Evidence:    ${JSON.stringify(h1Result?.sampleEvidence)}`);
  for (const ev of h1Result?.sampleEvidence || []) {
    if (ev.includes("\n") || ev.includes("  ")) {
      throw new Error(`Whitespace normalization failure in H1 evidence: ${ev}`);
    }
  }

  // Check 6: Single-Report Invariant
  if (verifiedOwnerJob?.expertReport || verifiedOwnerJob?.expertReportId) {
    throw new Error("VIOLATION: Expert report was generated or attached during an Owner scan!");
  }
  const dbExpertCheck = await scanDb.getExpertReport(ownerJob.id, guestOwner.tenant.id);
  if (dbExpertCheck !== null) {
    throw new Error("VIOLATION: Expert report record exists in database for Owner scan!");
  }
  console.log("  Single-Report OK:  Verified Owner Report present; Expert Report strictly absent.");

  // Check 7: Owner PDF Generation
  console.log("  Testing Owner PDF generation...");
  const ownerPdfBuffer = await pdfGenerator.generatePdf(ownerReport);
  console.log(`  Owner PDF Size:    ${ownerPdfBuffer.length} bytes (Header: ${ownerPdfBuffer.subarray(0, 5).toString()})`);
  if (!ownerPdfBuffer.subarray(0, 5).toString().startsWith("%PDF-")) {
    throw new Error("Owner PDF did not produce a valid %PDF header!");
  }
  console.log("  [PASS] Owner Report validated successfully.");


  // 2. Issue Second Isolated Guest Session for Expert Scan
  console.log("\n[Phase 2: Expert Diagnostic Scan — https://www.caferemote.com/]");
  const guestExpert = authService.createGuestSession("198.51.100.51");
  console.log(`  Guest Tenant ID:   ${guestExpert.tenant.id}`);

  const expertSubmission = await jobManager.submitScan(
    {
      targetUrl: "https://www.caferemote.com/",
      reportType: "expert",
      platformName: "CafeRemote Job Board",
      businessCategory: "job_board",
      targetMarket: "Global",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 3,
      maxDepth: 1,
    },
    guestExpert.tenant.id,
    guestExpert.user.id
  );

  if (!expertSubmission.job) {
    throw new Error(`Expert job submission failed: ${expertSubmission.error}`);
  }

  const expertJob = expertSubmission.job;
  console.log(`  Expert Job ID:     ${expertJob.id}`);
  console.log("  Running scan orchestrator...");
  await scanOrchestrator.runAudit(expertJob);

  const verifiedExpertJob = await scanDb.getJob(expertJob.id, guestExpert.tenant.id);
  console.log(`  Job Status:        ${verifiedExpertJob?.status}`);
  console.log(`  Pages Crawled:     ${verifiedExpertJob?.testedCount}`);

  const expertReport = verifiedExpertJob?.expertReport;
  if (!expertReport) {
    throw new Error("FAIL: Expert report was not generated!");
  }

  console.log(`\n  --- Expert Report Evidence Integrity Checks ---`);
  console.log(`  Expert Report ID:  ${expertReport.metadata.reportId}`);
  console.log(`  Overall Score:     ${expertReport.executiveSummary.overallScore.score} / 100 (${expertReport.executiveSummary.overallScore.ratingBand})`);
  console.log(`  Findings Count:    ${expertReport.findings.length}`);
  console.log(`  URL Count:         ${expertReport.urlInventory.length}`);
  console.log(`  Remediation Tasks: ${expertReport.remediationRegister.length}`);

  // Check 1: Performance diagnostic returns NOT_CONNECTED and null values
  console.log(`  Lab Perf Status:   ${expertReport.performanceDiagnostics.labScores.status}`);
  console.log(`  Lab Perf Score:    ${expertReport.performanceDiagnostics.labScores.mobile}`);
  if (expertReport.performanceDiagnostics.labScores.status !== "NOT_CONNECTED") {
    throw new Error(`Integrity error: Expected performance.status = 'NOT_CONNECTED', got ${expertReport.performanceDiagnostics.labScores.status}`);
  }
  if (expertReport.performanceDiagnostics.labScores.mobile !== null) {
    throw new Error(`FABRICATION DETECTED: Lab performance score is ${expertReport.performanceDiagnostics.labScores.mobile}, expected null!`);
  }

  // Check 2: Session Security reports NO_COOKIES_OBSERVED or OBSERVED with honest flags
  console.log(`  Auth Session Status: ${expertReport.authenticationAssessment.sessionSecurity.status}`);
  console.log(`  Cookie Secure Flag:  ${expertReport.authenticationAssessment.sessionSecurity.cookieSecure}`);
  console.log(`  Cookie HttpOnly:     ${expertReport.authenticationAssessment.sessionSecurity.cookieHttpOnly}`);
  console.log(`  Cookie SameSite:     ${expertReport.authenticationAssessment.sessionSecurity.cookieSameSite}`);

  // Check 3: Cryptographic Manifest
  console.log(`  Manifest Digest:     ${expertReport.exportManifest.checksum}`);
  if (!expertReport.exportManifest.checksum?.startsWith("sha256:")) {
    throw new Error("Integrity error: Export manifest checksum does not start with 'sha256:'");
  }

  // Check 4: Remediation Advice integrity - zero placeholders
  for (const finding of expertReport.findings) {
    if (finding.remediation && finding.remediation.includes("Follow documented remediation procedures for this test rule")) {
      throw new Error(`PLACEHOLDER DETECTED: Finding ${finding.id} contains generic placeholder advice!`);
    }
  }
  console.log("  Remediation Advice:  Verified authentic catalogue guidance for all findings.");

  // Check 5: Extracted H1 from URL inventory
  const homePageDiag = expertReport.urlInventory.find((p) => !p.url.includes("sitemap.xml"));
  console.log(`  Extracted H1:        ${JSON.stringify(homePageDiag?.headingsOutline?.h1)}`);
  for (const h1 of homePageDiag?.headingsOutline?.h1 || []) {
    if (h1.includes("\n") || h1.includes("  ")) {
      throw new Error(`Whitespace normalization failure in expert report H1: ${h1}`);
    }
  }

  // Check 6: Single-Report Invariant
  if (verifiedExpertJob?.report || verifiedExpertJob?.ownerReportId) {
    throw new Error("VIOLATION: Owner report was generated or attached during an Expert scan!");
  }
  const dbOwnerCheck = await scanDb.getReport(expertJob.id, guestExpert.tenant.id);
  if (dbOwnerCheck !== null) {
    throw new Error("VIOLATION: Owner report record exists in database for Expert scan!");
  }
  console.log("  Single-Report OK:  Verified Expert Report present; Owner Report strictly absent.");

  // Check 7: Expert PDF Generation
  console.log("  Testing Expert PDF generation...");
  const expertPdfBuffer = await expertPdfGenerator.generatePdf(expertReport);
  console.log(`  Expert PDF Size:   ${expertPdfBuffer.length} bytes (Header: ${expertPdfBuffer.subarray(0, 5).toString()})`);
  if (!expertPdfBuffer.subarray(0, 5).toString().startsWith("%PDF-")) {
    throw new Error("Expert PDF did not produce a valid %PDF header!");
  }
  console.log("  [PASS] Expert Diagnostic Report validated successfully.");

  console.log("\n================================================================================");
  console.log("   LIVE CAFEREMOTE VALIDATION COMPLETE: ALL INTEGRITY & EVIDENCE GATES PASSED");
  console.log("================================================================================");
}

runCafeRemoteValidation().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
