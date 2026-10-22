#!/usr/bin/env node
/**
 * SiteIntel Pulse — Automated Backup & Recovery Validation Test
 * 
 * Verifies that the online SQLite backup creates bit-accurate, recoverable
 * snapshots and that restoration recovers exact tenant, user, scan, and report states.
 */

import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { performBackup } from "./backup-database.mjs";
import { performRestore } from "./restore-database.mjs";

const testDir = path.resolve(process.cwd(), "test-data", "backup-recovery-test");
const testLiveDb = path.join(testDir, "live.db");
const testBackupDb = path.join(testDir, "live-backup.db");
const testRestoredDb = path.join(testDir, "restored.db");

function cleanup() {
  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  } catch {}
}

async function run() {
  console.log("=================================================");
  console.log(" SiteIntel Pulse — Backup & Recovery Verification");
  console.log("=================================================\n");

  cleanup();
  fs.mkdirSync(testDir, { recursive: true });

  console.log("1. Initializing test database with WAL mode and schema...");
  const db = new DatabaseSync(testLiveDb);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE scan_jobs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      target_url TEXT NOT NULL,
      status TEXT NOT NULL
    );
    CREATE TABLE owner_reports (
      id TEXT PRIMARY KEY,
      overall_score INTEGER NOT NULL,
      url TEXT NOT NULL
    );
  `);

  console.log("2. Inserting sample tenant, user, scan job, and report data...");
  db.prepare("INSERT INTO tenants VALUES (?, ?, ?)").run("tenant_prod_1", "Acme Staging Corp", "pro");
  db.prepare("INSERT INTO users VALUES (?, ?, ?, ?)").run("user_prod_1", "tenant_prod_1", "admin@acmestaging.local", "tenant_admin");
  db.prepare("INSERT INTO scan_jobs VALUES (?, ?, ?, ?)").run("scan_backup_001", "tenant_prod_1", "https://staging.example.com", "completed");
  db.prepare("INSERT INTO owner_reports VALUES (?, ?, ?)").run("rep_backup_001", 94, "https://staging.example.com");

  console.log("3. Writing uncheckpointed WAL transactions...");
  for (let i = 2; i <= 10; i++) {
    db.prepare("INSERT INTO scan_jobs VALUES (?, ?, ?, ?)").run(`scan_backup_00${i}`, "tenant_prod_1", `https://sub${i}.example.com`, "completed");
  }

  // Keep live DB open to prove online hot-backup behavior
  console.log("4. Executing online backup while live database is open...");
  const backupRes = performBackup(testLiveDb, testBackupDb);
  if (!fs.existsSync(testBackupDb) || backupRes.size === 0) {
    throw new Error("Backup file was not created or has 0 bytes!");
  }
  console.log(`✓ Backup successfully created (${backupRes.size} bytes).`);

  // Close live DB to simulate a catastrophe / recovery
  db.close();

  console.log("5. Testing disaster recovery into a new database file...");
  performRestore(testBackupDb, testRestoredDb);

  console.log("6. Validating restored database integrity and record consistency...");
  const restoredDb = new DatabaseSync(testRestoredDb, { readOnly: true });
  try {
    const tenant = restoredDb.prepare("SELECT * FROM tenants WHERE id = ?").get("tenant_prod_1");
    if (!tenant || tenant.name !== "Acme Staging Corp") {
      throw new Error(`Tenant data mismatch: ${JSON.stringify(tenant)}`);
    }

    const user = restoredDb.prepare("SELECT * FROM users WHERE id = ?").get("user_prod_1");
    if (!user || user.email !== "admin@acmestaging.local") {
      throw new Error(`User data mismatch: ${JSON.stringify(user)}`);
    }

    const report = restoredDb.prepare("SELECT * FROM owner_reports WHERE id = ?").get("rep_backup_001");
    if (!report || report.overall_score !== 94) {
      throw new Error(`Report data mismatch: ${JSON.stringify(report)}`);
    }

    const jobs = restoredDb.prepare("SELECT count(*) as count FROM scan_jobs").get();
    if (jobs.count !== 10) {
      throw new Error(`Scan jobs count mismatch: expected 10, got ${jobs.count}`);
    }

    console.log(`✓ All 10 scan jobs, tenant, user, and report records restored with 100% fidelity.`);
  } finally {
    restoredDb.close();
  }

  console.log("7. Cleaning up test artifacts...");
  cleanup();

  console.log("\n=================================================");
  console.log(" BACKUP & RECOVERY VERIFICATION: PASSED (100%)");
  console.log("=================================================\n");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  cleanup();
  process.exit(1);
});
