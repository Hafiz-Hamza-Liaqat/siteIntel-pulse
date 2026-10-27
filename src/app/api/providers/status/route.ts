import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrGuest } from "@/lib/auth/guard";
import { integrationsManager } from "@/lib/providers/analytics";

export async function GET(req: NextRequest) {
  const { auth, newSessionCookie } = await requireAuthOrGuest(req);
  const tenantId = auth.tenant.id;

  const providers = await integrationsManager.getAllConnectionStates(tenantId);

  const response = NextResponse.json({
    tenantId,
    providers,
  });

  if (newSessionCookie) {
    response.cookies.set(newSessionCookie.name, newSessionCookie.value, newSessionCookie.options);
  }

  return response;
}
