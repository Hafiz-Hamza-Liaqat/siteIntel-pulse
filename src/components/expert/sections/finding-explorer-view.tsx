"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpDown,
} from "lucide-react";
import type { ExpertAssessmentResult } from "@/types";

interface FindingExplorerViewProps {
  findings: ExpertAssessmentResult[];
}

export function FindingExplorerView({ findings }: FindingExplorerViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [workstreamFilter, setWorkstreamFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"severity" | "status" | "category" | "rule">("severity");
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

  // Extract unique categories from findings
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    findings.forEach((f) => cats.add(f.category));
    return Array.from(cats).sort();
  }, [findings]);

  // Filter & sort
  const filteredFindings = useMemo(() => {
    const filtered = findings.filter((f) => {
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchId = f.id.toLowerCase().includes(term);
        const matchTest = f.testId.toLowerCase().includes(term);
        const matchTitle = f.title.toLowerCase().includes(term);
        const matchRemediation = f.remediation.toLowerCase().includes(term);
        const matchElements = f.affectedElements.some((el) => el.toLowerCase().includes(term));
        const matchUrls = f.affectedUrls.some((u) => u.toLowerCase().includes(term));
        if (!matchId && !matchTest && !matchTitle && !matchRemediation && !matchElements && !matchUrls) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "ALL" && f.category !== categoryFilter) return false;

      // Severity filter
      if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;

      // Status filter
      if (statusFilter !== "ALL" && f.status !== statusFilter) return false;

      // Workstream filter
      if (workstreamFilter !== "ALL" && f.workstream !== workstreamFilter) return false;

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "severity") {
        const severityOrder: Record<string, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
          INFO: 0,
        };
        const diff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (diff !== 0) return diff;
      }
      if (sortBy === "status") {
        const statusOrder: Record<string, number> = {
          FAIL: 5,
          WARNING: 4,
          BLOCKED: 3,
          UNKNOWN: 2,
          NOT_TESTED: 1,
          PASS: 0,
          NOT_APPLICABLE: -1,
        };
        const diff = (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
        if (diff !== 0) return diff;
      }
      if (sortBy === "category") {
        return a.categoryName.localeCompare(b.categoryName);
      }
      return a.testId.localeCompare(b.testId);
    });
  }, [findings, searchTerm, categoryFilter, severityFilter, statusFilter, workstreamFilter, sortBy]);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      case "LOW":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">INFO</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASS":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">PASS</span>;
      case "FAIL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">FAIL</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">WARN</span>;
      case "BLOCKED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">BLOCKED</span>;
      case "NOT_APPLICABLE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">N/A</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">NOT TESTED</span>;
    }
  };

  return (
    <section id="section-findings" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Diagnostic Finding Ledger</h2>
            <p className="text-xs text-brand-textMuted">
              Technical evidence records, exact DOM selectors, reproduction steps, and validation assertions
            </p>
          </div>
        </div>

        <div className="text-xs text-brand-textMuted">
          Showing <strong className="text-white">{filteredFindings.length}</strong> of {findings.length} findings
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 p-4 rounded-xl border border-brand-border bg-brand-card">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search findings by ID, title, rule, DOM selector, URL, or remediation..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-white text-xs placeholder-brand-textMuted focus:outline-none focus:border-brand-cyan transition-colors"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-brand-textMuted flex items-center gap-1 text-[11px]">
              <ArrowUpDown className="w-3 h-3" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs focus:outline-none focus:border-brand-cyan"
            >
              <option value="severity">Severity (Critical First)</option>
              <option value="status">Status (Fails First)</option>
              <option value="category">Category Name</option>
              <option value="rule">Rule ID</option>
            </select>
          </div>
        </div>

        {/* Filter Pills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-brand-border/60 text-xs">
          {/* Severity */}
          <div>
            <label className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="FAIL">Fail</option>
              <option value="WARNING">Warning</option>
              <option value="PASS">Pass</option>
              <option value="NOT_TESTED">Not Tested</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs truncate"
            >
              <option value="ALL">All 11 Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Workstream */}
          <div>
            <label className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">
              Specialist Workstream
            </label>
            <select
              value={workstreamFilter}
              onChange={(e) => setWorkstreamFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
            >
              <option value="ALL">All Workstreams</option>
              <option value="seo">SEO Architecture</option>
              <option value="performance">Performance & Web Vitals</option>
              <option value="security">Cloud & Security</option>
              <option value="accessibility">Accessibility & UX</option>
              <option value="analytics">Analytics & Tags</option>
              <option value="content">Content Operations</option>
              <option value="ai_automation">AI & GEO</option>
              <option value="engineering">Frontend Engineering</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="p-8 rounded-xl border border-brand-border bg-brand-card text-center text-xs text-brand-textMuted">
            No diagnostic findings match your current filters.
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedFindingId === finding.id;

            return (
              <div
                key={finding.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? "border-brand-cyan/40 bg-brand-card shadow-lg shadow-brand-cyan/5"
                    : "border-brand-border bg-brand-card hover:border-brand-borderHover"
                }`}
              >
                {/* Header Summary Row */}
                <button
                  type="button"
                  onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                  className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-brand-surface/30 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="mt-0.5 sm:mt-0 text-brand-cyan">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-brand-textMuted" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-white">
                          {finding.id}
                        </span>
                        <span className="font-mono text-[10px] text-brand-cyan px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border">
                          {finding.testId}
                        </span>
                        <span className="text-xs text-brand-textMuted">•</span>
                        <span className="text-xs font-medium text-slate-300">
                          {finding.categoryName}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white">
                        {finding.title}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 pl-7 sm:pl-0">
                    <span className="text-[11px] font-mono text-brand-textMuted capitalize">
                      {finding.workstream}
                    </span>
                    {getSeverityBadge(finding.severity)}
                    {getStatusBadge(finding.status)}
                  </div>
                </button>

                {/* Expanded Detailed Diagnostic Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-brand-border/60 bg-brand-surface/50 space-y-4 text-xs animate-in fade-in duration-150">
                    {/* Discrepancy & Technical Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-lg bg-brand-dark/80 border border-brand-border/80 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                          Observed Technical Discrepancy
                        </span>
                        <p className="text-slate-200 leading-relaxed font-mono text-[11px]">
                          {finding.evidence?.[0]?.discrepancy || finding.technicalImpact}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-brand-dark/80 border border-brand-border/80 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                          Business & Conversion Impact
                        </span>
                        <p className="text-slate-200 leading-relaxed">
                          {finding.businessImpact}
                        </p>
                      </div>
                    </div>

                    {/* Affected Elements & DOM Selectors */}
                    {finding.affectedElements.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-brand-textMuted">
                          Affected DOM Elements / CSS Selectors ({finding.affectedElements.length})
                        </span>
                        <div className="p-2.5 rounded-lg bg-black/40 border border-brand-border font-mono text-[11px] text-brand-cyan max-h-32 overflow-y-auto space-y-1">
                          {finding.affectedElements.map((el, i) => (
                            <div key={i} className="truncate" title={el}>
                              {el}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Affected URLs Sample */}
                    {finding.affectedUrls.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-brand-textMuted">
                          Sample Affected URLs ({finding.affectedUrls.length})
                        </span>
                        <div className="p-2.5 rounded-lg bg-black/40 border border-brand-border font-mono text-[11px] text-slate-300 max-h-24 overflow-y-auto space-y-1">
                          {finding.affectedUrls.map((u, i) => (
                            <div key={i} className="truncate" title={u}>
                              {u}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remediation Action & Validation Procedure */}
                    <div className="p-4 rounded-lg bg-brand-card border border-brand-cyan/20 space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-brand-cyan block mb-1">
                          Actionable Remediation Guidance
                        </span>
                        <p className="text-white leading-relaxed font-medium">
                          {finding.remediation}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-brand-border/60">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                          Engineering Validation Procedure
                        </span>
                        <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                          {finding.validationProcedure}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
