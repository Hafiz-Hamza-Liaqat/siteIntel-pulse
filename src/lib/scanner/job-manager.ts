import { ScanJob, ScanRequest, JobStatus } from "@/types";
import { normalizeAndValidateUrl } from "./url-validator";
import { validateUrlSafety } from "./dns-safety";
import { scanDb } from "../persistence/db";

export class JobManager {
  private activeAbortControllers = new Map<string, AbortController>();

  /**
   * Submits a new scan request, validates target URL and safety, and initializes the job.
   */
  async submitScan(
    request: ScanRequest,
    tenantId?: string,
    userId?: string
  ): Promise<{ job?: ScanJob; error?: string }> {
    // 1. URL syntax & scheme validation
    const urlValidation = normalizeAndValidateUrl(request.targetUrl);
    if (!urlValidation.isValid || !urlValidation.normalizedUrl) {
      return { error: urlValidation.errorMessage || "Invalid target URL." };
    }

    // 2. Pre-connection SSRF & host safety validation
    const dnsSafety = await validateUrlSafety(urlValidation.normalizedUrl);
    if (!dnsSafety.isSafe) {
      return { error: dnsSafety.rejectionReason || "Target destination failed safety checks." };
    }

    // 3. Duplicate check for identical in-progress scan within tenant scope matching reportType
    const recentJob = await scanDb.findRecentJobByUrl(urlValidation.normalizedUrl, tenantId, request.reportType);
    if (recentJob && recentJob.status !== "failed" && recentJob.status !== "canceled") {
      return { job: recentJob };
    }

    // 4. Create scan job record
    const sanitizedRequest: ScanRequest = {
      ...request,
      targetUrl: urlValidation.normalizedUrl,
    };
    const job = await scanDb.createJob(sanitizedRequest, tenantId, userId);

    // Register AbortController for cancellation
    const controller = new AbortController();
    this.activeAbortControllers.set(job.id, controller);

    return { job };
  }

  /**
   * Retrieves current job status and progress.
   */
  async getJob(jobId: string, tenantId?: string): Promise<ScanJob | null> {
    return scanDb.getJob(jobId, tenantId);
  }

  /**
   * Cancels an in-flight scan job.
   */
  async cancelScan(jobId: string, tenantId?: string): Promise<{ success: boolean; message: string }> {
    const job = await scanDb.getJob(jobId, tenantId);
    if (!job) {
      return { success: false, message: "Scan job not found." };
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "canceled") {
      return { success: false, message: `Cannot cancel job in '${job.status}' state.` };
    }

    // Trigger abort signal
    const controller = this.activeAbortControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(jobId);
    }

    await scanDb.updateJob(
      jobId,
      {
        status: "canceled",
        currentStage: "Scan canceled by user. Partial findings retained.",
        progressPercentage: 100,
        completedAt: new Date().toISOString(),
      },
      tenantId
    );

    return { success: true, message: "Scan successfully canceled." };
  }

  /**
   * Updates job stage and progress accurately.
   */
  async updateProgress(
    jobId: string,
    status: JobStatus,
    stage: string,
    percentage: number,
    counts?: { discovered?: number; tested?: number; errors?: number },
    tenantId?: string
  ): Promise<void> {
    await scanDb.updateJob(
      jobId,
      {
        status,
        currentStage: stage,
        progressPercentage: Math.min(Math.max(percentage, 0), 100),
        ...(counts?.discovered !== undefined ? { discoveredCount: counts.discovered } : {}),
        ...(counts?.tested !== undefined ? { testedCount: counts.tested } : {}),
        ...(counts?.errors !== undefined ? { errorCount: counts.errors } : {}),
      },
      tenantId
    );
  }

  getAbortSignal(jobId: string): AbortSignal | undefined {
    return this.activeAbortControllers.get(jobId)?.signal;
  }

  cleanupJob(jobId: string) {
    this.activeAbortControllers.delete(jobId);
  }
}

export const jobManager = new JobManager();
