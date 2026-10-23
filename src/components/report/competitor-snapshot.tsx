import React from "react";
import { OwnerReport } from "@/types";
import { Users, Shield, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

interface CompetitorSnapshotProps {
  report: OwnerReport;
}

export function CompetitorSnapshot({ report }: CompetitorSnapshotProps) {
  const competitors = report.competitorSnapshot;

  if (competitors.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-teal" />
            <span>Competitive Benchmark Snapshot</span>
          </h2>
          <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
            Section 11 of 13
          </span>
        </div>
        <p className="text-sm text-brand-textMuted">
          No competitor domains were provided during intake. To enable side-by-side benchmark comparison,
          supply up to three competitor domains when launching an audit.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-teal" />
            <span>Competitive Benchmark Snapshot</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Comparison evaluated under the identical SiteIntel Pulse assessment rules and crawl parameters.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 11 of 13
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface text-brand-textMuted text-xs uppercase">
              <th className="p-3 font-semibold">Domain</th>
              <th className="p-3 font-semibold">Overall Score</th>
              <th className="p-3 font-semibold">Technical Health</th>
              <th className="p-3 font-semibold">SEO Index</th>
              <th className="p-3 font-semibold">Speed Index</th>
              <th className="p-3 font-semibold">HTTPS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-borderSubtle">
            {/* Target Domain */}
            <tr className="bg-brand-teal/5 font-bold text-white">
              <td className="p-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-teal" />
                <span>{report.companyIdentity.domain} (Your Platform)</span>
              </td>
              <td className="p-3 text-brand-tealLight font-mono text-base">
                {report.executiveSnapshot.overallScore.score}/100
              </td>
              <td className="p-3 font-mono">
                {report.scoreDetails.find((c) => c.category === "technical_health")?.scorePercentage || 0}%
              </td>
              <td className="p-3 font-mono">
                {report.scoreDetails.find((c) => c.category === "seo")?.scorePercentage || 0}%
              </td>
              <td className="p-3 font-mono">
                {report.scoreDetails.find((c) => c.category === "performance")?.scorePercentage || 0}%
              </td>
              <td className="p-3 text-status-pass flex items-center gap-1 font-normal text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active</span>
              </td>
            </tr>

            {/* Competitors */}
            {competitors.map((c, idx) => (
              <tr key={idx} className="text-brand-text hover:bg-brand-surface/40">
                <td className="p-3 font-medium text-white">{c.domain}</td>
                <td className="p-3 font-mono text-brand-textMuted">
                  {c.status === "NOT_ASSESSED" || c.overallScore == null ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      NOT ASSESSED
                    </span>
                  ) : (
                    `${c.overallScore}/100`
                  )}
                </td>
                <td className="p-3 font-mono">
                  {c.status === "NOT_ASSESSED" || c.keyMetrics.technicalHealthScore == null ? "NOT ASSESSED" : `${c.keyMetrics.technicalHealthScore}%`}
                </td>
                <td className="p-3 font-mono">
                  {c.status === "NOT_ASSESSED" || c.keyMetrics.seoScore == null ? "NOT ASSESSED" : `${c.keyMetrics.seoScore}%`}
                </td>
                <td className="p-3 font-mono">
                  {c.status === "NOT_ASSESSED" || c.keyMetrics.performanceScore == null ? "NOT ASSESSED" : `${c.keyMetrics.performanceScore}%`}
                </td>
                <td className="p-3 text-brand-textMuted text-xs flex items-center gap-1">
                  {c.status === "NOT_ASSESSED" || c.keyMetrics.httpsActive == null ? (
                    <span className="text-slate-400 text-xs">NOT ASSESSED</span>
                  ) : (
                    <>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${c.keyMetrics.httpsActive ? "text-status-pass" : "text-status-fail"}`} />
                      <span>{c.keyMetrics.httpsActive ? "Active" : "Insecure"}</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-brand-textMuted italic">
        * Comparative metrics reflect public observation under identical rule catalogue v1.0.0. SiteIntel Pulse does not fabricate estimated search traffic or ranking data.
      </div>
    </div>
  );
}
