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
    const report = await scanDb.getExpertReport(reportId);
    if (!report) {
      return NextResponse.json({ error: "Expert report not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (!verifyTenantOwnership(report.metadata.tenantId, auth.tenant.id)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this expert report.", code: "FORBIDDEN" },
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
        { error: "Forbidden: You do not have permission to view this job's expert report.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (job.request?.reportType === "owner") {
      return NextResponse.json(
        {
          error: "This scan was generated as a Website Owner Report. No Expert Diagnostic Report exists for this scan.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const report = await scanDb.getExpertReport(jobId);
    if (report) {
      return NextResponse.json(report);
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "Scan job in progress or failed", status: job.status, stage: job.currentStage },
        { status: 202 }
      );
    }
  }

  return NextResponse.json({ error: "Expert report not found or scan incomplete", code: "NOT_FOUND" }, { status: 404 });
}
