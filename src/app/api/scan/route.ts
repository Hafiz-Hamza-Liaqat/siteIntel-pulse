import { NextRequest, NextResponse } from "next/server";
import { ScanRequestSchema } from "@/types";
import { jobManager } from "@/lib/scanner/job-manager";
import { scanOrchestrator } from "@/lib/scanner/orchestrator";
import { requireAuth, requireAuthOrGuest, verifyTenantOwnership } from "@/lib/auth/guard";
import { tenantRateLimiter } from "@/lib/security/rate-limiter";
import { scanDb } from "@/lib/persistence/db";

export async function POST(req: NextRequest) {
  // 1. Resolve Authentication or Issue Isolated Guest Session
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const { auth, newSessionCookie } = await requireAuthOrGuest(req, clientIp);

  try {
    // 2. IP-level Rate Limiting against Cookie-clearing Abuse
    const ipHour = Math.floor(Date.now() / 3600000);
    const ipLimit = await scanDb.incrementRateLimit(`ratelimit:ip_scan:${clientIp}:${ipHour}`, 3600);
    if (ipLimit.count > 15) {
      return NextResponse.json(
        {
          error: "Too many scan requests from this IP address. Please wait before submitting more scans.",
          code: "IP_RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = ScanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // 3. Enforce Tenant Scan Quotas & Concurrent Limits
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

    // 4. Submit Scan Scoped to Tenant and Selected Report Type
    const submission = await jobManager.submitScan(
      parseResult.data,
      auth.tenant.id,
      auth.user.id
    );

    if (submission.error || !submission.job) {
      return NextResponse.json({ error: submission.error || "Failed to create job" }, { status: 400 });
    }

    const job = submission.job;

    // If job was already completed (cached for this tenant with matching reportType), return immediately
    if (job.status === "completed") {
      const reportId =
        job.request.reportType === "owner"
          ? job.report?.reportId || job.ownerReportId || job.id
          : undefined;
      const expertReportId =
        job.request.reportType === "expert"
          ? job.expertReportId || job.expertReport?.metadata?.reportId || job.id
          : undefined;

      const res = NextResponse.json({
        jobId: job.id,
        status: job.status,
        reportType: job.request.reportType,
        reportId,
        expertReportId,
      });

      if (newSessionCookie) {
        res.cookies.set(newSessionCookie.name, newSessionCookie.value, newSessionCookie.options);
      }
      return res;
    }

    // Trigger asynchronous execution in background
    scanOrchestrator.runAudit(job).catch((err) => {
      console.error(`Scan execution error for ${job.id}:`, err);
    });

    const res = NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        reportType: job.request.reportType,
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

    if (newSessionCookie) {
      res.cookies.set(newSessionCookie.name, newSessionCookie.value, newSessionCookie.options);
    }
    return res;
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

  const isCompleted = job.status === "completed";
  const reportId =
    job.request.reportType === "owner"
      ? job.report?.reportId || job.ownerReportId || (isCompleted ? job.id : undefined)
      : undefined;
  const expertReportId =
    job.request.reportType === "expert"
      ? job.expertReportId || job.expertReport?.metadata?.reportId || (isCompleted ? job.id : undefined)
      : undefined;

  return NextResponse.json({
    id: job.id,
    status: job.status,
    reportType: job.request.reportType,
    currentStage: job.currentStage,
    progressPercentage: job.progressPercentage,
    discoveredCount: job.discoveredCount,
    testedCount: job.testedCount,
    reportId,
    expertReportId,
    errorMessage: job.errorMessage,
  });
}
