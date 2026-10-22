import { NextRequest, NextResponse } from "next/server";
import { ScanRequestSchema, AuthContext } from "@/types";
import { jobManager } from "@/lib/scanner/job-manager";
import { scanOrchestrator } from "@/lib/scanner/orchestrator";
import { authenticateRequest, requireAuth, verifyTenantOwnership } from "@/lib/auth/guard";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { tenantRateLimiter } from "@/lib/security/rate-limiter";
import { extractClientIp } from "@/lib/security/login-rate-limiter";
import { scanDb } from "@/lib/persistence/db";

export async function POST(req: NextRequest) {
  // 1. Extract Client IP using trusted reverse-proxy normalization
  const clientIp = extractClientIp(req.headers);

  // 2. Check for existing authentication first (session cookie, Bearer token, or API key)
  const existingAuth = await authenticateRequest(req);

  // 3. Apply IP-based Rate Limiting BEFORE provisioning any new guest records or sessions in SQLite
  // Capping unauthenticated scan submissions at 15/hour prevents cookie-clearing abuse and database bloat
  if (!existingAuth) {
    const ipHour = Math.floor(Date.now() / 3600000);
    const ipLimitKey = `ratelimit:ip_scan:${clientIp}:${ipHour}`;
    const ipLimit = await scanDb.incrementRateLimit(ipLimitKey, 3600);
    if (ipLimit.count > 15) {
      return NextResponse.json(
        {
          error: "Too many scan requests from this IP address. Please wait before submitting more scans.",
          code: "IP_RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }
  }

  // 4. Validate Request Structure & Report Type BEFORE creating any guest records in SQLite
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const parseResult = ScanRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // 5. Provision or Resolve Identity
    // Guest records are created ONLY after IP rate limits and request payload validation have succeeded
    let auth: AuthContext;
    let newSessionCookie: { name: string; value: string; options: any } | undefined;

    if (existingAuth) {
      auth = existingAuth;
    } else {
      const authService = scanDb.getAuthService();
      const guest = authService.createGuestSession(clientIp);
      auth = {
        user: guest.user,
        tenant: guest.tenant,
      };
      newSessionCookie = {
        name: SESSION_COOKIE_NAME,
        value: guest.signedToken,
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 14 * 24 * 60 * 60, // 14 days
        },
      };
    }

    // 6. Enforce Tenant Scan Quotas & Concurrent Limits (5 scans/hr, 1 concurrent for guests)
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

    // 7. Submit Scan Scoped to Tenant and Selected Report Type
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
