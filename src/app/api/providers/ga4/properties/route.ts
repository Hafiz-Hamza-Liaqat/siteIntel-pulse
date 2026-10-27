import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { integrationsManager } from "@/lib/providers/analytics";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const tenantId = authResult.auth.tenant.id;
  const ga4 = integrationsManager.getGA4Adapter();
  const res = await ga4.listAccessibleProperties(tenantId);

  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, properties: res.properties });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const tenantId = authResult.auth.tenant.id;
  try {
    const body = await req.json();
    const { propertyId } = body || {};

    if (!propertyId || typeof propertyId !== "string") {
      return NextResponse.json(
        { success: false, error: "propertyId string is required (e.g. properties/123456789)." },
        { status: 400 }
      );
    }

    const ga4 = integrationsManager.getGA4Adapter();
    const res = await ga4.selectProperty(tenantId, propertyId);

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, propertyId: res.propertyId });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Invalid request payload." },
      { status: 400 }
    );
  }
}
