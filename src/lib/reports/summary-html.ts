import type { AssessmentAndIssuesSummary } from "@/types";

/**
 * Shared HTML renderer for the prominent "Assessment and Issues Summary" card
 * displayed near the front of both Company A (Owner) and Company B (Expert) reports.
 */
export function renderAssessmentAndIssuesSummaryHtml(
  summary?: AssessmentAndIssuesSummary
): string {
  if (!summary) return "";

  return `
  <div class="assessment-issues-summary-card no-break" style="margin: 12px 0 16px 0; border: 1.5px solid #0F9D91; border-radius: 6px; padding: 10px 12px; background: #FFFFFF; page-break-inside: avoid; break-inside: avoid;">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 5px; margin-bottom: 8px;">
      <span style="font-size: 9.5pt; font-weight: 700; color: #0B1220; text-transform: uppercase; letter-spacing: 0.5px;">
        Assessment and Issues Summary
      </span>
      <span style="font-size: 7pt; font-weight: 600; color: #0F9D91;">
        Shared Verified Single Source of Truth
      </span>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <!-- Group 1: 56 Catalogue Rule Outcomes -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px 9px;">
        <div style="font-size: 7.5pt; font-weight: 700; color: #1E293B; margin-bottom: 4px;">
          Rule &amp; Test Outcomes (${summary.ruleCounts.totalAccounted}/56 Accounted)
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 7pt;">
          <span style="background: #DCFCE7; color: #166534; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">PASS: ${summary.ruleCounts.pass}</span>
          <span style="background: #FEF3C7; color: #92400E; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">WARN: ${summary.ruleCounts.warn}</span>
          <span style="background: #FEE2E2; color: #991B1B; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">FAIL: ${summary.ruleCounts.fail}</span>
          <span style="background: #F1F5F9; color: #475569; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">NOT TESTED: ${summary.ruleCounts.notTested}</span>
          <span style="background: #F1F5F9; color: #475569; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">N/A: ${summary.ruleCounts.notApplicable}</span>
          <span style="background: #FEF3C7; color: #78350F; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">UNKNOWN: ${summary.ruleCounts.unknown}</span>
        </div>
      </div>

      <!-- Group 2: Defect Findings by Severity -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px 9px;">
        <div style="font-size: 7.5pt; font-weight: 700; color: #1E293B; margin-bottom: 4px;">
          Findings by Severity (${summary.severityCounts.totalUniqueFindings} Unique Identified)
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 7pt;">
          <span style="background: #7F1D1D; color: #FFFFFF; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">Critical: ${summary.severityCounts.critical}</span>
          <span style="background: #FEE2E2; color: #991B1B; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">High: ${summary.severityCounts.high}</span>
          <span style="background: #FEF3C7; color: #92400E; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">Med: ${summary.severityCounts.medium}</span>
          <span style="background: #EFF6FF; color: #1E40AF; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">Low: ${summary.severityCounts.low}</span>
          <span style="background: #F1F5F9; color: #475569; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; white-space: nowrap;">Info: ${summary.severityCounts.informational}</span>
        </div>
      </div>

      <!-- Group 3: Observed Technical Runtime & Network Errors -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px 9px;">
        <div style="font-size: 7.5pt; font-weight: 700; color: #1E293B; margin-bottom: 3px;">Observed Technical Errors &amp; Runtime Failures</div>
        <div style="font-size: 6.8pt; color: #475569; line-height: 1.45;">
          <div>HTTP 4xx/5xx Responses: <strong>${summary.technicalErrorCounts.http4xx5xxResponses}</strong></div>
          <div>Broken Internal Links: <strong>${summary.technicalErrorCounts.brokenInternalLinks}</strong></div>
          <div>Browser JS Exceptions (pageerror): <strong>${summary.technicalErrorCounts.browserJsExceptions}</strong></div>
          <div>Browser Console Errors: <strong>${summary.technicalErrorCounts.browserConsoleErrors}</strong></div>
          <div>Confirmed Reproducible Defects: <strong>${summary.technicalErrorCounts.confirmedReproducibleDefects}</strong></div>
        </div>
      </div>

      <!-- Group 4: Crawl Scope & Sample Limitations -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px 9px;">
        <div style="font-size: 7.5pt; font-weight: 700; color: #1E293B; margin-bottom: 3px;">Crawl Scope &amp; Sample Bounds</div>
        <div style="font-size: 6.8pt; color: #475569; line-height: 1.45;">
          <div>Discovered Candidate URLs: <strong>${summary.crawlScopeSummary.discoveredUrls}</strong> | Attempted: <strong>${summary.crawlScopeSummary.attemptedUrls}</strong></div>
          <div>Tested HTML Pages: <strong>${summary.crawlScopeSummary.testedHtmlPages}</strong> (Eligible Content)</div>
          <div>Non-HTML Resources Excluded: <strong>${summary.crawlScopeSummary.nonHtmlResourcesExcluded}</strong> (Sitemaps / Robots.txt / Feeds)</div>
          <div>Skipped Candidate URLs: <strong>${summary.crawlScopeSummary.skippedUrls}</strong> (Budget Limit Reached)</div>
          <div>Tested Viewports: <strong>${summary.crawlScopeSummary.testedViewportsCount}</strong> (${summary.crawlScopeSummary.testedViewports.join(", ")}px)</div>
        </div>
      </div>
    </div>
  </div>
  `;
}
