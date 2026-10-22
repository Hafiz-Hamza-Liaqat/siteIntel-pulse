"use client";

import { Users, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import type { CompetitorComparison } from "@/types";

interface CompetitorBenchmarkViewProps {
  companyDomain: string;
  companyScore: number;
  competitors: CompetitorComparison[];
}

export function CompetitorBenchmarkView({
  companyDomain,
  companyScore,
  competitors,
}: CompetitorBenchmarkViewProps) {
  return (
    <section id="section-competitors" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Competitor Benchmark Analysis</h2>
            <p className="text-xs text-brand-textMuted">
              Comparative baseline against up to 3 industry competitors (surface public audit)
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-brand-surface/80 text-brand-textMuted font-semibold border-b border-brand-border">
            <tr>
              <th className="py-3 px-4">Domain</th>
              <th className="py-3 px-3">Overall Score</th>
              <th className="py-3 px-3">Data Provenance</th>
              <th className="py-3 px-3">Key Strengths</th>
              <th className="py-3 px-3">Observed Weaknesses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/60 text-brand-text">
            {/* Audited Company Row */}
            <tr className="bg-brand-cyan/5 font-semibold">
              <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                <span>{companyDomain} (Target Platform)</span>
              </td>
              <td className="py-3.5 px-3">
                <span className="text-sm font-black text-brand-cyan">
                  {companyScore}/100
                </span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">
                Full 56-Rule Deep Audit
              </td>
              <td className="py-3.5 px-3 text-emerald-400">
                Verified crawl dataset & DOM evidence
              </td>
              <td className="py-3.5 px-3 text-slate-400">
                See finding ledger below
              </td>
            </tr>

            {/* Competitor Rows */}
            {competitors.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-brand-textMuted">
                  No competitor domains configured for this assessment run.
                </td>
              </tr>
            ) : (
              competitors.map((comp) => (
                <tr key={comp.domain} className="hover:bg-brand-surface/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-white">{comp.domain}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-200">
                      {comp.overallScore}/100
                    </span>
                  </td>
                  <td className="py-3 px-3 text-brand-textMuted">
                    {comp.dataProvenance}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {comp.keyStrengths.join(", ") || "Standard Baseline"}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {comp.keyWeaknesses.join(", ") || "Standard Baseline"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
