import crypto from "node:crypto";
import { scanDb, ScanDatabaseAdapter } from "@/lib/persistence/db";

export interface LoginRateLimitCheck {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
  reason?: string;
}

export const LOGIN_IP_WINDOW_SECONDS = 300; // 5 minutes
export const LOGIN_IP_MAX_ATTEMPTS = 10;
export const LOGIN_IP_ACCOUNT_MAX_ATTEMPTS = 5;

/**
 * Trust Contract for Client IP Resolution:
 * 1. Reverse Proxy Requirement:
 *    The application relies on an outer trusted reverse proxy (e.g., Nginx, Caddy, Cloudflare,
 *    Fly.io, or an authenticated cloud ingress) to establish the client's verified TCP remote address.
 * 2. Primary Trusted Header:
 *    By default, the application extracts the client IP from `X-Real-IP` (or a configured provider-specific
 *    header via the `TRUSTED_IP_HEADER` environment variable, such as `fly-client-ip` or `cf-connecting-ip`).
 * 3. Prohibited Fallback:
 *    The application NEVER falls back to `X-Forwarded-For` when the trusted header is missing. Arbitrary
 *    clients can forge or rotate `X-Forwarded-For` headers to evade IP-based rate limits.
 * 4. Production Fail-Safe:
 *    In production (`NODE_ENV === "production"`), if the trusted reverse-proxy header is missing or empty,
 *    `extractClientIp` returns `null`. Route handlers must fail safely by rejecting the request
 *    (e.g., HTTP 400 UNTRUSTED_CLIENT_IP) rather than allowing unmetered or spoofed access.
 * 5. Development & Test Safety:
 *    In non-production environments (`NODE_ENV !== "production"`), if the trusted header is absent,
 *    `extractClientIp` safely defaults to `"127.0.0.1"`. In this case, any client-supplied `X-Forwarded-For`
 *    values are still ignored, ensuring tests and local development cannot evade rate limits via forged headers.
 */
export function extractClientIp(headers: Headers): string | null {
  const trustedHeaderName = (process.env.TRUSTED_IP_HEADER || "x-real-ip").toLowerCase();
  const trustedIp = headers.get(trustedHeaderName)?.trim();
  if (trustedIp) {
    // If the trusted proxy supplied a comma-separated list, take the first authentic entry
    const sanitized = trustedIp.split(",")[0]?.trim();
    if (sanitized) return sanitized;
  }

  // In production, missing trusted reverse-proxy header must fail safely
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  // In development and test environments, fall back to loopback address.
  // Note: We intentionally do NOT fall back to caller-supplied X-Forwarded-For.
  return "127.0.0.1";
}

/**
 * Shared durable login rate limiter.
 * Prevents credential stuffing and password guessing attacks without locking
 * user accounts globally (preventing trivial denial-of-service attacks).
 */
export class LoginRateLimiter {
  constructor(private dbAdapter?: ScanDatabaseAdapter) {}

  private getDb(): ScanDatabaseAdapter {
    return this.dbAdapter || scanDb;
  }

  /**
   * Checks whether the client IP and targeted account are permitted to attempt login.
   */
  async checkAllowance(clientIp: string, targetEmail: string): Promise<LoginRateLimitCheck> {
    const db = this.getDb();
    const nowSec = Math.floor(Date.now() / 1000);
    const windowSlot = Math.floor(nowSec / LOGIN_IP_WINDOW_SECONDS);
    const emailHash = crypto.createHash("sha256").update(targetEmail.toLowerCase().trim()).digest("hex").slice(0, 16);

    const ipKey = `ratelimit:login:ip:${clientIp}:${windowSlot}`;
    const ipAccKey = `ratelimit:login:ip_acc:${clientIp}:${emailHash}:${windowSlot}`;

    // Read current rate limits (or query via increment with 0 effect, or inspect existing)
    // Here we check if either counter has already reached its quota
    // We inspect existing records in the rate_limits table
    const checkIp = await (db as any).incrementRateLimit ? null : null; // fallback
    
    // To ensure exact shared atomic read, we query the rate_limits table through adapter if available:
    const sqliteDb = (db as any).db;
    if (sqliteDb) {
      const ipRow = sqliteDb.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?").get(ipKey) as any;
      if (ipRow && ipRow.reset_at > nowSec && ipRow.count >= LOGIN_IP_MAX_ATTEMPTS) {
        const retryAfter = ipRow.reset_at - nowSec;
        return {
          allowed: false,
          limit: LOGIN_IP_MAX_ATTEMPTS,
          remaining: 0,
          resetAt: ipRow.reset_at,
          retryAfterSeconds: Math.max(1, retryAfter),
          reason: `Too many login attempts from this network. Please wait ${retryAfter} seconds.`,
        };
      }

      const ipAccRow = sqliteDb.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?").get(ipAccKey) as any;
      if (ipAccRow && ipAccRow.reset_at > nowSec && ipAccRow.count >= LOGIN_IP_ACCOUNT_MAX_ATTEMPTS) {
        const retryAfter = ipAccRow.reset_at - nowSec;
        return {
          allowed: false,
          limit: LOGIN_IP_ACCOUNT_MAX_ATTEMPTS,
          remaining: 0,
          resetAt: ipAccRow.reset_at,
          retryAfterSeconds: Math.max(1, retryAfter),
          reason: `Too many failed password attempts for this account from your IP. Please wait ${retryAfter} seconds.`,
        };
      }
    }

    return {
      allowed: true,
      limit: LOGIN_IP_ACCOUNT_MAX_ATTEMPTS,
      remaining: LOGIN_IP_ACCOUNT_MAX_ATTEMPTS,
      resetAt: (windowSlot + 1) * LOGIN_IP_WINDOW_SECONDS,
    };
  }

  /**
   * Records a failed password attempt in durable shared storage.
   */
  async recordFailedAttempt(clientIp: string, targetEmail: string): Promise<void> {
    const db = this.getDb();
    const nowSec = Math.floor(Date.now() / 1000);
    const windowSlot = Math.floor(nowSec / LOGIN_IP_WINDOW_SECONDS);
    const emailHash = crypto.createHash("sha256").update(targetEmail.toLowerCase().trim()).digest("hex").slice(0, 16);

    const ipKey = `ratelimit:login:ip:${clientIp}:${windowSlot}`;
    const ipAccKey = `ratelimit:login:ip_acc:${clientIp}:${emailHash}:${windowSlot}`;

    // Durable atomic increments in SQLite rate_limits table
    await db.incrementRateLimit(ipKey, LOGIN_IP_WINDOW_SECONDS);
    await db.incrementRateLimit(ipAccKey, LOGIN_IP_WINDOW_SECONDS);
  }
}

export const loginRateLimiter = new LoginRateLimiter();
