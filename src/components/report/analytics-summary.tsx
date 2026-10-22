import React from "react";
import { OwnerReport } from "@/types";
import { BarChart2, CheckCircle2, AlertTriangle, ShieldCheck, Tag } from "lucide-react";

interface AnalyticsSummaryProps {
  report: OwnerReport;
}

export function AnalyticsSummary({ report }: AnalyticsSummaryProps) {
  const ana = report.analyticsAndTrackingSummary;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-teal" />
            <span>Analytics, Attribution &amp; Tracking Readiness</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Measures your capability to track visitor conversions, attribution, and GDPR consent.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 10 of 13
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-brand-cyan" />
            <span>Google Analytics 4</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            {ana.ga4Detected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>GA4 Script Detected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Not Observed</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Records visitor traffic and behavior.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-brand-cyan" />
            <span>Tag Manager (GTM)</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            {ana.gtmDetected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Container Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Not In Use</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Manages conversion tags and marketing pixels.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-brand-cyan" />
            <span>Advertising Pixels</span>
          </div>
          <div className="text-sm font-bold text-white">
            {ana.advertisingPixelsCount} Pixel Scripts Active
          </div>
          <p className="text-xs text-brand-textMuted">Meta, LinkedIn, or Google Ads retargeting.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-cyan" />
            <span>Consent Mechanism</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            {ana.consentUiDetected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Consent UI Present</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>No Banner Observed</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">GDPR/CCPA cookie compliance mechanism.</p>
        </div>
      </div>
    </div>
  );
}
