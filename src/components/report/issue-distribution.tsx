import React from "react";
import { OwnerReport } from "@/types";
import { AlertCircle, AlertTriangle, Info, XCircle, ShieldAlert } from "lucide-react";

interface IssueDistributionProps {
  report: OwnerReport;
}

export function IssueDistribution({ report }: IssueDistributionProps) {
  const issues = report.issueDistribution;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-teal" />
            <span>Issue Distribution by Severity</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Prioritized by business risk to help Company A tackle highest-urgency platform gaps first.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 5 of 13
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical */}
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Critical</span>
            </span>
            <span className="text-2xl font-black text-white">{issues.critical}</span>
          </div>
          <p className="text-xs text-red-300/80 leading-relaxed">
            Severe blockers causing immediate traffic loss, site downtime, or unencrypted login risks.
          </p>
          <div className="text-[10px] text-red-400 font-bold uppercase pt-1">Fix Timeline: 24 Hours</div>
        </div>

        {/* High */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>High Priority</span>
            </span>
            <span className="text-2xl font-black text-white">{issues.high}</span>
          </div>
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Major SEO deficiencies, sluggish page speeds, or missing security headers hurting conversion.
          </p>
          <div className="text-[10px] text-amber-400 font-bold uppercase pt-1">Fix Timeline: 1–2 Weeks</div>
        </div>

        {/* Medium */}
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Medium</span>
            </span>
            <span className="text-2xl font-black text-white">{issues.medium}</span>
          </div>
          <p className="text-xs text-yellow-300/80 leading-relaxed">
            Suboptimal title lengths, empty anchor labels, or missing structured rich snippet data.
          </p>
          <div className="text-[10px] text-yellow-400 font-bold uppercase pt-1">Fix Timeline: 30 Days</div>
        </div>

        {/* Low / Info */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              <span>Low / Info</span>
            </span>
            <span className="text-2xl font-black text-white">{issues.low}</span>
          </div>
          <p className="text-xs text-blue-300/80 leading-relaxed">
            Content expansion opportunities, social card polish, and minor tracking maintenance.
          </p>
          <div className="text-[10px] text-blue-400 font-bold uppercase pt-1">Fix Timeline: Ongoing</div>
        </div>
      </div>
    </div>
  );
}
