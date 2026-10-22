import type { OwnerReport } from "../../types";
import path from "node:path";
import fs from "node:fs/promises";

export function generateReportHtml(report: OwnerReport): string {
  const overall = report.executiveSnapshot.overallScore;
  const company = report.companyIdentity;
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
  <title>Website Owner Audit Report — ${company.name}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
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
      font-size: 11pt;
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
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0B1220;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 9pt;
      color: #0F9D91;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta-block {
      text-align: right;
      font-size: 9pt;
      color: #64748B;
    }
    .hero-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
      display: flex;
      gap: 30px;
      align-items: center;
    }
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 6px solid ${getScoreColor(overall.score)};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .score-value {
      font-size: 26pt;
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
      font-size: 16pt;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .hero-band {
      display: inline-block;
      padding: 3px 10px;
      background: #E6FFFA;
      color: #0D9488;
      font-weight: 700;
      font-size: 9pt;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .hero-note {
      font-size: 9.5pt;
      color: #475569;
    }
    h2.section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #0B1220;
      border-left: 4px solid #0F9D91;
      padding-left: 10px;
      margin: 25px 0 15px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .category-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 25px;
    }
    .category-card {
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px;
      background: #FFFFFF;
    }
    .category-card-header {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      font-size: 10pt;
      margin-bottom: 6px;
    }
    .progress-bar-bg {
      background: #E2E8F0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .category-meta {
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #64748B;
    }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 9.5pt;
    }
    .table-custom th {
      background: #F1F5F9;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      color: #334155;
      border-bottom: 1px solid #CBD5E1;
    }
    .table-custom td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8pt;
      font-weight: 700;
    }
    .badge-pass { background: #DCFCE7; color: #166534; }
    .badge-warning { background: #FEF3C7; color: #92400E; }
    .badge-fail { background: #FEE2E2; color: #991B1B; }
    .badge-info { background: #E0F2FE; color: #075985; }
    .opportunity-card {
      border-left: 4px solid #0F9D91;
      background: #F8FAFC;
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 0 6px 6px 0;
    }
    .opportunity-title {
      font-weight: 700;
      font-size: 11pt;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .opportunity-impact {
      font-size: 9.5pt;
      color: #475569;
      margin-bottom: 6px;
    }
    .opportunity-action {
      font-size: 9pt;
      color: #0F766E;
      font-weight: 600;
    }
    .footer {
      margin-top: 35px;
      border-top: 1px solid #E2E8F0;
      padding-top: 15px;
      font-size: 8.5pt;
      color: #64748B;
      display: flex;
      justify-content: space-between;
    }
    .alert-box {
      background: #FFFBEB;
      border-left: 4px solid #F59E0B;
      padding: 10px 14px;
      margin: 15px 0;
      font-size: 9pt;
      color: #92400E;
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
      <div>Report ID: <strong>${report.reportId}</strong></div>
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
      <div class="hero-target">${company.name} (${company.targetUrl})</div>
      <div class="hero-band">${overall.ratingBand} ${overall.isProvisional ? "(Provisional Evaluation)" : "(Fully Assessed)"}</div>
      <div class="hero-note">${overall.evaluationNote}</div>
      <div style="margin-top: 8px; font-size: 8.5pt; color: #64748B;">
        Category: <strong>${company.businessCategory}</strong> | Scope: <strong>${report.executiveSnapshot.testedPageCount} pages tested</strong> | Coverage: <strong>${report.executiveSnapshot.coverage.coveragePercentage}% evaluated</strong> | Points Earned: <strong>${overall.totalEarnedCataloguePoints ?? overall.score}/100 pts</strong>
      </div>
    </div>
  </div>

  ${overall.isProvisional ? `
  <div class="alert-box no-break">
    <strong>Provisional Coverage Acceptance Notice:</strong> ${overall.evaluationNote} SiteIntel Pulse requires ≥70% overall catalogue coverage and ≥60% per-category coverage for a certified fully assessed score.
  </div>` : ""}

  <h2 class="section-title">1. Executive Snapshot &amp; Category Scores</h2>
  <div class="category-grid no-break">
    ${report.scoreDetails.map((cat) => `
      <div class="category-card">
        <div class="category-card-header">
          <span>${cat.categoryName}</span>
          <span style="color: ${getScoreColor(cat.scorePercentage)}">${cat.scorePercentage}% ${!cat.isEligibleForOverall ? '<small style="color: #D97706; font-size: 7.5pt;">(Prov)</small>' : ""}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${cat.scorePercentage}%; background: ${getScoreColor(cat.scorePercentage)};"></div>
        </div>
        <div class="category-meta" style="display: flex; flex-direction: column; gap: 2px; font-size: 7.5pt;">
          <div>Weight: <strong>${cat.allocatedWeight} pts</strong> | Coverage: <strong>${cat.coveragePercentage ?? Math.round((cat.testedPoints / cat.allocatedWeight) * 100)}%</strong> (${cat.testedPoints}/${cat.allocatedWeight} evaluated)</div>
          <div>Earned: <strong>${cat.earnedPoints}/${cat.allocatedWeight} allocated pts</strong> (${cat.scorePercentage}% of evaluated tests)</div>
        </div>
      </div>
    `).join("")}
  </div>

  <h2 class="section-title">2. Platform Profile &amp; Availability</h2>
  <table class="table-custom no-break">
    <tr>
      <td><strong>Target Domain</strong></td>
      <td>${company.domain}</td>
      <td><strong>Detected Technologies</strong></td>
      <td>${report.platformProfile.detectedTechnologies.join(", ")}</td>
    </tr>
    <tr>
      <td><strong>HTTPS Status</strong></td>
      <td>${report.platformProfile.httpsStatus}</td>
      <td><strong>Pages Discovered</strong></td>
      <td>${report.platformProfile.totalPagesDiscovered} pages</td>
    </tr>
    <tr>
      <td><strong>Primary Language</strong></td>
      <td>${report.platformProfile.primaryLanguage}</td>
      <td><strong>Target Market</strong></td>
      <td>${company.targetMarket}</td>
    </tr>
  </table>

  <div class="page-break"></div>

  <!-- PAGE 2: Issue Distribution & Top Opportunities -->
  <div class="header">
    <div class="brand-title">SiteIntel Pulse</div>
    <div class="meta-block">Report ID: ${report.reportId} | Target: ${company.domain}</div>
  </div>

  <h2 class="section-title">3. Issue Distribution Overview</h2>
  <table class="table-custom no-break">
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
  ${report.priorityOpportunities.map((opp) => `
    <div class="opportunity-card no-break">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="opportunity-title">#${opp.rank} — ${opp.title}</div>
        <span class="badge ${opp.urgency === 'HIGH' ? 'badge-fail' : 'badge-warning'}">${opp.urgency} PRIORITY</span>
      </div>
      <div class="opportunity-impact">${opp.businessImpact}</div>
      <div class="opportunity-action">Recommended Action: ${opp.recommendedAction}</div>
      <div style="font-size: 8pt; color: #64748B; margin-top: 4px;">Service Field: ${opp.potentialServiceCategory}</div>
    </div>
  `).join("")}

  <div class="page-break"></div>

  <!-- PAGE 3: Key Diagnostics & Competitor Snapshot -->
  <div class="header">
    <div class="brand-title">SiteIntel Pulse</div>
    <div class="meta-block">Report ID: ${report.reportId} | Page 3</div>
  </div>

  <h2 class="section-title">5. Core Technical &amp; SEO Diagnostics</h2>
  <table class="table-custom no-break">
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
        <td><strong>Performance &amp; Viewports</strong></td>
        <td><span class="badge badge-pass">RESPONSIVE</span></td>
        <td>Mobile lab score: ~${report.performanceAndResponsiveSummary.mobileLabScore}/100. Desktop: ~${report.performanceAndResponsiveSummary.desktopLabScore}/100. Tested across 7 screen widths (320px–1440px).</td>
      </tr>
      <tr>
        <td><strong>Public Security Posture</strong></td>
        <td>${report.securityAndAuthSummary.httpsEnforced ? '<span class="badge badge-pass">HTTPS ENFORCED</span>' : '<span class="badge badge-fail">INSECURE</span>'}</td>
        <td>${report.securityAndAuthSummary.securityHeadersConfigured}/${report.securityAndAuthSummary.totalSecurityHeadersChecked} recommended security response headers active.</td>
      </tr>
      <tr>
        <td><strong>AI / AEO Search Readiness</strong></td>
        <td><span class="badge badge-pass">OBSERVED</span></td>
        <td>AI crawler permissions: ${report.contentTrustAiSummary.aiCrawlerPolicy}. Entity schemas: ${report.contentTrustAiSummary.entitySchemaPresent ? "Present" : "Missing"}.</td>
      </tr>
    </tbody>
  </table>

  ${report.competitorSnapshot.length > 0 ? `
  <h2 class="section-title">6. Competitor Benchmark Snapshot</h2>
  <table class="table-custom no-break">
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
        <td>${company.domain} (Your Platform)</td>
        <td>${overall.score}/100</td>
        <td>${report.scoreDetails.find(c => c.category === 'seo')?.scorePercentage || 0}%</td>
        <td>${report.scoreDetails.find(c => c.category === 'performance')?.scorePercentage || 0}%</td>
        <td>${report.securityAndAuthSummary.httpsEnforced ? "HTTPS Active" : "Insecure"}</td>
      </tr>
      ${report.competitorSnapshot.map((c) => `
        <tr>
          <td>${c.domain}</td>
          <td>${c.overallScore || "N/A"}/100</td>
          <td>${c.keyMetrics.seoScore || "N/A"}%</td>
          <td>${c.keyMetrics.performanceScore || "N/A"}%</td>
          <td>${c.keyMetrics.httpsActive ? "HTTPS Active" : "HTTP"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div style="font-size: 8pt; color: #64748B; margin-top: -15px; margin-bottom: 20px;">
    * Benchmarks reflect uniform public scan observations under identical catalogue rules v1.0.0.
  </div>` : ""}

  <h2 class="section-title">7. Methodology &amp; Next Steps</h2>
  <div class="no-break" style="font-size: 9pt; color: #475569; line-height: 1.6;">
    <p><strong>Scan Scope:</strong> ${report.methodologyAndLimitations.scanScope}</p>
    <p><strong>Evidence Integrity:</strong> Measured public HTML, robots.txt, and HTTP headers strictly recorded without artificial score inflation.</p>
    <p style="margin-top: 8px;"><strong>Milestone 2 Next Steps:</strong> ${report.methodologyAndLimitations.expertEngagementCta}</p>
  </div>

  <div class="footer">
    <div>Generated by <strong>SiteIntel Pulse</strong> — Discover Issues. Prove with Evidence. Improve. Grow.</div>
    <div>Confidential — Prepared for ${company.name}</div>
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
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      });

      await fs.writeFile(targetFile, pdfBuffer);
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}

export const pdfGenerator = new PdfGenerator();
