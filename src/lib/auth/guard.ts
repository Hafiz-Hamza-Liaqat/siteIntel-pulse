import { NextRequest, NextResponse } from "next/server";
import { AuthContext, UserRole } from "@/types";
import { scanDb } from "@/lib/persistence/db";
import { SESSION_COOKIE_NAME } from "./index";

export type AuthResult = 
  | { auth: AuthContext; response?: never }
  | { auth?: never; response: NextResponse };

/**
 * Extracts and validates credentials from Authorization header or HTTP-only session cookie.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthContext | null> {
  const authService = scanDb.getAuthService();
  if (!authService) return null;

  // 1. Check Authorization Header (Bearer token / API key)
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    if (rawToken.startsWith("sip_live_")) {
      return authService.validateApiKey(rawToken);
    }
    return authService.validateSessionToken(rawToken);
  }

  // 2. Check HTTP-only session cookie
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value) {
    return authService.validateSessionToken(cookie.value);
  }

  return null;
}

/**
 * Enforces server-side authentication and optional role restrictions.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<AuthResult> {
  const auth = await authenticateRequest(req);

  if (!auth) {
    return {
      response: NextResponse.json(
        {
          error: "Authentication required. Provide a valid Bearer token, API key, or session cookie.",
          code: "UNAUTHENTICATED",
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(auth.user.role)) {
    return {
      response: NextResponse.json(
        {
          error: `Forbidden. Role '${auth.user.role}' is not authorized for this resource.`,
          code: "FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }

  return { auth };
}

/**
 * Enforces strict multi-tenant data isolation.
 * Rejects access if the resource does not have a valid tenant owner or belongs to another tenant.
 */
export function verifyTenantOwnership(
  resourceTenantId: string | undefined | null,
  authTenantId: string
): boolean {
  if (!resourceTenantId || !authTenantId) {
    return false;
  }
  return resourceTenantId === authTenantId;
}
