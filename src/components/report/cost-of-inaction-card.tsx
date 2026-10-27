import React from "react";
import { CostOfInactionResult } from "@/types";
import { TrendingUp, AlertCircle, ShieldAlert, Calculator, Clock, Wrench } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@/lib/reports/currency";

interface CostOfInactionCardProps {
  costOfInaction?: CostOfInactionResult;
  result?: CostOfInactionResult;
}

export function CostOfInactionCard({ costOfInaction, result }: CostOfInactionCardProps) {
  const data = costOfInaction || result;
  if (!data) return null;

  const isEstimated = data.status === "ESTIMATED" && Boolean(data.scenarios);
  const currency = data.currency || "USD";
  const businessModel = (data.businessModel || "ecommerce").toUpperCase();
  const confidence = data.confidence || "MEDIUM";
  const hasExplicitGrossMargin = data.grossMarginPct != null;
  const remediationCost = data.remediationCostEstimate ?? 0;

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
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-brand-tealLight bg-brand-teal/10 px-3 py-1 rounded-md border border-brand-teal/30">
            Model: {businessModel}
          </span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
              hasExplicitGrossMargin
                ? "bg-brand-teal/15 text-brand-tealLight border-brand-teal/30"
                : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
            }`}
          >
            {hasExplicitGrossMargin
              ? `Gross Profit (${data.grossMarginPct}% Margin)`
              : "Revenue Model (Margin Omitted)"}
          </span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
              confidence === "HIGH"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : confidence === "MEDIUM"
                ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
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
              <p className="text-xs text-brand-textMuted">{data.methodologyNotes}</p>
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
          {/* Estimated Remediation Cost Callout */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-surface border border-brand-borderSubtle text-xs text-brand-textMuted">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-brand-teal" />
              <span>
                <strong className="text-white">Estimated Remediation Investment:</strong>{" "}
                Benchmark engineering cost based on observable friction findings.
              </span>
            </div>
            <span className="text-sm font-bold text-white">
              {formatCurrency(remediationCost, currency)}
            </span>
          </div>

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

              {/* Primary Metric */}
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-brand-textMuted">
                  {hasExplicitGrossMargin ? "Gross-Profit Opportunity" : "Top-Line Revenue Opportunity"}
                </div>
                <div className="text-2xl font-black text-white">
                  {formatCurrency(data.scenarios!.conservative.monthlyOpportunity, currency)}
                  <span className="text-xs text-brand-textMuted font-normal"> / mo</span>
                </div>
                <div className="text-xs text-brand-teal font-semibold mt-0.5">
                  {formatCurrency(data.scenarios!.conservative.annualOpportunity, currency)} / yr{" "}
                  {hasExplicitGrossMargin ? `(${data.grossMarginPct}% margin)` : "annualized"}
                </div>
              </div>

              {/* Detailed Revenue vs Gross-Profit Breakdown */}
              <div className="pt-2 border-t border-brand-borderSubtle/60 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Monthly Revenue:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(
                      data.scenarios!.conservative.monthlyRevenueOpportunity ??
                        data.scenarios!.conservative.monthlyOpportunity,
                      currency
                    )}{" "}
                    / mo
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Annual Revenue:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(
                      data.scenarios!.conservative.annualRevenueOpportunity ??
                        (data.scenarios!.conservative.monthlyRevenueOpportunity
                          ? data.scenarios!.conservative.monthlyRevenueOpportunity * 12
                          : data.scenarios!.conservative.annualOpportunity),
                      currency
                    )}{" "}
                    / yr
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Monthly Gross Profit:</span>
                  <span className="font-semibold text-white">
                    {hasExplicitGrossMargin
                      ? `${formatCurrency(
                          data.scenarios!.conservative.monthlyGrossProfitOpportunity ?? 0,
                          currency
                        )} / mo`
                      : "Omitted (supply margin %)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Annual Gross Profit:</span>
                  <span className="font-semibold text-white">
                    {hasExplicitGrossMargin
                      ? `${formatCurrency(
                          data.scenarios!.conservative.annualGrossProfitOpportunity ?? 0,
                          currency
                        )} / yr`
                      : "Omitted (supply margin %)"}
                  </span>
                </div>
              </div>

              {/* Modeled Conversion Rate */}
              {data.scenarios!.conservative.baselineConversionRatePct != null &&
                data.scenarios!.conservative.modeledConversionRatePct != null && (
                  <div className="text-[10px] font-mono text-brand-textMuted bg-brand-card/80 p-2 rounded border border-brand-borderSubtle">
                    CR: {data.scenarios!.conservative.baselineConversionRatePct.toFixed(2)}% →{" "}
                    {data.scenarios!.conservative.modeledConversionRatePct.toFixed(2)}% (+
                    {data.scenarios!.conservative.conversionRateDeltaPct}% abs)
                  </div>
                )}

              {/* Est. Remediation Cost & Payback */}
              <div className="pt-2 border-t border-brand-borderSubtle/60 space-y-1 text-xs text-brand-textMuted">
                <div className="flex items-center justify-between">
                  <span>Est. Remediation Cost:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(remediationCost, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Est. Payback:</span>
                  </span>
                  <span className="font-semibold text-white">
                    {data.scenarios!.conservative.paybackMonths != null
                      ? `${data.scenarios!.conservative.paybackMonths} months`
                      : "N/A"}
                  </span>
                </div>
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

              {/* Primary Metric */}
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-brand-tealLight">
                  {hasExplicitGrossMargin ? "Gross-Profit Opportunity" : "Top-Line Revenue Opportunity"}
                </div>
                <div className="text-3xl font-black text-white">
                  {formatCurrency(data.scenarios!.base.monthlyOpportunity, currency)}
                  <span className="text-xs text-brand-textMuted font-normal"> / mo</span>
                </div>
                <div className="text-xs text-brand-tealLight font-bold mt-0.5">
                  {formatCurrency(data.scenarios!.base.annualOpportunity, currency)} / yr{" "}
                  {hasExplicitGrossMargin ? `(${data.grossMarginPct}% margin)` : "annualized"}
                </div>
              </div>

              {/* Detailed Revenue vs Gross-Profit Breakdown */}
              <div className="pt-2 border-t border-brand-teal/30 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Monthly Revenue:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(
                      data.scenarios!.base.monthlyRevenueOpportunity ??
                        data.scenarios!.base.monthlyOpportunity,
                      currency
                    )}{" "}
                    / mo
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Annual Revenue:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(
                      data.scenarios!.base.annualRevenueOpportunity ??
                        (data.scenarios!.base.monthlyRevenueOpportunity
                          ? data.scenarios!.base.monthlyRevenueOpportunity * 12
                          : data.scenarios!.base.annualOpportunity),
                      currency
                    )}{" "}
                    / yr
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Monthly Gross Profit:</span>
                  <span className="font-semibold text-white">
                    {hasExplicitGrossMargin
                      ? `${formatCurrency(
                          data.scenarios!.base.monthlyGrossProfitOpportunity ?? 0,
                          currency
                        )} / mo`
                      : "Omitted (supply margin %)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Annual Gross Profit:</span>
                  <span className="font-semibold text-white">
                    {hasExplicitGrossMargin
                      ? `${formatCurrency(
                          data.scenarios!.base.annualGrossProfitOpportunity ?? 0,
                          currency
                        )} / yr`
                      : "Omitted (supply margin %)"}
                  </span>
                </div>
              </div>

              {/* Modeled Conversion Rate */}
              {data.scenarios!.base.baselineConversionRatePct != null &&
                data.scenarios!.base.modeledConversionRatePct != null && (
                  <div className="text-[10px] font-mono text-brand-tealLight bg-brand-card/80 p-2 rounded border border-brand-teal/30">
                    CR: {data.scenarios!.base.baselineConversionRatePct.toFixed(2)}% →{" "}
                    {data.scenarios!.base.modeledConversionRatePct.toFixed(2)}% (+
                    {data.scenarios!.base.conversionRateDeltaPct}% abs)
                  </div>
                )}

              {/* Est. Remediation Cost & Payback */}
              <div className="pt-2 border-t border-brand-teal/30 space-y-1 text-xs text-brand-textMuted">
                <div className="flex items-center justify-between">
                  <span>Est. Remediation Cost:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(remediationCost, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Est. Payback:</span>
                  </span>
                  <span className="font-bold text-brand-tealLight">
                    {data.scenarios!.base.paybackMonths != null
                      ? `${data.scenarios!.base.paybackMonths} months`
                      : "N/A"}
                  </span>
                </div>
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

              {/* Primary Metric */}
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-brand-textMuted">
                  {hasExplicitGrossMargin ? "Gross-Profit Opportunity" : "Top-Line Revenue Opportunity"}
                </div>
                <div className="text-2xl font-black text-white">
                  {formatCurrency(data.scenarios!.upside.monthlyOpportunity, currency)}
                  <span className="text-xs text-brand-textMuted font-normal"> / mo</span>
                </div>
                <div className="text-xs text-cyan-400 font-semibold mt-0.5">
                  {formatCurrency(data.scenarios!.upside.annualOpportunity, currency)} / yr{" "}
                  {hasExplicitGrossMargin ? `(${data.grossMarginPct}% margin)` : "annualized"}
                </div>
              </div>

              {/* Detailed Revenue vs Gross-Profit Breakdown */}
              <div className="pt-2 border-t border-brand-borderSubtle/60 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Monthly Revenue:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(
                      data.scenarios!.upside.monthlyRevenueOpportunity ??
                        data.scenarios!.upside.monthlyOpportunity,
                      currency
                    )}{" "}
                    / mo
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Annual Revenue:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(
                      data.scenarios!.upside.annualRevenueOpportunity ??
                        (data.scenarios!.upside.monthlyRevenueOpportunity
                          ? data.scenarios!.upside.monthlyRevenueOpportunity * 12
                          : data.scenarios!.upside.annualOpportunity),
                      currency
                    )}{" "}
                    / yr
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Monthly Gross Profit:</span>
                  <span className="font-semibold text-white">
                    {hasExplicitGrossMargin
                      ? `${formatCurrency(
                          data.scenarios!.upside.monthlyGrossProfitOpportunity ?? 0,
                          currency
                        )} / mo`
                      : "Omitted (supply margin %)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-brand-textMuted">
                  <span>Annual Gross Profit:</span>
                  <span className="font-semibold text-white">
                    {hasExplicitGrossMargin
                      ? `${formatCurrency(
                          data.scenarios!.upside.annualGrossProfitOpportunity ?? 0,
                          currency
                        )} / yr`
                      : "Omitted (supply margin %)"}
                  </span>
                </div>
              </div>

              {/* Modeled Conversion Rate */}
              {data.scenarios!.upside.baselineConversionRatePct != null &&
                data.scenarios!.upside.modeledConversionRatePct != null && (
                  <div className="text-[10px] font-mono text-brand-textMuted bg-brand-card/80 p-2 rounded border border-brand-borderSubtle">
                    CR: {data.scenarios!.upside.baselineConversionRatePct.toFixed(2)}% →{" "}
                    {data.scenarios!.upside.modeledConversionRatePct.toFixed(2)}% (+
                    {data.scenarios!.upside.conversionRateDeltaPct}% abs)
                  </div>
                )}

              {/* Est. Remediation Cost & Payback */}
              <div className="pt-2 border-t border-brand-borderSubtle/60 space-y-1 text-xs text-brand-textMuted">
                <div className="flex items-center justify-between">
                  <span>Est. Remediation Cost:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(remediationCost, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Est. Payback:</span>
                  </span>
                  <span className="font-semibold text-white">
                    {data.scenarios!.upside.paybackMonths != null
                      ? `${data.scenarios!.upside.paybackMonths} months`
                      : "N/A"}
                  </span>
                </div>
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
