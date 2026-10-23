import type { ExpertReport } from "../../types";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export function generateExpertReportHtml(report: ExpertReport): string {
  const meta = report.metadata;
  const exec = report.executiveSummary;
  const platform = report.platformProfile;
  const dateFormatted = new Date(meta.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">CRITICAL</span>`;
      case "HIGH":
        return `<span style="background: #FFEDD5; color: #9A3412; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">HIGH</span>`;
      case "MEDIUM":
        return `<span style="background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">MEDIUM</span>`;
      case "LOW":
        return `<span style="background: #E0E7FF; color: #3730A3; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">LOW</span>`;
      default:
        return `<span style="background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">INFO</span>`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return `<span style="background: #DCFCE7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">PASS</span>`;
      case "FAIL":
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">FAIL</span>`;
      case "WARNING":
        return `<span style="background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">WARN</span>`;
      case "BLOCKED":
        return `<span style="background: #FEE2E2; color: #991B1B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">BLOCKED</span>`;
      case "NOT_APPLICABLE":
        return `<span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">N/A</span>`;
      default:
        return `<span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt;">NOT TESTED</span>`;
    }
  };

  const totalEstimatedHours = report.remediationRegister.reduce(
    (acc, t) => acc + (t.estimatedHours || 0),
    0
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Company B Expert Diagnostic Report — ${meta.companyA.domain}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 14mm 14mm 14mm;
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
      font-size: 9.5pt;
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
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-title {
      font-size: 16pt;
      font-weight: 800;
      color: #042F2E;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 8.5pt;
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
      font-size: 20pt;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 6px;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #042F2E;
      margin-top: 18px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E2E8F0;
    }
    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1E293B;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 14px;
    }
    .card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .card-title {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .card-value {
      font-size: 15pt;
      font-weight: 800;
      color: #0F172A;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 14px;
      font-size: 8.5pt;
    }
    th {
      background: #042F2E;
      color: #FFFFFF;
      text-align: left;
      padding: 6px 8px;
      font-weight: 600;
      font-size: 8pt;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #F8FAFC;
    }
    .code-box {
      background: #0F172A;
      color: #F8FAFC;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 7.5pt;
      padding: 6px 8px;
      border-radius: 4px;
      word-break: break-all;
      margin-top: 4px;
    }
    .alert-box {
      background: #EFF6FF;
      border-left: 3px solid #3B82F6;
      padding: 8px 10px;
      border-radius: 0 4px 4px 0;
      font-size: 8.5pt;
      margin-bottom: 12px;
    }
    .footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      margin-top: 20px;
      font-size: 7.5pt;
      color: #94A3B8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- SECTION 1: COVER & EXECUTIVE SUMMARY -->
  <div class="header">
    <div>
      <div class="brand-title">SiteIntel Pulse</div>
      <div class="brand-subtitle">Company B Expert Diagnostic & Growth Intelligence Report</div>
    </div>
    <div class="report-meta">
      <div>Report ID: <strong>${meta.reportId}</strong></div>
      <div>Audit Date: <strong>${dateFormatted}</strong></div>
      <div>Engine: <strong>SiteIntel Pulse v2.0.0</strong></div>
    </div>
  </div>

  <h1>Expert Technical Diagnostic Report</h1>
  <p style="font-size: 11pt; color: #475569; margin-bottom: 16px;">
    In-depth engineering inspection, page-level diagnostic inventory, security posture, and specialist workstream plan for <strong>${meta.companyA.targetUrl}</strong>.
  </p>

  <div class="grid-4">
    <div class="card">
      <div class="card-title">Overall Score</div>
      <div class="card-value" style="color: ${getScoreColor(exec.overallScore.score)}">
        ${exec.overallScore.score}<span style="font-size: 10pt; color: #64748B;">/100</span>
      </div>
      <div style="font-size: 7.5pt; color: #64748B; margin-top: 2px;">
        Rating: <strong>${exec.overallScore.ratingBand}</strong>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Discovered Pages</div>
      <div class="card-value">${report.coverage.discoveredPages}</div>
      <div style="font-size: 7.5pt; color: #64748B; margin-top: 2px;">
        Tested: <strong>${report.coverage.testedPages}</strong> (${report.coverage.coveragePercentage}%)
      </div>
    </div>

    <div class="card">
      <div class="card-title">Defect Triage</div>
      <div class="card-value" style="color: #DC2626;">
        ${exec.issueTotals.critical + exec.issueTotals.high}
      </div>
      <div style="font-size: 7.5pt; color: #64748B; margin-top: 2px;">
        ${exec.issueTotals.critical} Critical / ${exec.issueTotals.high} High / ${exec.issueTotals.medium} Med
      </div>
    </div>

    <div class="card">
      <div class="card-title">Remediation Effort</div>
      <div class="card-value" style="color: #0F9D91;">
        ${totalEstimatedHours}<span style="font-size: 10pt; color: #64748B;"> hrs</span>
      </div>
      <div style="font-size: 7.5pt; color: #64748B; margin-top: 2px;">
        Across ${exec.workstreamEstimates.length} technical workstreams
      </div>
    </div>
  </div>

  <div class="alert-box">
    <strong>Auditor Scope & Methodology:</strong> ${meta.scopeAndBoundaries}
  </div>

  <!-- SECTION 2: METADATA & SCOPE -->
  <h2>1. Scope & Execution Parameters</h2>
  <div class="grid-3">
    <div class="card">
      <div class="card-title">Target Hostname</div>
      <div style="font-weight: 700;">${meta.companyA.domain}</div>
      <div style="font-size: 8pt; color: #64748B;">Category: ${meta.companyA.businessCategory} | Market: ${meta.companyA.targetMarket}</div>
    </div>
    <div class="card">
      <div class="card-title">Crawl Execution</div>
      <div style="font-weight: 700;">Depth ${report.coverage.crawlDepthReached} | Budget ${report.coverage.totalPagesBudget} pages</div>
      <div style="font-size: 8pt; color: #64748B;">Exhaustive: ${report.coverage.isExhaustive ? "Yes" : "Budget Limited"}</div>
    </div>
    <div class="card">
      <div class="card-title">Audit Mode</div>
      <div style="font-weight: 700; color: ${meta.authorization.isAuthorizedForAuthScan ? "#0F9D91" : "#D97706"};">
        ${meta.authorization.isAuthorizedForAuthScan ? "AUTHORIZED DYNAMIC" : "PASSIVE PUBLIC"}
      </div>
      <div style="font-size: 8pt; color: #64748B;">Repo Authorized: ${meta.authorization.repositoryAuthorized ? "Yes" : "No"}</div>
    </div>
  </div>

  <!-- SECTION 3: PLATFORM PROFILE & STACK -->
  <h2>2. Platform Profile & Detected Stack</h2>
  <div class="grid-4">
    <div class="card">
      <div class="card-title">CMS Category</div>
      <div style="font-weight: 700;">${platform.cmsCategory}</div>
      <div style="font-size: 8pt; color: #64748B;">Confidence: ${platform.confidence}</div>
    </div>
    <div class="card">
      <div class="card-title">Framework Hints</div>
      <div style="font-weight: 700;">${platform.frameworkHints.join(", ") || "Vanilla / Static"}</div>
      <div style="font-size: 8pt; color: #64748B;">Modern Frontend</div>
    </div>
    <div class="card">
      <div class="card-title">Server & CDN Clues</div>
      <div style="font-weight: 700;">${platform.serverCdnClues.join(", ") || "Standard HTTP/2"}</div>
      <div style="font-size: 8pt; color: #64748B;">Edge Distribution</div>
    </div>
    <div class="card">
      <div class="card-title">Client Tech</div>
      <div style="font-weight: 700;">${platform.clientTechnologies.join(", ") || "Standard"}</div>
      <div style="font-size: 8pt; color: #64748B;">Integrations: ${report.integrations.length}</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 4: SCORE LEDGER & COVERAGE -->
  <h2>3. Assessment Catalogue & Score Ledger (56 Rules / 11 Categories)</h2>
  <table>
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
        <td><strong>${c.categoryName}</strong></td>
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
  <h2>4. Discovered Page Diagnostics (Top ${Math.min(report.urlInventory.length, 12)} Pages)</h2>
  <table>
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
      ${report.urlInventory
        .slice(0, 12)
        .map(
          (u) => `<tr>
        <td style="max-width: 200px; word-break: break-all; font-family: monospace; font-size: 8pt;">${u.url}</td>
        <td>${u.statusCode}</td>
        <td><strong>${u.indexabilityStatus}</strong></td>
        <td>${u.crawlDepth}</td>
        <td style="font-size: 7.5pt; color: #64748B;">${u.canonicalStatus}</td>
        <td>${u.wordCount}</td>
        <td>${u.responseTimeMs}ms</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <!-- SECTION 6 & 7: TECHNICAL SEO & LINK AUDIT -->
  <div class="grid-2">
    <div>
      <h2>5. SEO Structural Health</h2>
      <div class="card" style="margin-bottom: 8px;">
        <div class="card-title">Structured Data Entities</div>
        <div style="font-size: 8.5pt;">
          ${report.seoDiagnostics.structuredDataEntities.length > 0
            ? report.seoDiagnostics.structuredDataEntities.map(e => e.type || e["@type"] || "Entity").slice(0, 6).join(", ")
            : "No Schema.org entities detected"}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Heading Hierarchy Sample</div>
        <div style="font-size: 8pt; font-family: monospace;">
          H1: ${report.seoDiagnostics.headingHierarchy.h1?.length || 0} found | H2: ${report.seoDiagnostics.headingHierarchy.h2?.length || 0} found
        </div>
      </div>
    </div>

    <div>
      <h2>6. Link Architecture & Status</h2>
      <div class="card" style="margin-bottom: 8px;">
        <div class="card-title">Link Breakdown</div>
        <div>Internal Links: <strong>${report.linkAudit.internalLinks.length}</strong></div>
        <div>Outbound Links: <strong>${report.linkAudit.outboundLinks.length}</strong></div>
        <div>Broken Links: <strong style="color: ${report.linkAudit.brokenLinks.length > 0 ? '#DC2626' : '#059669'}">${report.linkAudit.brokenLinks.length}</strong></div>
      </div>
      <div class="card">
        <div class="card-title">Orphan Candidates</div>
        <div style="font-size: 8pt;">${report.linkAudit.orphanCandidates.length > 0 ? report.linkAudit.orphanCandidates.join(", ") : "None identified"}</div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 8 & 9: PERFORMANCE & RESPONSIVE MATRIX -->
  <h2>7. Core Web Vitals & Multi-Viewport Matrix</h2>
  <div class="grid-4">
    <div class="card">
      <div class="card-title">Lab TTFB</div>
      <div class="card-value" style="font-size: 13pt;">${report.performanceDiagnostics.labScores.ttfbMs != null ? `${report.performanceDiagnostics.labScores.ttfbMs}ms` : "—"}</div>
    </div>
    <div class="card">
      <div class="card-title">Render-Blocking</div>
      <div class="card-value" style="font-size: 13pt; color: ${report.performanceDiagnostics.blockingResources.length > 0 ? '#D97706' : '#059669'};">
        ${report.performanceDiagnostics.blockingResources.length} assets
      </div>
    </div>
    <div class="card">
      <div class="card-title">Mobile Lab Score</div>
      <div class="card-value" style="font-size: 13pt;">${report.performanceDiagnostics.labScores.mobile != null ? `${report.performanceDiagnostics.labScores.mobile}/100` : "Not connected"}</div>
    </div>
    <div class="card">
      <div class="card-title">Responsive Breakpoints</div>
      <div class="card-value" style="font-size: 13pt; color: #0F9D91;">
        ${report.responsiveDiagnostics.length > 0 ? `${report.responsiveDiagnostics.length} tested` : "Not tested"}
      </div>
    </div>
  </div>

  <table>
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
      ${report.responsiveDiagnostics.length > 0
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
        : '<tr><td colspan="5" style="text-align: center; color: #64748B; padding: 12px;">Passive crawl only — browser-automated responsive tests were not executed for this run.</td></tr>'}
    </tbody>
  </table>

  <!-- SECTION 10 & 11: SECURITY & AUTH -->
  <h2>8. Security Configuration & Authentication Posture</h2>
  <div class="grid-2">
    <div>
      <h3>HTTP Security Headers</h3>
      <table>
        <thead>
          <tr>
            <th>Control</th>
            <th>Severity</th>
            <th>Observed Directive</th>
          </tr>
        </thead>
        <tbody>
          ${report.securityDiagnostics
            .slice(0, 7)
            .map(
              (h) => `<tr>
            <td><strong>${h.title}</strong></td>
            <td>${getSeverityBadge(h.severity)}</td>
            <td style="font-family: monospace; font-size: 7.5pt; max-width: 150px; word-break: break-all;">${h.observedValue || "—"}</td>
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
        <div style="font-size: 8.5pt;">
          ${report.authenticationAssessment.publicLoginSurfaces.length > 0
            ? report.authenticationAssessment.publicLoginSurfaces.map(s => `<div><strong>Login:</strong> ${s.url} (HTTPS: ${s.isHttps ? 'Yes' : 'No'})</div>`).join("")
            : "No explicit public login or register forms detected"}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Session Cookie Flags</div>
        <div>Secure Flag: <strong>${report.authenticationAssessment.sessionSecurity.cookieSecure === null ? "Unknown (No Cookies)" : report.authenticationAssessment.sessionSecurity.cookieSecure ? "Enforced" : "Vulnerable"}</strong></div>
        <div>HttpOnly Flag: <strong>${report.authenticationAssessment.sessionSecurity.cookieHttpOnly === null ? "Unknown (No Cookies)" : report.authenticationAssessment.sessionSecurity.cookieHttpOnly ? "Enforced" : "Vulnerable"}</strong></div>
        <div>SameSite Policy: <strong>${report.authenticationAssessment.sessionSecurity.cookieSameSite || "Unobserved"}</strong></div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 12 & 13: GEO/AEO & INTEGRATIONS -->
  <h2>9. Integrations, GEO / AEO & AI Readiness</h2>
  <div class="grid-2">
    <div>
      <h3>Detected Integrations & Tags</h3>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Category</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          ${report.integrations
            .map(
              (i) => `<tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.category}</td>
            <td>${i.state === "NOT_DETECTED" ? '<span style="color: #64748B;">NOT DETECTED</span>' : '<span style="color: #059669; font-weight: bold;">ACTIVE / DETECTED</span>'}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div>
      <h3>AI Crawler Policies & Schema</h3>
      <div class="card" style="margin-bottom: 8px;">
        <div class="card-title">Robots.txt AI Crawlers</div>
        <div style="font-size: 8.5pt;">
          GPTBot: <strong>${report.geoAeoDiagnostics.crawlerPolicies.GPTBot || "Open"}</strong><br/>
          ClaudeBot: <strong>${report.geoAeoDiagnostics.crawlerPolicies.ClaudeBot || "Open"}</strong><br/>
          CCBot: <strong>${report.geoAeoDiagnostics.crawlerPolicies.CCBot || "Open"}</strong>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Direct Answer Readiness</div>
        <div style="font-size: 8.5pt;">
          FAQ Schema: <strong>${report.geoAeoDiagnostics.directAnswerReadiness.faqSchemaPresent ? "Present" : "Missing"}</strong><br/>
          HowTo Schema: <strong>${report.geoAeoDiagnostics.directAnswerReadiness.howToSchemaPresent ? "Present" : "Missing"}</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 16: COMPETITOR BENCHMARK -->
  <h2>10. Competitor Benchmark Analysis</h2>
  <table>
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
        <td><strong>${meta.companyA.domain} (Company A)</strong></td>
        <td><strong>${exec.overallScore.score}/100</strong></td>
        <td>Live Crawl & Deterministic Catalogue</td>
        <td>Full Inspection</td>
      </tr>
      ${report.competitorComparisons
        .map(
          (comp) => `<tr>
        <td><strong>${comp.domain}</strong></td>
        <td>${comp.status === "NOT_ASSESSED" || comp.overallScore == null ? "NOT ASSESSED" : `${comp.overallScore}/100`}</td>
        <td>${comp.dataProvenance}</td>
        <td>${comp.status === "NOT_ASSESSED" ? "Pending Scan" : "Public Surface Benchmark"}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- SECTION 17: FINDING LEDGER -->
  <h2>11. Diagnostic Finding Ledger (Top 15 of ${report.findings.filter((f) => f.status === "FAIL" || f.status === "WARNING").length} Total Issues — Full Ledger in Export)</h2>
  <table>
    <thead>
      <tr>
        <th>Finding ID</th>
        <th>Category & Rule</th>
        <th>Sev / Stat</th>
        <th>Technical Impact & Evidence</th>
        <th>Remediation Advice</th>
      </tr>
    </thead>
    <tbody>
      ${report.findings
        .filter((f) => f.status === "FAIL" || f.status === "WARNING" || f.severity === "CRITICAL" || f.severity === "HIGH")
        .slice(0, 15)
        .map(
          (f) => `<tr>
        <td style="font-family: monospace; font-size: 8pt; white-space: nowrap;">${f.id}</td>
        <td>
          <strong>${f.categoryName}</strong><br/>
          <span style="font-size: 8pt; color: #475569;">${f.title}</span>
        </td>
        <td style="white-space: nowrap;">
          ${getSeverityBadge(f.severity)}<br/>
          ${getStatusBadge(f.status)}
        </td>
        <td style="font-size: 8pt;">
          <strong>Technical:</strong> ${f.technicalImpact}<br/>
          ${f.evidence?.[0]?.discrepancy ? `<div class="code-box">${f.evidence[0].discrepancy}</div>` : ""}
        </td>
        <td style="font-size: 8pt; color: #042F2E;">
          ${f.remediation}
        </td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- SECTION 18: REMEDIATION PLAN -->
  <h2>12. Specialist Remediation Action Plan (Company B Engineering Tasks)</h2>
  <table>
    <thead>
      <tr>
        <th>Task ID</th>
        <th>Workstream</th>
        <th>Pri</th>
        <th>Effort</th>
        <th>Task Action & Validation</th>
      </tr>
    </thead>
    <tbody>
      ${report.remediationRegister
        .slice(0, 15)
        .map(
          (t) => `<tr>
        <td style="font-family: monospace; font-size: 8pt; white-space: nowrap;">${t.id}</td>
        <td><strong>${t.workstream}</strong></td>
        <td>${getSeverityBadge(t.priority)}</td>
        <td>${t.estimatedEffort}</td>
        <td>
          <strong>${t.title}</strong>
          <div style="font-size: 7.5pt; color: #475569; margin-top: 2px;">${t.actionSteps.join(" -> ")}</div>
          <div style="font-size: 7.5pt; color: #0F9D91; margin-top: 2px;"><strong>Validation:</strong> ${t.validationProcedure}</div>
        </td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <!-- SECTION 19: EXPORT MANIFEST & SIGN-OFF -->
  <h2>13. Cryptographic Integrity Sign-Off & Manifest</h2>
  <div class="card" style="margin-top: 10px;">
    <div><strong>Export ID:</strong> ${report.exportManifest.exportId}</div>
    <div><strong>Audit Core Manifest Hash:</strong> <span style="font-family: monospace; font-size: 8pt;">${report.exportManifest.checksum || "NOT_GENERATED"}</span></div>
    <div><strong>Digest Scope:</strong> Canonical serialization of audit dataset (scanId, targetUrl, overallScore, categoryScores, findings ledger, and platformProfile).</div>
    <div><strong>Verification Status:</strong> <span style="font-family: monospace; font-size: 8.5pt; font-weight: 700; color: #0D9488;">${report.exportManifest.verificationStatus || "DIGEST_GENERATED"}</span></div>
    <div><strong>Generated At:</strong> ${report.exportManifest.generatedAt}</div>
    <div style="font-size: 8pt; color: #64748B; margin-top: 6px;">* Binary artifact note: The manifest hash verifies the structured report data model. Generated PDF bytes have an independent byte-level SHA-256 calculated upon binary rendering.</div>
  </div>

  <div class="footer">
    <div>Generated by <strong>SiteIntel Pulse v2.0</strong> — Discover Issues. Prove with Evidence. Improve. Grow.</div>
    <div>Company B Confidential Diagnostic Work Product</div>
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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
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
