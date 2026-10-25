import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { DatabaseSync } from "node:sqlite";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import {
  LoginRateLimiter,
  extractClientIp,
  LOGIN_IP_ACCOUNT_MAX_ATTEMPTS,
} from "./login-rate-limiter";
import { seedInitialAccounts } from "../auth/seed";
import { POST as loginHandler } from "@/app/api/auth/login/route";

describe("Login Abuse Protection & DoS Prevention", () => {
  let db: DatabaseSync;
  let adapter: SqliteScanDatabaseAdapter;

  beforeEach(() => {
    adapter = new SqliteScanDatabaseAdapter(":memory:");
    (globalThis as any).scanDbInstance = adapter;
    seedInitialAccounts((adapter as any).db);
  });

  afterEach(() => {
    (globalThis as any).scanDbInstance = undefined;
    adapter.close();
  });

  describe("Client IP Extraction", () => {
    it("ignores untrusted X-Forwarded-For when X-Real-IP is missing and defaults to 127.0.0.1 in non-prod", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "203.0.113.195, 70.41.3.18, 150.172.238.178");
      expect(extractClientIp(headers)).toBe("127.0.0.1");
    });

    it("extracts IP from trusted X-Real-IP header", () => {
      const headers = new Headers();
      headers.set("x-real-ip", "198.51.100.42");
      expect(extractClientIp(headers)).toBe("198.51.100.42");
    });

    it("falls back to 127.0.0.1 when no IP headers are present in non-prod", () => {
      const headers = new Headers();
      expect(extractClientIp(headers)).toBe("127.0.0.1");
    });
  });

  describe("Durable Login Rate Limiter Units", () => {
    it("allows login attempts under the quota threshold", async () => {
      const limiter = new LoginRateLimiter(adapter);
      const allowance = await limiter.checkAllowance("192.0.2.1", "admin@companya.test");
      expect(allowance.allowed).toBe(true);
      expect(allowance.remaining).toBe(LOGIN_IP_ACCOUNT_MAX_ATTEMPTS);
    });

    it("blocks repeated failed password attempts after exceeding threshold", async () => {
      const limiter = new LoginRateLimiter(adapter);
      const ip = "192.0.2.2";
      const email = "admin@companya.test";

      // Record 5 failed attempts
      for (let i = 0; i < LOGIN_IP_ACCOUNT_MAX_ATTEMPTS; i++) {
        await limiter.recordFailedAttempt(ip, email);
      }

      // 6th check should be blocked
      const check = await limiter.checkAllowance(ip, email);
      expect(check.allowed).toBe(false);
      expect(check.retryAfterSeconds).toBeGreaterThan(0);
      expect(check.reason).toContain("Too many failed password attempts");
    });

    it("does NOT lock out other IP addresses attempting to authenticate for the same account (DoS Prevention)", async () => {
      const limiter = new LoginRateLimiter(adapter);
      const attackerIp = "198.51.100.99";
      const legitimateIp = "203.0.113.50";
      const targetEmail = "admin@companya.test";

      // Attacker exhausts their quota
      for (let i = 0; i < LOGIN_IP_ACCOUNT_MAX_ATTEMPTS; i++) {
        await limiter.recordFailedAttempt(attackerIp, targetEmail);
      }

      // Attacker is blocked
      const attackerCheck = await limiter.checkAllowance(attackerIp, targetEmail);
      expect(attackerCheck.allowed).toBe(false);

      // Legitimate user from different IP remains allowed!
      const legitCheck = await limiter.checkAllowance(legitimateIp, targetEmail);
      expect(legitCheck.allowed).toBe(true);
    });
  });

  describe("End-to-End Login Route Handler Abuse Protection", () => {
    function createLoginRequest(email: string, passwordPlain: string, clientIp: string): NextRequest {
      return new NextRequest(new URL("http://localhost:3000/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": clientIp,
        },
        body: JSON.stringify({ email, password: passwordPlain }),
      });
    }

    it("rate-limits brute-force login attempts and returns HTTP 429 with Retry-After header", async () => {
      const uniqueSuffix = Math.floor(Math.random() * 150) + 50;
      const attackerIp = `192.0.2.${uniqueSuffix}`;
      const legitIp = `203.0.113.${uniqueSuffix}`;
      const email = "admin@companya.test";

      // 5 failed password attempts return HTTP 401
      for (let i = 0; i < LOGIN_IP_ACCOUNT_MAX_ATTEMPTS; i++) {
        const req = createLoginRequest(email, "WrongPassword_Attempt!", attackerIp);
        const res = await loginHandler(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.code).toBe("AUTHENTICATION_FAILED");
      }

      // 6th attempt from the same attacker IP must be rejected with HTTP 429
      const reqBlocked = createLoginRequest(email, "WrongPassword_Attempt!", attackerIp);
      const resBlocked = await loginHandler(reqBlocked);
      expect(resBlocked.status).toBe(429);
      const jsonBlocked = await resBlocked.json();
      expect(jsonBlocked.code).toBe("TOO_MANY_REQUESTS");
      expect(resBlocked.headers.get("Retry-After")).toBeTruthy();

      // Legitimate user from distinct IP can still log in with correct credentials
      const reqLegit = createLoginRequest(email, "CompanyA_Auditor_2026!", legitIp);
      const resLegit = await loginHandler(reqLegit);
      expect(resLegit.status).toBe(200);
      const jsonLegit = await resLegit.json();
      expect(jsonLegit.success).toBe(true);
      expect(jsonLegit.user.email).toBe(email);
    });
  });
});
