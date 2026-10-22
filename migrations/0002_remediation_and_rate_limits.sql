-- Migration: 0002_remediation_and_rate_limits.sql
-- Description: Remediation task updates, assignees, notes, and sliding-window rate limiting

-- 1. Remediation Tasks Table
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

-- 2. Rate Limits Table
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_remediation_tenant ON remediation_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_remediation_report ON remediation_tasks(report_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
