"use client";

import React, { useState } from "react";
import { OwnerReport, CategoryScore } from "@/types";
import { BarChart3, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, HelpCircle, ShieldAlert, ShieldCheck } from "lucide-react";

interface ScoreCoverageDetailsProps {
  report: OwnerReport;
}

export function ScoreCoverageDetails({ report }: ScoreCoverageDetailsProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const getBarColor = (scorePct: number) => {
    if (scorePct >= 90) return "bg-emerald-500";
    if (scorePct >= 75) return "bg-teal-500";
    if (scorePct >= 60) return "bg-amber-500";
    if (scorePct >= 40) return "bg-orange-500";
    return "bg-rose-500";
  };

  const getTextColor = (scorePct: number) => {
    if (scorePct >= 90) return "text-emerald-400";
    if (scorePct >= 75) return "text-teal-400";
    if (scorePct >= 60) return "text-amber-400";
    if (scorePct >= 40) return "text-orange-400";
    return "text-rose-400";
  };

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-teal" />
            <span>Score &amp; Coverage Details Across 11 Categories</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Each category represents a distinct pillar of digital platform health totaling exactly 100 maximum catalogue points.
            Categories require ≥60% evaluated coverage to qualify as fully eligible.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 4 of 13
        </span>
      </div>

      <div className="space-y-4">
        {report.scoreDetails.map((cat) => {
          const isExpanded = expandedCat === cat.category;
          const catResults = report.results.filter((r) => r.category === cat.category);
          const coveragePct = cat.coveragePercentage ?? Math.round((cat.testedPoints / cat.allocatedWeight) * 100);
          const allocationPct = cat.earnedAllocationPercentage ?? Math.round((cat.earnedPoints / cat.allocatedWeight) * 100);
          const isEligible = cat.isEligibleForOverall;

          return (
            <div
              key={cat.category}
              className={`rounded-xl border transition-colors overflow-hidden ${
                isEligible ? "border-brand-borderSubtle bg-brand-surface/60" : "border-amber-500/30 bg-amber-500/[0.03]"
              }`}
            >
              <div
                onClick={() => setExpandedCat(isExpanded ? null : cat.category)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-bold text-white text-base">{cat.categoryName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-card border border-brand-borderSubtle text-brand-textMuted">
                      Weight: {cat.allocatedWeight} pts
                    </span>
                    {/* Eligibility Badge */}
                    {isEligible ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Eligible (≥60% Covered)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Provisional (&lt;60% Covered)</span>
                      </span>
                    )}
                  </div>

                  {/* Dual-Indicator Progress Display */}
                  <div className="space-y-1">
                    <div className="w-full bg-brand-card h-2.5 rounded-full overflow-hidden border border-brand-borderSubtle flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getBarColor(cat.scorePercentage)}`}
                        style={{ width: `${cat.scorePercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Explicit Denominators and Metric Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-0.5 text-brand-textMuted">
                    <div>
                      <span>Evaluated Test Score: </span>
                      <strong className="text-white">{cat.scorePercentage}%</strong>
                      <span className="text-[11px] text-brand-textMuted"> ({cat.earnedPoints} / {cat.testedPoints} tested)</span>
                    </div>
                    <div>
                      <span>Full Allocation Earned: </span>
                      <strong className="text-brand-cyan">{cat.earnedPoints} / {cat.allocatedWeight} pts</strong>
                      <span className="text-[11px] text-brand-textMuted"> ({allocationPct}%)</span>
                    </div>
                    <div>
                      <span>Category Coverage: </span>
                      <strong className={isEligible ? "text-emerald-400" : "text-amber-400"}>
                        {coveragePct}%
                      </strong>
                      <span className="text-[11px] text-brand-textMuted"> ({cat.testedPoints} / {cat.allocatedWeight} pts)</span>
                    </div>
                  </div>

                  {/* Test Counts Summary */}
                  <div className="text-[11px] text-brand-textMuted flex flex-wrap gap-2 pt-0.5">
                    <span>
                      Pass: <strong className="text-emerald-400">{cat.testCounts.pass}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Warning: <strong className="text-amber-400">{cat.testCounts.warning}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Fail: <strong className="text-rose-400">{cat.testCounts.fail}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Non-evaluated / Unknown: <strong className="text-slate-400">{cat.testCounts.unknown + cat.testCounts.notTested + cat.testCounts.blocked + cat.testCounts.notApplicable}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-brand-borderSubtle">
                  <div className="text-right">
                    <span className={`text-2xl font-black ${getTextColor(cat.scorePercentage)}`}>
                      {cat.scorePercentage}%
                    </span>
                    <span className="block text-[10px] uppercase font-bold text-brand-textMuted">
                      {isEligible ? "Category Score" : "Provisional Score"}
                    </span>
                  </div>
                  <button className="p-1.5 rounded-lg bg-brand-card border border-brand-borderSubtle text-brand-textMuted hover:text-white transition-colors">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Rule Details Table */}
              {isExpanded && (
                <div className="border-t border-brand-borderSubtle bg-brand-card/70 p-4 sm:p-6 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-textMuted">
                    Individual Test Results ({catResults.length} Tests in {cat.categoryName})
                  </h4>
                  <div className="space-y-2">
                    {catResults.map((r) => (
                      <div
                        key={r.testId}
                        className="p-3 rounded-lg bg-brand-surface border border-brand-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-brand-cyan">{r.testId}</span>
                            <span className="font-semibold text-white">{r.testName}</span>
                          </div>
                          <p className="text-brand-textMuted text-[11px]">{r.summary}</p>
                          {r.limitations && (
                            <p className="text-amber-400/90 text-[10px] italic">Note: {r.limitations}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-brand-textMuted">
                            {r.earnedPoints} / {r.maxPoints} pts
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                              r.status === "PASS"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : r.status === "WARNING"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : r.status === "FAIL"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
