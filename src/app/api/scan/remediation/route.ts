import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { scanDb } from "@/lib/persistence/db";
import { RemediationUpdateSchema } from "@/types";

export async function POST(req: NextRequest) {
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  try {
    const body = await req.json();
    const parsed = RemediationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { taskId, status, assignedTo, notes } = parsed.data;

    const updated = await scanDb.updateRemediationStatus(
      taskId,
      status,
      auth.tenant.id,
      assignedTo,
      notes
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Remediation task not found or unauthorized for this tenant.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Task ${taskId} updated to status ${status}.`,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId parameter" }, { status: 400 });
  }

  const tasks = await scanDb.getRemediationTasks(reportId, auth.tenant.id);
  return NextResponse.json({ tasks });
}
