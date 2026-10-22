"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  PlusCircle,
  FileSpreadsheet,
} from "lucide-react";
import type { ExpertReport } from "@/types";

interface ExpertHeaderProps {
  report: ExpertReport;
  onNewScanClick?: () => void;
}

export function ExpertHeader({ report, onNewScanClick }: ExpertHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const meta = report.metadata;
  const exec = report.executiveSummary;
  const overall = exec.overallScore;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 75) return "text-teal-400 border-teal-500/30 bg-teal-500/10";
    if (score >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    if (score >= 40) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  const getEligibilityBadge = (status: string) => {
    if (status === "FULLY_ASSESSED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          Fully Assessed
        </span>
      );
    }
    if (status === "INSUFFICIENT_EVIDENCE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <ShieldAlert className="w-3.5 h-3.5" />
          Insufficient Evidence
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <ShieldAlert className="w-3.5 h-3.5" />
        Provisional Assessment
      </span>
    );
  };

  return (
    <header className="rounded-2xl border border-brand-border bg-brand-surface/90 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Top Bar: Provenance, Audit Mode, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-bold tracking-wide uppercase">
            Milestone 2 • Company B Workbench
          </span>

          {meta.authorization.isAuthorizedForAuthScan ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              Authorized Dynamic Audit
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              Passive Public Scan
            </span>
          )}

          {getEligibilityBadge(overall.assessmentStatus)}
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Switch to Owner Report Link */}
          <Link
            href={`/owner-report?id=${meta.reportId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-textMuted hover:text-white text-xs font-medium transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-brand-cyan" />
            <span>View Owner Report</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {/* Download PDF Trigger */}
          <a
            href={`/api/scan/expert-pdf?id=${meta.reportId}`}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyanHover text-brand-dark font-semibold text-xs transition-all shadow-md shadow-brand-cyan/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Expert PDF</span>
          </a>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-text text-xs font-medium transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-brand-textMuted" />
            </button>

            {exportOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-brand-border bg-brand-card shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
                onMouseLeave={() => setExportOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-brand-textMuted">
                  Diagnostic Data Exports
                </div>
                <a
                  href={`/api/scan/expert-export?id=${meta.reportId}&format=csv_findings`}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-brand-text hover:bg-brand-surface hover:text-white"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>CSV: Findings Ledger</span>
                </a>
                <a
                  href={`/api/scan/expert-export?id=${meta.reportId}&format=csv_inventory`}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-brand-text hover:bg-brand-surface hover:text-white"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  <span>CSV: URL Inventory</span>
                </a>
                <a
                  href={`/api/scan/expert-export?id=${meta.reportId}&format=csv_remediation`}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-brand-text hover:bg-brand-surface hover:text-white"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>CSV: Workstream Tasks</span>
                </a>
                <div className="my-1 border-t border-brand-border" />
                <a
                  href={`/api/scan/expert-export?id=${meta.reportId}&format=json`}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-brand-text hover:bg-brand-surface hover:text-white"
                >
                  <Database className="w-4 h-4 text-brand-cyan" />
                  <span>JSON: Full Report Bundle</span>
                </a>
                <a
                  href={`/api/scan/expert-export?id=${meta.reportId}&format=manifest`}
                  download
                  className="flex items-center gap-2 px-3 py-2 text-brand-text hover:bg-brand-surface hover:text-white"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>JSON: Integrity Manifest</span>
                </a>
              </div>
            )}
          </div>

          {onNewScanClick && (
            <button
              type="button"
              onClick={onNewScanClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-card text-brand-text hover:text-white text-xs font-medium transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-brand-cyan" />
              <span>New Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Target & KPI Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2 border-t border-brand-border/60">
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-brand-textMuted font-bold">
            Inspected Platform
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {meta.companyA.name || meta.companyA.domain}
            </h1>
            <a
              href={meta.companyA.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-textMuted hover:text-brand-cyan transition-colors"
              title="Open audited domain in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="flex items-center gap-3 text-xs text-brand-textMuted">
            <span className="font-mono text-slate-300">{meta.companyA.targetUrl}</span>
            <span>•</span>
            <span>Category: <strong className="text-white capitalize">{meta.companyA.businessCategory}</strong></span>
            <span>•</span>
            <span>Report ID: <strong className="font-mono text-brand-cyan">{meta.reportId}</strong></span>
          </div>
        </div>

        {/* Score & Defect Triage Pills */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Overall Score Box */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${getScoreColor(overall.score)}`}>
            <div>
              <div className="text-3xl font-black">{overall.score}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                Score / 100
              </div>
            </div>
            <div className="border-l border-current/20 pl-3 text-xs font-medium">
              <div>{overall.ratingBand}</div>
              <div className="text-[11px] opacity-80 font-normal">
                {report.coverage.coveragePercentage}% catalogue coverage
              </div>
            </div>
          </div>

          {/* Issue Triage Counters */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-center">
              <div className="text-base font-bold text-rose-400">{exec.issueTotals.critical}</div>
              <div className="text-[10px] text-brand-textMuted uppercase font-semibold">Critical</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-center">
              <div className="text-base font-bold text-orange-400">{exec.issueTotals.high}</div>
              <div className="text-[10px] text-brand-textMuted uppercase font-semibold">High</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-center">
              <div className="text-base font-bold text-amber-400">{exec.issueTotals.medium}</div>
              <div className="text-[10px] text-brand-textMuted uppercase font-semibold">Medium</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-center">
              <div className="text-base font-bold text-brand-cyan">{report.remediationRegister.length}</div>
              <div className="text-[10px] text-brand-textMuted uppercase font-semibold">Tasks</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
