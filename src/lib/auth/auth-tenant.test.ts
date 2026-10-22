import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { hashPassword, verifyPassword, hashToken } from "./index";
import { verifyTenantOwnership } from "./guard";
import { TenantRateLimiter } from "../security/rate-limiter";
import type { ScanRequest } from "@/types";

describe("Phase 2 & Phase 4: Authentication, Multi-Tenant Isolation & Rate Limiting", () => {
  const testDbDir = path.resolve(process.cwd(), "test-data");
  let testDbPath: string;
  let dbAdapter: SqliteScanDatabaseAdapter;

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    testDbPath = path.resolve(testDbDir, `test-auth-${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.db`);
    dbAdapter = new SqliteScanDatabaseAdapter(testDbPath);
  });

  afterEach(() => {
    dbAdapter.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}
  });

  describe("Cryptographic Primitives & Password Hashing", () => {
    it("hashes and verifies passwords with PBKDF2/SHA-512 and random salt", () => {
      const plaintext = "SecureSecretPassword_2026!";
      const { hash, salt } = hashPassword(plaintext);

      expect(hash).toHaveLength(128); // 64 bytes hex
      expect(salt).toHaveLength(64); // 32 bytes hex

      expect(verifyPassword(plaintext, hash, salt)).toBe(true);
      expect(verifyPassword("WrongPassword!", hash, salt)).toBe(false);
      expect(verifyPassword(plaintext, hash, "tampered_salt_12345678901234567890123456789012")).toBe(false);
    });

    it("hashes tokens deterministically with SHA-256", () => {
      const token = "sip_live_test_token_12345";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe("Authentication Workflows & Sessions", () => {
    it("authenticates seeded users and issues valid session tokens", () => {
      const authService = dbAdapter.getAuthService();

      // Company A user
      const loginA = authService.authenticateUser("admin@companya.test", "CompanyA_Auditor_2026!");
      expect(loginA).not.toBeNull();
      expect(loginA?.user.email).toBe("admin@companya.test");
      expect(loginA?.tenant.id).toBe("tenant_comp_a");
      expect(loginA?.token).toBeDefined();

      // Validate session token
      const sessionCtx = authService.validateSessionToken(loginA!.token);
      expect(sessionCtx).not.toBeNull();
      expect(sessionCtx?.user.id).toBe(loginA?.user.id);
      expect(sessionCtx?.tenant.id).toBe("tenant_comp_a");

      // Invalid token returns null
      expect(authService.validateSessionToken("invalid_tampered_token")).toBeNull();

      // Invalid password returns null
      expect(authService.authenticateUser("admin@companya.test", "IncorrectPassword!")).toBeNull();
    });

    it("authenticates via Bearer API Keys", () => {
      const authService = dbAdapter.getAuthService();
      const apiKeyCtx = authService.validateApiKey("sip_live_companya_test_secret_key_123");
      expect(apiKeyCtx).not.toBeNull();
      expect(apiKeyCtx?.tenant.id).toBe("tenant_comp_a");

      // Non-existent API key returns null
      expect(authService.validateApiKey("sip_live_nonexistent_key_999")).toBeNull();
    });
  });

  describe("Multi-Tenant Isolation & Resource Ownership", () => {
    it("enforces tenant boundaries: User B cannot view User A's scans or reports", async () => {
      const requestA: ScanRequest = {
        targetUrl: "https://companya-store.test",
        reportType: "owner",
        platformName: "Company A Store",
        businessCategory: "ecommerce",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 10,
        maxDepth: 2,
      };

      // 1. User A (tenant_comp_a) creates a scan job
      const jobA = await dbAdapter.createJob(requestA, "tenant_comp_a", "usr_companya_admin");
      expect(jobA.tenantId).toBe("tenant_comp_a");

      // 2. User A can retrieve their own job
      const retrievedByA = await dbAdapter.getJob(jobA.id, "tenant_comp_a");
      expect(retrievedByA).not.toBeNull();
      expect(retrievedByA?.id).toBe(jobA.id);

      // 3. User B (tenant_comp_b) attempting to access User A's job is denied (returns null)
      const retrievedByB = await dbAdapter.getJob(jobA.id, "tenant_comp_b");
      expect(retrievedByB).toBeNull();

      // 4. Changing job ID or guessing another ID fails
      expect(verifyTenantOwnership(jobA.tenantId, "tenant_comp_b")).toBe(false);
      expect(verifyTenantOwnership(jobA.tenantId, "tenant_comp_a")).toBe(true);
    });

    it("prevents cross-tenant remediation task modification", async () => {
      const requestA: ScanRequest = {
        targetUrl: "https://companya-store.test",
        reportType: "owner",
        platformName: "Company A",
        businessCategory: "ecommerce",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 5,
        maxDepth: 1,
      };

      const jobA = await dbAdapter.createJob(requestA, "tenant_comp_a", "usr_companya_admin");

      const mockExpertReport: any = {
        metadata: {
          reportId: `rep_exp_${jobA.id}`,
          scanId: jobA.id,
          tenantId: "tenant_comp_a",
          generatedAt: new Date().toISOString(),
          companyA: { domain: "companya-store.test" },
        },
        executiveSummary: { overallScore: { score: 80, isProvisional: false } },
        findings: [],
        urlInventory: [],
        remediationRegister: [
          {
            id: "task_a1",
            title: "Fix HSTS Header",
            workstream: "security",
            priority: "CRITICAL",
            status: "PLANNED",
            findingIds: ["SEC-002"],
            estimatedHours: 2,
          },
        ],
      };

      await dbAdapter.saveExpertReport(mockExpertReport, "tenant_comp_a");

      // Tenant A can view tasks
      const tasksA = await dbAdapter.getRemediationTasks(mockExpertReport.metadata.reportId, "tenant_comp_a");
      expect(tasksA.length).toBe(1);

      // Tenant B queries Tenant A's tasks: returns empty array (isolated)
      const tasksB = await dbAdapter.getRemediationTasks(mockExpertReport.metadata.reportId, "tenant_comp_b");
      expect(tasksB.length).toBe(0);

      // Tenant B attempts to update Tenant A's task status: denied (returns false)
      const unauthorizedUpdate = await dbAdapter.updateRemediationStatus(
        "task_a1",
        "RESOLVED",
        "tenant_comp_b",
        "Hacker B",
        "Tampered notes"
      );
      expect(unauthorizedUpdate).toBe(false);

      // Tenant A performs authorized update: succeeds
      const authorizedUpdate = await dbAdapter.updateRemediationStatus(
        "task_a1",
        "RESOLVED",
        "tenant_comp_a",
        "Alice Lead",
        "HSTS enabled with 1 year max-age"
      );
      expect(authorizedUpdate).toBe(true);

      const verifiedTasks = await dbAdapter.getRemediationTasks(mockExpertReport.metadata.reportId, "tenant_comp_a");
      expect(verifiedTasks[0].status).toBe("RESOLVED");
      expect(verifiedTasks[0].assigned_to).toBe("Alice Lead");
    });
  });

  describe("Rate Limiting & Scan Abuse Prevention", () => {
    it("enforces sliding-window rate limit and concurrent scan quotas", async () => {
      const rateLimiter = new TenantRateLimiter();

      // Check allowance for tenant_comp_a
      const allowance1 = await rateLimiter.checkScanAllowance("tenant_comp_a", dbAdapter);
      expect(allowance1.allowed).toBe(true);
      expect(allowance1.limit).toBe(20);

      // Create 2 concurrent active scans for tenant_comp_a (reaching plan limit of 2)
      const req: ScanRequest = {
        targetUrl: "https://companya.test",
        reportType: "owner",
        businessCategory: "ecommerce",
        targetMarket: "US",
        preferredLanguage: "en",
        competitors: [],
        maxPages: 10,
        maxDepth: 2,
      };

      const job1 = await dbAdapter.createJob(req, "tenant_comp_a");
      await dbAdapter.updateJob(job1.id, { status: "discovering" });

      const job2 = await dbAdapter.createJob(req, "tenant_comp_a");
      await dbAdapter.updateJob(job2.id, { status: "collecting_evidence" });

      // Third concurrent scan request should be rejected with quota exceeded
      const allowanceExceeded = await rateLimiter.checkScanAllowance("tenant_comp_a", dbAdapter);
      expect(allowanceExceeded.allowed).toBe(false);
      expect(allowanceExceeded.reason).toContain("Concurrent scan quota exceeded");

      // Once job1 completes, quota is freed
      await dbAdapter.updateJob(job1.id, { status: "completed" });
      const allowanceRestored = await rateLimiter.checkScanAllowance("tenant_comp_a", dbAdapter);
      expect(allowanceRestored.allowed).toBe(true);
    });
  });
});
