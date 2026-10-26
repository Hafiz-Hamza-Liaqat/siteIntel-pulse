import { ScanRequest, ScanJob, OwnerReport, ExpertReport } from "@/types";
import { jobManager } from "./job-manager";
import { SafeCrawler } from "./crawler";
import { assessmentRegistry } from "../catalogue/registry";
import { projectOwnerReport } from "../reports/owner-projection";
import { projectExpertReport } from "../reports/expert-projection";
import { scanDb } from "../persistence/db";
import { runResponsiveAudit, ResponsiveRunnerResult } from "./responsive-runner";
import { checkPublicExposure, ExposureCheckResult } from "./exposure-checker";
import { PageSpeedProvider } from "../providers/pagespeed";
import { PageSpeedResult } from "../providers/types";

export class ScanOrchestrator {
  /**
   * Executes the full website audit pipeline for exactly ONE selected report type.
   */
  async runAudit(job: ScanJob): Promise<OwnerReport | ExpertReport> {
    const jobId = job.id;
    const request = job.request;
    const abortSignal = jobManager.getAbortSignal(jobId);

    try {
      // Stage 1: Validating
      await jobManager.updateProgress(jobId, "validating", "Validating URL syntax, ports, and SSRF safety boundaries", 10, undefined, job.tenantId);

      // Stage 2: Discovering & Crawling
      await jobManager.updateProgress(jobId, "discovering", "Fetching entry page, parsing robots.txt and XML sitemaps", 25, undefined, job.tenantId);

      const crawler = new SafeCrawler(
        {
          maxPages: request.maxPages,
          maxDepth: request.maxDepth,
        },
        abortSignal
      );

      const crawlResult = await crawler.crawlWebsite(request.targetUrl, async (stage, discovered, tested) => {
        await jobManager.updateProgress(
          jobId,
          "collecting_evidence",
          stage,
          Math.min(30 + Math.round((tested / (request.maxPages || 50)) * 30), 60),
          { discovered, tested },
          job.tenantId
        );
      });

      if (abortSignal?.aborted) {
        throw new Error("Scan was canceled by user.");
      }

      // Stage 2.5: Deep Evidence Gathering (Headless Browser & Bounded Exposure Probes)
      await jobManager.updateProgress(
        jobId,
        "collecting_evidence",
        "Executing headless responsive viewport checks across 7 screen widths and security exposure probes",
        68,
        { discovered: crawlResult.coverage.discoveredPages, tested: crawlResult.coverage.testedPages },
        job.tenantId
      );

      let responsiveResult: ResponsiveRunnerResult | undefined;
      try {
        responsiveResult = await runResponsiveAudit(request.targetUrl, { abortSignal });
      } catch (err) {
        console.warn("[Orchestrator] Responsive audit warning:", err);
      }

      let exposureResult: ExposureCheckResult | undefined;
      try {
        exposureResult = await checkPublicExposure(request.targetUrl, { abortSignal });
      } catch (err) {
        console.warn("[Orchestrator] Exposure check warning:", err);
      }

      // PageSpeed provider evaluation
      const pageSpeedProvider = new PageSpeedProvider();
      let pageSpeedMobile: PageSpeedResult | undefined;
      let pageSpeedDesktop: PageSpeedResult | undefined;
      try {
        pageSpeedMobile = await pageSpeedProvider.getPageSpeedData(request.targetUrl, "mobile");
        pageSpeedDesktop = await pageSpeedProvider.getPageSpeedData(request.targetUrl, "desktop");
      } catch (err) {
        console.warn("[Orchestrator] PageSpeed check warning:", err);
      }

      // Stage 3: Assessing
      await jobManager.updateProgress(
        jobId,
        "assessing",
        "Executing 56 versioned deterministic rules across 11 catalogue categories",
        75,
        { discovered: crawlResult.coverage.discoveredPages, tested: crawlResult.coverage.testedPages },
        job.tenantId
      );

      const parsedUrl = new URL(request.targetUrl);
      const evalContext = {
        targetUrl: request.targetUrl,
        domain: parsedUrl.hostname,
        businessCategory: request.businessCategory,
        pages: crawlResult.pages,
        robotsTxt: crawlResult.robotsTxt,
        isRobotsTruncated: crawlResult.isRobotsTruncated,
        sitemapUrls: crawlResult.sitemapUrls,
        isSitemapTruncated: crawlResult.isSitemapTruncated,
        externalLinksTested: crawlResult.externalLinksTested,
        competitors: request.competitors,
        pageSpeedMobile,
        pageSpeedDesktop,
        browserResponsiveResults: responsiveResult?.viewportResults,
        browserVisualResults: responsiveResult?.visualDesign,
        exposureResults: exposureResult,
      };

      const assessmentResults = assessmentRegistry.evaluateAll(evalContext);

      // Stage 4: Scoring
      await jobManager.updateProgress(jobId, "scoring", "Computing category scores and overall weighted composite baseline", 85, undefined, job.tenantId);

      // Stage 5 & 6: Single-Report Generation & Persistence
      if (request.reportType === "expert") {
        await jobManager.updateProgress(
          jobId,
          "generating_report",
          "Projecting Company B Expert Diagnostic Report",
          95,
          undefined,
          job.tenantId
        );

        const expertReport = projectExpertReport(
          jobId,
          request,
          crawlResult,
          assessmentResults,
          {
            pageSpeedData: { mobile: pageSpeedMobile, desktop: pageSpeedDesktop },
            browserResponsiveResults: responsiveResult?.viewportResults,
            visualDesign: responsiveResult?.visualDesign,
          },
          job.tenantId
        );
        await scanDb.saveExpertReport(expertReport, job.tenantId);
        await scanDb.updateJob(
          jobId,
          {
            status: "completed",
            currentStage: "Audit complete. Expert Diagnostic Report ready.",
            progressPercentage: 100,
            coverage: { ...crawlResult.coverage, ...expertReport.coverage },
            results: assessmentResults,
            expertReport,
            expertReportId: expertReport.metadata.reportId,
            completedAt: new Date().toISOString(),
          },
          job.tenantId
        );

        jobManager.cleanupJob(jobId);
        return expertReport;
      } else {
        await jobManager.updateProgress(
          jobId,
          "generating_report",
          "Projecting Company A Owner Report",
          95,
          undefined,
          job.tenantId
        );

        const ownerReport = projectOwnerReport(
          jobId,
          request,
          crawlResult,
          assessmentResults,
          job.tenantId,
          {
            pageSpeedData: { mobile: pageSpeedMobile, desktop: pageSpeedDesktop },
            browserResponsiveResults: responsiveResult?.viewportResults,
          }
        );
        await scanDb.saveReport(ownerReport, job.tenantId);
        await scanDb.updateJob(
          jobId,
          {
            status: "completed",
            currentStage: "Audit complete. Owner Report ready.",
            progressPercentage: 100,
            coverage: ownerReport.executiveSnapshot.coverage,
            results: assessmentResults,
            report: ownerReport,
            ownerReportId: ownerReport.reportId,
            completedAt: new Date().toISOString(),
          },
          job.tenantId
        );

        jobManager.cleanupJob(jobId);
        return ownerReport;
      }
    } catch (err: any) {
      const isCanceled = abortSignal?.aborted || err?.message?.includes("canceled");
      await scanDb.updateJob(
        jobId,
        {
          status: isCanceled ? "canceled" : "failed",
          currentStage: isCanceled ? "Scan canceled by user." : `Scan halted: ${err?.message || "Execution error"}`,
          errorMessage: err?.message,
          progressPercentage: 100,
          completedAt: new Date().toISOString(),
        },
        job.tenantId
      );
      jobManager.cleanupJob(jobId);
      throw err;
    }
  }
}

export const scanOrchestrator = new ScanOrchestrator();
