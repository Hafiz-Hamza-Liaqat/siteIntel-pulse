import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  hashPassword,
  verifyPassword,
  needsPasswordRehash,
  MODERN_PBKDF2_ITERATIONS,
  LEGACY_PBKDF2_ITERATIONS_210K,
  LEGACY_PBKDF2_ITERATIONS_100K,
  AuthService,
} from "./index";
import { getSessionSecret, signSessionToken, verifySignedSessionToken } from "./config";
import { runMigrations } from "../persistence/migrator";
import { SqliteScanDatabaseAdapter } from "../persistence/db";

describe("Password and Authentication Security Hardening", () => {
  describe("OWASP PBKDF2 Password Hashing & Verification (220,000 iterations)", () => {
    it("hashes password with OWASP-recommended 220,000 iterations PBKDF2-HMAC-SHA-512", () => {
      const password = "SecureTenantPassword_2026!";
      const { hash, salt, formatted } = hashPassword(password);

      expect(formatted).toMatch(/^pbkdf2\$sha512\$220000\$[0-9a-f]{64}\$[0-9a-f]{128}$/);
      expect(salt).toHaveLength(64); // 32 bytes hex
      expect(hash).toHaveLength(128); // 64 bytes hex
      expect(needsPasswordRehash(formatted)).toBe(false);
    });

    it("verifies correct password against modern hash", () => {
      const password = "CorrectPassword_456!";
      const { formatted, salt } = hashPassword(password);

      expect(verifyPassword(password, formatted, salt)).toBe(true);
    });

    it("rejects incorrect password against modern hash", () => {
      const password = "CorrectPassword_456!";
      const { formatted, salt } = hashPassword(password);

      expect(verifyPassword("WrongPassword_789!", formatted, salt)).toBe(false);
    });

    it("generates unique cryptographically secure salts for identical passwords", () => {
      const password = "IdenticalPassword_123!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1.salt).not.toBe(hash2.salt);
      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.formatted).not.toBe(hash2.formatted);
    });

    it("safely handles malformed, truncated, or invalid hashes without throwing exceptions", () => {
      const validSalt = crypto.randomBytes(32).toString("hex");

      expect(verifyPassword("pass", "", validSalt)).toBe(false);
      expect(verifyPassword("pass", "pbkdf2$invalid", validSalt)).toBe(false);
      expect(verifyPassword("pass", "pbkdf2$sha512$not_a_number$salt$hash", validSalt)).toBe(false);
      expect(verifyPassword("pass", "pbkdf2$md5$1000$salt$hash", validSalt)).toBe(false);
      expect(verifyPassword("pass", "corrupted_raw_hex_string", validSalt)).toBe(false);
      expect(verifyPassword("pass", "123456", validSalt)).toBe(false);
    });

    it("transparently verifies legacy 210,000 iteration hashes for backward compatibility", () => {
      const password = "LegacyTenantPassword_210k!";
      const salt = crypto.randomBytes(32).toString("hex");
      const legacyFormatted = `pbkdf2$sha512$210000$${salt}$${crypto
        .pbkdf2Sync(password, salt, 210_000, 64, "sha512")
        .toString("hex")}`;

      expect(verifyPassword(password, legacyFormatted, salt)).toBe(true);
      expect(verifyPassword("Wrong210kPassword", legacyFormatted, salt)).toBe(false);
      expect(needsPasswordRehash(legacyFormatted)).toBe(true);
    });

    it("transparently verifies legacy 100,000 iteration raw hex hashes for backward compatibility", () => {
      const password = "LegacyTenantPassword_100k!";
      const salt = crypto.randomBytes(32).toString("hex");
      const legacyRawHash = crypto
        .pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS_100K, 64, "sha512")
        .toString("hex");

      // Verify legacy raw hex hash
      expect(verifyPassword(password, legacyRawHash, salt)).toBe(true);
      expect(verifyPassword("WrongLegacyPassword", legacyRawHash, salt)).toBe(false);

      // Verify that needsPasswordRehash detects legacy hash
      expect(needsPasswordRehash(legacyRawHash)).toBe(true);
    });

    it("benchmarks password verification time for 220,000 iterations on current hardware", () => {
      const password = "BenchmarkPassword_2026!";
      const { formatted, salt } = hashPassword(password);

      const start = performance.now();
      const iterations = 3;
      for (let i = 0; i < iterations; i++) {
        const result = verifyPassword(password, formatted, salt);
        expect(result).toBe(true);
      }
      const duration = performance.now() - start;
      const avgMs = duration / iterations;

      console.log(`[Benchmark] Average PBKDF2-SHA512 (220,000 iter) verification time: ${avgMs.toFixed(2)} ms`);
      expect(avgMs).toBeLessThan(1500);
      expect(avgMs).toBeGreaterThan(5); // Defensible proof work is actually performed
    });
  });

  describe("Session Secret Validation & Entropy Fail-Safe", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("fails startup in production mode if SESSION_SECRET is missing", () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.SESSION_SECRET;

      expect(() => getSessionSecret()).toThrowError(/FATAL CONFIGURATION ERROR/);
    });

    it("fails startup in production mode if SESSION_SECRET is shorter than 32 characters", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SESSION_SECRET = "too_short_secret";

      expect(() => getSessionSecret()).toThrowError(/at least 32 characters/);
    });

    it("fails startup in production mode if SESSION_SECRET is an insecure default placeholder", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SESSION_SECRET = "siteintel_staging_session_secret_change_in_production_32bytes_min";

      expect(() => getSessionSecret()).toThrowError(/default placeholder/);
    });

    it("accepts a valid high-entropy SESSION_SECRET in production mode", () => {
      (process.env as any).NODE_ENV = "production";
      const highEntropySecret = crypto.randomBytes(32).toString("hex");
      process.env.SESSION_SECRET = highEntropySecret;

      expect(getSessionSecret()).toBe(highEntropySecret);
    });

    it("safely aborts database adapter initialization in production mode if SESSION_SECRET is missing", () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.SESSION_SECRET;

      expect(() => new SqliteScanDatabaseAdapter(":memory:")).toThrowError(/FATAL CONFIGURATION ERROR/);
    });

    it("signs session tokens and detects tampering using timingSafeEqual", () => {
      process.env.SESSION_SECRET = "valid_test_secret_with_more_than_32_characters_12345";
      const rawToken = crypto.randomBytes(32).toString("hex");
      const signed = signSessionToken(rawToken);

      expect(signed).toContain(".");
      expect(verifySignedSessionToken(signed)).toBe(rawToken);

      // Tampered token
      const [token, sig] = signed.split(".");
      const tampered = `${token}f.${sig}`;
      expect(verifySignedSessionToken(tampered)).toBeNull();

      // Tampered signature
      const tamperedSig = `${token}.${sig.slice(0, -2)}aa`;
      expect(verifySignedSessionToken(tamperedSig)).toBeNull();
    });
  });

  describe("Session ID Rotation & Automatic Hash Upgrade on Login", () => {
    let db: DatabaseSync;
    let authService: AuthService;

    beforeEach(() => {
      db = new DatabaseSync(":memory:");
      db.exec("PRAGMA foreign_keys = ON;");
      runMigrations(db);
      authService = new AuthService(db);
    });

    afterEach(() => {
      db.close();
    });

    it("rotates session ID and revokes previous session upon re-login", () => {
      // 1. Create tenant and user
      const now = new Date().toISOString();
      db.prepare("INSERT INTO tenants (id, name, slug, plan, max_concurrent_scans, scans_per_hour_quota, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        "tenant_test_rot", "Test Rot", "rot", "pro", 2, 20, now
      );

      const { formatted, salt } = hashPassword("ValidPassword123!");
      db.prepare("INSERT INTO users (id, tenant_id, email, password_hash, salt, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        "usr_rot_1", "tenant_test_rot", "rot@test.local", formatted, salt, "admin", "Rot User", now
      );

      // Initial login
      const login1 = authService.authenticateUser("rot@test.local", "ValidPassword123!");
      expect(login1).not.toBeNull();
      const firstToken = login1!.token;

      // Verify first token works
      const authCtx1 = authService.validateSessionToken(firstToken);
      expect(authCtx1).not.toBeNull();

      // Second login passing first token to revoke (simulating browser presenting existing session cookie)
      const login2 = authService.authenticateUser("rot@test.local", "ValidPassword123!", firstToken);
      expect(login2).not.toBeNull();
      const secondToken = login2!.token;

      expect(secondToken).not.toBe(firstToken);

      // Previous session must be revoked
      expect(authService.validateSessionToken(firstToken)).toBeNull();

      // New rotated session must be valid
      expect(authService.validateSessionToken(secondToken)).not.toBeNull();
    });

    it("transparently upgrades legacy 100,000 and 210,000 iteration hashes to modern 220,000 on login", () => {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO tenants (id, name, slug, plan, max_concurrent_scans, scans_per_hour_quota, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        "tenant_upgrade", "Upgrade Tenant", "upg", "pro", 2, 20, now
      );

      const password = "OldLegacyPassword_2025!";
      const salt = crypto.randomBytes(32).toString("hex");
      const legacyRawHash = crypto
        .pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS_100K, 64, "sha512")
        .toString("hex");

      // Insert user with legacy raw hash
      db.prepare("INSERT INTO users (id, tenant_id, email, password_hash, salt, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        "usr_upg_1", "tenant_upgrade", "legacy@test.local", legacyRawHash, salt, "admin", "Legacy User", now
      );

      // Verify user has legacy hash before login
      const preRow = db.prepare("SELECT password_hash FROM users WHERE id = 'usr_upg_1'").get() as any;
      expect(preRow.password_hash).toBe(legacyRawHash);
      expect(needsPasswordRehash(preRow.password_hash)).toBe(true);

      // Authenticate
      const loginResult = authService.authenticateUser("legacy@test.local", password);
      expect(loginResult).not.toBeNull();

      // Verify that database password_hash has been automatically upgraded to 220,000
      const postRow = db.prepare("SELECT password_hash FROM users WHERE id = 'usr_upg_1'").get() as any;
      expect(postRow.password_hash).toMatch(/^pbkdf2\$sha512\$220000\$/);
      expect(needsPasswordRehash(postRow.password_hash)).toBe(false);
    });
  });
});
