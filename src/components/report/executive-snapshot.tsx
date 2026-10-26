import React from "react";
import { OwnerReport } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  FileSearch,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface ExecutiveSnapshotProps {
  report: OwnerReport;
}

export function ExecutiveSnapshot({ report }: ExecutiveSnapshotProps) {
  const snapshot = report.executiveSnapshot;
  const overall = snapshot.overallScore;

  const getScoreColorClass = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (score >= 75) return "text-teal-400 border-teal-500/40 bg-teal-500/10";
    if (score >= 60) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    if (score >= 40) return "text-orange-400 border-orange-500/40 bg-orange-500/10";
    return "text-rose-400 border-rose-500/40 bg-rose-500/10";
  };

  const isInsufficient = overall.assessmentStatus === "INSUFFICIENT_EVIDENCE";
  const isProvisional = overall.isProvisional;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-teal" />
          <span>Executive Snapshot &amp; Baseline Health</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* Assessment Eligibility Status Badge */}
          {isInsufficient ? (
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Insufficient Evidence (&lt;40% Coverage)</span>
            </span>
          ) : isProvisional ? (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Provisional Preliminary Score</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fully Assessed Baseline (≥70% Covered)</span>
            </span>
          )}
          <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
            Section 2 of 13
          </span>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center rounded-xl bg-brand-surface p-6 border border-brand-borderSubtle">
        {/* Overall Score Circle */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div
            className={`w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center ${getScoreColorClass(
              overall.score
            )}`}
          >
            <span className="text-4xl font-black text-white leading-none">{overall.score}%</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-textMuted mt-1">Normalized</span>
          </div>
          <span className="text-xs font-semibold text-brand-textMuted">
            {isProvisional ? (
              <span className="text-amber-400 font-bold uppercase tracking-wider">Provisional Score</span>
            ) : (
              "Normalized Score"
            )}
          </span>
        </div>

        {/* Status & Rating Band */}
        <div className="md:col-span-2 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="inline-block px-3 py-1 rounded-md bg-brand-teal/15 text-brand-tealLight border border-brand-teal/30 text-xs font-bold uppercase tracking-wider">
                {overall.ratingBand}
              </div>
              {isProvisional && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                  Provisional
                </span>
              )}
            </div>
            <p className="text-sm text-brand-text leading-relaxed">{overall.evaluationNote}</p>
          </div>

          {isProvisional && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Coverage Acceptance Criteria Notice</span>
              </div>
              <p className="leading-relaxed">
                SiteIntel Pulse requires at least <strong>70% total evaluated catalogue coverage</strong> and a minimum of{" "}
                <strong>60% coverage in every category</strong> before a score is certified as fully assessed.
                Currently, <strong>{snapshot.coverage.coveragePercentage}%</strong> of catalogue points have been evaluated.
              </p>
              {overall.ineligibleCategories && overall.ineligibleCategories.length > 0 && (
                <p className="text-[11px] text-amber-300 font-mono">
                  Categories needing expanded evidence: {overall.ineligibleCategories.join(", ")}
                </p>
              )}
            </div>
          )}

          {overall.criticalIssuesCount > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                <strong>{overall.criticalIssuesCount} Critical Finding(s) Detected:</strong> Immediate action is
                recommended regardless of composite score to prevent traffic loss or security risk.
              </span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2.5 pt-2 text-center text-xs">
            <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
              <div className="text-base font-bold text-white">{snapshot.testedPageCount}</div>
              <div className="text-[10px] text-brand-textMuted uppercase font-medium">Pages Audited</div>
            </div>
            <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
              <div className="text-base font-bold text-white">{snapshot.coverage.discoveredPages}</div>
              <div className="text-[10px] text-brand-textMuted uppercase font-medium">Pages Discovered</div>
            </div>
            <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
              <div className="text-base font-bold text-brand-tealLight">{snapshot.coverage.coveragePercentage}%</div>
              <div className="text-[10px] text-brand-textMuted uppercase font-medium">Catalogue Coverage</div>
            </div>
            <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
              <div className="text-base font-bold text-brand-cyan">
                {overall.totalEarnedCataloguePoints ?? overall.score} / {overall.pointsActuallyEvaluated ?? overall.evaluatedWeightedPoints}
              </div>
              <div className="text-[10px] text-brand-textMuted uppercase font-medium">Earned / Evaluated Pts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
