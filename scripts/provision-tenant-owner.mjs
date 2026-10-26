#!/usr/bin/env node
/**
 * SiteIntel Pulse — Production Tenant & Owner Account Provisioning CLI
 *
 * Secure server-side administrative CLI for provisioning isolated tenants
 * and owner accounts directly in SQLite.
 *
 * Security Invariants Enforced:
 * 1. Server-side only: Manually invoked via terminal; never exposed as an HTTP endpoint.
 * 2. Production enforcement: Requires NODE_ENV=production and a valid 64-hex SESSION_SECRET.
 * 3. Database validation: Refuses to proceed if database file or migrated schema is absent.
 * 4. TTY requirement: Requires an interactive terminal; passwords are read without echo.
 * 5. Role boundary: Grants only tenant-level 'owner' role; no global superuser or cross-tenant access.
 * 6. Cryptographic standard: Uses OWASP-aligned PBKDF2-HMAC-SHA512 (220,000 iterations).
 * 7. Information safety: Never logs, prints, or exposes passwords or secrets.
 *
 * Usage:
 *   NODE_ENV=production npm run admin:provision-tenant
 */

import path from "node:path";
import fs from "node:fs";
import readline from "node:readline";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

// Cryptographic configuration matching SiteIntel Pulse standard
export const PBKDF2_ITERATIONS = 220_000;
export const PBKDF2_KEYLEN = 64;
export const PBKDF2_DIGEST = "sha512";

/**
 * Validates password complexity against application security policy:
 * - At least 12 characters
 * - At least one lowercase letter (a-z)
 * - At least one uppercase letter (A-Z)
 * - At least one digit (0-9)
 * - At least one special/symbol character
 * - No leading or trailing whitespace
 */
export function validatePasswordStrength(password) {
  if (typeof password !== "string") {
    return { valid: false, error: "Password must be a string." };
  }
  if (password !== password.trim()) {
    return { valid: false, error: "Password cannot contain leading or trailing whitespace." };
  }
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters long." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one digit (0-9)." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character or symbol." };
  }
  return { valid: true };
}

/**
 * Validates tenant slug format (lowercase alphanumeric and single hyphens).
 */
export function validateSlug(slug) {
  if (typeof slug !== "string" || !slug.trim()) {
    return { valid: false, error: "Tenant slug is required." };
  }
  const clean = slug.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 50) {
    return { valid: false, error: "Tenant slug must be between 3 and 50 characters long." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
    return {
      valid: false,
      error: "Tenant slug must contain only lowercase alphanumeric characters and single hyphens without leading or trailing hyphens.",
    };
  }
  return { valid: true, slug: clean };
}

/**
 * Validates email format.
 */
export function validateEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    return { valid: false, error: "Email address is required." };
  }
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) {
    return { valid: false, error: "Invalid email address format." };
  }
  return { valid: true, email: clean };
}

/**
 * Hashes a plaintext password using PBKDF2-HMAC-SHA512 with 220,000 iterations.
 *
 * NOTE ON RUNTIME ARCHITECTURE:
 * Native `node` executes this ESM script directly without ts-node or TypeScript loaders.
 * Strip-only TypeScript parameter properties and `@/types` path aliases in `src/lib/auth/index.ts`
 * prevent direct import in raw Node.js. This module implements the identical OWASP-recommended
 * PBKDF2-HMAC-SHA512 format, verified to be 100% interoperable with `AuthService.authenticateUser`.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString("hex");
  const rawHash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
  const formatted = `pbkdf2$${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${rawHash}`;
  return { formatted, salt };
}

/**
 * Core business transaction: Provisions a tenant and owner user atomically.
 * @param {Object} options
 * @param {any} options.db
 * @param {string} options.tenantName
 * @param {string} options.tenantSlug
 * @param {string} options.ownerName
 * @param {string} options.ownerEmail
 * @param {string} options.password
 * @param {string} [options.confirmPassword]
 */
export function provisionTenantOwner({
  db,
  tenantName,
  tenantSlug,
  ownerName,
  ownerEmail,
  password,
  confirmPassword = password,
}) {
  if (!db) {
    throw new Error("Active database instance is required.");
  }

  // Validate Tenant Name
  if (typeof tenantName !== "string" || tenantName.trim().length < 2 || tenantName.trim().length > 100) {
    throw new Error("Tenant name must be between 2 and 100 characters long.");
  }
  const cleanTenantName = tenantName.trim();

  // Validate Tenant Slug
  const slugRes = validateSlug(tenantSlug);
  if (!slugRes.valid) {
    throw new Error(slugRes.error);
  }
  const cleanSlug = slugRes.slug;

  // Validate Owner Name
  if (typeof ownerName !== "string" || ownerName.trim().length < 2 || ownerName.trim().length > 100) {
    throw new Error("Owner name must be between 2 and 100 characters long.");
  }
  const cleanOwnerName = ownerName.trim();

  // Validate Owner Email
  const emailRes = validateEmail(ownerEmail);
  if (!emailRes.valid) {
    throw new Error(emailRes.error);
  }
  const cleanEmail = emailRes.email;

  // Validate Passwords
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new Error("Passwords do not match. Please re-enter.");
  }
  const passRes = validatePasswordStrength(password);
  if (!passRes.valid) {
    throw new Error(passRes.error);
  }

  // Check uniqueness before beginning transaction
  const existingSlug = db.prepare("SELECT id FROM tenants WHERE slug = ?").get(cleanSlug);
  if (existingSlug) {
    throw new Error(`Tenant slug '${cleanSlug}' is already in use.`);
  }

  const existingEmail = db.prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)").get(cleanEmail);
  if (existingEmail) {
    throw new Error(`User email '${cleanEmail}' is already registered.`);
  }

  // Generate IDs and hash
  const tenantId = `tenant_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const userId = `usr_${cleanSlug}_${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();
  const { formatted, salt } = hashPassword(password);

  // Execute atomic insertion
  db.exec("BEGIN IMMEDIATE;");
  try {
    const insertTenant = db.prepare(`
      INSERT INTO tenants (id, name, slug, plan, max_concurrent_scans, scans_per_hour_quota, created_at)
      VALUES (?, ?, ?, 'pro', 2, 20, ?)
    `);
    insertTenant.run(tenantId, cleanTenantName, cleanSlug, now);

    const insertUser = db.prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, salt, role, name, created_at)
      VALUES (?, ?, ?, ?, ?, 'owner', ?, ?)
    `);
    insertUser.run(userId, tenantId, cleanEmail, formatted, salt, cleanOwnerName, now);

    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw new Error(`Failed to commit tenant provisioning transaction: ${err.message}`);
  }

  return {
    tenantId,
    tenantName: cleanTenantName,
    tenantSlug: cleanSlug,
    userId,
    ownerName: cleanOwnerName,
    ownerEmail: cleanEmail,
    role: "owner",
    createdAt: now,
  };
}

/**
 * Prompts user on terminal with visible text input.
 */
export async function promptVisible(queryText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(queryText, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Prompts user on terminal with masked input (no echo).
 */
export async function promptHidden(queryText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(queryText);

    // Mute keystrokes from echoing back to the console
    rl._writeToOutput = function (stringToWrite) {
      if (stringToWrite.includes("\r") || stringToWrite.includes("\n")) {
        process.stdout.write("\n");
      }
    };

    rl.question("", (password) => {
      rl.close();
      resolve(password);
    });
  });
}

/**
 * Main CLI interactive workflow.
 */
export async function runCli() {
  console.log("================================================================================");
  console.log(" SiteIntel Pulse — Production Tenant & Owner Account Provisioning");
  console.log("================================================================================\n");

  // Safeguard 1: NODE_ENV must be production
  if (process.env.NODE_ENV !== "production") {
    console.error("FATAL CONFIGURATION ERROR: Tenant owner provisioning CLI must be executed with NODE_ENV=production.");
    console.error("Command aborted for security.");
    process.exit(1);
  }

  // Safeguard 2: SESSION_SECRET must be valid 64-hex string and not a placeholder
  const sessionSecret = process.env.SESSION_SECRET?.trim() || "";
  const knownPlaceholders = [
    "<generate-unique-32-byte-hex-secret-via-openssl-rand-hex-32>",
    "siteintel_staging_session_secret_change_in_production_32bytes_min",
    "staging_session_secret_min_32_chars_random_string_here",
  ];
  if (
    !sessionSecret ||
    sessionSecret.length < 32 ||
    knownPlaceholders.includes(sessionSecret) ||
    sessionSecret.startsWith("<") ||
    !/^[0-9a-f]{64}$/i.test(sessionSecret)
  ) {
    console.error("FATAL CONFIGURATION ERROR: A valid 64-character hexadecimal SESSION_SECRET must be set in environment before provisioning accounts.");
    console.error("Generate a strong secret on your host using: openssl rand -hex 32");
    console.error("Command aborted for security.");
    process.exit(1);
  }

  // Safeguard 3: Interactive TTY required for hidden password entry
  if (!process.stdin.isTTY) {
    console.error("FATAL ERROR: An interactive terminal (TTY) is required for password entry.");
    console.error("Passwords cannot be passed via command-line arguments or non-interactive streams.");
    console.error("Command aborted.");
    process.exit(1);
  }

  // Safeguard 4: Database file and schema must exist
  const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "siteintel.db");
  if (!fs.existsSync(dbPath)) {
    console.error(`FATAL ERROR: Target database file does not exist at: ${dbPath}`);
    console.error("The application database must be initialized and migrated before running account provisioning.");
    process.exit(1);
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tenants', 'users')")
    .all();
  if (tables.length < 2) {
    console.error(`FATAL ERROR: Required database tables ('tenants', 'users') do not exist in database at: ${dbPath}`);
    console.error("Run application database migrations before running account provisioning.");
    db.close();
    process.exit(1);
  }

  try {
    const tenantName = await promptVisible("Enter Tenant Name (e.g. Acme Corporation): ");
    const tenantSlug = await promptVisible("Enter Unique Tenant Slug (e.g. acme): ");
    const ownerName = await promptVisible("Enter Owner Full Name (e.g. Jane Doe): ");
    const ownerEmail = await promptVisible("Enter Owner Email Address: ");

    console.log("\nEnter account password (minimum 12 characters, with uppercase, lowercase, number, symbol):");
    const password = await promptHidden("Password: ");
    const confirmPassword = await promptHidden("Confirm Password: ");

    console.log("\nValidating credentials and provisioning account atomically...");

    const result = provisionTenantOwner({
      db,
      tenantName,
      tenantSlug,
      ownerName,
      ownerEmail,
      password,
      confirmPassword,
    });

    console.log("\n================================================================================");
    console.log(" Tenant & Owner Account Provisioned Successfully");
    console.log("================================================================================");
    console.log(` Tenant ID:   ${result.tenantId}`);
    console.log(` Tenant Name: ${result.tenantName}`);
    console.log(` Tenant Slug: ${result.tenantSlug}`);
    console.log(` User ID:     ${result.userId}`);
    console.log(` Owner Name:  ${result.ownerName}`);
    console.log(` Owner Email: ${result.ownerEmail}`);
    console.log(` Assigned Role: ${result.role} (strictly tenant-isolated)`);
    console.log(` Created At:  ${result.createdAt}`);
    console.log("================================================================================\n");
    console.log("Security Note: The tenant owner can now authenticate at /login.");
    console.log("Passwords and keys are never printed or saved in logs.\n");
  } catch (err) {
    console.error(`\n[PROVISIONING ERROR]: ${err.message}\n`);
    db.close();
    process.exit(1);
  }

  db.close();
  process.exit(0);
}

// Execute standalone if called from CLI
const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(decodeURI(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"));

if (isDirectExecution) {
  runCli();
}
