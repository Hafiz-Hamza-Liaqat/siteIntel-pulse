import { NextRequest, NextResponse } from "next/server";
import { scanDb } from "@/lib/persistence/db";
import { requireAuth, verifyTenantOwnership } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  // 1. Enforce Server-Side Authentication
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("id");
  const jobId = searchParams.get("jobId");

  if (reportId) {
    const report = await scanDb.getReport(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (!verifyTenantOwnership(report.tenantId, auth.tenant.id)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this report.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    return NextResponse.json(report);
  }

  if (jobId) {
    const job = await scanDb.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (!verifyTenantOwnership(job.tenantId, auth.tenant.id)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this job's report.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (job.request?.reportType === "expert") {
      return NextResponse.json(
        {
          error: "This scan was generated as an Expert Diagnostic Report. No Owner Report exists for this scan.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const report = await scanDb.getReport(jobId);
    if (!report) {
      return NextResponse.json({ error: "Report for job not yet ready", code: "NOT_READY" }, { status: 404 });
    }

    return NextResponse.json(report);
  }

  return NextResponse.json({ error: "Missing report id or jobId parameter", code: "BAD_REQUEST" }, { status: 400 });
}
