import React from "react";
import { CostOfInactionResult } from "@/types";
import { TrendingUp, AlertCircle, ShieldAlert, DollarSign, Calculator, Clock } from "lucide-react";

interface CostOfInactionCardProps {
  costOfInaction?: CostOfInactionResult;
  result?: CostOfInactionResult;
}

export function CostOfInactionCard({ costOfInaction, result }: CostOfInactionCardProps) {
  const data = costOfInaction || result;
  if (!data) return null;

  const isEstimated = data.status === "ESTIMATED" && Boolean(data.scenarios);
  const currencySymbol = data.currency === "EUR" ? "€" : data.currency === "GBP" ? "£" : "$";
  const businessModel = (data.businessModel || "ecommerce").toUpperCase();
  const confidence = data.confidence || "MEDIUM";

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-teal" />
            <span>Cost of Inaction &amp; Revenue Opportunity Calculator</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Simulates potential commercial upside from eliminating observable UX, speed, and conversion barriers.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-brand-tealLight bg-brand-teal/10 px-3 py-1 rounded-md border border-brand-teal/30">
            Model: {businessModel}
          </span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
            confidence === "HIGH"
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : confidence === "MEDIUM"
              ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
          }`}>
            {confidence} Confidence
          </span>
        </div>
      </div>

      {!isEstimated ? (
        <div className="rounded-xl bg-brand-surface border border-brand-borderSubtle p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Commercial Session Inputs Required</h3>
              <p className="text-xs text-brand-textMuted">
                {data.methodologyNotes}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-brand-card border border-brand-borderSubtle text-xs text-brand-textMuted font-mono">
            <strong>Opportunity Formula:</strong> {data.formula}
          </div>

          <div className="space-y-1.5 text-xs text-brand-textMuted">
            <div className="font-semibold text-white">Modeling Policies &amp; Invariants:</div>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              {(data.assumptions || []).map((a, idx) => (
                <li key={idx}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3 Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Conservative */}
            <div className="rounded-xl bg-brand-surface border border-brand-borderSubtle p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-textMuted uppercase tracking-wider">
                  Conservative Scenario
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-card text-brand-textMuted border border-brand-borderSubtle">
                  +{data.scenarios!.conservative.conversionRateDeltaPct}% CR
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-white">
                  {currencySymbol}{data.scenarios!.conservative.monthlyOpportunity.toLocaleString()}
                  <span className="text-xs text-brand-textMuted font-normal"> / mo</span>
                </div>
                <div className="text-xs text-brand-teal font-semibold mt-1">
                  {currencySymbol}{data.scenarios!.conservative.annualOpportunity.toLocaleString()} annualized opportunity
                </div>
              </div>
              <div className="pt-2 border-t border-brand-borderSubtle/60 flex items-center justify-between text-xs text-brand-textMuted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Est. Payback</span>
                </span>
                <span className="font-semibold text-white">
                  {data.scenarios!.conservative.paybackMonths != null
                    ? `${data.scenarios!.conservative.paybackMonths} months`
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* Base Scenario (Highlighted) */}
            <div className="rounded-xl bg-brand-teal/10 border border-brand-teal/40 p-5 space-y-4 shadow-lg shadow-brand-teal/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-tealLight uppercase tracking-wider">
                  Base Opportunity (Target)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-teal/20 text-brand-tealLight border border-brand-teal/30">
                  +{data.scenarios!.base.conversionRateDeltaPct}% CR
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-white">
                  {currencySymbol}{data.scenarios!.base.monthlyOpportunity.toLocaleString()}
                  <span className="text-xs text-brand-textMuted font-normal"> / mo</span>
                </div>
                <div className="text-xs text-brand-tealLight font-bold mt-1">
                  {currencySymbol}{data.scenarios!.base.annualOpportunity.toLocaleString()} annualized opportunity
                </div>
              </div>
              <div className="pt-2 border-t border-brand-teal/30 flex items-center justify-between text-xs text-brand-textMuted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Est. Payback</span>
                </span>
                <span className="font-bold text-brand-tealLight">
                  {data.scenarios!.base.paybackMonths != null
                    ? `${data.scenarios!.base.paybackMonths} months`
                    : "Immediate"}
                </span>
              </div>
            </div>

            {/* Upside Scenario */}
            <div className="rounded-xl bg-brand-surface border border-brand-borderSubtle p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Upside Scenario
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-card text-brand-textMuted border border-brand-borderSubtle">
                  +{data.scenarios!.upside.conversionRateDeltaPct}% CR
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-white">
                  {currencySymbol}{data.scenarios!.upside.monthlyOpportunity.toLocaleString()}
                  <span className="text-xs text-brand-textMuted font-normal"> / mo</span>
                </div>
                <div className="text-xs text-cyan-400 font-semibold mt-1">
                  {currencySymbol}{data.scenarios!.upside.annualOpportunity.toLocaleString()} annualized opportunity
                </div>
              </div>
              <div className="pt-2 border-t border-brand-borderSubtle/60 flex items-center justify-between text-xs text-brand-textMuted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Est. Payback</span>
                </span>
                <span className="font-semibold text-white">
                  {data.scenarios!.upside.paybackMonths != null
                    ? `${data.scenarios!.upside.paybackMonths} months`
                    : "Immediate"}
                </span>
              </div>
            </div>
          </div>

          {/* Formula & Provenance Details */}
          <div className="rounded-xl bg-brand-surface border border-brand-borderSubtle p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-brand-teal" />
                <span>Opportunity Formula</span>
              </span>
              <span className="text-brand-textMuted font-mono text-[11px]">{data.inputSource}</span>
            </div>
            <div className="text-xs font-mono text-brand-tealLight bg-brand-card p-2.5 rounded border border-brand-borderSubtle">
              {data.formula}
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-white block">Labeled Assumptions &amp; Inputs:</span>
              <ul className="list-disc list-inside space-y-1 text-brand-textMuted text-[11px]">
                {(data.assumptions || []).map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Explicit Disclaimers Banner */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-4 flex items-start gap-3 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-200">Forward-Looking Opportunity Disclosure</div>
              <div>
                {(data.disclaimers || [])[0]} {(data.disclaimers || [])[1]}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
