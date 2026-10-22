#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

// STRICT SECURITY INVARIANT:
// Staging demonstration accounts must NEVER be seeded when NODE_ENV=production,
// regardless of any other staging-related environment variables.
if (process.env.NODE_ENV === "production") {
  console.error("FATAL SECURITY POLICY ERROR: Staging demonstration accounts cannot be seeded when NODE_ENV=production.");
  console.error("Operation aborted unconditionally.");
  process.exit(1);
}

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "siteintel.db");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`[Seed Staging] Opening database at ${dbPath}...`);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

// OWASP 220,000 iterations for PBKDF2-HMAC-SHA512
const PBKDF2_ITERATIONS = 220_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString("hex");
  const rawHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
  const formatted = `pbkdf2$${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${rawHash}`;
  return { formatted, salt };
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

const accounts = [
  {
    tenantId: "tenant_comp_a",
    tenantName: "Company A E-Commerce Inc.",
    slug: "companya",
    email: "admin@companya.test",
    passwordPlain: "CompanyA_Auditor_2026!",
    role: "admin",
    name: "Alice Walker (Company A Lead)",
    apiKeyRaw: "sip_live_companya_test_secret_key_123",
  },
  {
    tenantId: "tenant_comp_b",
    tenantName: "Company B Technical Advisory Agency",
    slug: "companyb",
    email: "lead@companyb.test",
    passwordPlain: "CompanyB_Technical_2026!",
    role: "owner",
    name: "Bob Vance (Company B Technical Director)",
    apiKeyRaw: "sip_live_companyb_test_secret_key_456",
  },
];

const now = new Date().toISOString();

const insertTenant = db.prepare(`
  INSERT OR REPLACE INTO tenants (id, name, slug, plan, max_concurrent_scans, scans_per_hour_quota, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, tenant_id, email, password_hash, salt, role, name, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertApiKey = db.prepare(`
  INSERT OR REPLACE INTO api_keys (id, key_hash, tenant_id, name, role, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const acc of accounts) {
  insertTenant.run(acc.tenantId, acc.tenantName, acc.slug, "pro", 2, 20, now);
  const { formatted, salt } = hashPassword(acc.passwordPlain);
  const userId = `usr_${acc.slug}_${acc.role}`;
  insertUser.run(userId, acc.tenantId, acc.email, formatted, salt, acc.role, acc.name, now);
  const keyId = `key_${acc.slug}`;
  insertApiKey.run(keyId, hashToken(acc.apiKeyRaw), acc.tenantId, `${acc.tenantName} Staging Key`, acc.role, now);
  console.log(`[Seed Staging] Configured tenant '${acc.tenantName}' with user '${acc.email}' (OWASP 210,000 iterations).`);
}

db.close();
console.log("[Seed Staging] Finished seeding staging accounts successfully.");
