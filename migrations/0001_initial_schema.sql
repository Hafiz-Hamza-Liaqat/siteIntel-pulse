-- Migration: 0001_initial_schema.sql
-- Description: Core multi-tenant architecture, user sessions, API keys, scan jobs, and dual reports

PRAGMA foreign_keys = ON;

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'pro',
  max_concurrent_scans INTEGER NOT NULL DEFAULT 2,
  scans_per_hour_quota INTEGER NOT NULL DEFAULT 20,
  created_at TEXT NOT NULL
);

-- 2. Users Table
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

-- 3. Sessions Table
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

-- 4. API Keys Table
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

-- 5. Scan Jobs Table
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

-- 6. Owner Reports Table
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

-- 7. Expert Reports Table
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

-- 8. Schema Migrations Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

-- Indexes for performance and isolation
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_tenant ON scan_jobs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_target ON scan_jobs(target_url, status);
CREATE INDEX IF NOT EXISTS idx_owner_reports_tenant ON owner_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expert_reports_tenant ON expert_reports(tenant_id);
