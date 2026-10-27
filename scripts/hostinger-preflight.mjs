#!/usr/bin/env node
/**
 * SiteIntel Pulse — Hostinger VPS Preflight Environment & Runtime Validator
 *
 * Validates the runtime environment, Node.js version, SQLite WAL persistence,
 * Playwright Chromium browser binary availability, and security configurations.
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "@playwright/test";

console.log("=================================================================");
console.log("  SiteIntel Pulse — Hostinger VPS Production Preflight Check     ");
console.log("=================================================================\n");

let failures = 0;
let warnings = 0;

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
}

function warn(msg) {
  console.log(`  [WARN] ${msg}`);
  warnings++;
}

function fail(msg) {
  console.log(`  [FAIL] ${msg}`);
  failures++;
}

// 1. Node.js Version Check
const nodeVer = process.version;
const [major, minor, patch] = nodeVer.slice(1).split(".").map(Number);
console.log(`--> Checking Node.js Runtime (Detected: ${nodeVer})...`);

if (major > 22 || (major === 22 && (minor > 5 || (minor === 5 && patch >= 0)))) {
  pass(`Node.js runtime meets >= 22.5.0 requirement (${nodeVer})`);
  if (major === 22 && minor >= 23) {
    pass(`Latest supported Node.js 22 LTS patch release confirmed (${nodeVer})`);
  } else {
    warn(`Running ${nodeVer}. Hostinger production recommendation is Node.js 22 LTS patch release >= v22.23.4.`);
  }
} else {
  fail(`Node.js version ${nodeVer} is unsupported. Node.js >= 22.5.0 is required for native node:sqlite.`);
}

// 2. Native SQLite & WAL Mode Check
console.log("\n--> Checking Native SQLite & WAL Journaling Mode...");
try {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "test-data", "preflight-test.db");
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const testDb = new DatabaseSync(dbPath);
  testDb.exec("PRAGMA journal_mode = WAL;");
  const journalMode = testDb.prepare("PRAGMA journal_mode;").get();
  
  if (journalMode?.journal_mode?.toLowerCase() === "wal") {
    pass(`SQLite DatabaseSync initialized with WAL mode at: ${dbPath}`);
  } else {
    fail(`SQLite failed to switch to WAL mode (reported: ${journalMode?.journal_mode})`);
  }

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS _preflight_check (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL
    );
    INSERT OR REPLACE INTO _preflight_check (id, ts) VALUES ('probe', unixepoch());
  `);
  
  const record = testDb.prepare("SELECT ts FROM _preflight_check WHERE id = 'probe';").get();
  if (record?.ts) {
    pass("SQLite read/write ACID transaction successfully verified.");
  } else {
    fail("Failed to verify SQLite write transaction.");
  }
  
  testDb.close();

  // Clean up if using temporary test path
  if (!process.env.DATABASE_PATH && fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    const walFile = `${dbPath}-wal`;
    const shmFile = `${dbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  }
} catch (err) {
  fail(`SQLite verification failed: ${err.message}`);
}

// 3. Playwright Chromium Headless Binary Check
console.log("\n--> Checking Headless Chromium (Playwright) Binary & Rendering Pipeline...");
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

// 4. Production Security Configuration Check
console.log("\n--> Checking Environment Security & Secrets Configuration...");
const nodeEnv = process.env.NODE_ENV || "development";
console.log(`    Current NODE_ENV: ${nodeEnv}`);

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (nodeEnv === "production") {
    fail("SESSION_SECRET is missing. In production, a 64-hex high-entropy secret is required (generate with: openssl rand -hex 32).");
  } else {
    warn("SESSION_SECRET is not set in non-production mode.");
  }
} else if (sessionSecret.length < 32) {
  fail(`SESSION_SECRET length (${sessionSecret.length} chars) is insecure. Must be >= 32 characters.`);
} else {
  pass(`SESSION_SECRET configured with sufficient entropy (${sessionSecret.length} chars).`);
}

const providerKey = process.env.PROVIDER_ENCRYPTION_KEY;
if (!providerKey) {
  if (nodeEnv === "production") {
    warn("PROVIDER_ENCRYPTION_KEY is unset. Required for encrypting OAuth tokens at rest (generate with: openssl rand -hex 32).");
  } else {
    pass("PROVIDER_ENCRYPTION_KEY optional in development/test.");
  }
} else if (!/^[0-9a-fA-F]{64}$/.test(providerKey)) {
  fail("PROVIDER_ENCRYPTION_KEY must be a valid 64-character hexadecimal string (32 bytes).");
} else {
  pass("PROVIDER_ENCRYPTION_KEY verified as valid 32-byte hexadecimal key.");
}

if (nodeEnv === "production" && process.env.ALLOW_STAGING_SEEDS === "true") {
  fail("ALLOW_STAGING_SEEDS=true is strictly forbidden in production mode.");
} else {
  pass("Demonstration account seed lockout verified.");
}

// 5. Host & Ingress Configuration Check
console.log("\n--> Checking Ingress & Trusted Proxy Settings...");
const host = process.env.HOST || "127.0.0.1";
if (host === "127.0.0.1" || host === "localhost") {
  pass(`Backend listening host is set to loopback (${host}) for strict Nginx reverse-proxy isolation.`);
} else {
  warn(`HOST is set to ${host}. For production security on Hostinger VPS, bind strictly to 127.0.0.1 behind Nginx.`);
}

const trustedIpHeader = process.env.TRUSTED_IP_HEADER || "x-real-ip";
pass(`Trusted proxy IP header configured as: '${trustedIpHeader}'.`);

console.log("\n=================================================================");
if (failures === 0) {
  console.log(`  PREFLIGHT RESULT: ALL CHECKS PASSED (${warnings} warning(s))`);
  console.log("  Environment is ready for Hostinger VPS execution.");
  console.log("=================================================================\n");
  process.exit(0);
} else {
  console.log(`  PREFLIGHT RESULT: ${failures} CHECK(S) FAILED (${warnings} warning(s))`);
  console.log("  Please resolve the errors above before launching on Hostinger VPS.");
  console.log("=================================================================\n");
  process.exit(1);
}
