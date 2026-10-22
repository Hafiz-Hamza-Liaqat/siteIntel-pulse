"use client";

import { PieChart, CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import type { IntegrationDiagnostic } from "@/types";

interface IntegrationsViewProps {
  integrations: IntegrationDiagnostic[];
}

export function IntegrationsView({ integrations }: IntegrationsViewProps) {
  const getStateBadge = (state: string) => {
    switch (state) {
      case "BEHAVIOR_VERIFIED":
      case "LOAD_OBSERVED":
      case "DETECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            DETECTED
          </span>
        );
      case "CONSENT_DEPENDENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            CONSENT GATED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" />
            NOT DETECTED
          </span>
        );
    }
  };

  return (
    <section id="section-analytics" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analytics, Tags & Consent Integrations</h2>
            <p className="text-xs text-brand-textMuted">
              Measurement IDs, container configurations, marketing pixels, and CMP consent detection
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-brand-border bg-brand-card hover:border-brand-borderHover transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{item.name}</span>
              {getStateBadge(item.state)}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-brand-textMuted">
                <span>Category:</span>
                <span className="font-semibold text-slate-300 uppercase text-[10px]">
                  {item.category}
                </span>
              </div>

              {item.detectedClues && item.detectedClues.length > 0 && (
                <div className="flex items-center justify-between text-brand-textMuted">
                  <span>Detected Clue:</span>
                  <span className="font-mono text-brand-cyan font-bold truncate max-w-xs">
                    {item.detectedClues[0]}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-brand-border/60 text-[11px] text-brand-textMuted leading-relaxed">
              {item.notes}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
