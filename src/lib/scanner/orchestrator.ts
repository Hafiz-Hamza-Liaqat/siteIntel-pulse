import { ScanRequest, ScanJob, OwnerReport } from "@/types";
import { jobManager } from "./job-manager";
import { SafeCrawler } from "./crawler";
import { assessmentRegistry } from "../catalogue/registry";
import { projectOwnerReport } from "../reports/owner-projection";
import { projectExpertReport } from "../reports/expert-projection";
import { scanDb } from "../persistence/db";

export class ScanOrchestrator {
  /**
   * Executes the full website owner audit pipeline.
   */
  async runAudit(job: ScanJob): Promise<OwnerReport> {
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
          Math.min(30 + Math.round((tested / (request.maxPages || 50)) * 40), 70),
          { discovered, tested },
          job.tenantId
        );
      });

      if (abortSignal?.aborted) {
        throw new Error("Scan was canceled by user.");
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
        sitemapUrls: crawlResult.sitemapUrls,
        externalLinksTested: crawlResult.externalLinksTested,
        competitors: request.competitors,
      };

      const assessmentResults = assessmentRegistry.evaluateAll(evalContext);

      // Stage 4: Scoring
      await jobManager.updateProgress(jobId, "scoring", "Computing category scores and overall weighted composite baseline", 85, undefined, job.tenantId);

      // Stage 5: Generating Reports
      await jobManager.updateProgress(jobId, "generating_report", "Projecting Company A Owner Report & Company B Expert Diagnostic Report", 95, undefined, job.tenantId);

      const ownerReport = projectOwnerReport(jobId, request, crawlResult, assessmentResults, job.tenantId);
      const expertReport = projectExpertReport(jobId, request, crawlResult, assessmentResults, {}, job.tenantId);

      // Stage 6: Persistence & Complete
      await scanDb.saveReport(ownerReport, job.tenantId);
      await scanDb.saveExpertReport(expertReport, job.tenantId);
      await scanDb.updateJob(
        jobId,
        {
          status: "completed",
          currentStage: "Audit complete. Owner Report and Expert Report ready.",
          progressPercentage: 100,
          coverage: ownerReport.executiveSnapshot.coverage,
          results: assessmentResults,
          report: ownerReport,
          expertReport,
          expertReportId: expertReport.metadata.reportId,
          completedAt: new Date().toISOString(),
        },
        job.tenantId
      );

      jobManager.cleanupJob(jobId);
      return ownerReport;
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
