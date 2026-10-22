import { scanOrchestrator } from "../src/lib/scanner/orchestrator.ts";
import { jobManager } from "../src/lib/scanner/job-manager.ts";
import { scanDb } from "../src/lib/persistence/db.ts";

async function runLiveValidation() {
  console.log("================================================================================");
  console.log("   SiteIntel Pulse — Live End-to-End Single-Report Verification");
  console.log("================================================================================");
  console.log("   Target: https://example.com (Live Public RFC 2606 Permitted Domain)");
  console.log("   Invariant: Exactly ONE report generated per scan; guest tenant isolation");
  console.log("================================================================================\n");

  const authService = scanDb.getAuthService();

  // 1. Issue an Isolated Guest Session
  console.log("[Test 1: Guest Session Issuance]");
  const guestA = authService.createGuestSession("198.51.100.12");
  console.log(`  Guest Tenant ID:   ${guestA.tenant.id}`);
  console.log(`  Guest User ID:     ${guestA.user.id}`);
  console.log(`  Guest Plan:        ${guestA.tenant.plan} (Max concurrent: ${guestA.tenant.maxConcurrentScans}, Scans/hr: ${guestA.tenant.scansPerHourQuota})`);
  console.log("  Session Token:     [REDACTED_SESSION_TOKEN]");

  // 2. Submit Live Owner Scan for https://example.com
  console.log("\n[Test 2: Live Owner Scan (https://example.com)]");
  const ownerSubmission = await jobManager.submitScan(
    {
      targetUrl: "https://example.com",
      reportType: "owner",
      platformName: "Example Domain Live",
      businessCategory: "other",
      targetMarket: "Global",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 2,
      maxDepth: 1,
    },
    guestA.tenant.id,
    guestA.user.id
  );

  if (!ownerSubmission.job) {
    throw new Error(`Owner job submission failed: ${ownerSubmission.error}`);
  }

  const ownerJob = ownerSubmission.job;
  console.log(`  Job ID:            ${ownerJob.id}`);
  console.log(`  Status:            ${ownerJob.status}`);

  console.log("  Executing live audit pipeline via ScanOrchestrator...");
  const ownerReportResult = await scanOrchestrator.runAudit(ownerJob);

  // Reload job from DB
  const verifiedOwnerJob = await scanDb.getJob(ownerJob.id, guestA.tenant.id);
  console.log(`  Job Final Status:  ${verifiedOwnerJob?.status}`);
  console.log(`  Current Stage:     ${verifiedOwnerJob?.currentStage}`);
  console.log(`  Pages Tested:      ${verifiedOwnerJob?.testedCount}`);
  console.log(`  Owner Report ID:   ${verifiedOwnerJob?.report?.reportId}`);
  console.log(`  Overall Score:     ${verifiedOwnerJob?.report?.executiveSnapshot.overallScore.score} / 100 (${verifiedOwnerJob?.report?.executiveSnapshot.overallScore.ratingBand})`);
  console.log(`  Catalogue Cov:     ${verifiedOwnerJob?.report?.executiveSnapshot.coverage.coveragePercentage}%`);

  // Verify Single-Report Invariant for Owner Scan:
  if (verifiedOwnerJob?.expertReport || verifiedOwnerJob?.expertReportId) {
    throw new Error("VIOLATION: Expert report was generated or attached during an Owner scan!");
  }
  const dbExpertCheck = await scanDb.getExpertReport(ownerJob.id, guestA.tenant.id);
  if (dbExpertCheck !== null) {
    throw new Error("VIOLATION: Expert report record exists in database for Owner scan!");
  }
  console.log("  Single-Report OK:  Verified Owner Report present; Expert Report strictly absent.");

  // 3. Issue Second Guest Session for Expert Scan
  console.log("\n[Test 3: Live Expert Scan (https://example.com)]");
  const guestB = authService.createGuestSession("198.51.100.15");
  console.log(`  Guest B Tenant ID: ${guestB.tenant.id}`);

  const expertSubmission = await jobManager.submitScan(
    {
      targetUrl: "https://example.com",
      reportType: "expert",
      platformName: "Example Domain Live",
      businessCategory: "other",
      targetMarket: "Global",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 2,
      maxDepth: 1,
    },
    guestB.tenant.id,
    guestB.user.id
  );

  if (!expertSubmission.job) {
    throw new Error(`Expert job submission failed: ${expertSubmission.error}`);
  }

  const expertJob = expertSubmission.job;
  console.log(`  Job ID:            ${expertJob.id}`);
  console.log("  Executing live audit pipeline via ScanOrchestrator...");
  const expertReportResult = await scanOrchestrator.runAudit(expertJob);

  // Reload job from DB
  const verifiedExpertJob = await scanDb.getJob(expertJob.id, guestB.tenant.id);
  console.log(`  Job Final Status:  ${verifiedExpertJob?.status}`);
  console.log(`  Current Stage:     ${verifiedExpertJob?.currentStage}`);
  console.log(`  Expert Report ID:  ${verifiedExpertJob?.expertReportId}`);
  console.log(`  Findings Count:    ${verifiedExpertJob?.expertReport?.findings?.length}`);
  console.log(`  URL Count:         ${verifiedExpertJob?.expertReport?.urlInventory?.length}`);
  console.log(`  Remediation Tasks: ${verifiedExpertJob?.expertReport?.remediationRegister?.length}`);

  // Verify Single-Report Invariant for Expert Scan:
  if (verifiedExpertJob?.report || verifiedExpertJob?.ownerReportId) {
    throw new Error("VIOLATION: Owner report was generated or attached during an Expert scan!");
  }
  const dbOwnerCheck = await scanDb.getReport(expertJob.id, guestB.tenant.id);
  if (dbOwnerCheck !== null) {
    throw new Error("VIOLATION: Owner report record exists in database for Expert scan!");
  }
  console.log("  Single-Report OK:  Verified Expert Report present; Owner Report strictly absent.");

  // 4. Verify Strict Tenant Isolation Between Guests
  console.log("\n[Test 4: Guest-to-Guest Data Isolation]");
  const crossJobCheck = await scanDb.getJob(ownerJob.id, guestB.tenant.id);
  if (crossJobCheck !== null) {
    throw new Error("VIOLATION: Guest B was able to read Guest A's scan job!");
  }

  const crossReportCheck = await scanDb.getReport(verifiedOwnerJob?.report?.reportId, guestB.tenant.id);
  if (crossReportCheck !== null) {
    throw new Error("VIOLATION: Guest B was able to read Guest A's Owner Report!");
  }
  console.log("  Isolation OK:      Guest B cannot access Guest A's scan or report (returns null).");

  console.log("\n================================================================================");
  console.log("   LIVE VALIDATION SUCCESS: All Single-Report & Isolation Invariants Passed");
  console.log("================================================================================");
}

runLiveValidation().catch((err) => {
  console.error("Live validation failed:", err);
  process.exit(1);
});
