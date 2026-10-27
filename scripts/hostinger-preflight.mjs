#!/usr/bin/env node
/**
 * SiteIntel Pulse — Hostinger VPS Preflight Environment & Runtime Validator
 *
 * Validates:
 * 1. Node.js runtime version & recommended security patch release
 * 2. SQLite WAL mode & ACID capability on an isolated temporary database
 * 3. Target database directory existence and write permissions (WITHOUT probing/mutating live database)
 * 4. Playwright Headless Chromium binary & PDF generation pipeline
 * 5. Production environment file loading (ENV_FILE) and mandatory security secrets
 * 6. Ingress host binding & trusted proxy header settings
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import dotenv from "dotenv";
import { chromium } from "@playwright/test";

export const KNOWN_INSECURE_SECRETS = new Set([
  "<generate-unique-32-byte-hex-secret-via-openssl-rand-hex-32>",
  "siteintel_staging_session_secret_change_in_production_32bytes_min",
  "staging_session_secret_min_32_chars_random_string_here",
  "secret",
  "changeme",
  "password",
  "12345678901234567890123456789012",
  "session_secret",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
]);

export function parseSemVer(verString) {
  if (!verString) return null;
  const match = verString.replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

export function compareSemVer(v1, v2) {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

/**
 * Safely loads and parses an environment file without printing secret values.
 * Returns { success, parsed, error }.
 */
export function loadEnvironmentFile(filePath) {
  if (!filePath) {
    return { success: false, error: "No environment file path provided." };
  }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return { success: false, error: `Environment file "${resolved}" specified by ENV_FILE does not exist.` };
  }

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      return { success: false, error: `Path "${resolved}" is not a regular file.` };
    }
    const content = fs.readFileSync(resolved, "utf-8");
    const parsed = dotenv.parse(content);
    return { success: true, parsed, resolvedPath: resolved };
  } catch (err) {
    return { success: false, error: `Failed to read or parse environment file "${resolved}": ${err.message}` };
  }
}

/**
 * Executes the Hostinger VPS preflight validation suite.
 * @param {object} [options]
 * @param {string} [options.envFile] - Explicit path to environment file (defaults to process.env.ENV_FILE)
 * @param {object} [options.env] - Environment dictionary (defaults to process.env)
 * @param {boolean} [options.silent] - Suppress console logging
 * @param {boolean} [options.skipChromium] - Skip headless Chromium check (useful for fast unit tests)
 * @returns {Promise<{ success: boolean, failures: string[], warnings: string[], logs: string[] }>}
 */
export async function runPreflight(options = {}) {
  const failures = [];
  const warnings = [];
  const logs = [];

  function log(msg) {
    logs.push(msg);
    if (!options.silent) console.log(msg);
  }

  function pass(msg) {
    log(`  [PASS] ${msg}`);
  }

  function warn(msg) {
    log(`  [WARN] ${msg}`);
    warnings.push(msg);
  }

  function fail(msg) {
    log(`  [FAIL] ${msg}`);
    failures.push(msg);
  }

  log("=================================================================");
  log("  SiteIntel Pulse — Hostinger VPS Production Preflight Check     ");
  log("=================================================================\n");

  // 1. Environment File Loading
  const envFilePath = options.envFile !== undefined ? options.envFile : process.env.ENV_FILE;
  let env;
  let hasExplicitEnvFile = false;

  if (envFilePath) {
    log(`--> Loading Environment File from ENV_FILE: ${envFilePath}...`);
    const loadResult = loadEnvironmentFile(envFilePath);
    if (!loadResult.success) {
      fail(loadResult.error);
      env = { ...(options.env || {}) };
    } else {
      hasExplicitEnvFile = true;
      pass(`Successfully loaded environment file: ${loadResult.resolvedPath}`);
      // When ENV_FILE is specified, validate strictly against the loaded file's settings
      env = {
        ...loadResult.parsed,
        ...(options.env || {}),
      };
    }
  } else {
    env = { ...(options.env || process.env) };
  }

  const isProduction = env.NODE_ENV === "production" || hasExplicitEnvFile;

  // 2. Node.js Version Check
  const nodeVer = process.version;
  const parsedNode = parseSemVer(nodeVer);
  log(`\n--> Checking Node.js Runtime (Detected: ${nodeVer})...`);

  const minRequired = { major: 22, minor: 5, patch: 0 };
  const recommendedPatch = { major: 22, minor: 23, patch: 4 };

  if (!parsedNode) {
    fail(`Could not parse current Node.js version string: ${nodeVer}`);
  } else if (compareSemVer(parsedNode, minRequired) < 0) {
    fail(`Node.js version ${nodeVer} is unsupported. Node.js >= 22.5.0 is required for native node:sqlite.`);
  } else {
    pass(`Node.js runtime meets >= 22.5.0 requirement (${nodeVer}).`);
    if (parsedNode.major === 22 && compareSemVer(parsedNode, recommendedPatch) < 0) {
      warn(`Running Node.js ${nodeVer}. Documented production security patch is Node.js >= v22.23.4 (contains Brotli & TLS fixes).`);
    } else {
      pass(`Node.js patch release verified (${nodeVer}).`);
    }
  }

  // 3. Isolated SQLite WAL Capability Check (NEVER probe the live database!)
  log("\n--> Checking Native SQLite & WAL Mode on Isolated Temporary Database...");
  const tempDbId = `siteintel-preflight-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const tempDbPath = path.join(os.tmpdir(), `${tempDbId}.db`);
  const walFile = `${tempDbPath}-wal`;
  const shmFile = `${tempDbPath}-shm`;

  try {
    const testDb = new DatabaseSync(tempDbPath);
    testDb.exec("PRAGMA journal_mode = WAL;");
    const journalMode = testDb.prepare("PRAGMA journal_mode;").get();

    if (journalMode?.journal_mode?.toLowerCase() === "wal") {
      pass("Isolated SQLite DatabaseSync initialized with WAL mode.");
    } else {
      fail(`SQLite failed to switch to WAL mode (reported: ${journalMode?.journal_mode})`);
    }

    testDb.exec(`
      CREATE TABLE IF NOT EXISTS _preflight_probe (
        id TEXT PRIMARY KEY,
        ts INTEGER NOT NULL
      );
      INSERT INTO _preflight_probe (id, ts) VALUES ('probe', unixepoch());
    `);

    const record = testDb.prepare("SELECT ts FROM _preflight_probe WHERE id = 'probe';").get();
    if (record?.ts) {
      pass("SQLite read/write ACID transaction successfully verified on temporary database.");
    } else {
      fail("Failed to verify SQLite write transaction.");
    }

    testDb.close();
  } catch (err) {
    fail(`Isolated SQLite verification failed: ${err.message}`);
  } finally {
    // Reliably cleanup all temporary probe files
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
    } catch {}
  }

  // 4. Target Production Database Directory Permissions Check (Without modifying database file)
  log("\n--> Checking Target Production Database Directory Permissions...");
  const configuredDbPath = env.DATABASE_PATH || path.join(process.cwd(), "data", "siteintel.db");
  const targetDir = path.dirname(path.resolve(configuredDbPath));

  try {
    if (!fs.existsSync(targetDir)) {
      // Attempt recursive directory creation if it doesn't exist
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Verify directory write permission by creating and immediately deleting a lightweight probe file
    const probeFile = path.join(targetDir, `.siteintel-probe-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`);
    fs.writeFileSync(probeFile, "ok", "utf-8");
    fs.unlinkSync(probeFile);

    pass(`Target database directory exists and is writable: ${targetDir}`);
    pass(`Configured production database path: ${configuredDbPath} (remains unmutated by preflight)`);
  } catch (err) {
    fail(`Target database directory "${targetDir}" is not writable: ${err.message}`);
  }

  // 5. Playwright Headless Chromium Binary Check
  if (!options.skipChromium) {
    log("\n--> Checking Headless Chromium (Playwright) Binary & PDF Rendering Pipeline...");
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
      const page = await browser.newPage();
      await page.setContent("<html><body><h1>Hostinger Preflight Check</h1></body></html>");
      const pdfBuffer = await page.pdf({ format: "A4" });
      await browser.close();

      if (pdfBuffer && pdfBuffer.length > 1000 && pdfBuffer.toString("utf-8", 0, 5) === "%PDF-") {
        pass(`Headless Chromium successfully generated A4 PDF binary (${pdfBuffer.length} bytes, %PDF- header verified).`);
      } else {
        fail("Chromium launched but failed to generate a valid PDF binary.");
      }
    } catch (err) {
      fail(`Headless Chromium launch failed: ${err.message}. Ensure Ubuntu 24.04 dependencies are installed (run: npx playwright install-deps chromium).`);
    }
  } else {
    log("\n--> Skipping Headless Chromium check (requested by options).");
  }

  // 6. Security Secrets & Environment Configuration Check
  log("\n--> Checking Environment Security & Production Secrets...");
  log(`    Effective NODE_ENV: ${env.NODE_ENV || "development"}`);

  // SESSION_SECRET Check
  const sessionSecret = env.SESSION_SECRET?.trim();
  if (!sessionSecret) {
    if (isProduction) {
      fail("MANDATORY SECRET MISSING: SESSION_SECRET must be configured (generate with: openssl rand -hex 32).");
    } else {
      warn("SESSION_SECRET is not configured in local development/test mode.");
    }
  } else if (KNOWN_INSECURE_SECRETS.has(sessionSecret)) {
    fail("SESSION_SECRET matches a known insecure default or test fixture.");
  } else if (sessionSecret.length < 32) {
    fail(`SESSION_SECRET length (${sessionSecret.length} chars) is insecure. Must be >= 32 characters.`);
  } else {
    pass(`SESSION_SECRET configured with sufficient entropy (${sessionSecret.length} chars). Secret value suppressed.`);
  }

  // PROVIDER_ENCRYPTION_KEY Check
  const providerKey = env.PROVIDER_ENCRYPTION_KEY?.trim();
  if (!providerKey) {
    if (isProduction) {
      fail("MANDATORY SECRET MISSING: PROVIDER_ENCRYPTION_KEY is required for encrypting OAuth tokens at rest (generate 32-byte hex with: openssl rand -hex 32).");
    } else {
      pass("PROVIDER_ENCRYPTION_KEY optional in development/test mode.");
    }
  } else if (!/^[0-9a-fA-F]{64}$/.test(providerKey)) {
    fail(`PROVIDER_ENCRYPTION_KEY is invalid (length ${providerKey.length}). Must be exactly 64 hexadecimal characters (32 bytes).`);
  } else if (KNOWN_INSECURE_SECRETS.has(providerKey)) {
    fail("PROVIDER_ENCRYPTION_KEY matches a known insecure default or test fixture.");
  } else {
    pass("PROVIDER_ENCRYPTION_KEY verified as valid 32-byte hexadecimal key. Key value suppressed.");
  }

  // Staging Seed Guard Check
  if (env.NODE_ENV === "production" && env.ALLOW_STAGING_SEEDS === "true") {
    fail("ALLOW_STAGING_SEEDS=true is strictly forbidden when NODE_ENV=production.");
  } else {
    pass("Demonstration account seed lockout verified.");
  }

  // 7. Ingress & Trusted Proxy Settings Check
  log("\n--> Checking Ingress & Trusted Proxy Settings...");
  const host = env.HOST || "127.0.0.1";
  if (host === "127.0.0.1" || host === "localhost") {
    pass(`Backend listening host is set to loopback (${host}) for strict Nginx reverse-proxy isolation.`);
  } else {
    warn(`HOST is set to ${host}. For production security on Hostinger VPS, bind strictly to 127.0.0.1 behind Nginx.`);
  }

  const trustedIpHeader = env.TRUSTED_IP_HEADER || "x-real-ip";
  pass(`Trusted proxy IP header configured as: '${trustedIpHeader}'.`);

  log("\n=================================================================");
  const success = failures.length === 0;
  if (success) {
    log(`  PREFLIGHT RESULT: ALL CHECKS PASSED (${warnings.length} warning(s))`);
    log("  Environment is ready for Hostinger VPS execution.");
  } else {
    log(`  PREFLIGHT RESULT: ${failures.length} CHECK(S) FAILED (${warnings.length} warning(s))`);
    log("  Please resolve the errors above before launching on Hostinger VPS.");
  }
  log("=================================================================\n");

  return { success, failures, warnings, logs };
}

// Execute directly if run as a CLI script
const isMainModule = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename || "") ||
  process.argv[1].endsWith("hostinger-preflight.mjs")
);

if (isMainModule) {
  runPreflight()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("FATAL ERROR during preflight execution:", err);
      process.exit(1);
    });
}
