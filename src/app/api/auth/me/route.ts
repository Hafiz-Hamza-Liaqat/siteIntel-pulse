import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthenticated", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  return NextResponse.json({
    user: auth.user,
    tenant: auth.tenant,
  });
}
