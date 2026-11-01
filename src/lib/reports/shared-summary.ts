import type {
  AssessmentAndIssuesSummary,
  AssessmentResult,
  RuleAssessmentOutcome,
} from "@/types";
import type { CrawlResult } from "../scanner/crawler";

export function buildAssessmentAndIssuesSummary(params: {
  crawl: CrawlResult;
  ruleOutcomes: RuleAssessmentOutcome[];
  findings: Array<{ status: string; severity: string; [key: string]: any }>;
  browserResults?: any[];
  technicalErrors?: {
    browserJsExceptions?: string[];
    browserConsoleErrors?: string[];
    failedNetworkRequests?: Array<{ url: string; error?: string }>;
  };
}): AssessmentAndIssuesSummary {
  const { crawl, ruleOutcomes, findings, technicalErrors } = params;

  // 1. Rule outcome counts across all 56 rules
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let notTestedCount = 0;
  let blockedCount = 0;
  let unknownCount = 0;
  let notApplicableCount = 0;

  for (const r of ruleOutcomes) {
    const s = String(r.status).toUpperCase();
    if (s === "PASS") passCount++;
    else if (s === "WARN" || s === "WARNING") warnCount++;
    else if (s === "FAIL") failCount++;
    else if (s === "NOT_TESTED") notTestedCount++;
    else if (s === "BLOCKED") blockedCount++;
    else if (s === "NOT_APPLICABLE") notApplicableCount++;
    else unknownCount++;
  }

  const totalAccounted =
    passCount +
    warnCount +
    failCount +
    notTestedCount +
    blockedCount +
    unknownCount +
    notApplicableCount;

  // 2. Finding counts by severity (only from genuine findings with status FAIL or WARN)
  const activeFindings = findings.filter(
    (f) => f.status === "FAIL" || f.status === "WARNING" || f.status === "WARN"
  );
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let informational = 0;

  for (const f of activeFindings) {
    const sev = String(f.severity).toUpperCase();
    if (sev === "CRITICAL") critical++;
    else if (sev === "HIGH") high++;
    else if (sev === "MEDIUM") medium++;
    else if (sev === "LOW") low++;
    else informational++;
  }

  const totalUniqueFindings = critical + high + medium + low + informational;

  // 3. Technical Error Counts
  const http4xx5xxResponses = (crawl.pages || []).filter((p) => p.statusCode >= 400).length;
  const failedHttpRequests = (crawl.coverage?.failedPages || 0) + http4xx5xxResponses;
  const brokenInternalLinks = (crawl.pages || []).reduce((acc, p) => {
    return acc + (p.links || []).filter((l) => l.isInternal && ((l.statusCode != null && l.statusCode >= 400) || l.isBroken)).length;
  }, 0);

  const jsExceptionsCount = technicalErrors?.browserJsExceptions?.length || 0;
  const consoleErrorsCount = technicalErrors?.browserConsoleErrors?.length || 0;
  const failedBrowserRequestsCount = technicalErrors?.failedNetworkRequests?.length || 0;

  // Confirmed reproducible defects: automated tests that proved reproducible failure
  const reproducibleDefectsCount = failCount;

  // 4. Crawl Scope Summary
  const rawScope = crawl.scopeCounts;
  const testedHtmlPages =
    rawScope?.testedHtmlPages ??
    (rawScope as any)?.successfullyTestedHtmlPages ??
    crawl.coverage?.htmlEligiblePages ??
    (crawl.pages || []).filter((p) => p.documentType === "html" || (!p.documentType && (p.contentType || "").includes("text/html"))).length;

  const discoveredUrls = rawScope?.discoveredUrls ?? crawl.coverage?.discoveredPages ?? (crawl.pages || []).length;
  const attemptedUrls = rawScope?.attemptedUrls ?? crawl.coverage?.testedPages ?? (crawl.pages || []).length;
  const nonHtmlResourcesExcluded = rawScope?.nonHtmlResourcesExcluded ?? (rawScope as any)?.nonHtmlResources ?? crawl.coverage?.excludedDocumentTypesCount ?? 0;
  const skippedUrls = rawScope?.skippedUrls ?? crawl.coverage?.skippedPages ?? 0;
  const testedViewports = [320, 360, 390, 768, 1024, 1280, 1440];

  return {
    ruleCounts: {
      pass: passCount,
      warn: warnCount,
      fail: failCount,
      notTested: notTestedCount,
      blocked: blockedCount,
      unknown: unknownCount,
      notApplicable: notApplicableCount,
      totalAccounted,
    },
    severityCounts: {
      critical,
      high,
      medium,
      low,
      informational,
      totalUniqueFindings,
    },
    technicalErrorCounts: {
      failedHttpRequests,
      http4xx5xxResponses,
      brokenInternalLinks,
      browserJsExceptions: jsExceptionsCount,
      browserConsoleErrors: consoleErrorsCount,
      failedBrowserNetworkRequests: failedBrowserRequestsCount,
      confirmedReproducibleDefects: reproducibleDefectsCount,
    },
    crawlScopeSummary: {
      discoveredUrls,
      attemptedUrls,
      testedHtmlPages,
      nonHtmlResourcesExcluded,
      skippedUrls,
      testedViewportsCount: testedViewports.length,
      testedViewports,
    },
  };
}
