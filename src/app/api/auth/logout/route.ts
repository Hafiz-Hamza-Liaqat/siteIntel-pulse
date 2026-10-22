import { NextRequest, NextResponse } from "next/server";
import { scanDb } from "@/lib/persistence/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value) {
    const authService = scanDb.getAuthService();
    authService.revokeSession(cookie.value);
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
