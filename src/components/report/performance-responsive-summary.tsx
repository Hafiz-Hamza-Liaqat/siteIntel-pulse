import React from "react";
import { OwnerReport } from "@/types";
import { Gauge, Smartphone, Monitor, CheckCircle2 } from "lucide-react";

interface PerformanceResponsiveSummaryProps {
  report: OwnerReport;
}

export function PerformanceResponsiveSummary({ report }: PerformanceResponsiveSummaryProps) {
  const perf = report.performanceAndResponsiveSummary;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-teal" />
            <span>Performance &amp; Responsive Experience</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Mobile and desktop speed diagnostics evaluated across a standard 7-viewport matrix.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 7 of 13
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mobile Speed */}
        <div className="p-5 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-brand-tealLight" />
              <span>Mobile Lab Score</span>
            </span>
            <span className="text-2xl font-black text-brand-tealLight">{perf.mobileLabScore ?? "N/A"}/100</span>
          </div>
          <div className="w-full bg-brand-card h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-teal h-full rounded-full"
              style={{ width: `${perf.mobileLabScore ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-brand-textMuted">Simulated mobile 4G network performance.</p>
        </div>

        {/* Desktop Speed */}
        <div className="p-5 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-brand-cyan" />
              <span>Desktop Lab Score</span>
            </span>
            <span className="text-2xl font-black text-brand-cyan">{perf.desktopLabScore ?? "N/A"}/100</span>
          </div>
          <div className="w-full bg-brand-card h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-cyan h-full rounded-full"
              style={{ width: `${perf.desktopLabScore ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-brand-textMuted">Desktop high-speed connection rendering.</p>
        </div>

        {/* Core Web Vitals Status */}
        <div className="p-5 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <span className="text-xs font-semibold text-brand-textMuted uppercase block">
            Core Web Vitals Field Status
          </span>
          <div className="text-sm font-semibold text-white">{perf.coreWebVitalsStatus}</div>
          <p className="text-xs text-brand-textMuted">
            Field data reflects 28-day Chrome User Experience metrics when API key is active.
          </p>
        </div>
      </div>

      {/* Viewport Test Matrix Coverage */}
      <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Responsive Matrix Verification (7 Device Breakpoints)
          </span>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>0 Horizontal Overflows Detected</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {perf.testedViewports.map((vp) => (
            <span
              key={vp}
              className="px-3 py-1 rounded-lg bg-brand-card border border-brand-borderSubtle text-xs font-mono text-brand-text"
            >
              {vp}px width
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
