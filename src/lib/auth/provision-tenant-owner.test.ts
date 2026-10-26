import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "@/lib/persistence/migrator";
import { AuthService } from "@/lib/auth";
import { seedInitialAccounts } from "@/lib/auth/seed";
import { verifyTenantOwnership } from "@/lib/auth/guard";
import {
  provisionTenantOwner,
  validatePasswordStrength,
  validateSlug,
  validateEmail,
  validateSessionSecret,
  checkTtyEligibility,
  promptHidden,
  loadEnvFile,
  resolveDatabasePath,
} from "../../../scripts/provision-tenant-owner.mjs";

describe("Production Tenant & Owner Account Provisioning CLI", () => {
  let tempDir: string;
  let tempDbPath: string;
  let db: DatabaseSync;
  let authService: AuthService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "siteintel-provision-test-"));
    tempDbPath = path.join(tempDir, "test-siteintel.db");

    db = new DatabaseSync(tempDbPath);
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("PRAGMA journal_mode = WAL;");
    runMigrations(db);

    authService = new AuthService(db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
    process.env = { ...originalEnv };
  });

  describe("Input Validation & Password Policies", () => {
    it("validates password strength rules rigorously", () => {
      expect(validatePasswordStrength("short").valid).toBe(false);
      expect(validatePasswordStrength("alllowercase123!").valid).toBe(false);
      expect(validatePasswordStrength("ALLUPPERCASE123!").valid).toBe(false);
      expect(validatePasswordStrength("NoDigitsHereAtAll!").valid).toBe(false);
      expect(validatePasswordStrength("NoSymbols12345678").valid).toBe(false);
      expect(validatePasswordStrength(" WhitespaceAtEnds123! ").valid).toBe(false);
      expect(validatePasswordStrength("Valid_Passw0rd_2026!").valid).toBe(true);
    });

    it("validates tenant slug syntax and length", () => {
      expect(validateSlug("").valid).toBe(false);
      expect(validateSlug("ab").valid).toBe(false); // too short
      expect(validateSlug("-leading-hyphen").valid).toBe(false);
      expect(validateSlug("trailing-hyphen-").valid).toBe(false);
      expect(validateSlug("UPPERCASE_NOT_ALLOWED").valid).toBe(false);
      expect(validateSlug("valid-tenant-slug-2026").valid).toBe(true);
      expect(validateSlug("acme-corp").slug).toBe("acme-corp");
    });

    it("validates email formatting", () => {
      expect(validateEmail("notanemail").valid).toBe(false);
      expect(validateEmail("missing@domain").valid).toBe(false);
      expect(validateEmail("valid.owner@company.com").valid).toBe(true);
      expect(validateEmail("UPPER@DOMAIN.COM").email).toBe("upper@domain.com");
    });
  });

  describe("Core Provisioning Transaction & Authenticity", () => {
    it("atomically provisions a tenant and owner user", () => {
      const result = provisionTenantOwner({
        db,
        tenantName: "Acme Enterprises Inc.",
        tenantSlug: "acme-enterprises",
        ownerName: "Alice Admin",
        ownerEmail: "alice@acme.com",
        password: "SuperSecret_Admin_2026!",
        confirmPassword: "SuperSecret_Admin_2026!",
      });

      expect(result.tenantId).toMatch(/^tenant_/);
      expect(result.userId).toMatch(/^usr_acme-enterprises_/);
      expect(result.tenantName).toBe("Acme Enterprises Inc.");
      expect(result.tenantSlug).toBe("acme-enterprises");
      expect(result.ownerEmail).toBe("alice@acme.com");
      expect(result.role).toBe("owner");

      // Verify records are present in the actual database tables
      const tenantRow = db.prepare("SELECT * FROM tenants WHERE id = ?").get(result.tenantId) as any;
      expect(tenantRow).toBeDefined();
      expect(tenantRow.slug).toBe("acme-enterprises");
      expect(tenantRow.plan).toBe("pro");

      const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(result.userId) as any;
      expect(userRow).toBeDefined();
      expect(userRow.email).toBe("alice@acme.com");
      expect(userRow.role).toBe("owner");
      expect(userRow.password_hash).toMatch(/^pbkdf2\$sha512\$220000\$/);
    });

    it("allows the provisioned owner to authenticate via the existing AuthService login flow", () => {
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");

      provisionTenantOwner({
        db,
        tenantName: "Staging Test Corp",
        tenantSlug: "staging-corp",
        ownerName: "Bob Specialist",
        ownerEmail: "bob@stagingcorp.com",
        password: "StagingPassword_2026!#",
        confirmPassword: "StagingPassword_2026!#",
      });

      // Attempt authentication with wrong password
      const failedAuth = authService.authenticateUser("bob@stagingcorp.com", "WrongPassword123!");
      expect(failedAuth).toBeNull();

      // Attempt authentication with correct password
      const auth = authService.authenticateUser("bob@stagingcorp.com", "StagingPassword_2026!#");
      expect(auth).not.toBeNull();
      expect(auth?.user.email).toBe("bob@stagingcorp.com");
      expect(auth?.user.role).toBe("owner");
      expect(auth?.tenant.slug).toBe("staging-corp");
      expect(auth?.token).toBeDefined();
      expect(auth?.signedToken).toContain(".");
    });

    it("rejects duplicate tenant slugs and rolls back cleanly", () => {
      provisionTenantOwner({
        db,
        tenantName: "First Tenant",
        tenantSlug: "duplicate-slug",
        ownerName: "First Owner",
        ownerEmail: "first@example.com",
        password: "ValidPassword_2026!#",
      });

      expect(() => {
        provisionTenantOwner({
          db,
          tenantName: "Second Tenant",
          tenantSlug: "duplicate-slug",
          ownerName: "Second Owner",
          ownerEmail: "second@example.com",
          password: "ValidPassword_2026!#",
        });
      }).toThrowError(/Tenant slug 'duplicate-slug' is already in use/);

      // Verify second user was not created
      const secondUser = db.prepare("SELECT * FROM users WHERE email = ?").get("second@example.com");
      expect(secondUser).toBeUndefined();
    });

    it("rejects duplicate owner emails and rolls back cleanly", () => {
      provisionTenantOwner({
        db,
        tenantName: "Tenant Alpha",
        tenantSlug: "tenant-alpha",
        ownerName: "Owner One",
        ownerEmail: "shared@example.com",
        password: "ValidPassword_2026!#",
      });

      expect(() => {
        provisionTenantOwner({
          db,
          tenantName: "Tenant Beta",
          tenantSlug: "tenant-beta",
          ownerName: "Owner Two",
          ownerEmail: "shared@example.com",
          password: "ValidPassword_2026!#",
        });
      }).toThrowError(/User email 'shared@example.com' is already registered/);

      // Verify second tenant was not created
      const secondTenant = db.prepare("SELECT * FROM tenants WHERE slug = ?").get("tenant-beta");
      expect(secondTenant).toBeUndefined();
    });

    it("rejects mismatched confirmPassword", () => {
      expect(() => {
        provisionTenantOwner({
          db,
          tenantName: "Mismatch Corp",
          tenantSlug: "mismatch-corp",
          ownerName: "Mismatch Owner",
          ownerEmail: "mismatch@example.com",
          password: "ValidPassword_2026!#",
          confirmPassword: "DifferentPassword_2026!#",
        });
      }).toThrowError(/Passwords do not match/);
    });
  });

  describe("Multi-Tenant Isolation Between Independently Provisioned Tenants", () => {
    it("proves complete multi-tenant boundary isolation between two independently provisioned tenants", () => {
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");

      const tenantA = provisionTenantOwner({
        db,
        tenantName: "Company A Website Owner",
        tenantSlug: "company-a",
        ownerName: "Owner A",
        ownerEmail: "owner@company-a.com",
        password: "CompanyA_Password_2026!",
      });

      const tenantB = provisionTenantOwner({
        db,
        tenantName: "Company B Technical Advisory",
        tenantSlug: "company-b",
        ownerName: "Owner B",
        ownerEmail: "owner@company-b.com",
        password: "CompanyB_Password_2026!",
      });

      expect(tenantA.tenantId).not.toBe(tenantB.tenantId);
      expect(tenantA.userId).not.toBe(tenantB.userId);

      // Tenant ownership check rejects cross-tenant access
      expect(verifyTenantOwnership(tenantA.tenantId, tenantA.tenantId)).toBe(true);
      expect(verifyTenantOwnership(tenantA.tenantId, tenantB.tenantId)).toBe(false);
      expect(verifyTenantOwnership(tenantB.tenantId, tenantA.tenantId)).toBe(false);
    });

    it("confirms guest-session provisioning and production seed lockout remain intact", () => {
      // 1. Production seed lockout still blocks demo accounts
      (process.env as any).NODE_ENV = "production";
      (process.env as any).ALLOW_STAGING_SEEDS = "true";
      const seedResult = seedInitialAccounts(db);
      expect(seedResult.seeded).toBe(false);
      expect(seedResult.message).toContain("cannot be seeded when NODE_ENV=production");

      // 2. Public guest session provisioning still functions independently
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
      const guest = authService.createGuestSession("198.51.100.99");
      expect(guest.tenant.id).toMatch(/^tenant_guest_/);
      expect(guest.user.role).toBe("viewer");
    });
  });

  describe("Interactive TTY & Hidden Password Entry Hardening", () => {
    it("strictly requires both stdin and stdout to be interactive TTYs", () => {
      // 1. Missing stdin TTY
      const noStdinTty = checkTtyEligibility({ isTTY: false } as any, { isTTY: true } as any);
      expect(noStdinTty.eligible).toBe(false);
      expect(noStdinTty.error).toContain("stdin isTTY");

      // 2. Missing stdout TTY
      const noStdoutTty = checkTtyEligibility({ isTTY: true } as any, { isTTY: false } as any);
      expect(noStdoutTty.eligible).toBe(false);
      expect(noStdoutTty.error).toContain("stdout isTTY");

      // 3. Neither is TTY
      const neitherTty = checkTtyEligibility({ isTTY: false } as any, { isTTY: false } as any);
      expect(neitherTty.eligible).toBe(false);

      // 4. Undefined / null streams
      expect(checkTtyEligibility(null as any, null as any).eligible).toBe(false);

      // 5. Normal interactive eligibility
      const bothTty = checkTtyEligibility({ isTTY: true } as any, { isTTY: true } as any);
      expect(bothTty.eligible).toBe(true);
      expect(bothTty.error).toBeUndefined();
    });

    it("ensures promptHidden throws immediately without TTY and never reads password", async () => {
      await expect(
        promptHidden("Password: ", { isTTY: false } as any, { isTTY: true } as any)
      ).rejects.toThrowError(/Interactive terminal input/);

      await expect(
        promptHidden("Password: ", { isTTY: true } as any, { isTTY: false } as any)
      ).rejects.toThrowError(/Interactive terminal output/);
    });

    it("verifies that passwords are never included in error messages, results, or logs", () => {
      const sensitivePassword = "SensitiveSecretPassword_2026!#";

      // Error on password mismatch must not disclose password
      try {
        provisionTenantOwner({
          db,
          tenantName: "Safe Tenant",
          tenantSlug: "safe-tenant",
          ownerName: "Safe Owner",
          ownerEmail: "safe@example.com",
          password: sensitivePassword,
          confirmPassword: "WrongConfirmationPassword_2026!#",
        });
      } catch (err: any) {
        expect(err.message).not.toContain(sensitivePassword);
        expect(err.message).not.toContain("WrongConfirmationPassword");
      }

      // Successful result object must not include password or hash
      const result = provisionTenantOwner({
        db,
        tenantName: "Secure Corp",
        tenantSlug: "secure-corp",
        ownerName: "Secure Owner",
        ownerEmail: "owner@securecorp.com",
        password: sensitivePassword,
        confirmPassword: sensitivePassword,
      });

      expect((result as any).password).toBeUndefined();
      expect((result as any).hash).toBeUndefined();
      expect((result as any).salt).toBeUndefined();
    });
  });

  describe("Session Secret Validation & Known Test Fixture Rejection", () => {
    it("rejects the known predictable 64-hex public CI test fixture", () => {
      const ciFixture = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const validation = validateSessionSecret(ciFixture);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("known insecure placeholder or default test fixture");
    });

    it("rejects documentation bracketed placeholders and staging defaults", () => {
      expect(validateSessionSecret("<generate-unique-32-byte-hex-secret-via-openssl-rand-hex-32>").valid).toBe(false);
      expect(validateSessionSecret("siteintel_staging_session_secret_change_in_production_32bytes_min").valid).toBe(false);
      expect(validateSessionSecret("staging_session_secret_min_32_chars_random_string_here").valid).toBe(false);
    });

    it("rejects invalid lengths and non-hexadecimal characters", () => {
      expect(validateSessionSecret("").valid).toBe(false);
      expect(validateSessionSecret("abcdef012345").valid).toBe(false); // too short
      expect(validateSessionSecret("g".repeat(64)).valid).toBe(false); // non-hex
    });

    it("accepts a cryptographically strong 64-character hexadecimal random secret", () => {
      const validSecret = crypto.randomBytes(32).toString("hex");
      const validation = validateSessionSecret(validSecret);
      expect(validation.valid).toBe(true);
      expect(validation.secret).toBe(validSecret);
    });
  });

  describe("Safe Environment & Configuration Loading", () => {
    it("safely loads key=value pairs from env file without overriding existing process.env", () => {
      const mockEnvPath = path.join(tempDir, "mock.env");
      fs.writeFileSync(
        mockEnvPath,
        `
# Test configuration
SESSION_SECRET=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd
NEW_CONFIG_VAR=persisted_value
ALREADY_SET_VAR=from_file_should_be_ignored
`
      );

      process.env.ALREADY_SET_VAR = "existing_host_value";

      const loaded = loadEnvFile(mockEnvPath);
      expect(loaded).toBe(true);
      expect(process.env.NEW_CONFIG_VAR).toBe("persisted_value");
      expect(process.env.ALREADY_SET_VAR).toBe("existing_host_value"); // Preserved
    });

    it("resolves database path from explicit DATABASE_PATH or defaults safely", () => {
      process.env.DATABASE_PATH = tempDbPath;
      expect(resolveDatabasePath()).toBe(path.resolve(tempDbPath));
    });
  });

  describe("CLI Environment & Safeguard Enforcement", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts", "provision-tenant-owner.mjs");

    it("refuses to proceed if NODE_ENV is not production", () => {
      expect(() => {
        execFileSync(process.execPath, [scriptPath], {
          env: {
            ...process.env,
            NODE_ENV: "development",
            SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
            DATABASE_PATH: tempDbPath,
          },
          stdio: "pipe",
        });
      }).toThrow();
    });

    it("refuses to proceed if SESSION_SECRET is missing or invalid in production", () => {
      expect(() => {
        execFileSync(process.execPath, [scriptPath], {
          env: {
            ...process.env,
            NODE_ENV: "production",
            SESSION_SECRET: "invalid_short_secret",
            DATABASE_PATH: tempDbPath,
          },
          stdio: "pipe",
        });
      }).toThrow();
    });

    it("refuses to proceed if non-interactive (no TTY attached)", () => {
      expect(() => {
        execFileSync(process.execPath, [scriptPath], {
          env: {
            ...process.env,
            NODE_ENV: "production",
            SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
            DATABASE_PATH: tempDbPath,
          },
          stdio: "pipe", // non-interactive stream
        });
      }).toThrow();
    });

    it("refuses to proceed if database file does not exist", () => {
      const nonExistentDb = path.join(tempDir, "does-not-exist.db");
      expect(() => {
        execFileSync(process.execPath, [scriptPath], {
          env: {
            ...process.env,
            NODE_ENV: "production",
            SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
            DATABASE_PATH: nonExistentDb,
          },
          stdio: "pipe",
        });
      }).toThrow();
    });
  });
});
