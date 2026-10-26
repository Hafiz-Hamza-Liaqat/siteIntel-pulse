import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getSessionSecret } from "@/lib/auth/config";
import { extractClientIp } from "@/lib/security/login-rate-limiter";
import { seedInitialAccounts } from "@/lib/auth/seed";
import { AuthService } from "@/lib/auth";
import { DatabaseSync } from "node:sqlite";

describe("Staging Preflight & Production Security Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("Docker Compose Staging Hardening", () => {
    const composePath = path.resolve(process.cwd(), "docker-compose.staging.yml");
    const composeContent = fs.readFileSync(composePath, "utf-8");

    it("binds published port strictly to host loopback (127.0.0.1:3000:3000)", () => {
      expect(composeContent).toContain('"127.0.0.1:3000:3000"');
      expect(composeContent).not.toMatch(/^\s*-\s*["']?3000:3000["']?\s*$/m);
    });

    it("keeps container internal HOST listening on 0.0.0.0", () => {
      expect(composeContent).toMatch(/HOST=0\.0\.0\.0/);
    });

    it("requires SESSION_SECRET interpolation and forbids hardcoded secrets", () => {
      expect(composeContent).toContain("${SESSION_SECRET:?");
      expect(composeContent).not.toContain("staging_session_secret_min_32_chars_random_string_here");
      expect(composeContent).not.toContain("siteintel_staging_session_secret");
    });

    it("makes NEXT_PUBLIC_APP_URL configurable with fallback", () => {
      expect(composeContent).toContain("${NEXT_PUBLIC_APP_URL:-");
    });

    it("defines durable volumes for data and backups", () => {
      expect(composeContent).toContain("siteintel_data:/app/data");
      expect(composeContent).toContain("siteintel_backups:/app/backups");
    });
  });

  describe("Session Secret Production Startup Guard", () => {
    it("aborts in production mode when SESSION_SECRET is missing", () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.SESSION_SECRET;

      expect(() => getSessionSecret()).toThrowError(/FATAL CONFIGURATION ERROR/);
    });

    it("aborts in production mode when SESSION_SECRET is shorter than 32 characters", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SESSION_SECRET = "short_secret_12345";

      expect(() => getSessionSecret()).toThrowError(/at least 32 characters/);
    });

    it("aborts in production mode for all known placeholder secrets", () => {
      (process.env as any).NODE_ENV = "production";
      const placeholders = [
        "<generate-unique-32-byte-hex-secret-via-openssl-rand-hex-32>",
        "siteintel_staging_session_secret_change_in_production_32bytes_min",
        "staging_session_secret_min_32_chars_random_string_here",
        "secret",
        "changeme",
        "password",
        "12345678901234567890123456789012",
        "session_secret",
      ];

      for (const placeholder of placeholders) {
        process.env.SESSION_SECRET = placeholder;
        expect(() => getSessionSecret()).toThrowError(/default placeholder/);
      }
    });

    it("aborts in production mode when SESSION_SECRET is the literal runbook placeholder", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SESSION_SECRET = "<generate-unique-32-byte-hex-secret-via-openssl-rand-hex-32>";

      expect(() => getSessionSecret()).toThrowError(/default placeholder/);
    });

    it("aborts in production mode when SESSION_SECRET matches any bracketed placeholder (<...>)", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SESSION_SECRET = "<insert-random-secret-here-at-least-32-characters-long>";

      expect(() => getSessionSecret()).toThrowError(/default placeholder/);
    });

    it("aborts in production mode when SESSION_SECRET is not valid 64-character hexadecimal", () => {
      (process.env as any).NODE_ENV = "production";
      // 64 characters long but contains non-hexadecimal characters ('z')
      process.env.SESSION_SECRET = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";

      expect(() => getSessionSecret()).toThrowError(/64-character hexadecimal string/);
    });

    it("aborts in production mode when SESSION_SECRET is hexadecimal but not 64 characters long", () => {
      (process.env as any).NODE_ENV = "production";
      // 48 hex characters
      process.env.SESSION_SECRET = "abcdef0123456789abcdef0123456789abcdef0123456789";

      expect(() => getSessionSecret()).toThrowError(/64-character hexadecimal string/);
    });

    it("accepts a cryptographically strong 64-character hexadecimal secret in production", () => {
      (process.env as any).NODE_ENV = "production";
      const validSecret = crypto.randomBytes(32).toString("hex");
      process.env.SESSION_SECRET = validSecret;

      expect(getSessionSecret()).toBe(validSecret);
    });
  });

  describe("Reverse Proxy Client IP Trust Contract", () => {
    it("fails safely by returning null in production when trusted header is absent", () => {
      (process.env as any).NODE_ENV = "production";
      const headers = new Headers();
      headers.set("x-forwarded-for", "203.0.113.195, 10.0.0.1");

      const ip = extractClientIp(headers);
      expect(ip).toBeNull();
    });

    it("extracts client IP from X-Real-IP in production and ignores spoofed X-Forwarded-For", () => {
      (process.env as any).NODE_ENV = "production";
      const headers = new Headers();
      headers.set("x-real-ip", "198.51.100.22");
      headers.set("x-forwarded-for", "10.0.0.99, 172.16.0.1");

      const ip = extractClientIp(headers);
      expect(ip).toBe("198.51.100.22");
    });
  });

  describe("Production Demonstration Seed Lockout & Account Provisioning Contract", () => {
    it("strictly prevents demo seeding in production even if ALLOW_STAGING_SEEDS is true", () => {
      (process.env as any).NODE_ENV = "production";
      (process.env as any).ALLOW_STAGING_SEEDS = "true";

      const memDb = new DatabaseSync(":memory:");
      const result = seedInitialAccounts(memDb);
      memDb.close();

      expect(result.seeded).toBe(false);
      expect(result.message).toContain("cannot be seeded when NODE_ENV=production");
    });

    it("dynamically provisions separate isolated guest tenants for public intake without pre-seeded accounts", () => {
      (process.env as any).NODE_ENV = "production";
      (process.env as any).SESSION_SECRET = crypto.randomBytes(32).toString("hex");

      const memDb = new DatabaseSync(":memory:");
      memDb.exec(`
        CREATE TABLE tenants (id TEXT PRIMARY KEY, name TEXT, slug TEXT, plan TEXT, max_concurrent_scans INTEGER, scans_per_hour_quota INTEGER, created_at TEXT);
        CREATE TABLE users (id TEXT PRIMARY KEY, tenant_id TEXT, email TEXT, password_hash TEXT, salt TEXT, role TEXT, name TEXT, created_at TEXT);
        CREATE TABLE sessions (id TEXT PRIMARY KEY, token_hash TEXT, user_id TEXT, tenant_id TEXT, expires_at TEXT, created_at TEXT);
      `);

      const authService = new AuthService(memDb);
      const guest1 = authService.createGuestSession("198.51.100.1");
      const guest2 = authService.createGuestSession("198.51.100.2");

      expect(guest1.tenant.id).toMatch(/^tenant_guest_/);
      expect(guest2.tenant.id).toMatch(/^tenant_guest_/);
      expect(guest1.tenant.id).not.toBe(guest2.tenant.id);
      expect(guest1.user.id).not.toBe(guest2.user.id);
      expect(guest1.token).not.toBe(guest2.token);

      memDb.close();
    });
  });
});
