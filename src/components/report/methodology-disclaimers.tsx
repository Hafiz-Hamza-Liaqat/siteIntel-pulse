import React from "react";
import { OwnerReport } from "@/types";
import { FileText, ShieldAlert, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

interface MethodologyDisclaimersProps {
  report: OwnerReport;
}

export function MethodologyDisclaimers({ report }: MethodologyDisclaimersProps) {
  const meth = report.methodologyAndLimitations;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal" />
            <span>Methodology, Limitations &amp; Next Steps</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Evidence provenance and operational boundaries of the Milestone 1 Website Owner Audit.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 13 of 13
        </span>
      </div>

      <div className="space-y-4 text-xs text-brand-text leading-relaxed">
        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <strong className="text-white block font-semibold text-sm">Scan Scope &amp; Safety Boundary:</strong>
          <p className="text-brand-textMuted">{meth.scanScope}</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <strong className="text-white block font-semibold text-sm">Data Sources &amp; Measurement Basis:</strong>
          <ul className="list-disc pl-5 space-y-1 text-brand-textMuted">
            {meth.dataSources.map((ds, idx) => (
              <li key={idx}>{ds}</li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <strong className="text-white block font-semibold text-sm">Disclaimers &amp; Reporting Integrity:</strong>
          <ul className="list-disc pl-5 space-y-1 text-brand-textMuted">
            {meth.disclaimers.map((disc, idx) => (
              <li key={idx}>{disc}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Milestone 2 Expert Audit Next Steps Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-brand-surface to-brand-card border border-brand-cyan/40 space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brand-cyan">
            Next Level: Milestone 2 Expert Audit
          </span>
          <h3 className="text-lg font-bold text-white">Need Exact Code Fix Locations &amp; Engineer Work Plans?</h3>
          <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
            {meth.expertEngagementCta}
          </p>
        </div>

        <div>
          <Link
            href="/expert-audit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-surface hover:bg-brand-surfaceHover text-brand-text border border-brand-border text-xs font-bold transition-all"
          >
            <span>Learn About Company B Expert Audit</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-cyan" />
          </Link>
        </div>
      </div>
    </div>
  );
}
