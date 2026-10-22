import { DatabaseSync } from "node:sqlite";
import { hashPassword, hashToken } from "./index";

export interface SeedCredentials {
  tenantId: string;
  tenantName: string;
  slug: string;
  email: string;
  passwordPlain: string;
  role: "owner" | "admin" | "specialist" | "viewer";
  name: string;
  apiKeyRaw: string;
}

export const DEFAULT_SEED_CREDENTIALS: SeedCredentials[] = [
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

/**
 * Seeds staging evaluation accounts into SQLite.
 * STRICT SECURITY INVARIANT:
 * In production mode (`NODE_ENV === 'production'`), default staging demonstration
 * accounts can NEVER be seeded, even if staging-related environment variables
 * (such as ALLOW_STAGING_SEED) are accidentally enabled.
 */
export function seedInitialAccounts(db: DatabaseSync): { seeded: boolean; message: string } {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    return {
      seeded: false,
      message: "CRITICAL SECURITY POLICY: Default demonstration accounts cannot be seeded when NODE_ENV=production.",
    };
  }

  const insertTenant = db.prepare(`
    INSERT OR IGNORE INTO tenants (id, name, slug, plan, max_concurrent_scans, scans_per_hour_quota, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, salt, role, name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertApiKey = db.prepare(`
    INSERT OR IGNORE INTO api_keys (id, key_hash, tenant_id, name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  for (const cred of DEFAULT_SEED_CREDENTIALS) {
    // 1. Seed Tenant
    insertTenant.run(cred.tenantId, cred.tenantName, cred.slug, "pro", 2, 20, now);

    // 2. Seed User with OWASP 210,000 iterations
    const { formatted, salt } = hashPassword(cred.passwordPlain);
    const userId = `usr_${cred.slug}_${cred.role}`;
    insertUser.run(userId, cred.tenantId, cred.email, formatted, salt, cred.role, cred.name, now);

    // 3. Seed API Key
    const keyId = `key_${cred.slug}`;
    const keyHash = hashToken(cred.apiKeyRaw);
    insertApiKey.run(keyId, keyHash, cred.tenantId, `${cred.tenantName} Default Key`, cred.role, now);
  }

  return {
    seeded: true,
    message: "Staging evaluation accounts successfully seeded.",
  };
}
