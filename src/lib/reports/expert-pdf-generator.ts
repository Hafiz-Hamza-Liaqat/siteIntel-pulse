import type { ExpertReport } from "../../types";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

function escapeHtml(str: unknown): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateExpertReportHtml(report: ExpertReport): string {
  const meta = report.metadata;
  const exec = report.executiveSummary;
  const platform = report.platformProfile;
  const detection = meta.companyA.businessCategoryDetection;

  const dateFormatted = new Date(meta.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#059669";
    if (score >= 75) return "#0D9488";
    if (score >= 60) return "#D97706";
    if (score >= 40) return "#EA580C";
    return "#DC2626";
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">CRITICAL</span>`;
      case "HIGH":
        return `<span style="background: #FFEDD5; color: #9A3412; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">HIGH</span>`;
      case "MEDIUM":
        return `<span style="background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">MEDIUM</span>`;
      case "LOW":
        return `<span style="background: #E0E7FF; color: #3730A3; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">LOW</span>`;
      default:
        return `<span style="background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">INFO</span>`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return `<span style="background: #DCFCE7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">PASS</span>`;
      case "FAIL":
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">FAIL</span>`;
      case "WARNING":
        return `<span style="background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">WARN</span>`;
      case "BLOCKED":
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">BLOCKED</span>`;
      case "NOT_APPLICABLE":
        return `<span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">N/A</span>`;
      case "UNKNOWN":
        return `<span style="background: #FEF3C7; color: #78350F; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">UNKNOWN</span>`;
      default:
        return `<span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt;">NOT TESTED</span>`;
    }
  };

  const totalEstimatedHours = (report.remediationRegister || []).reduce(
    (acc, t) => acc + (t.estimatedHours || 0),
    0
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Company B Expert Diagnostic Report — ${escapeHtml(meta.companyA.domain)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      font-size: 9pt;
      line-height: 1.45;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .no-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header {
      border-bottom: 2px solid #0F9D91;
      padding-bottom: 10px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-title {
      font-size: 15pt;
      font-weight: 800;
      color: #042F2E;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 8pt;
      color: #0F9D91;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748B;
    }
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }
    h2 {
      font-size: 12pt;
      font-weight: 700;
      color: #042F2E;
      margin-top: 16px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E2E8F0;
      page-break-after: avoid;
      break-after: avoid;
    }
    h3 {
      font-size: 10pt;
      font-weight: 700;
      color: #1E293B;
      margin-top: 10px;
      margin-bottom: 4px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 9px 11px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-title {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .card-value {
      font-size: 14pt;
      font-weight: 800;
      color: #0F172A;
    }
    table {
      table-layout: fixed;
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 14px;
      font-size: 8pt;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: #042F2E;
      color: #FFFFFF;
      text-align: left;
      padding: 6px 8px;
      font-weight: 600;
      font-size: 7.5pt;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    tr:nth-child(even) td {
      background: #F8FAFC;
    }
    .code-box, .url-cell, code, pre {
      background: #0F172A;
      color: #F8FAFC;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 7pt;
      padding: 5px 7px;
      border-radius: 4px;
      word-break: break-all;
      overflow-wrap: anywhere;
      margin-top: 3px;
    }
    .alert-box {
      background: #EFF6FF;
      border-left: 3px solid #3B82F6;
      padding: 7px 10px;
      border-radius: 0 4px 4px 0;
      font-size: 8pt;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>

  <!-- SECTION 1: COVER & EXECUTIVE SUMMARY -->
  <div class="header">
    <div>
      <div class="brand-title">SiteIntel Pulse</div>
      <div class="brand-subtitle">Company B Expert Diagnostic &amp; Growth Intelligence Report</div>
    </div>
    <div class="report-meta">
      <div>Report ID: <strong>${escapeHtml(meta.reportId)}</strong></div>
      <div>Audit Date: <strong>${dateFormatted}</strong></div>
      <div>Engine: <strong>SiteIntel Pulse v2.0.0</strong></div>
    </div>
  </div>

  <h1>Expert Technical Diagnostic Report</h1>
  <p style="font-size: 10pt; color: #475569; margin-bottom: 14px; word-break: break-word;">
    In-depth engineering inspection, page-level diagnostic inventory, security posture, and specialist workstream plan for <strong>${escapeHtml(meta.companyA.targetUrl)}</strong>.
  </p>

  <div class="grid-4">
    <div class="card">
      <div class="card-title">Overall Score ${exec.overallScore.isProvisional ? '<span style="color: #D97706; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; margin-left: 4px;">PROVISIONAL</span>' : ''}</div>
      <div class="card-value" style="color: ${getScoreColor(exec.overallScore.score)}">
        ${exec.overallScore.score}%<span style="font-size: 8pt; color: #64748B;"> (Normalized)</span>
      </div>
      <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
        Rating: <strong>${escapeHtml(exec.overallScore.ratingBand)}</strong> ${exec.overallScore.isProvisional ? '(Provisional)' : '(Fully Assessed)'}
      </div>
      <div style="font-size: 6.5pt; color: #64748B; margin-top: 1px;">
        Earned: <strong>${exec.overallScore.totalEarnedCataloguePoints ?? exec.overallScore.score} / ${exec.overallScore.pointsActuallyEvaluated ?? exec.overallScore.evaluatedWeightedPoints} pts evaluated</strong> (100 catalogue max)
      </div>
    </div>

    <div class="card">
      <div class="card-title">Crawl Inventory</div>
      <div class="card-value">${report.coverage.testedPages}<span style="font-size: 8.5pt; color: #64748B;"> / ${report.coverage.totalPagesBudget} budget</span></div>
      <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
        Discovered: <strong>${report.coverage.discoveredPages}</strong> | Depth: <strong>${report.coverage.crawlDepthReached}</strong>
      </div>
      <div style="font-size: 6.5pt; color: #94A3B8; margin-top: 1px;">
        Failed: ${report.coverage.failedPages} | Skipped: ${report.coverage.skippedPages}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Catalogue Coverage</div>
      <div class="card-value" style="color: ${report.coverage.coveragePercentage >= 70 ? '#0F9D91' : '#D97706'};">
        ${report.coverage.coveragePercentage}%
      </div>
      <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
        Evaluated: <strong>${report.coverage.weightedPointsEvaluated}/100 pts</strong> across 56 rules
      </div>
      <div style="font-size: 6.5pt; color: ${exec.overallScore.isProvisional ? '#D97706' : '#059669'}; margin-top: 1px; font-weight: 600;">
        ${escapeHtml(exec.overallScore.assessmentStatus)} ${exec.overallScore.isProvisional ? '(&lt;70% or low category)' : '(&ge;70% threshold)'}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Defect Triage &amp; Effort</div>
      <div class="card-value" style="color: #DC2626;">
        ${exec.issueTotals.critical + exec.issueTotals.high}<span style="font-size: 8.5pt; color: #64748B;"> high-priority</span>
      </div>
      <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
        ${exec.issueTotals.critical} Crit / ${exec.issueTotals.high} High / ${exec.issueTotals.medium} Med
      </div>
      <div style="font-size: 6.5pt; color: #0F9D91; margin-top: 1px; font-weight: 600;">
        ${totalEstimatedHours} hrs effort (${exec.workstreamEstimates.length} workstreams)
      </div>
    </div>
  </div>

  ${exec.overallScore.isProvisional ? `
  <div class="alert-box no-break" style="margin-bottom: 12px; border-left: 3px solid #D97706; background-color: #FFFBEB; color: #92400E;">
    <strong>Provisional Coverage Acceptance Notice:</strong> ${escapeHtml(exec.overallScore.evaluationNote)} SiteIntel Pulse requires &ge;70% overall catalogue coverage and &ge;60% per-category coverage for a certified fully assessed score.
    ${exec.overallScore.ineligibleCategories && exec.overallScore.ineligibleCategories.length > 0 ? `
      <div style="font-size: 7.5pt; color: #B45309; margin-top: 3px;">
        <strong>Categories needing expanded evidence:</strong> ${escapeHtml(exec.overallScore.ineligibleCategories.join("; "))}
      </div>
    ` : ""}
  </div>
  ` : ""}

  <div class="alert-box">
    <strong>Auditor Scope &amp; Methodology:</strong> ${escapeHtml(meta.scopeAndBoundaries)}
  </div>

  <!-- SECTION 2: METADATA & SCOPE -->
  <h2>1. Scope &amp; Execution Parameters</h2>
  <div class="grid-4">
    <div class="card">
      <div class="card-title">Target Hostname</div>
      <div style="font-weight: 700; word-break: break-all;">${escapeHtml(meta.companyA.domain)}</div>
      <div style="font-size: 7.5pt; color: #64748B;">Market: ${escapeHtml(meta.companyA.targetMarket || "Global")}</div>
    </div>
    <div class="card">
      <div class="card-title">Business Model</div>
      <div style="font-weight: 700;">${escapeHtml(detection ? detection.categoryLabel : meta.companyA.businessCategory)}</div>
      <div style="font-size: 7.5pt; color: #64748B;">
        ${detection ? `${detection.decisionSource === "AUTO_DETECTED" ? "Auto" : "Manual"} (${detection.confidence} · ${Math.round(detection.confidenceScore * 100)}% heuristic)` : "Assigned"}
      </div>
      ${detection && detection.secondaryFacets && detection.secondaryFacets.length > 0 ? `
        <div style="font-size: 6.5pt; color: #0D9488; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(detection.secondaryFacets.map(f => f.replace(/_/g, " ")).join(", "))}
        </div>
      ` : ""}
    </div>
    <div class="card">
      <div class="card-title">Crawl Inventory &amp; Budget</div>
      <div style="font-weight: 700;">Tested: ${report.coverage.testedPages} / ${report.coverage.totalPagesBudget} budget</div>
      <div style="font-size: 7.5pt; color: #64748B;">
        Discovered: ${report.coverage.discoveredPages} | Failed: ${report.coverage.failedPages} | Skipped: ${report.coverage.skippedPages}
      </div>
      <div style="font-size: 7pt; color: #64748B;">
        Depth: ${report.coverage.crawlDepthReached} | Exhaustive: ${report.coverage.isExhaustive ? "Yes" : "Budget Capped"}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Catalogue Coverage</div>
      <div style="font-weight: 700; color: ${report.coverage.coveragePercentage >= 70 ? '#0F9D91' : '#D97706'};">
        ${report.coverage.coveragePercentage}% (${report.coverage.weightedPointsEvaluated}/100 pts)
      </div>
      <div style="font-size: 7.5pt; color: #64748B;">
        Status: <strong>${escapeHtml(exec.overallScore.assessmentStatus)}</strong>
      </div>
      <div style="font-size: 7pt; color: #64748B;">
        ${exec.overallScore.isProvisional ? "Provisional (requires &ge;70%)" : "Certified Complete"}
      </div>
    </div>
  </div>

  <!-- SECTION 3: PLATFORM PROFILE & STACK -->
  <h2>2. Platform Profile &amp; Detected Stack</h2>
  <div class="grid-4">
    <div class="card">
      <div class="card-title">CMS Category</div>
      <div style="font-weight: 700;">${escapeHtml(platform.cmsCategory || "Custom Web Application")}</div>
      <div style="font-size: 7.5pt; color: #64748B;">Confidence: ${escapeHtml(platform.confidence || "MEDIUM")}</div>
    </div>
    <div class="card">
      <div class="card-title">Framework Hints</div>
      <div style="font-weight: 700; word-break: break-word;">${escapeHtml((platform.frameworkHints || []).join(", ") || "Vanilla / Static")}</div>
      <div style="font-size: 7.5pt; color: #64748B;">Modern Frontend</div>
    </div>
    <div class="card">
      <div class="card-title">Server &amp; CDN Clues</div>
      <div style="font-weight: 700; word-break: break-word;">${escapeHtml((platform.serverCdnClues || []).join(", ") || "Standard HTTP/2")}</div>
      <div style="font-size: 7.5pt; color: #64748B;">Edge Distribution</div>
    </div>
    <div class="card">
      <div class="card-title">Client Tech</div>
      <div style="font-weight: 700; word-break: break-word;">${escapeHtml((platform.clientTechnologies || []).join(", ") || "Standard")}</div>
      <div style="font-size: 7.5pt; color: #64748B;">Integrations: ${(report.integrations || []).length}</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 4: SCORE LEDGER & COVERAGE -->
  <h2>3. Assessment Catalogue &amp; Score Ledger (56 Rules / 11 Categories)</h2>
  <table>
    <colgroup>
      <col style="width: 32%;">
      <col style="width: 16%;">
      <col style="width: 18%;">
      <col style="width: 16%;">
      <col style="width: 18%;">
    </colgroup>
    <thead>
      <tr>
        <th>Category</th>
        <th>Score %</th>
        <th>Earned Allocation</th>
        <th>Coverage %</th>
        <th>Threshold Status</th>
      </tr>
    </thead>
    <tbody>
      ${exec.categoryScores
        .map(
          (c) => `<tr>
        <td><strong>${escapeHtml(c.categoryName)}</strong></td>
        <td><strong>${c.scorePercentage}%</strong></td>
        <td>${c.earnedAllocationPercentage}%</td>
        <td>${c.coveragePercentage}%</td>
        <td>${
          c.coveragePercentage >= 60
            ? '<span style="color: #059669; font-weight: bold;">EVALUATED</span>'
            : '<span style="color: #D97706; font-weight: bold;">PROVISIONAL</span>'
        }</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <!-- SECTION 5: URL INVENTORY -->
  <h2>4. Discovered Page Diagnostics (Top ${Math.min((report.urlInventory || []).length, 12)} Pages)</h2>
  <table>
    <colgroup>
      <col style="width: 36%;">
      <col style="width: 10%;">
      <col style="width: 14%;">
      <col style="width: 8%;">
      <col style="width: 14%;">
      <col style="width: 9%;">
      <col style="width: 9%;">
    </colgroup>
    <thead>
      <tr>
        <th>Path / URL</th>
        <th>Status</th>
        <th>Indexability</th>
        <th>Depth</th>
        <th>Canonical</th>
        <th>Words</th>
        <th>TTFB</th>
      </tr>
    </thead>
    <tbody>
      ${(report.urlInventory || []).length > 0 ? report.urlInventory
        .slice(0, 12)
        .map(
          (u) => `<tr>
        <td style="word-break: break-all; font-family: monospace; font-size: 7.5pt;">${escapeHtml(u.url)}</td>
        <td>${u.statusCode}</td>
        <td><strong>${escapeHtml(u.indexabilityStatus)}</strong></td>
        <td>${u.crawlDepth}</td>
        <td style="font-size: 7pt; color: #64748B;">${escapeHtml(u.canonicalStatus)}</td>
        <td>${u.wordCount}</td>
        <td>${u.responseTimeMs}ms</td>
      </tr>`
        )
        .join("") : `<tr><td colspan="7" style="text-align: center; color: #64748B; padding: 10px;">No crawled URL records observed.</td></tr>`}
    </tbody>
  </table>

  <!-- SECTION 6 & 7: TECHNICAL SEO & LINK AUDIT -->
  <div class="grid-2">
    <div>
      <h2>5. SEO Structural Health</h2>
      <div class="card" style="margin-bottom: 8px;">
        <div class="card-title">Structured Data Entities</div>
        <div style="font-size: 8pt; word-break: break-word;">
          ${(report.seoDiagnostics.structuredDataEntities || []).length > 0
            ? report.seoDiagnostics.structuredDataEntities.map(e => escapeHtml(e.type || e["@type"] || "Entity")).slice(0, 6).join(", ")
            : "No Schema.org entities detected"}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Heading Hierarchy Sample</div>
        <div style="font-size: 7.5pt; font-family: monospace;">
          H1: ${report.seoDiagnostics.headingHierarchy?.h1?.length || 0} found | H2: ${report.seoDiagnostics.headingHierarchy?.h2?.length || 0} found
        </div>
      </div>
    </div>

    <div>
      <h2>6. Link Architecture &amp; Status</h2>
      <div class="card" style="margin-bottom: 8px;">
        <div class="card-title">Link Breakdown</div>
        <div>Internal Links: <strong>${(report.linkAudit.internalLinks || []).length}</strong></div>
        <div>Outbound Links: <strong>${(report.linkAudit.outboundLinks || []).length}</strong></div>
        <div>Broken Links: <strong style="color: ${(report.linkAudit.brokenLinks || []).length > 0 ? '#DC2626' : '#059669'}">${(report.linkAudit.brokenLinks || []).length}</strong></div>
      </div>
      <div class="card">
        <div class="card-title">Orphan Candidates</div>
        <div style="font-size: 7.5pt; word-break: break-all;">${(report.linkAudit.orphanCandidates || []).length > 0 ? report.linkAudit.orphanCandidates.map(escapeHtml).join(", ") : "None identified"}</div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 8 & 9: PERFORMANCE & RESPONSIVE MATRIX -->
  <h2>7. Core Web Vitals &amp; Multi-Viewport Matrix</h2>
  <div class="grid-4">
    <div class="card">
      <div class="card-title">Lab TTFB</div>
      <div class="card-value" style="font-size: 12pt;">${report.performanceDiagnostics.labScores?.ttfbMs != null ? `${report.performanceDiagnostics.labScores.ttfbMs}ms` : "—"}</div>
    </div>
    <div class="card">
      <div class="card-title">Lab Speed Index</div>
      <div class="card-value" style="font-size: 12pt;">${report.performanceDiagnostics.labScores?.speedIndex != null ? `${report.performanceDiagnostics.labScores.speedIndex}ms` : "—"}</div>
    </div>
    <div class="card">
      <div class="card-title">PageSpeed Status</div>
      <div class="card-value" style="font-size: 11pt; color: ${report.performanceDiagnostics.labScores?.mobileScore != null ? "#0F9D91" : "#64748B"};">
        ${report.performanceDiagnostics.labScores?.mobileScore != null ? `${report.performanceDiagnostics.labScores.mobileScore}/100` : "Not Configured"}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Responsive Breakpoints</div>
      <div class="card-value" style="font-size: 11pt; color: #0F9D91;">
        ${(report.responsiveDiagnostics || []).length > 0 ? `${report.responsiveDiagnostics.length} tested` : "Not tested"}
      </div>
    </div>
  </div>

  <table>
    <colgroup>
      <col style="width: 20%;">
      <col style="width: 20%;">
      <col style="width: 20%;">
      <col style="width: 20%;">
      <col style="width: 20%;">
    </colgroup>
    <thead>
      <tr>
        <th>Viewport Width</th>
        <th>Horizontal Overflow</th>
        <th>Touch Target Deficits</th>
        <th>Clipping Issues</th>
        <th>Severity</th>
      </tr>
    </thead>
    <tbody>
      ${(report.responsiveDiagnostics || []).length > 0
        ? report.responsiveDiagnostics
            .map(
              (b) => `<tr>
            <td><strong>${b.viewport}px</strong></td>
            <td>${b.horizontalOverflow ? '<span style="color: #DC2626; font-weight: bold;">OVERFLOW</span>' : '<span style="color: #059669;">Normal Fit</span>'}</td>
            <td>${b.touchTargetIssues}</td>
            <td>${b.clippingIssues}</td>
            <td>${getSeverityBadge(b.severity)}</td>
          </tr>`
            )
            .join("")
        : '<tr><td colspan="5" style="text-align: center; color: #64748B; padding: 10px;">Passive crawl only — browser-automated responsive tests were not executed for this run.</td></tr>'}
    </tbody>
  </table>

  <!-- SECTION 10 & 11: SECURITY & AUTH -->
  <h2>8. Security Configuration &amp; Authentication Posture</h2>
  <div class="grid-2">
    <div>
      <h3>HTTP Security Headers</h3>
      <table>
        <colgroup>
          <col style="width: 38%;">
          <col style="width: 18%;">
          <col style="width: 44%;">
        </colgroup>
        <thead>
          <tr>
            <th>Control</th>
            <th>Severity</th>
            <th>Observed Directive</th>
          </tr>
        </thead>
        <tbody>
          ${(report.securityDiagnostics || [])
            .slice(0, 7)
            .map(
              (h) => `<tr>
            <td><strong>${escapeHtml(h.title)}</strong></td>
            <td>${getSeverityBadge(h.severity)}</td>
            <td style="font-family: monospace; font-size: 7pt; word-break: break-all;">${escapeHtml(h.observedValue || "—")}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div>
      <h3>Authentication Posture</h3>
      <div class="card" style="margin-bottom: 8px;">
        <div class="card-title">Discovered Public Surfaces</div>
        <div style="font-size: 8pt; word-break: break-all;">
          ${(report.authenticationAssessment.publicLoginSurfaces || []).length > 0
            ? report.authenticationAssessment.publicLoginSurfaces.map(s => `<div><strong>Login:</strong> ${escapeHtml(s.url)} (HTTPS: ${s.isHttps ? 'Yes' : 'No'})</div>`).join("")
            : "No explicit public login or register forms detected"}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Session Cookie Flags</div>
        <div>Secure Flag: <strong>${report.authenticationAssessment.sessionSecurity.cookieSecure === null ? "Unknown (No Cookies)" : report.authenticationAssessment.sessionSecurity.cookieSecure ? "Enforced" : "Vulnerable"}</strong></div>
        <div>HttpOnly Flag: <strong>${report.authenticationAssessment.sessionSecurity.cookieHttpOnly === null ? "Unknown (No Cookies)" : report.authenticationAssessment.sessionSecurity.cookieHttpOnly ? "Enforced" : "Vulnerable"}</strong></div>
        <div>SameSite Policy: <strong>${escapeHtml(report.authenticationAssessment.sessionSecurity.cookieSameSite || "Unobserved")}</strong></div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 12 & 13: GEO/AEO & INTEGRATIONS -->
  <h2>9. Integrations, GEO / AEO &amp; AI Readiness</h2>
  <div class="grid-2">
    <div>
      <h3>Detected Integrations &amp; Tags</h3>
      <table>
        <colgroup>
          <col style="width: 40%;">
          <col style="width: 35%;">
          <col style="width: 25%;">
        </colgroup>
        <thead>
          <tr>
            <th>Service</th>
            <th>Category</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          ${(report.integrations || []).length > 0 ? report.integrations
            .map(
              (i) => `<tr>
            <td><strong>${escapeHtml(i.name)}</strong></td>
            <td>${escapeHtml(i.category)}</td>
            <td>${i.state === "NOT_DETECTED" ? '<span style="color: #64748B;">NOT DETECTED</span>' : '<span style="color: #059669; font-weight: bold;">ACTIVE</span>'}</td>
          </tr>`
            )
            .join("") : `<tr><td colspan="3" style="text-align: center; color: #64748B; padding: 10px;">No third-party tool integrations detected.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div>
      <h3>AI Crawler Policies &amp; Schema</h3>
      <div class="card" style="margin-bottom: 8px;">
        <div class="card-title">Robots.txt AI Crawlers</div>
        <div style="font-size: 8pt;">
          GPTBot: <strong>${escapeHtml(report.geoAeoDiagnostics.crawlerPolicies?.GPTBot || "Open")}</strong><br/>
          ClaudeBot: <strong>${escapeHtml(report.geoAeoDiagnostics.crawlerPolicies?.ClaudeBot || "Open")}</strong><br/>
          CCBot: <strong>${escapeHtml(report.geoAeoDiagnostics.crawlerPolicies?.CCBot || "Open")}</strong>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Direct Answer Readiness</div>
        <div style="font-size: 8pt;">
          FAQ Schema: <strong>${report.geoAeoDiagnostics.directAnswerReadiness?.faqSchemaPresent ? "Present" : "Missing"}</strong><br/>
          HowTo Schema: <strong>${report.geoAeoDiagnostics.directAnswerReadiness?.howToSchemaPresent ? "Present" : "Missing"}</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 16: COMPETITOR BENCHMARK -->
  <h2>10. Competitor Benchmark Analysis</h2>
  <table>
    <colgroup>
      <col style="width: 32%;">
      <col style="width: 18%;">
      <col style="width: 28%;">
      <col style="width: 22%;">
    </colgroup>
    <thead>
      <tr>
        <th>Domain</th>
        <th>Overall Score</th>
        <th>Data Provenance</th>
        <th>Audit Scope</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #CCFBF1;">
        <td class="url-cell"><strong>${escapeHtml(meta.companyA.domain)} (Company A)</strong></td>
        <td><strong>${exec.overallScore.score}% (${exec.overallScore.totalEarnedCataloguePoints ?? exec.overallScore.score} / ${exec.overallScore.pointsActuallyEvaluated ?? exec.overallScore.evaluatedWeightedPoints} pts)</strong></td>
        <td>Live Crawl &amp; Deterministic Catalogue</td>
        <td>Full Inspection</td>
      </tr>
      ${(report.competitorComparisons || []).length > 0 ? report.competitorComparisons
        .map(
          (comp) => `<tr>
        <td class="url-cell"><strong>${escapeHtml(comp.domain)}</strong></td>
        <td>${comp.status === "NOT_ASSESSED" || comp.overallScore == null ? "NOT ASSESSED" : `${comp.overallScore}/100`}</td>
        <td>${escapeHtml(comp.dataProvenance)}</td>
        <td>${comp.status === "NOT_ASSESSED" ? "Pending Scan" : "Public Surface Benchmark"}</td>
      </tr>`
        )
        .join("") : `<tr><td colspan="4" style="text-align: center; color: #64748B; padding: 8px;">No competitor domains specified for comparative evaluation.</td></tr>`}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- SECTION 17: FINDING LEDGER -->
  <h2>11. Diagnostic Finding Ledger (Top 15 of ${(report.findings || []).filter((f) => f.status === "FAIL" || f.status === "WARNING").length} Total Issues — Full Ledger in Export)</h2>
  <table>
    <colgroup>
      <col style="width: 12%;">
      <col style="width: 22%;">
      <col style="width: 12%;">
      <col style="width: 30%;">
      <col style="width: 24%;">
    </colgroup>
    <thead>
      <tr>
        <th>Finding ID</th>
        <th>Category &amp; Rule</th>
        <th>Sev / Stat</th>
        <th>Technical Impact &amp; Evidence</th>
        <th>Remediation Advice</th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        const issues = (report.findings || [])
          .filter((f) => f.status === "FAIL" || f.status === "WARNING" || f.severity === "CRITICAL" || f.severity === "HIGH")
          .slice(0, 15);
        if (issues.length === 0) {
          return `<tr><td colspan="5" style="text-align: center; color: #64748B; padding: 14px;">No critical or high-severity issues observed across all evaluated catalogue rules.</td></tr>`;
        }
        return issues
          .map(
            (f) => `<tr>
          <td style="font-family: monospace; font-size: 7.5pt;">${escapeHtml(f.id)}</td>
          <td>
            <strong>${escapeHtml(f.categoryName)}</strong><br/>
            <span style="font-size: 7.5pt; color: #475569;">${escapeHtml(f.title)}</span>
          </td>
          <td>
            ${getSeverityBadge(f.severity)}<br/>
            ${getStatusBadge(f.status)}
          </td>
          <td style="font-size: 7.5pt;">
            <strong>Technical:</strong> ${escapeHtml(f.technicalImpact)}<br/>
            ${f.evidence?.[0]?.discrepancy ? `<div class="code-box">${escapeHtml(f.evidence[0].discrepancy)}</div>` : ""}
          </td>
          <td style="font-size: 7.5pt; color: #042F2E;">
            ${escapeHtml(f.remediation)}
          </td>
        </tr>`
          )
          .join("");
      })()}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- SECTION 18: REMEDIATION PLAN -->
  <h2>12. Specialist Remediation Action Plan (Company B Engineering Tasks)</h2>
  <table>
    <colgroup>
      <col style="width: 12%;">
      <col style="width: 20%;">
      <col style="width: 10%;">
      <col style="width: 12%;">
      <col style="width: 46%;">
    </colgroup>
    <thead>
      <tr>
        <th>Task ID</th>
        <th>Workstream</th>
        <th>Pri</th>
        <th>Effort</th>
        <th>Task Action &amp; Validation</th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        const tasks = (report.remediationRegister || []).slice(0, 15);
        if (tasks.length === 0) {
          return `<tr><td colspan="5" style="text-align: center; color: #64748B; padding: 14px;">No remediation tasks scheduled. Target meets evaluated baseline specifications.</td></tr>`;
        }
        return tasks
          .map(
            (t) => `<tr>
          <td style="font-family: monospace; font-size: 7.5pt;">${escapeHtml(t.id)}</td>
          <td><strong>${escapeHtml(t.workstream)}</strong></td>
          <td>${getSeverityBadge(t.priority)}</td>
          <td>${escapeHtml(t.estimatedEffort)}</td>
          <td>
            <strong>${escapeHtml(t.title)}</strong>
            <div style="font-size: 7pt; color: #475569; margin-top: 2px;">${escapeHtml((t.actionSteps || []).join(" -> "))}</div>
            <div style="font-size: 7pt; color: #0F9D91; margin-top: 2px;"><strong>Validation:</strong> ${escapeHtml(t.validationProcedure)}</div>
          </td>
        </tr>`
          )
          .join("");
      })()}
    </tbody>
  </table>

  <!-- SECTION 19: EXPORT MANIFEST & SIGN-OFF -->
  <h2>13. Cryptographic Integrity Sign-Off &amp; Manifest</h2>
  <div class="card" style="margin-top: 10px; font-size: 8pt;">
    <div><strong>Export ID:</strong> ${escapeHtml(report.exportManifest?.exportId || "EXP_DEFAULT")}</div>
    <div><strong>Audit Core Manifest Hash:</strong> <span style="font-family: monospace; font-size: 7.5pt; word-break: break-all;">${escapeHtml(report.exportManifest?.checksum || "NOT_GENERATED")}</span></div>
    <div><strong>Digest Scope:</strong> Canonical serialization of audit dataset (scanId, targetUrl, overallScore, categoryScores, findings ledger, and platformProfile).</div>
    <div><strong>Verification Status:</strong> <span style="font-family: monospace; font-size: 8pt; font-weight: 700; color: #0D9488;">${escapeHtml(report.exportManifest?.verificationStatus || "DIGEST_GENERATED")}</span></div>
    <div><strong>Generated At:</strong> ${escapeHtml(report.exportManifest?.generatedAt || new Date().toISOString())}</div>
    <div style="font-size: 7.5pt; color: #64748B; margin-top: 6px;">* Binary artifact note: The manifest hash verifies the structured report data model. Generated PDF bytes have an independent byte-level SHA-256 calculated upon binary rendering.</div>
  </div>

</body>
</html>`;
}

export class ExpertPdfGenerator {
  /**
   * Generates a PDF file from an ExpertReport using Playwright Chromium.
   */
  async generatePdf(report: ExpertReport, outputPath?: string): Promise<Buffer> {
    const html = generateExpertReportHtml(report);
    const targetFile =
      outputPath ||
      path.join(process.cwd(), "test-results", `Expert-${report.metadata.reportId}.pdf`);

    // Ensure target directory exists
    await fs.mkdir(path.dirname(targetFile), { recursive: true });

    // Dynamic import of playwright
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 7.5pt; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <span>SiteIntel Pulse — Company B Expert Diagnostic Report</span>
            <span>${escapeHtml(report.metadata.companyA.domain)}</span>
          </div>`,
        footerTemplate: `
          <div style="font-size: 7.5pt; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <span>Confidential — Company B Technical Advisory</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>`,
        margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
      });

      // Compute independent SHA-256 of generated PDF artifact
      const pdfSha256 = "sha256:" + crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      if (report.exportManifest) {
        report.exportManifest.pdfSha256 = pdfSha256;
      }

      await fs.writeFile(targetFile, pdfBuffer);
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}

export const expertPdfGenerator = new ExpertPdfGenerator();
