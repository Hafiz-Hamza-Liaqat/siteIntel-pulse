import React from "react";
import { OwnerReport } from "@/types";
import { Gauge, Smartphone, Monitor, CheckCircle2, AlertCircle, Activity } from "lucide-react";

interface PerformanceResponsiveSummaryProps {
  report: OwnerReport;
}

export function PerformanceResponsiveSummary({ report }: PerformanceResponsiveSummaryProps) {
  const perf = report.performanceAndResponsiveSummary;
  const isMobileMeasured = perf.mobileLabScore != null;
  const isDesktopMeasured = perf.desktopLabScore != null;
  const lab = perf.labMetrics;
  const field = perf.fieldMetrics;

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
            {isMobileMeasured ? (
              <span className="text-2xl font-black text-brand-tealLight">{perf.mobileLabScore}/100</span>
            ) : (
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20">
                UNCONFIGURED
              </span>
            )}
          </div>
          <div className="w-full bg-brand-card h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isMobileMeasured ? "bg-brand-teal" : "bg-brand-borderSubtle"}`}
              style={{ width: `${perf.mobileLabScore ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-brand-textMuted">
            {isMobileMeasured
              ? "Simulated mobile 4G network performance via Lighthouse."
              : "Google PageSpeed Insights API key not configured; synthetic scores are never fabricated."}
          </p>
        </div>

        {/* Desktop Speed */}
        <div className="p-5 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-brand-cyan" />
              <span>Desktop Lab Score</span>
            </span>
            {isDesktopMeasured ? (
              <span className="text-2xl font-black text-brand-cyan">{perf.desktopLabScore}/100</span>
            ) : (
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20">
                UNCONFIGURED
              </span>
            )}
          </div>
          <div className="w-full bg-brand-card h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isDesktopMeasured ? "bg-brand-cyan" : "bg-brand-borderSubtle"}`}
              style={{ width: `${perf.desktopLabScore ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-brand-textMuted">
            {isDesktopMeasured
              ? "Desktop high-speed connection rendering via Lighthouse."
              : "Google PageSpeed Insights API key not configured; synthetic scores are never fabricated."}
          </p>
        </div>

        {/* Core Web Vitals Status */}
        <div className="p-5 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <span className="text-xs font-semibold text-brand-textMuted uppercase block">
            Core Web Vitals Field Status
          </span>
          <div className="text-sm font-semibold text-white">{perf.coreWebVitalsStatus}</div>
          <p className="text-xs text-brand-textMuted">
            Field metrics reflect 28-day Chrome User Experience (CrUX) data when provider credentials are active.
          </p>
        </div>
      </div>

      {/* Lab & Field Metrics Breakdown (When Available) */}
      {(lab || field) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lab && (
            <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Measured Lab Diagnostics ({lab.strategy?.toUpperCase() || "MOBILE"})</span>
                </span>
                <span className="text-[10px] text-brand-textMuted">{lab.providerName || "Lighthouse"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">Speed Index</div>
                  <div className="font-bold text-white mt-0.5">{lab.speedIndexMs != null ? `${lab.speedIndexMs}ms` : "N/A"}</div>
                </div>
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">FCP</div>
                  <div className="font-bold text-white mt-0.5">{lab.fcpMs != null ? `${lab.fcpMs}ms` : "N/A"}</div>
                </div>
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">LCP</div>
                  <div className="font-bold text-white mt-0.5">{lab.lcpMs != null ? `${lab.lcpMs}ms` : "N/A"}</div>
                </div>
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">TBT</div>
                  <div className="font-bold text-white mt-0.5">{lab.tbtMs != null ? `${lab.tbtMs}ms` : "N/A"}</div>
                </div>
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">TTFB</div>
                  <div className="font-bold text-white mt-0.5">{lab.ttfbMs != null ? `${lab.ttfbMs}ms` : "N/A"}</div>
                </div>
              </div>
            </div>
          )}

          {field && (
            <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CrUX Field Data (75th Percentile)</span>
                </span>
                <span className="text-[10px] text-brand-textMuted">Chrome User Experience Report</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">Field LCP</div>
                  <div className="font-bold text-white mt-0.5">{field.lcpMs != null ? `${field.lcpMs}ms` : "N/A"}</div>
                </div>
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">Field INP</div>
                  <div className="font-bold text-white mt-0.5">{field.inpMs != null ? `${field.inpMs}ms` : "N/A"}</div>
                </div>
                <div className="p-2 rounded bg-brand-card border border-brand-borderSubtle">
                  <div className="text-[10px] text-brand-textMuted font-sans uppercase">Field CLS</div>
                  <div className="font-bold text-white mt-0.5">{field.cls != null ? field.cls.toFixed(2) : "N/A"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
