"use client";

import { Shield, ShieldAlert, ShieldCheck, AlertCircle, Lock, ExternalLink } from "lucide-react";
import type { SecurityDiagnostic } from "@/types";

interface SecurityDiagnosticsViewProps {
  security: SecurityDiagnostic[];
}

export function SecurityDiagnosticsView({ security }: SecurityDiagnosticsViewProps) {
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">LOW</span>;
    }
  };

  return (
    <section id="section-security" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Public Security Configuration</h2>
            <p className="text-xs text-brand-textMuted">
              HTTP response headers, clickjacking defense, transport security, and browser sandboxing
            </p>
          </div>
        </div>
      </div>

      {/* Security Headers Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-brand-surface/80 text-brand-textMuted font-semibold border-b border-brand-border">
            <tr>
              <th className="py-3 px-4">Security Control</th>
              <th className="py-3 px-3">Severity</th>
              <th className="py-3 px-3">Observed Directive</th>
              <th className="py-3 px-3">Exploitability & Technical Risk</th>
              <th className="py-3 px-3">Recommended Remediation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/60 text-brand-text">
            {security.map((sec) => (
              <tr key={sec.id} className="hover:bg-brand-surface/40 transition-colors">
                <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                  <div>{sec.title}</div>
                  {sec.headerName && (
                    <div className="font-mono text-[10px] text-brand-cyan mt-0.5">
                      {sec.headerName}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  {getSeverityBadge(sec.severity)}
                </td>
                <td className="py-3 px-3 font-mono text-[11px] max-w-xs truncate" title={sec.observedValue || "Not configured"}>
                  <span className={sec.observedValue ? "text-slate-200" : "text-rose-400 font-bold"}>
                    {sec.observedValue || "Missing / Not Sent"}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-300 max-w-xs leading-relaxed">
                  {sec.exploitabilityNote}
                </td>
                <td className="py-3 px-3 text-brand-cyan text-[11px] max-w-xs leading-relaxed">
                  {sec.remediation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
