"use client";

import { Smartphone, Monitor, Tablet, AlertTriangle, CheckCircle, Eye } from "lucide-react";
import type { ResponsiveDiagnostic } from "@/types";

interface ResponsiveMatrixViewProps {
  responsive: ResponsiveDiagnostic[];
}

export function ResponsiveMatrixView({ responsive }: ResponsiveMatrixViewProps) {
  const getDeviceIcon = (viewport: number) => {
    if (viewport < 600) return Smartphone;
    if (viewport < 1024) return Tablet;
    return Monitor;
  };

  const getDeviceLabel = (viewport: number) => {
    if (viewport === 320) return "Small Mobile (iPhone SE)";
    if (viewport === 375) return "Standard Mobile (iPhone 13)";
    if (viewport === 414) return "Large Mobile (iPhone Max / Pixel)";
    if (viewport === 768) return "Tablet Portrait (iPad Mini)";
    if (viewport === 1024) return "Tablet Landscape / Small Laptop";
    if (viewport === 1280) return "Standard Desktop";
    return "Wide Desktop (1440p+)";
  };

  return (
    <section id="section-responsive" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Responsive Multi-Viewport Matrix</h2>
            <p className="text-xs text-brand-textMuted">
              Synthetic emulation across 7 screen resolutions: horizontal overflow, clipping, and tap targets
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {responsive.map((r) => {
          const Icon = getDeviceIcon(r.viewport);

          return (
            <div
              key={r.viewport}
              className={`p-4 rounded-xl border bg-brand-card transition-all space-y-3 ${
                r.horizontalOverflow
                  ? "border-rose-500/40 bg-rose-500/5 shadow-md shadow-rose-500/5"
                  : "border-brand-border hover:border-brand-borderHover"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brand-surface text-brand-cyan border border-brand-border">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{r.viewport}px</div>
                    <div className="text-[10px] text-brand-textMuted">{getDeviceLabel(r.viewport)}</div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    r.horizontalOverflow
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {r.horizontalOverflow ? "OVERFLOW" : "PASS"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs pt-1 border-t border-brand-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-brand-textMuted">Touch Targets Deficits:</span>
                  <span
                    className={`font-semibold ${
                      r.touchTargetIssues > 0 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {r.touchTargetIssues > 0 ? `${r.touchTargetIssues} elements` : "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-brand-textMuted">Clipping / Truncation:</span>
                  <span
                    className={`font-semibold ${
                      r.clippingIssues > 0 ? "text-rose-400" : "text-slate-300"
                    }`}
                  >
                    {r.clippingIssues > 0 ? `${r.clippingIssues} issues` : "None"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-brand-textMuted">Severity Band:</span>
                  <span className="font-bold text-slate-300">{r.severity}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
