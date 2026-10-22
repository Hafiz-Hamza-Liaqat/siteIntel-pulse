import { NextRequest, NextResponse } from "next/server";
import { jobManager } from "@/lib/scanner/job-manager";
import { requireAuth, verifyTenantOwnership } from "@/lib/auth/guard";

export async function POST(req: NextRequest) {
  // 1. Enforce Server-Side Authentication
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  try {
    const body = await req.json();
    const jobId = body?.jobId;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
    }

    // 2. Verify Job Ownership
    const job = await jobManager.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Scan job not found.", code: "NOT_FOUND" }, { status: 404 });
    }

    if (!verifyTenantOwnership(job.tenantId, auth.tenant.id)) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to cancel another tenant's scan.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const cancelRes = await jobManager.cancelScan(jobId, auth.tenant.id);
    if (!cancelRes.success) {
      return NextResponse.json({ error: cancelRes.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: cancelRes.message });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
