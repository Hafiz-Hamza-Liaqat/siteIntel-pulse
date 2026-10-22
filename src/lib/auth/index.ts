import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { User, Tenant, Session, ApiKey, AuthContext } from "@/types";
import { signSessionToken, verifySignedSessionToken, getSessionSecret } from "./config";
export { getSessionSecret, signSessionToken, verifySignedSessionToken } from "./config";

export const MODERN_PBKDF2_ITERATIONS = 220_000; // OWASP recommendation for PBKDF2-HMAC-SHA512
export const LEGACY_PBKDF2_ITERATIONS_210K = 210_000;
export const LEGACY_PBKDF2_ITERATIONS_100K = 100_000;
export const PBKDF2_KEYLEN = 64;
export const PBKDF2_DIGEST = "sha512";
export const SESSION_COOKIE_NAME = "siteintel_session";
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface HashedPasswordResult {
  hash: string;
  salt: string;
  formatted: string;
}

/**
 * Hashes a plaintext password using PBKDF2-HMAC-SHA-512 with OWASP-recommended 220,000 iterations.
 */
export function hashPassword(
  password: string,
  existingSalt?: string,
  iterations = MODERN_PBKDF2_ITERATIONS
): HashedPasswordResult {
  const salt = existingSalt || crypto.randomBytes(32).toString("hex");
  const rawHash = crypto
    .pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
  const formatted = `pbkdf2$${PBKDF2_DIGEST}$${iterations}$${salt}$${rawHash}`;
  return { hash: rawHash, salt, formatted };
}

/**
 * Verifies a plaintext password against a stored hash using timing-safe comparison.
 * Supports:
 * 1. Formatted modern hashes: `pbkdf2$sha512$<iterations>$<salt>$<hash>` (supports 220,000, 210,000, or any valid count).
 * 2. Legacy raw hex hashes with separate salt (checked against 220,000, then 210,000, then 100,000 iterations).
 * Safely handles malformed strings without throwing.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || typeof storedHash !== "string") {
    return false;
  }

  try {
    // 1. Check formatted modern hash
    if (storedHash.startsWith("pbkdf2$")) {
      const parts = storedHash.split("$");
      if (parts.length !== 5) return false;
      const [, digest, iterStr, hashSalt, expectedHashHex] = parts;
      const iterations = parseInt(iterStr, 10);
      if (isNaN(iterations) || iterations < 1) return false;
      if (digest !== "sha512") return false;

      const computed = crypto
        .pbkdf2Sync(password, hashSalt, iterations, PBKDF2_KEYLEN, digest)
        .toString("hex");

      const compBuf = Buffer.from(computed, "hex");
      const expBuf = Buffer.from(expectedHashHex, "hex");
      if (compBuf.length !== expBuf.length || compBuf.length === 0) return false;
      return crypto.timingSafeEqual(compBuf, expBuf);
    }

    // 2. Legacy unformatted raw hex hash
    if (!salt || typeof salt !== "string") return false;

    // Try modern 220,000 first
    const modernComputed = crypto
      .pbkdf2Sync(password, salt, MODERN_PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString("hex");
    const modBuf = Buffer.from(modernComputed, "hex");
    const storedBuf = Buffer.from(storedHash, "hex");

    if (modBuf.length === storedBuf.length && crypto.timingSafeEqual(modBuf, storedBuf)) {
      return true;
    }

    // Try intermediate 210,000
    const legacy210Computed = crypto
      .pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS_210K, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString("hex");
    const leg210Buf = Buffer.from(legacy210Computed, "hex");

    if (leg210Buf.length === storedBuf.length && crypto.timingSafeEqual(leg210Buf, storedBuf)) {
      return true;
    }

    // Fall back to legacy 100,000
    const legacyComputed = crypto
      .pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS_100K, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString("hex");
    const legBuf = Buffer.from(legacyComputed, "hex");

    if (legBuf.length === storedBuf.length && crypto.timingSafeEqual(legBuf, storedBuf)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Checks whether a stored password hash requires upgrading to modern OWASP parameters.
 */
export function needsPasswordRehash(storedHash: string): boolean {
  if (!storedHash.startsWith(`pbkdf2$${PBKDF2_DIGEST}$${MODERN_PBKDF2_ITERATIONS}$`)) {
    return true;
  }
  return false;
}

/**
 * Computes a SHA-256 digest of a session or API key token for database storage.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a high-entropy secret token with an optional prefix.
 */
export function generateSecretToken(prefix = "sip_live_"): string {
  return `${prefix}${crypto.randomBytes(24).toString("hex")}`;
}

export class AuthService {
  constructor(private db: DatabaseSync) {}

  /**
   * Creates an authenticated session for a user and tenant.
   * Returns both rawToken and signedCookieValue.
   */
  createSession(userId: string, tenantId: string): { token: string; signedToken: string; session: Session } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const sessionId = `sess_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
    const createdAt = now.toISOString();

    const stmt = this.db.prepare(
      "INSERT INTO sessions (id, token_hash, user_id, tenant_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(sessionId, tokenHash, userId, tenantId, expiresAt, createdAt);

    const signedToken = signSessionToken(rawToken);

    return {
      token: rawToken,
      signedToken,
      session: {
        id: sessionId,
        tokenHash,
        userId,
        tenantId,
        expiresAt,
        createdAt,
      },
    };
  }

  /**
   * Creates an isolated guest tenant, user, and session token.
   * Gives guests immediate access to run public scans without manual registration,
   * while enforcing total database-level tenant isolation.
   */
  createGuestSession(clientIp?: string): {
    user: User;
    tenant: Tenant;
    token: string;
    signedToken: string;
    session: Session;
  } {
    const entropy = crypto.randomBytes(8).toString("hex");
    const tenantId = `tenant_guest_${Date.now()}_${entropy}`;
    const userId = `user_guest_${Date.now()}_${entropy}`;
    const now = new Date().toISOString();

    const tenant: Tenant = {
      id: tenantId,
      name: "Guest Session",
      slug: `guest-${entropy}`,
      plan: "guest",
      maxConcurrentScans: 1,
      scansPerHourQuota: 5,
      createdAt: now,
    };

    const user: User = {
      id: userId,
      tenantId,
      email: `guest_${entropy}@guest.local`,
      role: "viewer",
      name: "Guest Visitor",
      createdAt: now,
    };

    this.db.exec("BEGIN IMMEDIATE;");
    try {
      this.db
        .prepare(
          "INSERT INTO tenants (id, name, slug, plan, max_concurrent_scans, scans_per_hour_quota, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          tenant.id,
          tenant.name,
          tenant.slug,
          tenant.plan,
          tenant.maxConcurrentScans,
          tenant.scansPerHourQuota,
          tenant.createdAt
        );

      this.db
        .prepare(
          "INSERT INTO users (id, tenant_id, email, password_hash, salt, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          user.id,
          user.tenantId,
          user.email,
          "GUEST_NO_PASSWORD",
          "NONE",
          user.role,
          user.name,
          user.createdAt
        );

      this.db.exec("COMMIT;");
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }

    const { token, signedToken, session } = this.createSession(userId, tenantId);

    return {
      user,
      tenant,
      token,
      signedToken,
      session,
    };
  }

  /**
   * Validates a session token (raw or signed) and returns full AuthContext.
   */
  validateSessionToken(tokenOrSigned: string): AuthContext | null {
    if (!tokenOrSigned || typeof tokenOrSigned !== "string") return null;

    // Unpack if signed
    const rawToken = verifySignedSessionToken(tokenOrSigned);
    if (!rawToken) return null;

    const tokenHash = hashToken(rawToken);

    const query = `
      SELECT 
        s.id AS session_id, s.expires_at,
        u.id AS user_id, u.tenant_id, u.email, u.role, u.name AS user_name, u.created_at AS user_created_at,
        t.id AS t_id, t.name AS tenant_name, t.slug, t.plan, t.max_concurrent_scans, t.scans_per_hour_quota, t.created_at AS tenant_created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN tenants t ON s.tenant_id = t.id
      WHERE s.token_hash = ?
    `;

    const row = this.db.prepare(query).get(tokenHash) as any;
    if (!row) return null;

    // Check expiration
    if (new Date(row.expires_at).getTime() < Date.now()) {
      // Invalidate expired session
      this.db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
      return null;
    }

    return {
      user: {
        id: row.user_id,
        tenantId: row.tenant_id,
        email: row.email,
        role: row.role,
        name: row.user_name,
        createdAt: row.user_created_at,
      },
      tenant: {
        id: row.t_id,
        name: row.tenant_name,
        slug: row.slug,
        plan: row.plan,
        maxConcurrentScans: row.max_concurrent_scans,
        scansPerHourQuota: row.scans_per_hour_quota,
        createdAt: row.tenant_created_at,
      },
    };
  }

  /**
   * Validates a Bearer API Key and returns AuthContext.
   */
  validateApiKey(rawApiKey: string): AuthContext | null {
    if (!rawApiKey || typeof rawApiKey !== "string") return null;
    const keyHash = hashToken(rawApiKey);

    const query = `
      SELECT 
        k.id AS key_id, k.name AS key_name, k.role,
        t.id AS t_id, t.name AS tenant_name, t.slug, t.plan, t.max_concurrent_scans, t.scans_per_hour_quota, t.created_at AS tenant_created_at
      FROM api_keys k
      JOIN tenants t ON k.tenant_id = t.id
      WHERE k.key_hash = ?
    `;

    const row = this.db.prepare(query).get(keyHash) as any;
    if (!row) return null;

    // Update last_used_at
    this.db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(new Date().toISOString(), row.key_id);

    return {
      user: {
        id: `apikey_${row.key_id}`,
        tenantId: row.t_id,
        email: `api-${row.key_name}@tenant.local`,
        role: row.role,
        name: `API Key (${row.key_name})`,
        createdAt: row.tenant_created_at,
      },
      tenant: {
        id: row.t_id,
        name: row.tenant_name,
        slug: row.slug,
        plan: row.plan,
        maxConcurrentScans: row.max_concurrent_scans,
        scansPerHourQuota: row.scans_per_hour_quota,
        createdAt: row.tenant_created_at,
      },
    };
  }

  /**
   * Authenticates a user with email and password, rotating session ID.
   * Transparently migrates legacy hashes to modern OWASP parameters.
   */
  authenticateUser(
    email: string,
    passwordPlain: string,
    existingTokenToRevoke?: string
  ): { user: User; tenant: Tenant; token: string; signedToken: string } | null {
    const row = this.db.prepare(`
      SELECT 
        u.id, u.tenant_id, u.email, u.password_hash, u.salt, u.role, u.name, u.created_at,
        t.id AS t_id, t.name AS t_name, t.slug, t.plan, t.max_concurrent_scans, t.scans_per_hour_quota, t.created_at AS t_created_at
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE LOWER(u.email) = LOWER(?)
    `).get(email.trim()) as any;

    if (!row) return null;

    const isValid = verifyPassword(passwordPlain, row.password_hash, row.salt);
    if (!isValid) return null;

    // Transparent Hash Migration to OWASP 210,000 iterations
    if (needsPasswordRehash(row.password_hash)) {
      const upgraded = hashPassword(passwordPlain);
      this.db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").run(
        upgraded.formatted,
        upgraded.salt,
        row.id
      );
    }

    // Revoke old session if provided (session fixation protection)
    if (existingTokenToRevoke) {
      this.revokeSession(existingTokenToRevoke);
    }

    // Issue fresh rotated session
    const { token, signedToken } = this.createSession(row.id, row.tenant_id);

    return {
      user: {
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        role: row.role,
        name: row.name,
        createdAt: row.created_at,
      },
      tenant: {
        id: row.t_id,
        name: row.t_name,
        slug: row.slug,
        plan: row.plan,
        maxConcurrentScans: row.max_concurrent_scans,
        scansPerHourQuota: row.scans_per_hour_quota,
        createdAt: row.t_created_at,
      },
      token,
      signedToken,
    };
  }

  /**
   * Revokes a session token (raw or signed).
   */
  revokeSession(tokenOrSigned: string): void {
    const rawToken = verifySignedSessionToken(tokenOrSigned) || tokenOrSigned;
    const tokenHash = hashToken(rawToken);
    this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }
}
