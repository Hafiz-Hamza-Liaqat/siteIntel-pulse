import { NextRequest, NextResponse } from "next/server";
import { ScanRequestSchema } from "@/types";
import { jobManager } from "@/lib/scanner/job-manager";
import { scanOrchestrator } from "@/lib/scanner/orchestrator";
import { requireAuth, verifyTenantOwnership } from "@/lib/auth/guard";
import { tenantRateLimiter } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  // 1. Enforce Server-Side Authentication
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  try {
    const body = await req.json();
    const parseResult = ScanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // 2. Enforce Tenant Scan Quotas & Concurrent Limits
    const allowance = await tenantRateLimiter.checkScanAllowance(auth.tenant.id);
    if (!allowance.allowed) {
      return NextResponse.json(
        { error: allowance.reason, code: "QUOTA_EXCEEDED" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(allowance.limit),
            "X-RateLimit-Remaining": String(allowance.remaining),
            "X-RateLimit-Reset": String(allowance.resetAt),
          },
        }
      );
    }

    // 3. Submit Scan Scoped to Tenant
    const submission = await jobManager.submitScan(
      parseResult.data,
      auth.tenant.id,
      auth.user.id
    );

    if (submission.error || !submission.job) {
      return NextResponse.json({ error: submission.error || "Failed to create job" }, { status: 400 });
    }

    const job = submission.job;

    // If job was already completed (cached for this tenant), return immediately
    if (job.status === "completed" && job.report) {
      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        reportId: job.report.reportId,
        expertReportId: job.expertReportId || job.expertReport?.metadata?.reportId,
      });
    }

    // Trigger asynchronous execution in background
    scanOrchestrator.runAudit(job).catch((err) => {
      console.error(`Scan execution error for ${job.id}:`, err);
    });

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        currentStage: job.currentStage,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(allowance.limit),
          "X-RateLimit-Remaining": String(allowance.remaining),
          "X-RateLimit-Reset": String(allowance.resetAt),
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // 1. Enforce Server-Side Authentication
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("id");

  if (!jobId) {
    return NextResponse.json({ error: "Missing job id parameter" }, { status: 400 });
  }

  // 2. Retrieve job and verify tenant boundary
  const job = await jobManager.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!verifyTenantOwnership(job.tenantId, auth.tenant.id)) {
    return NextResponse.json(
      { error: "Forbidden: cross-tenant scan access is denied.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    currentStage: job.currentStage,
    progressPercentage: job.progressPercentage,
    discoveredCount: job.discoveredCount,
    testedCount: job.testedCount,
    reportId: job.report?.reportId,
    expertReportId: job.expertReportId || job.expertReport?.metadata?.reportId,
    errorMessage: job.errorMessage,
  });
}
