import { scanDb, ScanDatabaseAdapter } from "@/lib/persistence/db";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  reason?: string;
}

export class TenantRateLimiter {
  /**
   * Checks whether a tenant is within their hourly scan quota and concurrent scan limits.
   */
  async checkScanAllowance(tenantId: string, customDb?: ScanDatabaseAdapter): Promise<RateLimitResult> {
    const db = customDb || scanDb;
    const tenant = await db.getTenant(tenantId);
    const hourlyQuota = tenant?.scansPerHourQuota || 20;
    const maxConcurrent = tenant?.maxConcurrentScans || 2;

    // 1. Check concurrent scans
    const activeCount = await db.getActiveScanCount(tenantId);
    if (activeCount >= maxConcurrent) {
      return {
        allowed: false,
        limit: maxConcurrent,
        remaining: 0,
        resetAt: Math.floor(Date.now() / 1000) + 60,
        reason: `Concurrent scan quota exceeded. Your plan allows a maximum of ${maxConcurrent} active concurrent scans.`,
      };
    }

    // 2. Check hourly scan creation rate limit
    const nowSec = Math.floor(Date.now() / 1000);
    const hourWindow = Math.floor(nowSec / 3600);
    const key = `ratelimit:scan:${tenantId}:${hourWindow}`;

    const usage = await db.incrementRateLimit(key, 3600);
    const remaining = Math.max(0, hourlyQuota - usage.count);
    const resetAt = (hourWindow + 1) * 3600;

    if (usage.count > hourlyQuota) {
      return {
        allowed: false,
        limit: hourlyQuota,
        remaining: 0,
        resetAt,
        reason: `Hourly scan quota exceeded. Your plan allows ${hourlyQuota} scans per hour. Window resets at ${new Date(resetAt * 1000).toISOString()}.`,
      };
    }

    return {
      allowed: true,
      limit: hourlyQuota,
      remaining,
      resetAt,
    };
  }
}

export const tenantRateLimiter = new TenantRateLimiter();
