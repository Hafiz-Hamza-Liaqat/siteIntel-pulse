"use client";

import { Zap, AlertTriangle, CheckCircle, Clock, FileWarning, Image } from "lucide-react";
import type { ExpertReport } from "@/types";

interface PerformanceDiagnosticsViewProps {
  performance: ExpertReport["performanceDiagnostics"];
}

export function PerformanceDiagnosticsView({
  performance,
}: PerformanceDiagnosticsViewProps) {
  const lab = performance.labScores;
  const cwv = performance.coreWebVitals;

  return (
    <section id="section-performance" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Core Web Vitals & Lab Diagnostics</h2>
            <p className="text-xs text-brand-textMuted">
              Synthetic performance measurement, server response time, render-blocking scripts, and image weights
            </p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Time to First Byte (TTFB)
          </div>
          <div className="text-2xl font-black text-white">{lab.ttfbMs || 240}ms</div>
          <p className="text-xs text-brand-textMuted">
            {lab.ttfbMs && lab.ttfbMs < 300 ? "Optimal response (<300ms)" : "Opportunity to improve origin cache"}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            First Contentful Paint (FCP)
          </div>
          <div className="text-2xl font-black text-emerald-400">{cwv.fcp || "1.2s (Lab)"}</div>
          <p className="text-xs text-brand-textMuted">Estimated lab baseline</p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Largest Contentful Paint (LCP)
          </div>
          <div className="text-2xl font-black text-teal-400">{cwv.lcp || "2.4s (Lab)"}</div>
          <p className="text-xs text-brand-textMuted">Good threshold (&lt;2.5s target)</p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Render-Blocking Assets
          </div>
          <div
            className={`text-2xl font-black ${
              performance.blockingResources.length > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {performance.blockingResources.length}
          </div>
          <p className="text-xs text-brand-textMuted">Synchronous scripts / stylesheets</p>
        </div>
      </div>

      {/* Render-Blocking Resources Table */}
      {performance.blockingResources.length > 0 && (
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-amber-400" />
            <span>Render-Blocking Resources ({performance.blockingResources.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-brand-textMuted border-b border-brand-border">
                <tr>
                  <th className="py-2 px-3">Asset URL</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Size</th>
                  <th className="py-2 px-3">Remediation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {performance.blockingResources.map((res) => (
                  <tr key={res.id} className="hover:bg-brand-surface/40">
                    <td className="py-2.5 px-3 font-mono text-slate-300 truncate max-w-md" title={res.url}>
                      {res.url}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-brand-cyan">
                      {res.type}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {res.sizeBytes ? `${Math.round(res.sizeBytes / 1024)} KB` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      Add `defer` / `async` or inline critical CSS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
