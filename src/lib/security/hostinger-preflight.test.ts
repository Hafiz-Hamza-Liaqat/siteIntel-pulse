import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  parseSemVer,
  compareSemVer,
  loadEnvironmentFile,
  runPreflight,
  KNOWN_INSECURE_SECRETS,
} from "../../../scripts/hostinger-preflight.mjs";

describe("Hostinger VPS Preflight Validator & Environment Suite", () => {
  const originalEnv = { ...process.env };
  const tempDirsToCleanup: string[] = [];

  function createTempDir(prefix: string): string {
    const dir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`);
    fs.mkdirSync(dir, { recursive: true });
    tempDirsToCleanup.push(dir);
    return dir;
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    for (const dir of tempDirsToCleanup) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      } catch {}
    }
    tempDirsToCleanup.length = 0;
  });

  describe("Semantic Version Comparison", () => {
    it("parses valid semver strings with and without leading 'v'", () => {
      expect(parseSemVer("v22.23.4")).toEqual({ major: 22, minor: 23, patch: 4 });
      expect(parseSemVer("22.5.0")).toEqual({ major: 22, minor: 5, patch: 0 });
      expect(parseSemVer("v20.10.0-rc1")).toEqual({ major: 20, minor: 10, patch: 0 });
    });

    it("returns null for malformed or empty version strings", () => {
      expect(parseSemVer("")).toBeNull();
      expect(parseSemVer("invalid")).toBeNull();
      expect(parseSemVer(null as any)).toBeNull();
    });

    it("correctly compares semver objects", () => {
      const v22_5_0 = { major: 22, minor: 5, patch: 0 };
      const v22_21_1 = { major: 22, minor: 21, patch: 1 };
      const v22_23_4 = { major: 22, minor: 23, patch: 4 };
      const v23_0_0 = { major: 23, minor: 0, patch: 0 };
      const v20_0_0 = { major: 20, minor: 0, patch: 0 };

      expect(compareSemVer(v22_5_0, v22_23_4)).toBeLessThan(0);
      expect(compareSemVer(v22_23_4, v22_5_0)).toBeGreaterThan(0);
      expect(compareSemVer(v22_23_4, v22_23_4)).toBe(0);
      expect(compareSemVer(v20_0_0, v22_5_0)).toBeLessThan(0);
      expect(compareSemVer(v23_0_0, v22_23_4)).toBeGreaterThan(0);
      expect(compareSemVer(v22_21_1, v22_23_4)).toBeLessThan(0);
    });
  });

  describe("Isolated SQLite WAL Probe & Production Database Non-Mutation", () => {
    it("NEVER creates preflight tables or alters an existing production database", async () => {
      const tempDir = createTempDir("siteintel-test-db-isolation");
      const prodDbPath = path.join(tempDir, "production.db");

      // Initialize an existing production SQLite database with application data
      const prodDb = new DatabaseSync(prodDbPath);
      prodDb.exec("PRAGMA journal_mode = WAL;");
      prodDb.exec(`
        CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT);
        INSERT INTO accounts (id, name) VALUES ('act_1', 'Original Account');
        CREATE TABLE scans (id TEXT PRIMARY KEY, score INTEGER);
        INSERT INTO scans (id, score) VALUES ('scan_1', 94);
      `);
      prodDb.close();

      // Read initial state: list of tables and row counts
      const checkDbBefore = new DatabaseSync(prodDbPath);
      const tablesBefore = checkDbBefore
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        .all() as { name: string }[];
      const accountsCountBefore = (checkDbBefore.prepare("SELECT COUNT(*) as count FROM accounts;").get() as any).count;
      checkDbBefore.close();

      expect(tablesBefore.map((t) => t.name)).toEqual(["accounts", "scans"]);
      expect(accountsCountBefore).toBe(1);

      // Run preflight with DATABASE_PATH configured to this production database
      const validSessionSecret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_valid_secret";
      const validTokenKey = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"; // 64 chars

      const result = await runPreflight({
        env: {
          NODE_ENV: "production",
          DATABASE_PATH: prodDbPath,
          SESSION_SECRET: validSessionSecret,
          PROVIDER_ENCRYPTION_KEY: validTokenKey,
          HOST: "127.0.0.1",
          TRUSTED_IP_HEADER: "x-real-ip",
        },
        skipChromium: true,
        silent: true,
      });

      expect(result.success).toBe(true);
      expect(result.failures).toHaveLength(0);

      // Verify the production database was NOT touched or injected with preflight tables
      const checkDbAfter = new DatabaseSync(prodDbPath);
      const tablesAfter = checkDbAfter
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        .all() as { name: string }[];
      const accountsCountAfter = (checkDbAfter.prepare("SELECT COUNT(*) as count FROM accounts;").get() as any).count;
      const probeTable = checkDbAfter
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_preflight_probe';")
        .get();
      checkDbAfter.close();

      expect(tablesAfter.map((t) => t.name)).toEqual(["accounts", "scans"]);
      expect(accountsCountAfter).toBe(1);
      expect(probeTable).toBeUndefined();
    });

    it("verifies write permissions in target database directory without mutating database", async () => {
      const tempDir = createTempDir("siteintel-test-dir-perms");
      const targetDbPath = path.join(tempDir, "subfolder", "data.db");

      const result = await runPreflight({
        env: {
          DATABASE_PATH: targetDbPath,
          SESSION_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_valid_secret",
          PROVIDER_ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        },
        skipChromium: true,
        silent: true,
      });

      expect(result.success).toBe(true);
      // The target directory should have been created, but data.db itself should NOT have been created by preflight
      expect(fs.existsSync(path.join(tempDir, "subfolder"))).toBe(true);
      expect(fs.existsSync(targetDbPath)).toBe(false);
    });
  });

  describe("Environment File Loading (ENV_FILE)", () => {
    it("fails closed when ENV_FILE path does not exist", async () => {
      const missingPath = path.join(os.tmpdir(), "nonexistent-env-file.env");
      const result = await runPreflight({
        envFile: missingPath,
        skipChromium: true,
        silent: true,
      });

      expect(result.success).toBe(false);
      expect(result.failures.some((f: string) => f.includes("does not exist"))).toBe(true);
    });

    it("fails closed and suppresses secret values when mandatory production secrets are missing", async () => {
      const tempDir = createTempDir("siteintel-test-missing-secrets");
      const envFilePath = path.join(tempDir, "incomplete.env");

      // Write env file missing SESSION_SECRET and PROVIDER_ENCRYPTION_KEY
      fs.writeFileSync(
        envFilePath,
        [
          "NODE_ENV=production",
          "PORT=3000",
          "HOST=127.0.0.1",
          "TRUSTED_IP_HEADER=x-real-ip",
        ].join("\n"),
        "utf-8"
      );

      const result = await runPreflight({
        envFile: envFilePath,
        skipChromium: true,
        silent: true,
      });

      expect(result.success).toBe(false);
      expect(result.failures.some((f: string) => f.includes("MANDATORY SECRET MISSING: SESSION_SECRET"))).toBe(true);
      expect(result.failures.some((f: string) => f.includes("MANDATORY SECRET MISSING: PROVIDER_ENCRYPTION_KEY"))).toBe(true);

      // Verify no leaked secrets in logs
      const combinedLogs = result.logs.join("\n");
      expect(combinedLogs).not.toContain("password");
      expect(combinedLogs).not.toContain("secret=");
    });

    it("fails closed when SESSION_SECRET is shorter than 32 characters", async () => {
      const tempDir = createTempDir("siteintel-test-short-secret");
      const envFilePath = path.join(tempDir, "short.env");

      fs.writeFileSync(
        envFilePath,
        [
          "NODE_ENV=production",
          "SESSION_SECRET=short_16_bytes!",
          "PROVIDER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        ].join("\n"),
        "utf-8"
      );

      const result = await runPreflight({
        envFile: envFilePath,
        skipChromium: true,
        silent: true,
      });

      expect(result.success).toBe(false);
      expect(result.failures.some((f: string) => f.includes("Must be >= 32 characters"))).toBe(true);
      // Ensure the actual short secret string is NOT printed in the failure
      expect(result.failures.join(" ")).not.toContain("short_16_bytes!");
    });

    it("fails closed when secrets match known insecure defaults or placeholders", async () => {
      for (const insecure of KNOWN_INSECURE_SECRETS) {
        const tempDir = createTempDir("siteintel-test-insecure-secret");
        const envFilePath = path.join(tempDir, "insecure.env");

        fs.writeFileSync(
          envFilePath,
          [
            "NODE_ENV=production",
            `SESSION_SECRET=${insecure}`,
            `PROVIDER_ENCRYPTION_KEY=${insecure}`,
          ].join("\n"),
          "utf-8"
        );

        const result = await runPreflight({
          envFile: envFilePath,
          skipChromium: true,
          silent: true,
        });

        expect(result.success).toBe(false);
        expect(
          result.failures.some((f: string) => f.includes("known insecure default") || f.includes("Must be >= 32") || f.includes("Must be exactly 64"))
        ).toBe(true);
      }
    });

    it("passes cleanly when valid production environment file is provided and suppresses secret values", async () => {
      const tempDir = createTempDir("siteintel-test-valid-env");
      const envFilePath = path.join(tempDir, "production.env");
      const secretSession = "real_production_super_secret_entropy_64_characters_minimum_string_abc_123";
      const secretTokenKey = "9f8e7d6c5b4a3928172635445566778899aabbccddeeff001122334455667788";

      fs.writeFileSync(
        envFilePath,
        [
          "NODE_ENV=production",
          "PORT=3000",
          "HOST=127.0.0.1",
          "TRUSTED_IP_HEADER=x-real-ip",
          `SESSION_SECRET=${secretSession}`,
          `PROVIDER_ENCRYPTION_KEY=${secretTokenKey}`,
          "ALLOW_STAGING_SEEDS=false",
        ].join("\n"),
        "utf-8"
      );

      const result = await runPreflight({
        envFile: envFilePath,
        skipChromium: true,
        silent: true,
      });

      expect(result.success).toBe(true);
      expect(result.failures).toHaveLength(0);

      const allLogs = result.logs.join("\n");
      // Assert secret values are NOT leaked in output logs
      expect(allLogs).not.toContain(secretSession);
      expect(allLogs).not.toContain(secretTokenKey);
      expect(allLogs).toContain("Secret value suppressed.");
      expect(allLogs).toContain("Key value suppressed.");
    });

    it("fails when ALLOW_STAGING_SEEDS=true in production mode", async () => {
      const tempDir = createTempDir("siteintel-test-seed-guard");
      const envFilePath = path.join(tempDir, "seed.env");

      fs.writeFileSync(
        envFilePath,
        [
          "NODE_ENV=production",
          "SESSION_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_valid_secret",
          "PROVIDER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          "ALLOW_STAGING_SEEDS=true",
        ].join("\n"),
        "utf-8"
      );

      const result = await runPreflight({
        envFile: envFilePath,
        skipChromium: true,
        silent: true,
      });

      expect(result.success).toBe(false);
      expect(result.failures.some((f: string) => f.includes("ALLOW_STAGING_SEEDS=true is strictly forbidden"))).toBe(true);
    });

    it("preserves normal local test execution when no ENV_FILE is specified", async () => {
      // In local non-production development without ENV_FILE, preflight runs non-strict checks
      const result = await runPreflight({
        env: {
          NODE_ENV: "test",
        },
        skipChromium: true,
        silent: true,
      });

      // Does not hard fail for missing production secrets in test mode
      expect(result.failures).toHaveLength(0);
      expect(result.success).toBe(true);
    });
  });

  describe("loadEnvironmentFile Helper", () => {
    it("returns error for empty or invalid paths", () => {
      expect(loadEnvironmentFile("")).toEqual({ success: false, error: "No environment file path provided." });
      expect(loadEnvironmentFile("/nonexistent/file.env").success).toBe(false);
    });

    it("safely reads and parses key-values from valid file", () => {
      const tempDir = createTempDir("siteintel-test-helper");
      const envPath = path.join(tempDir, "test.env");
      fs.writeFileSync(envPath, "TEST_A=hello\nTEST_B=world\n", "utf-8");

      const res = loadEnvironmentFile(envPath);
      expect(res.success).toBe(true);
      expect(res.parsed).toEqual({ TEST_A: "hello", TEST_B: "world" });
    });
  });
});
