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
 * Normalizes client IP address from standard reverse proxy headers.
 * Under documented reverse proxy configurations (e.g. Nginx proxy_set_header X-Real-IP $remote_addr),
 * X-Real-IP reflects the authentic TCP connection IP and cannot be spoofed by client-supplied
 * X-Forwarded-For headers.
 */
export function extractClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

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
