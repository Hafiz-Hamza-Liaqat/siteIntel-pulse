import React from "react";
import { OwnerReport } from "@/types";
import { TrendingUp, ArrowRight, AlertTriangle, CheckCircle, Zap } from "lucide-react";

interface PriorityOpportunityPlanProps {
  report: OwnerReport;
}

export function PriorityOpportunityPlan({ report }: PriorityOpportunityPlanProps) {
  const opportunities = report.priorityOpportunities;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-teal" />
            <span>Priority Opportunity Plan (Top Growth Initiatives)</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Actionable, evidence-backed improvements mapped to relevant digital service disciplines.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 12 of 13
        </span>
      </div>

      <div className="space-y-4">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="p-5 rounded-xl bg-brand-surface border border-brand-borderSubtle hover:border-brand-teal/40 transition-colors space-y-3 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-brand-teal/20 text-brand-tealLight font-bold text-sm flex items-center justify-center shrink-0">
                  #{opp.rank}
                </span>
                <h3 className="font-bold text-white text-base">{opp.title}</h3>
              </div>

              <span
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto ${
                  opp.urgency === "HIGH"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                }`}
              >
                {opp.urgency} Priority
              </span>
            </div>

            <p className="text-sm text-brand-textMuted leading-relaxed">{opp.businessImpact}</p>

            <div className="pt-2 border-t border-brand-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-brand-tealLight font-medium">
                <strong>Recommended Action:</strong> {opp.recommendedAction}
              </div>
              <div className="text-brand-textMuted text-[11px] font-mono shrink-0">
                Service Field: <span className="text-white font-sans font-semibold">{opp.potentialServiceCategory}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
