"use client";

import {
  BarChart3,
  Globe,
  Layers,
  ListOrdered,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { ExpertReport } from "@/types";

interface ExpertSummaryViewProps {
  report: ExpertReport;
}

export function ExpertSummaryView({ report }: ExpertSummaryViewProps) {
  const meta = report.metadata;
  const exec = report.executiveSummary;
  const platform = report.platformProfile;
  const coverage = report.coverage;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 75) return "text-teal-400";
    if (score >= 60) return "text-amber-400";
    if (score >= 40) return "text-orange-400";
    return "text-rose-400";
  };

  return (
    <div className="space-y-12">
      {/* SECTION 1: EXECUTIVE SNAPSHOT & WORKSTREAM ESTIMATES */}
      <section id="section-summary" className="space-y-6">
        <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Executive Diagnostic Snapshot</h2>
              <p className="text-xs text-brand-textMuted">
                Composite technical baseline and specialist engineering workstreams
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-brand-cyan px-2.5 py-1 rounded bg-brand-surface border border-brand-border">
            56-Rule Assessment Baseline
          </span>
        </div>

        {/* Provisional Coverage Notice */}
        {exec.overallScore.isProvisional && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Provisional Coverage Acceptance Notice</span>
            </div>
            <p className="leading-relaxed">
              {exec.overallScore.evaluationNote} SiteIntel Pulse requires at least <strong>70% total evaluated catalogue coverage</strong> and a minimum of{" "}
              <strong>60% coverage in every category</strong> before a score is certified as fully assessed.
              Currently, <strong>{coverage.coveragePercentage}%</strong> of catalogue points have been evaluated.
            </p>
            {exec.overallScore.ineligibleCategories && exec.overallScore.ineligibleCategories.length > 0 && (
              <p className="text-[11px] text-amber-300 font-mono">
                Categories needing expanded evidence: {exec.overallScore.ineligibleCategories.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Workstream Estimates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {exec.workstreamEstimates.map((w) => (
            <div
              key={w.workstream}
              className="p-4 rounded-xl border border-brand-border bg-brand-card hover:border-brand-borderHover transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
                  {w.title}
                </span>
                <span className="text-xs font-bold text-brand-cyan px-2 py-0.5 rounded bg-brand-surface border border-brand-border">
                  {w.taskCount} tasks
                </span>
              </div>
              <div>
                <div className="text-xl font-extrabold text-white">
                  {w.estimatedEffortSummary}
                </div>
                <div className="text-xs text-brand-textMuted mt-0.5">
                  Assigned: <strong className="text-slate-300">{w.recommendedSpecialist}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-xs">
                <span className="text-brand-textMuted">Critical Deficit:</span>
                <span
                  className={`font-bold ${
                    w.criticalCount > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {w.criticalCount > 0 ? `${w.criticalCount} Critical` : "None"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: SCOPE & AUDIT PARAMETERS */}
      <section id="section-scope" className="space-y-6">
        <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Scope & Execution Parameters</h2>
              <p className="text-xs text-brand-textMuted">
                Autonomous crawl budget, DNS safety, depth limits, and authorization boundary
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              Crawl Inventory & Budget
            </div>
            <div className="text-2xl font-black text-white">
              {coverage.testedPages}{" "}
              <span className="text-sm font-normal text-brand-textMuted">
                / {coverage.totalPagesBudget} budget
              </span>
            </div>
            <p className="text-xs text-brand-textMuted">
              Discovered {coverage.discoveredPages} URLs across depth {coverage.crawlDepthReached}.{" "}
              {coverage.failedPages > 0 || coverage.skippedPages > 0
                ? `(Failed: ${coverage.failedPages}, Skipped: ${coverage.skippedPages})`
                : coverage.isExhaustive
                ? "Full site traversed."
                : "Capped by maxPages policy."}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              Audit Mode & Authorization
            </div>
            <div className="text-2xl font-black text-white">
              {meta.authorization.isAuthorizedForAuthScan ? (
                <span className="text-emerald-400">Authorized</span>
              ) : (
                <span className="text-amber-400">Passive Public</span>
              )}
            </div>
            <p className="text-xs text-brand-textMuted">
              {meta.authorization.isAuthorizedForAuthScan
                ? "Owner consent verified. Dynamic authentication flows evaluated."
                : "Non-invasive public surface assessment without credential authentication."}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              Business Model Detection
            </div>
            <div className="text-lg font-bold text-white capitalize">
              {meta.companyA.businessCategoryDetection?.categoryLabel || meta.companyA.businessCategory.replace("_", " ")}
            </div>
            {meta.companyA.businessCategoryDetection ? (
              <div className="text-xs text-brand-textMuted space-y-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                      meta.companyA.businessCategoryDetection.decisionSource === "AUTO_DETECTED"
                        ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                        : meta.companyA.businessCategoryDetection.decisionSource === "MANUALLY_OVERRIDDEN"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-slate-500/15 text-slate-300 border border-slate-500/30"
                    }`}
                  >
                    {meta.companyA.businessCategoryDetection.decisionSource}
                  </span>
                  <span className="text-slate-300">
                    {meta.companyA.businessCategoryDetection.confidence} ({Math.round(meta.companyA.businessCategoryDetection.confidenceScore * 100)}% heuristic)
                  </span>
                </div>
                {meta.companyA.businessCategoryDetection.secondaryFacets && meta.companyA.businessCategoryDetection.secondaryFacets.length > 0 && (
                  <div className="text-[11px] text-cyan-300/90 truncate" title={meta.companyA.businessCategoryDetection.secondaryFacets.join(", ")}>
                    Facets: {meta.companyA.businessCategoryDetection.secondaryFacets.map(f => f.replace(/_/g, " ")).join(", ")}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-brand-textMuted">Assigned via audit profile.</p>
            )}
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              Auditor Work Product
            </div>
            <div className="text-lg font-bold text-white">
              {meta.companyB.name}
            </div>
            <p className="text-xs text-brand-textMuted">
              Role: <strong className="text-slate-300">{meta.companyB.auditorRole}</strong>
              <br />
              Generated:{" "}
              <span className="font-mono text-slate-400">
                {new Date(meta.generatedAt).toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* Methodology & Boundaries Disclaimer Box */}
        <div className="p-4 rounded-xl border border-brand-border bg-brand-surface/60 text-xs text-brand-text space-y-1.5">
          <div className="font-bold text-white flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Boundaries & Safety Guarantees:</span>
          </div>
          <p className="text-brand-textMuted leading-relaxed">
            {meta.scopeAndBoundaries}
          </p>
        </div>
      </section>

      {/* SECTION 3: PLATFORM PROFILE & DETECTED TECH STACK */}
      <section id="section-platform" className="space-y-6">
        <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Platform Profile & Detected Stack</h2>
              <p className="text-xs text-brand-textMuted">
                Heuristic framework detection, server signatures, edge CDN, and AI integrations
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-surface text-brand-cyan border border-brand-border">
            Confidence: {platform.confidence}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              CMS Architecture
            </span>
            <div className="text-lg font-bold text-white">{platform.cmsCategory}</div>
            <p className="text-xs text-brand-textMuted">
              Inferred from meta generator, headers, and DOM markup patterns
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              Frontend Frameworks
            </span>
            <div className="text-lg font-bold text-white">
              {platform.frameworkHints.length > 0
                ? platform.frameworkHints.join(", ")
                : "Vanilla / Static"}
            </div>
            <p className="text-xs text-brand-textMuted">
              Client runtime markers and script signatures
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              Edge CDN & Hosting
            </span>
            <div className="text-lg font-bold text-white">
              {platform.serverCdnClues.length > 0
                ? platform.serverCdnClues.join(", ")
                : "Direct Origin Server"}
            </div>
            <p className="text-xs text-brand-textMuted">
              Observed in HTTP response headers and socket connection
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
              AI Integrations
            </span>
            <div className="text-lg font-bold text-white">
              {platform.aiIntegrationClues.length > 0
                ? platform.aiIntegrationClues.join(", ")
                : "None Detected"}
            </div>
            <p className="text-xs text-brand-textMuted">
              Chatbots, assistive widgets, and LLM endpoints
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: 56-RULE SCORE LEDGER & EXPLICIT INVARIANTS */}
      <section id="section-ledger" className="space-y-6">
        <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Assessment Catalogue & Score Ledger</h2>
              <p className="text-xs text-brand-textMuted">
                11 categories, 56 deterministic rules, exact denominators, and coverage thresholds
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-surface/80 text-brand-textMuted font-semibold border-b border-brand-border">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Applicable Score %</th>
                <th className="py-3 px-4">Allocation Earned</th>
                <th className="py-3 px-4">Coverage %</th>
                <th className="py-3 px-4">Rules Evaluated</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60 text-brand-text">
              {exec.categoryScores.map((c) => (
                <tr key={c.category} className="hover:bg-brand-surface/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{c.categoryName}</td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={getScoreColor(c.scorePercentage)}>
                      {c.scorePercentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {c.earnedAllocationPercentage}%
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span
                      className={
                        c.coveragePercentage >= 60 ? "text-emerald-400" : "text-amber-400"
                      }
                    >
                      {c.coveragePercentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-brand-textMuted">
                    {c.testCounts.pass + c.testCounts.warning + c.testCounts.fail} / {c.testCounts.total} rules
                  </td>
                  <td className="py-3 px-4">
                    {c.coveragePercentage >= 60 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Evaluated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Provisional (&lt;60%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
