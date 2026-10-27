import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { integrationsManager } from "@/lib/providers/analytics";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const tenantId = authResult.auth.tenant.id;
  const ads = integrationsManager.getGoogleAdsAdapter();

  const url = new URL(req.url);
  const managerCustomerId = url.searchParams.get("managerCustomerId");

  if (managerCustomerId) {
    const res = await ads.listClientAccounts(tenantId, managerCustomerId);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, accounts: res.accounts });
  }

  const res = await ads.listAccessibleCustomers(tenantId);
  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, customers: res.customers });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const tenantId = authResult.auth.tenant.id;
  try {
    const body = await req.json();
    const { customerId, managerCustomerId } = body || {};

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        { success: false, error: "customerId string is required (e.g. customers/123-456-7890 or 123-456-7890)." },
        { status: 400 }
      );
    }

    const ads = integrationsManager.getGoogleAdsAdapter();
    const res = await ads.selectCustomer(tenantId, customerId, { managerCustomerId });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      customerId: res.customerId,
      managerCustomerId: res.managerCustomerId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Invalid request payload." },
      { status: 400 }
    );
  }
}
