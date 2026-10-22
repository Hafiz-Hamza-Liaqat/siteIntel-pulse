import { DatabaseSync } from "node:sqlite";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "0001_initial_schema",
    sql: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL DEFAULT 'pro',
        max_concurrent_scans INTEGER NOT NULL DEFAULT 2,
        scans_per_hour_quota INTEGER NOT NULL DEFAULT 20,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'specialist',
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key_hash TEXT NOT NULL UNIQUE,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'specialist',
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS scan_jobs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        user_id TEXT,
        target_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        current_stage TEXT NOT NULL,
        progress_percentage INTEGER NOT NULL DEFAULT 0,
        discovered_count INTEGER NOT NULL DEFAULT 0,
        tested_count INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        request_json TEXT NOT NULL,
        coverage_json TEXT,
        results_json TEXT,
        error_message TEXT,
        expert_report_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS owner_reports (
        report_id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL UNIQUE,
        tenant_id TEXT,
        overall_score REAL NOT NULL,
        is_provisional INTEGER NOT NULL DEFAULT 0,
        report_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (scan_id) REFERENCES scan_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS expert_reports (
        report_id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL UNIQUE,
        tenant_id TEXT,
        overall_score REAL NOT NULL,
        is_provisional INTEGER NOT NULL DEFAULT 0,
        report_json TEXT NOT NULL,
        findings_count INTEGER NOT NULL DEFAULT 0,
        url_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (scan_id) REFERENCES scan_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_scan_jobs_tenant ON scan_jobs(tenant_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_scan_jobs_target ON scan_jobs(target_url, status);
      CREATE INDEX IF NOT EXISTS idx_owner_reports_tenant ON owner_reports(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_expert_reports_tenant ON expert_reports(tenant_id);
    `,
  },
  {
    version: 2,
    name: "0002_remediation_and_rate_limits",
    sql: `
      CREATE TABLE IF NOT EXISTS remediation_tasks (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        scan_id TEXT NOT NULL,
        tenant_id TEXT,
        test_id TEXT NOT NULL,
        title TEXT NOT NULL,
        workstream TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        assigned_to TEXT,
        estimated_hours REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (scan_id) REFERENCES scan_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        reset_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_remediation_tenant ON remediation_tasks(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_remediation_report ON remediation_tasks(report_id);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
    `,
  },
];

export function runMigrations(db: DatabaseSync): { appliedCount: number } {
  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare("SELECT version FROM schema_migrations").all() as Array<{ version: number }>;
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  let appliedCount = 0;

  for (const migration of MIGRATIONS) {
    if (!appliedSet.has(migration.version)) {
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.exec(migration.sql);
        const insertStmt = db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);");
        insertStmt.run(migration.version, migration.name, new Date().toISOString());
        db.exec("COMMIT;");
        appliedCount++;
      } catch (err) {
        db.exec("ROLLBACK;");
        throw new Error(`Migration ${migration.name} failed: ${(err as Error).message}`);
      }
    }
  }

  return { appliedCount };
}
