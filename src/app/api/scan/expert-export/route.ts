import { NextRequest, NextResponse } from "next/server";
import { scanDb } from "@/lib/persistence/db";
import {
  exportFindingsCsv,
  exportInventoryCsv,
  exportRemediationCsv,
  exportManifestJson,
  exportFullBundleJson,
} from "@/lib/reports/expert-export";
import { requireAuth, verifyTenantOwnership } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  // 1. Enforce Server-Side Authentication
  const authCheck = await requireAuth(req);
  if (authCheck.response) return authCheck.response;
  const { auth } = authCheck;

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("id");
  const jobId = searchParams.get("jobId");
  const format = searchParams.get("format") || "json";

  let report = null;
  if (reportId) {
    report = await scanDb.getExpertReport(reportId);
  } else if (jobId) {
    report = await scanDb.getExpertReport(jobId);
    if (!report) {
      const job = await scanDb.getJob(jobId);
      report = job?.expertReport || null;
    }
  }

  if (!report) {
    return NextResponse.json({ error: "Expert report not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // 2. Enforce Tenant Isolation
  if (!verifyTenantOwnership(report.metadata.tenantId, auth.tenant.id)) {
    return NextResponse.json(
      { error: "Forbidden: You are not authorized to export another tenant's audit data.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const hostname = report.metadata.companyA?.domain || "website";

  switch (format) {
    case "csv_findings": {
      const csv = exportFindingsCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="SiteIntel-Expert-Findings-${hostname}.csv"`,
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }

    case "csv_inventory": {
      const csv = exportInventoryCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="SiteIntel-Expert-Inventory-${hostname}.csv"`,
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }

    case "csv_remediation": {
      const csv = exportRemediationCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="SiteIntel-Expert-Remediation-${hostname}.csv"`,
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }

    case "manifest": {
      const manifest = exportManifestJson(report);
      return new NextResponse(manifest, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="SiteIntel-Verification-Manifest-${hostname}.json"`,
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }

    case "json":
    default: {
      const bundle = exportFullBundleJson(report);
      return new NextResponse(bundle, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="SiteIntel-Expert-Audit-${hostname}.json"`,
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }
  }
}
