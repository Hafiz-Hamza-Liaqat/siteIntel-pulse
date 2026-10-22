import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { AuthService } from "./index";
import { verifyTenantOwnership } from "./guard";
import { TenantRateLimiter } from "../security/rate-limiter";
import { ScanRequest } from "@/types";

describe("Public Guest Sessions & Tenant-Level Isolation", () => {
  const testDbPath = path.resolve(process.cwd(), "data", `test_guest_${Date.now()}.db`);
  let db: SqliteScanDatabaseAdapter;
  let authService: AuthService;

  beforeEach(() => {
    db = new SqliteScanDatabaseAdapter(testDbPath);
    authService = db.getAuthService();
  });

  afterEach(() => {
    db.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}
  });

  it("issues an unpredictable guest tenant, user, and valid session token", () => {
    const guest1 = authService.createGuestSession("192.168.1.50");

    expect(guest1.tenant.id).toMatch(/^tenant_guest_\d+_[a-f0-9]{16}$/);
    expect(guest1.user.id).toMatch(/^user_guest_\d+_[a-f0-9]{16}$/);
    expect(guest1.tenant.plan).toBe("guest");
    expect(guest1.tenant.maxConcurrentScans).toBe(1);
    expect(guest1.tenant.scansPerHourQuota).toBe(5);
    expect(guest1.user.role).toBe("viewer");
    expect(guest1.token).toBeDefined();
    expect(guest1.signedToken).toContain(".");

    // Validate the signed cookie value
    const authContext = authService.validateSessionToken(guest1.signedToken);
    expect(authContext).not.toBeNull();
    expect(authContext?.tenant.id).toBe(guest1.tenant.id);
    expect(authContext?.user.id).toBe(guest1.user.id);
    expect(authContext?.tenant.plan).toBe("guest");
  });

  it("enforces complete tenant isolation between two separate guest sessions", async () => {
    const guestA = authService.createGuestSession("10.0.0.1");
    const guestB = authService.createGuestSession("10.0.0.2");

    expect(guestA.tenant.id).not.toBe(guestB.tenant.id);
    expect(guestA.user.id).not.toBe(guestB.user.id);

    // Guest A creates a scan job
    const reqA: ScanRequest = {
      targetUrl: "https://guest-a-site.com",
      reportType: "owner",
      platformName: "Guest A Store",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 5,
      maxDepth: 1,
    };

    const jobA = await db.createJob(reqA, guestA.tenant.id, guestA.user.id);
    expect(jobA.tenantId).toBe(guestA.tenant.id);

    // 1. Guest A can access their own job
    const loadedByA = await db.getJob(jobA.id, guestA.tenant.id);
    expect(loadedByA).not.toBeNull();
    expect(loadedByA?.id).toBe(jobA.id);

    // 2. Guest B CANNOT access Guest A's job (tenant isolation returns null)
    const loadedByB = await db.getJob(jobA.id, guestB.tenant.id);
    expect(loadedByB).toBeNull();

    // 3. Ownership verification check
    expect(verifyTenantOwnership(jobA.tenantId, guestA.tenant.id)).toBe(true);
    expect(verifyTenantOwnership(jobA.tenantId, guestB.tenant.id)).toBe(false);

    // 4. Guest A saves an owner report
    const ownerReportA: any = {
      reportId: `rep_guest_a_${jobA.id}`,
      reportVersion: "1.0.0",
      scanId: jobA.id,
      tenantId: guestA.tenant.id,
      generatedAt: new Date().toISOString(),
      companyIdentity: {
        name: "Guest A",
        domain: "guest-a-site.com",
        targetUrl: "https://guest-a-site.com",
        businessCategory: "ecommerce",
        targetMarket: "US",
        preferredLanguage: "en",
      },
      executiveSnapshot: {
        overallScore: { score: 80, ratingBand: "Generally healthy" },
        categoryScores: [],
        coverage: { discoveredPages: 1, testedPages: 1, coveragePercentage: 80 },
        topOpportunities: [],
        testedPageCount: 1,
      },
      results: [],
    };

    await db.saveReport(ownerReportA, guestA.tenant.id);

    // 5. Guest A can retrieve the report; Guest B CANNOT
    const reportLoadedByA = await db.getReport(ownerReportA.reportId, guestA.tenant.id);
    expect(reportLoadedByA).not.toBeNull();

    const reportLoadedByB = await db.getReport(ownerReportA.reportId, guestB.tenant.id);
    expect(reportLoadedByB).toBeNull();
  });

  it("enforces scan quota allowance on guest sessions", async () => {
    const rateLimiter = new TenantRateLimiter();
    const guest = authService.createGuestSession("192.168.1.100");

    // Allowance check for new guest
    const allowance = await rateLimiter.checkScanAllowance(guest.tenant.id, db);
    expect(allowance.allowed).toBe(true);
    expect(allowance.limit).toBe(5); // Guest quota is 5 scans/hour
    expect(allowance.remaining).toBe(4); // 5 minus 1 used during check

    // Active scan limits: guest has maxConcurrentScans = 1
    const req: ScanRequest = {
      targetUrl: "https://quota-test.com",
      reportType: "owner",
      platformName: "Quota Test",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 2,
      maxDepth: 1,
    };

    const job = await db.createJob(req, guest.tenant.id, guest.user.id);
    await db.updateJob(job.id, { status: "discovering" }, guest.tenant.id);

    // Second active scan must be rejected due to concurrent scan limit of 1
    const secondAllowance = await rateLimiter.checkScanAllowance(guest.tenant.id, db);
    expect(secondAllowance.allowed).toBe(false);
    expect(secondAllowance.reason).toContain("Concurrent scan quota exceeded");
  });
});
