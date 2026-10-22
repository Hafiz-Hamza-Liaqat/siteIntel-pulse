import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { ScanJob, ScanRequest, OwnerReport, ExpertReport, Tenant } from "@/types";
import { runMigrations } from "./migrator";
import { AuthService, hashPassword, hashToken, getSessionSecret } from "../auth";
import { seedInitialAccounts } from "../auth/seed";

export interface ScanDatabaseAdapter {
  createJob(request: ScanRequest, tenantId?: string, userId?: string): Promise<ScanJob>;
  getJob(jobId: string, tenantId?: string): Promise<ScanJob | null>;
  updateJob(jobId: string, updates: Partial<ScanJob>, tenantId?: string): Promise<ScanJob | null>;
  saveReport(report: OwnerReport, tenantId?: string): Promise<void>;
  getReport(reportId: string, tenantId?: string): Promise<OwnerReport | null>;
  saveExpertReport(report: ExpertReport, tenantId?: string): Promise<void>;
  getExpertReport(reportId: string, tenantId?: string): Promise<ExpertReport | null>;
  findRecentJobByUrl(url: string, tenantId?: string, reportType?: "owner" | "expert"): Promise<ScanJob | null>;
  updateRemediationStatus(
    taskId: string,
    status: string,
    tenantId?: string,
    assignedTo?: string,
    notes?: string
  ): Promise<boolean>;
  getRemediationTasks(reportId: string, tenantId?: string): Promise<any[]>;
  getTenant(tenantId: string): Promise<Tenant | null>;
  getActiveScanCount(tenantId: string): Promise<number>;
  incrementRateLimit(key: string, ttlSeconds: number): Promise<{ count: number; resetAt: number }>;
  getAuthService(): AuthService;
  ping(): boolean;
  close(): void;
}

/**
 * Production-ready SQLite Database Adapter utilizing Node 22 native DatabaseSync.
 * Provides durable disk-backed ACID transactions, foreign keys, and WAL journal mode.
 */
export class SqliteScanDatabaseAdapter implements ScanDatabaseAdapter {
  private db: DatabaseSync;
  private authService: AuthService;

  constructor(customPath?: string) {
    const rawPath =
      customPath ||
      process.env.DATABASE_PATH ||
      (process.env.DATABASE_URL?.replace(/^(sqlite|file):\/\//, "")) ||
      path.resolve(process.cwd(), "data", "siteintel.db");

    // Ensure parent directory exists
    const dir = path.dirname(rawPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(rawPath);

    // Fail immediately if mandatory production secrets are missing or insecure
    if (process.env.NODE_ENV === "production") {
      getSessionSecret();
    }

    // Performance & Durability Pragmas
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA synchronous = NORMAL;");

    // Run versioned migrations
    runMigrations(this.db);

    // Initialize Auth Service & Seed initial default accounts
    this.authService = new AuthService(this.db);
    seedInitialAccounts(this.db);
  }

  getAuthService(): AuthService {
    return this.authService;
  }

  async createJob(request: ScanRequest, tenantId?: string, userId?: string): Promise<ScanJob> {
    const id = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const job: ScanJob = {
      id,
      tenantId,
      userId,
      request,
      status: "queued",
      currentStage: "Scan request received and queued",
      progressPercentage: 0,
      discoveredCount: 0,
      testedCount: 0,
      errorCount: 0,
      results: [],
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO scan_jobs (
        id, tenant_id, user_id, target_url, status, current_stage, progress_percentage,
        discovered_count, tested_count, error_count, request_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      job.id,
      job.tenantId || null,
      job.userId || null,
      request.targetUrl,
      job.status,
      job.currentStage,
      job.progressPercentage,
      job.discoveredCount,
      job.testedCount,
      job.errorCount,
      JSON.stringify(request),
      now,
      now
    );

    return job;
  }

  async getJob(jobId: string, tenantId?: string): Promise<ScanJob | null> {
    let query = "SELECT * FROM scan_jobs WHERE id = ?";
    const params: any[] = [jobId];

    if (tenantId) {
      query += " AND (tenant_id = ? OR tenant_id IS NULL)";
      params.push(tenantId);
    }

    const row = this.db.prepare(query).get(...params) as any;
    if (!row) return null;

    const job = this.hydrateJob(row);

    // If completed, hydrate the appropriate report
    if (job.status === "completed") {
      if (job.request?.reportType === "expert") {
        const expertReport = await this.getExpertReport(job.id, tenantId);
        if (expertReport) {
          job.expertReport = expertReport;
          job.expertReportId = expertReport.metadata?.reportId;
        }
      } else {
        const report = await this.getReport(job.id, tenantId);
        if (report) {
          job.report = report;
          job.ownerReportId = report.reportId;
        }
      }
    }

    return job;
  }

  async updateJob(jobId: string, updates: Partial<ScanJob>, tenantId?: string): Promise<ScanJob | null> {
    const existing = await this.getJob(jobId, tenantId);
    if (!existing) return null;

    const merged: ScanJob = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE scan_jobs SET
        status = ?,
        current_stage = ?,
        progress_percentage = ?,
        discovered_count = ?,
        tested_count = ?,
        error_count = ?,
        coverage_json = ?,
        results_json = ?,
        error_message = ?,
        expert_report_id = ?,
        updated_at = ?,
        completed_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.status,
      merged.currentStage,
      merged.progressPercentage,
      merged.discoveredCount,
      merged.testedCount,
      merged.errorCount,
      merged.coverage ? JSON.stringify(merged.coverage) : null,
      merged.results ? JSON.stringify(merged.results) : null,
      merged.errorMessage || null,
      merged.expertReportId || null,
      merged.updatedAt,
      merged.completedAt || null,
      jobId
    );

    return merged;
  }

  async saveReport(report: OwnerReport, tenantId?: string): Promise<void> {
    const effectiveTenant = tenantId || report.tenantId || null;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO owner_reports (
        report_id, scan_id, tenant_id, overall_score, is_provisional, report_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const overallScore =
      report.executiveSnapshot?.overallScore?.score ??
      (report as any).overallScore?.earnedPercentage ??
      (report as any).overallScore?.totalAwardedPoints ??
      0;
    const isProvisional =
      report.executiveSnapshot?.overallScore?.isProvisional ??
      (report as any).provisionalStatus?.isProvisional ??
      false;
    const scanId = report.scanId || (report as any).jobId || report.reportId;
    const createdAt = report.generatedAt || new Date().toISOString();

    stmt.run(
      report.reportId,
      scanId,
      effectiveTenant,
      overallScore,
      isProvisional ? 1 : 0,
      JSON.stringify(report),
      createdAt
    );
  }

  async getReport(reportId: string, tenantId?: string): Promise<OwnerReport | null> {
    let query = "SELECT report_json, tenant_id FROM owner_reports WHERE (report_id = ? OR scan_id = ?)";
    const params: any[] = [reportId, reportId];

    if (tenantId) {
      query += " AND (tenant_id = ? OR tenant_id IS NULL)";
      params.push(tenantId);
    }

    const row = this.db.prepare(query).get(...params) as any;
    if (!row) return null;

    return JSON.parse(row.report_json);
  }

  async saveExpertReport(report: ExpertReport, tenantId?: string): Promise<void> {
    const effectiveTenant = tenantId || report.metadata.tenantId || null;

    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO expert_reports (
          report_id, scan_id, tenant_id, overall_score, is_provisional, report_json, findings_count, url_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const findingsCount = (report as any).findings?.length ?? (report as any).findingsLedger?.length ?? 0;
      const urlCount = (report as any).urlInventory?.length ?? 0;
      const scanId = report.metadata.scanId || (report.metadata as any).jobId || report.metadata.reportId;
      const overallScore =
        (report.executiveSummary as any)?.overallScore?.score ??
        (report.executiveSummary as any)?.overallScore ??
        0;
      const isProvisional = (report.executiveSummary as any)?.overallScore?.isProvisional ? 1 : 0;
      const createdAt = report.metadata.generatedAt || new Date().toISOString();

      stmt.run(
        report.metadata.reportId,
        scanId,
        effectiveTenant,
        overallScore,
        isProvisional,
        JSON.stringify(report),
        findingsCount,
        urlCount,
        createdAt
      );

      // Persist individual remediation tasks into relational table
      const insertTask = this.db.prepare(`
        INSERT OR REPLACE INTO remediation_tasks (
          id, report_id, scan_id, tenant_id, test_id, title, workstream, priority, status, assigned_to, estimated_hours, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      const register = (report as any).remediationRegister || [];
      for (const task of register) {
        insertTask.run(
          task.id,
          report.metadata.reportId,
          report.metadata.scanId,
          effectiveTenant,
          task.findingIds?.[0] || task.id,
          task.title,
          task.workstream,
          task.priority,
          task.status || "PLANNED",
          null,
          task.estimatedHours || 0,
          null,
          now,
          now
        );
      }

      this.db.exec("COMMIT;");
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  async getExpertReport(reportId: string, tenantId?: string): Promise<ExpertReport | null> {
    let query = "SELECT report_json, tenant_id FROM expert_reports WHERE (report_id = ? OR scan_id = ?)";
    const params: any[] = [reportId, reportId];

    if (tenantId) {
      query += " AND (tenant_id = ? OR tenant_id IS NULL)";
      params.push(tenantId);
    }

    const row = this.db.prepare(query).get(...params) as any;
    if (!row) return null;

    return JSON.parse(row.report_json);
  }

  async findRecentJobByUrl(url: string, tenantId?: string, reportType?: "owner" | "expert"): Promise<ScanJob | null> {
    const normalizedInput = url.trim().toLowerCase();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    let query = `
      SELECT * FROM scan_jobs 
      WHERE LOWER(target_url) = ? 
        AND created_at >= ?
        AND status IN ('completed', 'discovering', 'collecting_evidence')
    `;
    const params: any[] = [normalizedInput, tenMinutesAgo];

    if (tenantId) {
      query += " AND (tenant_id = ? OR tenant_id IS NULL)";
      params.push(tenantId);
    }

    query += " ORDER BY created_at DESC LIMIT 10";

    const rows = this.db.prepare(query).all(...params) as any[];
    for (const row of rows) {
      const job = this.hydrateJob(row);
      if (!reportType || job.request.reportType === reportType) {
        return job;
      }
    }
    return null;
  }

  async updateRemediationStatus(
    taskId: string,
    status: string,
    tenantId?: string,
    assignedTo?: string,
    notes?: string
  ): Promise<boolean> {
    let query = "UPDATE remediation_tasks SET status = ?, updated_at = ?";
    const params: any[] = [status, new Date().toISOString()];

    if (assignedTo !== undefined) {
      query += ", assigned_to = ?";
      params.push(assignedTo);
    }
    if (notes !== undefined) {
      query += ", notes = ?";
      params.push(notes);
    }

    query += " WHERE id = ?";
    params.push(taskId);

    if (tenantId) {
      query += " AND (tenant_id = ? OR tenant_id IS NULL)";
      params.push(tenantId);
    }

    const info = this.db.prepare(query).run(...params);
    return info.changes > 0;
  }

  async getRemediationTasks(reportId: string, tenantId?: string): Promise<any[]> {
    let query = "SELECT * FROM remediation_tasks WHERE report_id = ?";
    const params: any[] = [reportId];

    if (tenantId) {
      query += " AND (tenant_id = ? OR tenant_id IS NULL)";
      params.push(tenantId);
    }

    query += " ORDER BY priority ASC, created_at ASC";

    return this.db.prepare(query).all(...params) as any[];
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const row = this.db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      maxConcurrentScans: row.max_concurrent_scans,
      scansPerHourQuota: row.scans_per_hour_quota,
      createdAt: row.created_at,
    };
  }

  async getActiveScanCount(tenantId: string): Promise<number> {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM scan_jobs 
      WHERE tenant_id = ? 
        AND status IN ('queued', 'validating', 'discovering', 'collecting_evidence', 'assessing', 'scoring', 'generating_report')
    `).get(tenantId) as any;

    return row?.count || 0;
  }

  async incrementRateLimit(key: string, ttlSeconds: number): Promise<{ count: number; resetAt: number }> {
    const nowSec = Math.floor(Date.now() / 1000);
    const resetAt = nowSec + ttlSeconds;

    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const existing = this.db.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?").get(key) as any;

      if (!existing || existing.reset_at < nowSec) {
        this.db.prepare("INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)").run(key, resetAt);
        this.db.exec("COMMIT;");
        return { count: 1, resetAt };
      } else {
        const newCount = existing.count + 1;
        this.db.prepare("UPDATE rate_limits SET count = ? WHERE key = ?").run(newCount, key);
        this.db.exec("COMMIT;");
        return { count: newCount, resetAt: existing.reset_at };
      }
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  ping(): boolean {
    try {
      this.db.prepare("SELECT 1;").get();
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    this.db.close();
  }

  private hydrateJob(row: any): ScanJob {
    return {
      id: row.id,
      tenantId: row.tenant_id || undefined,
      userId: row.user_id || undefined,
      request: JSON.parse(row.request_json),
      status: row.status,
      currentStage: row.current_stage,
      progressPercentage: row.progress_percentage,
      discoveredCount: row.discovered_count,
      testedCount: row.tested_count,
      errorCount: row.error_count,
      coverage: row.coverage_json ? JSON.parse(row.coverage_json) : undefined,
      results: row.results_json ? JSON.parse(row.results_json) : [],
      errorMessage: row.error_message || undefined,
      expertReportId: row.expert_report_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
    };
  }
}

// Global Singleton Management (Lazy Initialization)
const globalForDb = globalThis as unknown as {
  scanDbInstance?: ScanDatabaseAdapter;
};

export function getScanDb(): ScanDatabaseAdapter {
  if (!globalForDb.scanDbInstance) {
    globalForDb.scanDbInstance = new SqliteScanDatabaseAdapter();
  }
  return globalForDb.scanDbInstance;
}

export const scanDb: ScanDatabaseAdapter = new Proxy({} as ScanDatabaseAdapter, {
  get(_target, prop) {
    const instance = getScanDb();
    const val = (instance as any)[prop];
    if (typeof val === "function") {
      return val.bind(instance);
    }
    return val;
  },
});
