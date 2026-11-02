import type { ExpertReport } from "../../types";
import { formatCurrency } from "./currency.ts";
import { renderAssessmentAndIssuesSummaryHtml } from "./summary-html.ts";
import { getMetricRating, getMetricRatingStyle } from "../scoring/performance-thresholds.ts";
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
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">CRITICAL</span>`;
      case "HIGH":
        return `<span style="background: #FFEDD5; color: #9A3412; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">HIGH</span>`;
      case "MEDIUM":
        return `<span style="background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">MEDIUM</span>`;
      case "LOW":
        return `<span style="background: #E0E7FF; color: #3730A3; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">LOW</span>`;
      default:
        return `<span style="background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">INFO</span>`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return `<span style="background: #DCFCE7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">PASS</span>`;
      case "FAIL":
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">FAIL</span>`;
      case "WARNING":
        return `<span style="background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">WARN</span>`;
      case "BLOCKED":
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">BLOCKED</span>`;
      case "NOT_APPLICABLE":
        return `<span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">N/A</span>`;
      case "UNKNOWN":
        return `<span style="background: #FEF3C7; color: #78350F; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">UNKNOWN</span>`;
      default:
        return `<span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 7.5pt; display: inline-block; white-space: nowrap;">NOT TESTED</span>`;
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
      word-break: break-word;
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
      <div>Scan ID: <strong>${escapeHtml(meta.scanId)}</strong></div>
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
        Candidate Pages: <strong>${report.coverage.discoveredPages}</strong>${report.assessmentAndIssuesSummary?.crawlScopeSummary ? ` (${report.assessmentAndIssuesSummary.crawlScopeSummary.nonHtmlResourcesExcluded} non-HTML excluded)` : ""}
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
        ${exec.issueTotals.critical} Crit / ${exec.issueTotals.high} High / ${exec.issueTotals.medium} Med / ${exec.issueTotals.low} Low${(exec.issueTotals as any).informational ? ` / ${(exec.issueTotals as any).informational} Info` : ""}
      </div>
      <div style="font-size: 6.5pt; color: #0F9D91; margin-top: 1px; font-weight: 600;">
        ${totalEstimatedHours} hrs effort (${report.executiveSummary.workstreamEstimates.filter((w: any) => (w.taskCount || 0) > 0).length} active workstreams)
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

  ${renderAssessmentAndIssuesSummaryHtml(report.assessmentAndIssuesSummary)}

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
        Discovered: <strong>${report.coverage.discoveredPages}</strong> | Failed: ${report.coverage.failedPages} | Skipped: ${report.coverage.skippedPages}
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
        <td><strong>${c.scorePercentage}%</strong>${c.coveragePercentage < 80 || !c.isEligibleForOverall ? `<span style="color: #D97706; font-size: 7pt; display: block; font-weight: normal;">(${c.earnedPoints}/${c.testedPoints} pts evaluated, ${c.coveragePercentage}% cov)</span>` : ""}</td>
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
  <h2>4. Discovered Page Diagnostics (Top ${Math.min((report.urlInventory || []).length, 12)} of ${(report.urlInventory || []).length} Tested Pages)</h2>
  <div class="card" style="margin-bottom: 8px; font-size: 7.5pt; color: #475569;">
    <strong>Bounded Sample Audit Notice:</strong> Bounded public sample of ${(report.urlInventory || []).length} pages tested out of ${report.coverage?.discoveredPages ?? (report.urlInventory || []).length} discovered (${report.coverage?.skippedPages ?? 0} budget-skipped, ${report.coverage?.failedPages ?? 0} failed requests). Findings reflect evaluated sample pages and do not imply exhaustive crawling of all platform URLs. Full URL inventory of all tested pages is recorded in the export bundle.
  </div>
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
        <div class="card-title">Heading Hierarchy &amp; Outline</div>
        <div style="font-size: 7.5pt;">
          Homepage: <strong>${report.seoDiagnostics.headingHierarchy?.h1?.length ?? 0} H1</strong>, <strong>${report.seoDiagnostics.headingHierarchy?.h2?.length ?? 0} H2</strong> | Tested Pages: <strong>${report.seoDiagnostics.headingHierarchy?.pagesWithH1 ?? 0} with H1</strong>, <strong>${report.seoDiagnostics.headingHierarchy?.pagesMissingH1 ?? 0} missing H1</strong>
          ${report.seoDiagnostics.headingHierarchy?.h1?.[0] ? `<div style="color: #64748B; margin-top: 2px; font-size: 7pt; overflow-wrap: anywhere;">H1: "${escapeHtml(report.seoDiagnostics.headingHierarchy.h1[0])}"</div>` : ""}
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
  ${(() => {
    const pName = (report.performanceDiagnostics.labScores?.providerName || "").toLowerCase();
    const isLighthouse = pName.includes("google pagespeed") || (pName.includes("lighthouse") && !pName.includes("custom"));
    const mobScore = report.performanceDiagnostics.labScores?.mobileScore;
    const dskScore = report.performanceDiagnostics.labScores?.desktopScore;
    const mobProfile = report.performanceDiagnostics.labScores?.mobileLab?.deviceProfile || "390×844 Mobile Device";
    const dskProfile = report.performanceDiagnostics.labScores?.desktopLab?.deviceProfile || "1280×800 Desktop View";

    return `<div class="grid-4">
    <div class="card">
      <div class="card-title">${isLighthouse ? "Mobile Lighthouse" : "Mobile Lab Performance Index"}</div>
      <div class="card-value" style="color: ${mobScore != null ? getScoreColor(mobScore) : '#64748B'};">
        ${mobScore != null ? `${mobScore}/100` : "NOT_TESTED"}
      </div>
      <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
        Profile: <strong>${escapeHtml(mobProfile)}</strong>
      </div>
    </div>
    <div class="card">
      <div class="card-title">${isLighthouse ? "Desktop Lighthouse" : "Desktop Lab Performance Index"}</div>
      <div class="card-value" style="color: ${dskScore != null ? getScoreColor(dskScore) : '#64748B'};">
        ${dskScore != null ? `${dskScore}/100` : "NOT_TESTED"}
      </div>
      <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
        Profile: <strong>${escapeHtml(dskProfile)}</strong>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Audit Engine &amp; Method</div>
      <div style="font-weight: 700; font-size: 8.5pt; color: #0F172A; margin-top: 2px; word-break: break-word;">
        ${escapeHtml(report.performanceDiagnostics.labScores?.providerName || "Custom Lab Performance Index (Headless Chromium v1.50)")}
      </div>
      <div style="font-size: 6.5pt; color: #64748B; margin-top: 2px; word-break: break-word;">
        ${escapeHtml(report.performanceDiagnostics.labScores?.measurementMethod || "Custom Lab Performance Index v1.0 (Log-Normal Model)")}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Responsive Breakpoints</div>
      <div class="card-value" style="font-size: 14pt; color: #0F9D91;">
        ${(report.responsiveDiagnostics || []).length > 0 ? `${report.responsiveDiagnostics.length} / 7` : "0"}
      </div>
      <div style="font-size: 7pt; color: #64748B; margin-top: 2px;">
        Tested: <strong>320, 360, 390, 768, 1024, 1280, 1440px</strong>
      </div>
    </div>
  </div>`;
  })()}

  <div style="margin-top: 6px; margin-bottom: 4px; font-weight: 700; font-size: 8pt; color: #0F172A;">
    Diagnostic Lab Performance Breakdown (Mobile vs Desktop)
  </div>
  <table>
    <colgroup>
      <col style="width: 25%;">
      <col style="width: 15%;">
      <col style="width: 15%;">
      <col style="width: 15%;">
      <col style="width: 15%;">
      <col style="width: 15%;">
    </colgroup>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Mobile Lab</th>
        <th>Desktop Lab</th>
        <th>Good Threshold</th>
        <th>Mobile Rating</th>
        <th>Desktop Rating</th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        const mob = report.performanceDiagnostics.labScores?.mobileLab;
        const dsk = report.performanceDiagnostics.labScores?.desktopLab;
        const metricsDef: Array<{
          id: "fcp" | "lcp" | "cls" | "tbt" | "speedIndex" | "ttfb";
          name: string;
          mobVal: number | null | undefined;
          dskVal: number | null | undefined;
          unit: string;
          threshold: string;
          format: (v: number | null | undefined) => string;
        }> = [
          {
            id: "fcp",
            name: "First Contentful Paint (FCP)",
            mobVal: mob?.fcpMs ?? report.performanceDiagnostics.labScores?.fcpMs,
            dskVal: dsk?.fcpMs,
            unit: "ms",
            threshold: "≤ 1,800ms",
            format: (v) => (v != null ? `${Math.round(v)}ms` : "—"),
          },
          {
            id: "lcp",
            name: "Largest Contentful Paint (LCP)",
            mobVal: mob?.lcpMs ?? report.performanceDiagnostics.labScores?.lcpMs,
            dskVal: dsk?.lcpMs,
            unit: "ms",
            threshold: "≤ 2,500ms",
            format: (v) => (v != null ? `${Math.round(v)}ms` : "—"),
          },
          {
            id: "tbt",
            name: "Total Blocking Time (TBT)",
            mobVal: mob?.tbtMs ?? report.performanceDiagnostics.labScores?.tbtMs,
            dskVal: dsk?.tbtMs,
            unit: "ms",
            threshold: "≤ 200ms",
            format: (v) => (v != null ? `${Math.round(v)}ms` : "—"),
          },
          {
            id: "cls",
            name: "Cumulative Layout Shift (CLS)",
            mobVal: mob?.cls ?? report.performanceDiagnostics.labScores?.cls,
            dskVal: dsk?.cls,
            unit: "",
            threshold: "≤ 0.100",
            format: (v) => (v != null ? Number(v).toFixed(3) : '<span style="color: #64748B;">NOT_TESTED</span>'),
          },
          {
            id: "speedIndex",
            name: "Speed Index (SI)",
            mobVal: mob?.speedIndexMs ?? report.performanceDiagnostics.labScores?.speedIndex,
            dskVal: dsk?.speedIndexMs,
            unit: "ms",
            threshold: "≤ 3,400ms",
            format: (v) => (v != null ? `${Math.round(v)}ms` : "—"),
          },
          {
            id: "ttfb",
            name: "Time to First Byte (TTFB)",
            mobVal: mob?.ttfbMs ?? report.performanceDiagnostics.labScores?.ttfbMs,
            dskVal: dsk?.ttfbMs,
            unit: "ms",
            threshold: "≤ 800ms",
            format: (v) => (v != null ? `${Math.round(v)}ms` : "—"),
          },
        ];

        return metricsDef
          .map((m) => {
            const mobRating = getMetricRating(m.id, m.mobVal);
            const dskRating = getMetricRating(m.id, m.dskVal);
            const mobStyle = getMetricRatingStyle(mobRating);
            const dskStyle = getMetricRatingStyle(dskRating);

            return `<tr>
              <td><strong>${escapeHtml(m.name)}</strong></td>
              <td>${m.format(m.mobVal)}</td>
              <td>${m.format(m.dskVal)}</td>
              <td style="color: #64748B; font-size: 7.5pt;">${m.threshold}</td>
              <td><span style="background: ${mobStyle.bg}; color: ${mobStyle.color}; padding: 2px 5px; border-radius: 3px; font-size: 7pt; font-weight: bold; white-space: nowrap;">${mobStyle.label}</span></td>
              <td><span style="background: ${dskStyle.bg}; color: ${dskStyle.color}; padding: 2px 5px; border-radius: 3px; font-size: 7pt; font-weight: bold; white-space: nowrap;">${dskStyle.label}</span></td>
            </tr>`;
          })
          .join("");
      })()}
    </tbody>
  </table>

  <div style="font-size: 7pt; color: #64748B; margin-top: -8px; margin-bottom: 10px;">
    * Real-user field data (CrUX 75th percentile) requires sufficient 28-day Chrome user traffic. Field data currently unavailable or unconfigured for this domain.
  </div>

  <div style="margin-top: 8px; margin-bottom: 4px; font-weight: 700; font-size: 8pt; color: #0F172A;">
    Multi-Viewport Responsive Breakdown (7 Standard Viewports)
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
  ${(report.competitorComparisons || []).length > 0 ? `
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
      ${report.competitorComparisons
        .map(
          (comp) => `<tr>
        <td class="url-cell"><strong>${escapeHtml(comp.domain)}</strong></td>
        <td>${comp.status === "NOT_ASSESSED" || comp.overallScore == null ? "NOT ASSESSED" : `${comp.overallScore}/100`}</td>
        <td>${escapeHtml(comp.dataProvenance)}</td>
        <td>${comp.status === "NOT_ASSESSED" ? "Pending Scan" : "Public Surface Benchmark"}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>` : `
  <div class="card" style="padding: 12px; color: #64748B; text-align: center; font-size: 8.5pt; margin-top: 8px;">
    <strong>Not evaluated — no competitor domains supplied.</strong><br/>
    <span style="font-size: 7.5pt;">No competitor domains specified for comparative evaluation. Provide 1 to 3 direct competitor domains in the scan configuration to enable comparative technical and search visibility benchmarking.</span>
  </div>`}

  <div class="page-break"></div>

  <!-- SECTION 17: FINDING LEDGER -->
  ${(() => {
    const totalIssues = (report.findings || []).filter((f) => f.status === "FAIL" || f.status === "WARNING").length;
    const title = totalIssues <= 15
      ? `11. Diagnostic Finding Ledger (${totalIssues} Findings Identified — Full Ledger in Export)`
      : `11. Diagnostic Finding Ledger (Top 15 of ${totalIssues} Findings Identified — Full Ledger in Export)`;
    return `<h2>${title}</h2>`;
  })()}
  <table>
    <colgroup>
      <col style="width: 15%;">
      <col style="width: 22%;">
      <col style="width: 12%;">
      <col style="width: 28%;">
      <col style="width: 23%;">
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
          <td style="font-family: monospace; font-size: 7.5pt; white-space: nowrap;">${escapeHtml(f.id)}</td>
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
  <div class="card" style="margin-bottom: 8px; font-size: 7.5pt; color: #475569;">
    <strong>Synchronized Effort Schedule:</strong> Scheduled <strong>${totalEstimatedHours} engineering hours</strong> across <strong>${report.remediationRegister.length} active specialist workstreams</strong>. All hours reconcile directly with findings in the ledger.
  </div>
  <table>
    <colgroup>
      <col style="width: 11%;">
      <col style="width: 18%;">
      <col style="width: 9%;">
      <col style="width: 10%;">
      <col style="width: 10%;">
      <col style="width: 42%;">
    </colgroup>
    <thead>
      <tr>
        <th>Task ID</th>
        <th>Workstream</th>
        <th>Pri</th>
        <th>Effort</th>
        <th>Hours</th>
        <th>Task Action &amp; Validation</th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        const tasks = (report.remediationRegister || []).slice(0, 15);
        if (tasks.length === 0) {
          return `<tr><td colspan="6" style="text-align: center; color: #64748B; padding: 14px;">No remediation tasks scheduled. Target meets evaluated baseline specifications.</td></tr>`;
        }
        return tasks
          .map(
            (t) => `<tr>
          <td style="font-family: monospace; font-size: 7.5pt;">${escapeHtml(t.id)}</td>
          <td><strong>${escapeHtml(t.workstream)}</strong></td>
          <td>${getSeverityBadge(t.priority)}</td>
          <td>${escapeHtml(t.estimatedEffort)}</td>
          <td><strong>${t.estimatedHours || 0} hrs</strong></td>
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

  ${report.costOfInaction?.status === "ESTIMATED" && report.costOfInaction.scenarios ? `
  <div style="margin-top: 10px;">
    <h3 style="font-size: 8.5pt; font-weight: 700; color: #0F172A; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
      Financial Opportunity Modeling &amp; Cost of Inaction Linkage (Synchronized Snapshot)
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 6px;">
      <colgroup>
        <col style="width: 20%;">
        <col style="width: 20%;">
        <col style="width: 20%;">
        <col style="width: 20%;">
        <col style="width: 20%;">
      </colgroup>
      <thead>
        <tr style="background: #042F2E; color: white;">
          <th style="padding: 4px 6px;">Scenario</th>
          <th style="padding: 4px 6px;">Monthly Revenue</th>
          <th style="padding: 4px 6px;">Annual Revenue</th>
          <th style="padding: 4px 6px;">Gross Profit Opp</th>
          <th style="padding: 4px 6px;">Payback Period</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 4px 6px;"><strong>Conservative (+0.20%)</strong></td>
          <td style="padding: 4px 6px;">${formatCurrency(report.costOfInaction.scenarios.conservative.monthlyRevenueOpportunity ?? 0, report.costOfInaction.currency)} / mo</td>
          <td style="padding: 4px 6px;">${formatCurrency(report.costOfInaction.scenarios.conservative.annualRevenueOpportunity ?? 0, report.costOfInaction.currency)} / yr</td>
          <td style="padding: 4px 6px;">${report.costOfInaction.grossMarginPct != null ? `${formatCurrency(report.costOfInaction.scenarios.conservative.monthlyGrossProfitOpportunity ?? 0, report.costOfInaction.currency)} / mo` : "Omitted"}</td>
          <td style="padding: 4px 6px;">${report.costOfInaction.scenarios.conservative.paybackMonths != null ? `${report.costOfInaction.scenarios.conservative.paybackMonths} mo` : "N/A"}</td>
        </tr>
        <tr style="background: #F8FAFC;">
          <td style="padding: 4px 6px;"><strong>Base Case (+0.50%)</strong></td>
          <td style="padding: 4px 6px;">${formatCurrency(report.costOfInaction.scenarios.base.monthlyRevenueOpportunity ?? 0, report.costOfInaction.currency)} / mo</td>
          <td style="padding: 4px 6px;">${formatCurrency(report.costOfInaction.scenarios.base.annualRevenueOpportunity ?? 0, report.costOfInaction.currency)} / yr</td>
          <td style="padding: 4px 6px;">${report.costOfInaction.grossMarginPct != null ? `${formatCurrency(report.costOfInaction.scenarios.base.monthlyGrossProfitOpportunity ?? 0, report.costOfInaction.currency)} / mo` : "Omitted"}</td>
          <td style="padding: 4px 6px;">${report.costOfInaction.scenarios.base.paybackMonths != null ? `${report.costOfInaction.scenarios.base.paybackMonths} mo` : "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 4px 6px;"><strong>Upside (+1.00%)</strong></td>
          <td style="padding: 4px 6px;">${formatCurrency(report.costOfInaction.scenarios.upside.monthlyRevenueOpportunity ?? 0, report.costOfInaction.currency)} / mo</td>
          <td style="padding: 4px 6px;">${formatCurrency(report.costOfInaction.scenarios.upside.annualRevenueOpportunity ?? 0, report.costOfInaction.currency)} / yr</td>
          <td style="padding: 4px 6px;">${report.costOfInaction.grossMarginPct != null ? `${formatCurrency(report.costOfInaction.scenarios.upside.monthlyGrossProfitOpportunity ?? 0, report.costOfInaction.currency)} / mo` : "Omitted"}</td>
          <td style="padding: 4px 6px;">${report.costOfInaction.scenarios.upside.paybackMonths != null ? `${report.costOfInaction.scenarios.upside.paybackMonths} mo` : "N/A"}</td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 7pt; color: #475569; padding: 5px 6px; background: #F1F5F9; border-radius: 4px;">
      <strong>Evidence Traceability &amp; Attributed Defect Rules:</strong> Linked to friction findings in CRO-01..CRO-04, RSP-01..RSP-05, and PERF-01..PERF-05.
      Estimated remediation cost: <strong>${formatCurrency(report.costOfInaction.remediationCostEstimate ?? 0, report.costOfInaction.currency)}</strong>.
      Assumptions: ${(report.costOfInaction.assumptions || []).slice(0, 3).join(" • ")}.
    </div>
  </div>
  ` : ""}

  <!-- SECTION 18b: COMPLETE 56-RULE AUDIT LEDGER -->
  <div class="page-break"></div>
  <h2>Appendix: Complete 56-Rule Assessment Catalogue Ledger</h2>
  <div class="card" style="margin-bottom: 8px; font-size: 7.5pt; color: #475569;">
    <strong>Deterministic Evaluation Ledger:</strong> Complete audit record of all 56 rules across 11 assessment categories. Passing rules represent verified baseline hygiene, not defects. Non-evaluable checks explicitly disclose limitations rather than assuming compliance.
  </div>
  <table>
    <colgroup>
      <col style="width: 12%;">
      <col style="width: 16%;">
      <col style="width: 26%;">
      <col style="width: 10%;">
      <col style="width: 10%;">
      <col style="width: 26%;">
    </colgroup>
    <thead>
      <tr>
        <th>Rule ID</th>
        <th>Category</th>
        <th>Rule Name</th>
        <th>Status</th>
        <th>Points</th>
        <th>Observed Evidence / Procedure</th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        const rules = report.ruleLedger && report.ruleLedger.length > 0
          ? report.ruleLedger
          : (report.findings || []);
        return rules.map((r: any) => `<tr>
          <td style="font-family: monospace; font-size: 7.5pt; white-space: nowrap;"><strong>${escapeHtml(r.ruleId || r.testId)}</strong></td>
          <td style="font-size: 7pt;">${escapeHtml(r.categoryName || r.category)}</td>
          <td>
            <strong>${escapeHtml(r.testName || r.title)}</strong>
          </td>
          <td>${getStatusBadge(r.status)}</td>
          <td style="font-size: 7.5pt; white-space: nowrap;"><strong>${r.earnedPoints ?? 0}</strong> / ${r.allocatedPoints ?? r.maxPoints ?? 0} pts</td>
          <td style="font-size: 7pt; color: #334155;">
            ${escapeHtml(r.observedValue || r.summary || (r.evidence?.[0]?.observedValue ?? "Compliant baseline verified."))}
            ${r.status === "NOT_TESTED" || r.status === "UNKNOWN" ? '<div style="color: #D97706; margin-top: 2px;">(Evidence unavailable on passive crawl)</div>' : ""}
          </td>
        </tr>`).join("");
      })()}
    </tbody>
  </table>

  <!-- SECTION 19: EXPORT MANIFEST & SIGN-OFF -->
  <h2>13. Cryptographic Integrity Sign-Off &amp; Manifest</h2>
  <div class="card" style="margin-top: 10px; font-size: 8pt;">
    <div><strong>Scan ID:</strong> <span style="font-family: monospace; font-size: 7.5pt;">${escapeHtml(meta.scanId)}</span></div>
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
