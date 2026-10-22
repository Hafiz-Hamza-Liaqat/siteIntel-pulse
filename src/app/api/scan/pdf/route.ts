import { NextRequest, NextResponse } from "next/server";
import { scanDb } from "@/lib/persistence/db";
import { pdfGenerator, generateReportHtml } from "@/lib/reports/pdf-generator";
import { requireAuth, verifyTenantOwnership } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  // 1. Enforce Server-Side Authentication
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("id");
  const jobId = searchParams.get("jobId");
  const format = searchParams.get("format");

  let report = null;
  if (reportId) {
    report = await scanDb.getReport(reportId);
  } else if (jobId) {
    const job = await scanDb.getJob(jobId);
    report = job?.report || null;
  }

  if (!report) {
    return NextResponse.json({ error: "Report not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // 2. Enforce Tenant Isolation
  if (!verifyTenantOwnership(report.tenantId, auth.tenant.id)) {
    return NextResponse.json(
      { error: "Forbidden: You are not authorized to download another tenant's report.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  if (format === "html") {
    const html = generateReportHtml(report);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  }

  try {
    const buffer = await pdfGenerator.generatePdf(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SiteIntel-Pulse-Owner-Report-${report.companyIdentity.domain}.pdf"`,
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  } catch (err: any) {
    // If Playwright binary fails or is not available in headless runtime, stream HTML print view
    const html = generateReportHtml(report);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  }
}
