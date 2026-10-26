import type { OwnerReport } from "../../types";
import path from "node:path";
import fs from "node:fs/promises";

function escapeHtml(str: unknown): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateReportHtml(report: OwnerReport): string {
  const overall = report.executiveSnapshot.overallScore;
  const company = report.companyIdentity;
  const detection = company.businessCategoryDetection;
  const dateFormatted = new Date(report.generatedAt).toLocaleDateString("en-US", {
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Website Owner Audit Report — ${escapeHtml(company.name)}</title>
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
      font-size: 10pt;
      line-height: 1.5;
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
      font-size: 18pt;
      font-weight: 800;
      color: #0B1220;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 8.5pt;
      color: #0F9D91;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta-block {
      text-align: right;
      font-size: 8.5pt;
      color: #64748B;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .hero-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px 18px;
      margin-bottom: 20px;
      display: flex;
      gap: 24px;
      align-items: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .score-circle {
      width: 92px;
      height: 92px;
      border-radius: 50%;
      border: 6px solid ${getScoreColor(overall.score)};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .score-value {
      font-size: 24pt;
      font-weight: 800;
      color: #0F172A;
      line-height: 1;
    }
    .score-denom {
      font-size: 8pt;
      color: #64748B;
      font-weight: 600;
    }
    .hero-info {
      flex: 1;
    }
    .hero-target {
      font-size: 15pt;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .hero-band {
      display: inline-block;
      padding: 2px 9px;
      background: #E6FFFA;
      color: #0D9488;
      font-weight: 700;
      font-size: 8.5pt;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .hero-note {
      font-size: 9pt;
      color: #475569;
    }
    h2.section-title {
      font-size: 12pt;
      font-weight: 700;
      color: #0B1220;
      border-left: 4px solid #0F9D91;
      padding-left: 10px;
      margin: 20px 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .category-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }
    .category-card {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #FFFFFF;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .category-card-header {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      font-size: 9.5pt;
      margin-bottom: 5px;
    }
    .progress-bar-bg {
      background: #E2E8F0;
      height: 7px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 5px;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .category-meta {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #64748B;
    }
    table.table-custom {
      table-layout: fixed;
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 8.5pt;
    }
    table.table-custom thead {
      display: table-header-group;
    }
    table.table-custom tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.table-custom th {
      background: #F1F5F9;
      padding: 7px 9px;
      text-align: left;
      font-weight: 700;
      color: #334155;
      border-bottom: 1px solid #CBD5E1;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    table.table-custom td {
      padding: 7px 9px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .url-cell, code, pre {
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 7.5pt;
      font-weight: 700;
    }
    .badge-pass { background: #DCFCE7; color: #166534; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .badge-fail { background: #FEE2E2; color: #991B1B; }
    .badge-info { background: #E0F2FE; color: #075985; }
    .badge-not-tested { background: #F1F5F9; color: #475569; }
    .badge-unknown { background: #FEF3C7; color: #78350F; }
    .opportunity-card {
      border-left: 4px solid #0F9D91;
      background: #F8FAFC;
      padding: 10px 12px;
      margin-bottom: 10px;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .opportunity-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0F172A;
      margin-bottom: 3px;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .opportunity-impact {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 4px;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .opportunity-action {
      font-size: 8.5pt;
      color: #0F766E;
      font-weight: 600;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    .alert-box {
      background: #FFFBEB;
      border-left: 4px solid #F59E0B;
      padding: 9px 12px;
      margin: 12px 0;
      font-size: 8.5pt;
      color: #92400E;
      word-break: break-word;
      overflow-wrap: break-word;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: Identity & Executive Snapshot -->
  <div class="header">
    <div>
      <div class="brand-title">SiteIntel Pulse</div>
      <div class="brand-tagline">Website Intelligence &amp; Growth Audit</div>
    </div>
    <div class="meta-block">
      <div>Report ID: <strong>${escapeHtml(report.reportId)}</strong></div>
      <div>Audit Date: <strong>${dateFormatted}</strong></div>
      <div>Audience: <strong>Company A (Owner Report)</strong></div>
    </div>
  </div>

  <div class="hero-card no-break">
    <div class="score-circle">
      <div class="score-value">${overall.score}</div>
      <div class="score-denom">/ 100</div>
      ${overall.isProvisional ? `<div style="font-size: 6.5pt; color: #D97706; font-weight: 700; text-transform: uppercase;">PROVISIONAL</div>` : ""}
    </div>
    <div class="hero-info">
      <div class="hero-target">${escapeHtml(company.name)} (${escapeHtml(company.targetUrl)})</div>
      <div class="hero-band">${overall.ratingBand} ${overall.isProvisional ? "(Provisional Evaluation)" : "(Fully Assessed)"}</div>
      <div class="hero-note">${escapeHtml(overall.evaluationNote)}</div>
      <div style="margin-top: 8px; font-size: 8.5pt; color: #475569; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <span>Business Model: <strong>${escapeHtml(detection ? detection.categoryLabel : company.businessCategory)}</strong></span>
        ${detection ? `
          <span style="display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; font-weight: 700; ${
            detection.decisionSource === "AUTO_DETECTED"
              ? "background: #E6FFFA; color: #0D9488; border: 1px solid #99F6E4;"
              : detection.decisionSource === "MANUALLY_OVERRIDDEN"
              ? "background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;"
              : "background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;"
          }">
            ${detection.decisionSource === "AUTO_DETECTED" ? "Auto-Detected" : detection.decisionSource === "MANUALLY_OVERRIDDEN" ? "Manual Override" : "Unresolved"} (${detection.confidence} · ${Math.round(detection.confidenceScore * 100)}% heuristic)
          </span>
        ` : ""}
      </div>
      ${detection && detection.decisionSource === "MANUALLY_OVERRIDDEN" && detection.primaryCategory !== company.businessCategory ? `
        <div style="font-size: 8pt; color: #92400E; margin-top: 3px;">
          <em>Note: User override '${escapeHtml(company.businessCategory)}' supersedes detected '${escapeHtml(detection.primaryCategory)}'.</em>
        </div>
      ` : ""}
      ${detection && detection.secondaryFacets && detection.secondaryFacets.length > 0 ? `
        <div style="font-size: 8pt; color: #0D9488; margin-top: 3px;">
          <strong>Secondary Facets:</strong> ${escapeHtml(detection.secondaryFacets.map(f => f.replace(/_/g, " ")).join(", "))}
        </div>
      ` : ""}
      <div style="margin-top: 6px; font-size: 8pt; color: #64748B;">
        Scope: <strong>${report.executiveSnapshot.testedPageCount} pages tested</strong> | Coverage: <strong>${report.executiveSnapshot.coverage.coveragePercentage}% evaluated</strong> | Points Earned: <strong>${overall.totalEarnedCataloguePoints ?? overall.score}/100 pts</strong>
      </div>
    </div>
  </div>

  ${overall.isProvisional ? `
  <div class="alert-box no-break">
    <strong>Provisional Coverage Acceptance Notice:</strong> ${escapeHtml(overall.evaluationNote)} SiteIntel Pulse requires &ge;70% overall catalogue coverage and &ge;60% per-category coverage for a certified fully assessed score.
    ${overall.ineligibleCategories && overall.ineligibleCategories.length > 0 ? `
      <div style="font-size: 7.5pt; color: #B45309; margin-top: 3px;">
        <strong>Categories needing expanded evidence:</strong> ${escapeHtml(overall.ineligibleCategories.join("; "))}
      </div>
    ` : ""}
  </div>` : ""}

  <h2 class="section-title">1. Executive Snapshot &amp; Category Scores</h2>
  <div class="category-grid no-break">
    ${report.scoreDetails.map((cat) => `
      <div class="category-card">
        <div class="category-card-header">
          <span>${escapeHtml(cat.categoryName)}</span>
          <span style="color: ${getScoreColor(cat.scorePercentage)}">${cat.scorePercentage}% ${!cat.isEligibleForOverall ? '<small style="color: #D97706; font-size: 7.5pt;">(Prov)</small>' : ""}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${cat.scorePercentage}%; background: ${getScoreColor(cat.scorePercentage)};"></div>
        </div>
        <div class="category-meta" style="display: flex; flex-direction: column; gap: 2px; font-size: 7.5pt;">
          <div style="display: flex; justify-content: space-between;">
            <span>Earned: <strong>${cat.earnedPoints}/${cat.allocatedWeight} pts</strong></span>
            <span>Coverage: <strong>${cat.coveragePercentage}%</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #94A3B8;">
            <span>Pass: ${cat.testCounts.pass} | Warn: ${cat.testCounts.warning} | Fail: ${cat.testCounts.fail}</span>
            <span>Unknown: ${cat.testCounts.unknown ?? 0}</span>
          </div>
        </div>
      </div>
    `).join("")}
  </div>

  <h2 class="section-title">2. Platform &amp; Infrastructure Profile</h2>
  <table class="table-custom no-break">
    <colgroup>
      <col style="width: 25%;">
      <col style="width: 25%;">
      <col style="width: 25%;">
      <col style="width: 25%;">
    </colgroup>
    <tr>
      <td><strong>Target Domain</strong></td>
      <td class="url-cell">${escapeHtml(company.domain)}</td>
      <td><strong>Detected Technologies</strong></td>
      <td>${escapeHtml((report.platformProfile.detectedTechnologies || []).join(", ") || "Standard Web Stack")}</td>
    </tr>
    <tr>
      <td><strong>HTTPS Status</strong></td>
      <td>${escapeHtml(report.platformProfile.httpsStatus || "Standard")}</td>
      <td><strong>Pages Discovered</strong></td>
      <td>${report.platformProfile.totalPagesDiscovered} pages</td>
    </tr>
    <tr>
      <td><strong>Primary Language</strong></td>
      <td>${escapeHtml(report.platformProfile.primaryLanguage || "English")}</td>
      <td><strong>Target Market</strong></td>
      <td>${escapeHtml(company.targetMarket || "Global")}</td>
    </tr>
    <tr>
      <td><strong>Business Category</strong></td>
      <td>${escapeHtml(detection ? detection.categoryLabel : company.businessCategory)}</td>
      <td><strong>Detection Source</strong></td>
      <td>${escapeHtml(detection ? detection.decisionSource : "DEFAULT")}</td>
    </tr>
  </table>

  <div class="page-break"></div>

  <!-- PAGE 2: Issue Distribution & Top Opportunities -->
  <div class="header">
    <div class="brand-title">SiteIntel Pulse</div>
    <div class="meta-block">Report ID: ${escapeHtml(report.reportId)} | Target: ${escapeHtml(company.domain)}</div>
  </div>

  <h2 class="section-title">3. Issue Distribution Overview</h2>
  <table class="table-custom no-break">
    <colgroup>
      <col style="width: 18%;">
      <col style="width: 14%;">
      <col style="width: 68%;">
    </colgroup>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Count</th>
        <th>Description &amp; Recommended Timeline</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-fail">CRITICAL</span></td>
        <td><strong>${report.issueDistribution.critical}</strong></td>
        <td>Immediate blockers affecting website reachability, unencrypted logins, or total indexing disallows. Resolve within 24 hours.</td>
      </tr>
      <tr>
        <td><span class="badge badge-warning">HIGH</span></td>
        <td><strong>${report.issueDistribution.high}</strong></td>
        <td>Severe SEO, mobile responsiveness, or missing security headers hurting traffic and conversions. Resolve within 1–2 weeks.</td>
      </tr>
      <tr>
        <td><span class="badge badge-warning">MEDIUM</span></td>
        <td><strong>${report.issueDistribution.medium}</strong></td>
        <td>Suboptimal title lengths, empty link anchors, missing structured data, or minor slow assets. Resolve within 30 days.</td>
      </tr>
      <tr>
        <td><span class="badge badge-info">LOW / INFO</span></td>
        <td><strong>${report.issueDistribution.low}</strong></td>
        <td>Opportunities for content expansion, social markup polish, or tag housekeeping.</td>
      </tr>
    </tbody>
  </table>

  <h2 class="section-title">4. Priority Opportunity Plan (Top Growth Initiatives)</h2>
  ${report.priorityOpportunities && report.priorityOpportunities.length > 0 ? report.priorityOpportunities.map((opp) => `
    <div class="opportunity-card no-break">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="opportunity-title">#${opp.rank} — ${escapeHtml(opp.title)}</div>
        <span class="badge ${opp.urgency === 'HIGH' ? 'badge-fail' : 'badge-warning'}">${opp.urgency} PRIORITY</span>
      </div>
      <div class="opportunity-impact">${escapeHtml(opp.businessImpact)}</div>
      <div class="opportunity-action">Recommended Action: ${escapeHtml(opp.recommendedAction)}</div>
      <div style="font-size: 8pt; color: #64748B; margin-top: 4px;">Service Field: ${escapeHtml(opp.potentialServiceCategory)}</div>
    </div>
  `).join("") : `
    <div class="opportunity-card no-break" style="color: #64748B;">
      No high-priority remediations identified. Platform meets baseline targets.
    </div>
  `}

  <div class="page-break"></div>

  <!-- PAGE 3: Key Diagnostics & Competitor Snapshot -->
  <div class="header">
    <div class="brand-title">SiteIntel Pulse</div>
    <div class="meta-block">Report ID: ${escapeHtml(report.reportId)} | Target: ${escapeHtml(company.domain)}</div>
  </div>

  <h2 class="section-title">5. Core Technical &amp; SEO Diagnostics</h2>
  <table class="table-custom no-break">
    <colgroup>
      <col style="width: 25%;">
      <col style="width: 22%;">
      <col style="width: 53%;">
    </colgroup>
    <thead>
      <tr>
        <th>Diagnostic Area</th>
        <th>Observed Status</th>
        <th>Diagnostic Summary</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Page Titles &amp; Meta</strong></td>
        <td>${report.technicalHealthAndSeoSummary.titlesHealthy > 0 ? '<span class="badge badge-pass">HEALTHY</span>' : '<span class="badge badge-warning">REVIEW</span>'}</td>
        <td>${report.technicalHealthAndSeoSummary.titlesHealthy} pages with optimized titles, ${report.technicalHealthAndSeoSummary.descriptionsHealthy} with full descriptions.</td>
      </tr>
      <tr>
        <td><strong>Indexability &amp; Canonicals</strong></td>
        <td>${report.technicalHealthAndSeoSummary.canonicalsConsistent ? '<span class="badge badge-pass">CONSISTENT</span>' : '<span class="badge badge-warning">INCONSISTENT</span>'}</td>
        <td>Canonical URL consistency maintained. Sitemap detected: ${report.technicalHealthAndSeoSummary.sitemapAccessible ? "Yes" : "No"}.</td>
      </tr>
      <tr>
        <td><strong>Broken Links &amp; Errors</strong></td>
        <td>${report.technicalHealthAndSeoSummary.brokenLinksCount === 0 ? '<span class="badge badge-pass">CLEAN (0)</span>' : `<span class="badge badge-fail">${report.technicalHealthAndSeoSummary.brokenLinksCount} BROKEN</span>`}</td>
        <td>Internal links verified during crawl. ${report.technicalHealthAndSeoSummary.brokenLinksCount} dead ends found.</td>
      </tr>
      <tr>
        <td><strong>Performance Lab Scores</strong></td>
        <td>${report.performanceAndResponsiveSummary.mobileLabScore != null ? '<span class="badge badge-pass">MEASURED</span>' : '<span class="badge badge-not-tested">NOT CONNECTED</span>'}</td>
        <td>Mobile lab: ${report.performanceAndResponsiveSummary.mobileLabScore != null ? `${report.performanceAndResponsiveSummary.mobileLabScore}/100` : "PageSpeed provider not configured"}. Desktop lab: ${report.performanceAndResponsiveSummary.desktopLabScore != null ? `${report.performanceAndResponsiveSummary.desktopLabScore}/100` : "PageSpeed provider not configured"}.</td>
      </tr>
      <tr>
        <td><strong>Responsive Breakpoints</strong></td>
        <td>${(report.performanceAndResponsiveSummary.testedViewports || []).length > 0 ? (report.performanceAndResponsiveSummary.horizontalOverflowFound ? '<span class="badge badge-warning">OVERFLOW DETECTED</span>' : '<span class="badge badge-pass">PASS</span>') : '<span class="badge badge-not-tested">NOT TESTED</span>'}</td>
        <td>${(report.performanceAndResponsiveSummary.testedViewports || []).length > 0 ? `Tested viewports: ${report.performanceAndResponsiveSummary.testedViewports.join(", ")}px. Horizontal overflow: ${report.performanceAndResponsiveSummary.horizontalOverflowFound ? "Yes" : "No"}.` : "Automated browser viewport runner not executed; layout overflow unmeasured."}</td>
      </tr>
      <tr>
        <td><strong>Public Security Posture</strong></td>
        <td>${report.securityAndAuthSummary.httpsEnforced ? (report.securityAndAuthSummary.securityHeadersConfigured >= 3 ? '<span class="badge badge-pass">PASS</span>' : '<span class="badge badge-warning">REVIEW</span>') : '<span class="badge badge-fail">FAIL</span>'}</td>
        <td>HTTPS: ${report.securityAndAuthSummary.httpsEnforced ? "Enforced" : "Insecure"}. Security response headers: ${report.securityAndAuthSummary.securityHeadersConfigured} of ${report.securityAndAuthSummary.totalSecurityHeadersChecked} verified. Cookies: ${report.securityAndAuthSummary.publicCookieIssues != null ? `${report.securityAndAuthSummary.publicCookieIssues} issues detected` : "No session cookies observed on public crawl"}.</td>
      </tr>
      <tr>
        <td><strong>AI / AEO Search Readiness</strong></td>
        <td><span class="badge badge-pass">OBSERVED</span></td>
        <td>AI crawler permissions: ${escapeHtml(report.contentTrustAiSummary.aiCrawlerPolicy)}. Entity schemas: ${report.contentTrustAiSummary.entitySchemaPresent ? "Present" : "Missing"}.</td>
      </tr>
    </tbody>
  </table>

  ${report.competitorSnapshot && report.competitorSnapshot.length > 0 ? `
  <h2 class="section-title">6. Competitor Benchmark Snapshot</h2>
  <table class="table-custom no-break">
    <colgroup>
      <col style="width: 32%;">
      <col style="width: 17%;">
      <col style="width: 17%;">
      <col style="width: 17%;">
      <col style="width: 17%;">
    </colgroup>
    <thead>
      <tr>
        <th>Domain</th>
        <th>Overall Health</th>
        <th>SEO Index</th>
        <th>Speed Index</th>
        <th>Security / HTTPS</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #F8FAFC; font-weight: 700;">
        <td class="url-cell">${escapeHtml(company.domain)} (Your Platform)</td>
        <td>${overall.score}/100</td>
        <td>${report.scoreDetails.find(c => c.category === 'seo')?.scorePercentage || 0}%</td>
        <td>${report.scoreDetails.find(c => c.category === 'performance')?.scorePercentage || 0}%</td>
        <td>${report.securityAndAuthSummary.httpsEnforced ? "HTTPS Active" : "Insecure"}</td>
      </tr>
      ${report.competitorSnapshot.map((c) => `
        <tr>
          <td class="url-cell">${escapeHtml(c.domain)}</td>
          <td>${c.status === "NOT_ASSESSED" || c.overallScore == null ? "NOT ASSESSED" : `${c.overallScore}/100`}</td>
          <td>${c.keyMetrics?.seoScore != null ? `${c.keyMetrics.seoScore}%` : "Pending Scan"}</td>
          <td>${c.keyMetrics?.performanceScore != null ? `${c.keyMetrics.performanceScore}%` : "Pending Scan"}</td>
          <td>${c.status === "NOT_ASSESSED" || c.keyMetrics?.httpsActive == null ? "NOT ASSESSED" : (c.keyMetrics.httpsActive ? "HTTPS Active" : "HTTP")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div style="font-size: 8pt; color: #64748B; margin-top: -12px; margin-bottom: 18px;">
    * Benchmarks reflect uniform public scan observations under identical catalogue rules v1.0.0.
  </div>` : ""}

  <h2 class="section-title">${report.competitorSnapshot && report.competitorSnapshot.length > 0 ? "7" : "6"}. Methodology &amp; Next Steps</h2>
  <div class="no-break" style="font-size: 8.5pt; color: #475569; line-height: 1.6;">
    <p><strong>Scan Scope:</strong> ${escapeHtml(report.methodologyAndLimitations.scanScope)}</p>
    <p><strong>Evidence Integrity:</strong> Measured public HTML, robots.txt, and HTTP headers strictly recorded without artificial score inflation.</p>
    <p style="margin-top: 6px;"><strong>Milestone 2 Next Steps:</strong> ${escapeHtml(report.methodologyAndLimitations.expertEngagementCta)}</p>
  </div>

</body>
</html>`;
}

export class PdfGenerator {
  /**
   * Generates a PDF file from an OwnerReport using Playwright Chromium.
   */
  async generatePdf(report: OwnerReport, outputPath?: string): Promise<Buffer> {
    const html = generateReportHtml(report);
    const targetFile = outputPath || path.join(process.cwd(), "test-results", `${report.reportId}.pdf`);

    // Ensure directory exists
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
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 8pt; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <span>SiteIntel Pulse — Website Owner Report</span>
            <span>${escapeHtml(report.companyIdentity.domain)}</span>
          </div>`,
        footerTemplate: `
          <div style="font-size: 8pt; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <span>Confidential — Prepared for ${escapeHtml(report.companyIdentity.name)}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>`,
        margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
      });

      await fs.writeFile(targetFile, pdfBuffer);
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}

export const pdfGenerator = new PdfGenerator();
