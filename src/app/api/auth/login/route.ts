import { NextRequest, NextResponse } from "next/server";
import { scanDb } from "@/lib/persistence/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { loginRateLimiter, extractClientIp } from "@/lib/security/login-rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required.", code: "INVALID_CREDENTIALS" },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req.headers);
    if (!clientIp) {
      return NextResponse.json(
        {
          error: "Trusted client IP address could not be verified. Production requests must be routed through a configured reverse proxy.",
          code: "UNTRUSTED_CLIENT_IP",
        },
        { status: 400 }
      );
    }

    // 1. Check Login Rate Limit (Durable shared limits without DoS account lockout)
    const allowance = await loginRateLimiter.checkAllowance(clientIp, email);
    if (!allowance.allowed) {
      return NextResponse.json(
        {
          error: allowance.reason || "Too many failed login attempts. Please wait before trying again.",
          code: "TOO_MANY_REQUESTS",
          retryAfter: allowance.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(allowance.retryAfterSeconds || 60),
            "X-RateLimit-Limit": String(allowance.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(allowance.resetAt),
          },
        }
      );
    }

    const existingCookie = req.cookies.get(SESSION_COOKIE_NAME);
    const authService = scanDb.getAuthService();

    // 2. Authenticate with session-ID rotation and legacy hash upgrade
    const authResult = authService.authenticateUser(
      email,
      password,
      existingCookie?.value
    );

    if (!authResult) {
      // Record failed attempt in durable storage
      await loginRateLimiter.recordFailedAttempt(clientIp, email);

      return NextResponse.json(
        { error: "Invalid email or password.", code: "AUTHENTICATION_FAILED" },
        { status: 401 }
      );
    }

    const { user, tenant, token, signedToken } = authResult;

    // 3. Set secure HTTP-only signed session cookie
    const response = NextResponse.json({
      success: true,
      user,
      tenant,
      token,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 14 * 24 * 60 * 60, // 14 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
