import React from "react";
import { OwnerReport } from "@/types";
import { Globe, Calendar, Hash, Tag, MapPin, Building, Sparkles, CheckCircle, AlertTriangle } from "lucide-react";

interface CoverSectionProps {
  report: OwnerReport;
}

export function CoverSection({ report }: CoverSectionProps) {
  const company = report.companyIdentity;
  const detection = company.businessCategoryDetection;
  const dateStr = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-borderSubtle pb-6">
        <div className="space-y-1">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-teal">
            Website Owner Report — Milestone 1
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {company.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-brand-textMuted">
            <Globe className="w-4 h-4 text-brand-tealLight" />
            <a
              href={company.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-tealLight hover:underline font-mono"
            >
              {company.targetUrl}
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:items-end text-xs text-brand-textMuted space-y-1 bg-brand-surface/60 p-3.5 rounded-xl border border-brand-borderSubtle">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-brand-teal" />
            <span>Report ID: <strong className="text-white font-mono">{report.reportId}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-teal" />
            <span>Audit Date: <strong className="text-white">{dateStr}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-brand-teal" />
            <span>Audience: <strong className="text-brand-tealLight">Company A Decision-Maker</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
        <div className="p-3 rounded-lg bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <div className="text-brand-textMuted flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Business Category</span>
            </div>
            {detection && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                  detection.decisionSource === "AUTO_DETECTED"
                    ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                    : detection.decisionSource === "MANUALLY_OVERRIDDEN"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-slate-500/15 text-slate-300 border border-slate-500/30"
                }`}
              >
                {detection.decisionSource === "AUTO_DETECTED" ? "Auto" : detection.decisionSource === "MANUALLY_OVERRIDDEN" ? "Overridden" : "Default"}
              </span>
            )}
          </div>
          <div className="font-semibold text-white capitalize">
            {detection ? detection.categoryLabel : company.businessCategory.replace("_", " ")}
          </div>
          {detection && (
            <div className="text-[11px] text-brand-textMuted space-y-0.5 pt-0.5 border-t border-brand-borderSubtle/50">
              <div className="flex items-center justify-between">
                <span>Confidence:</span>
                <span className="font-medium text-slate-300">
                  {detection.confidence} ({Math.round(detection.confidenceScore * 100)}% heuristic)
                </span>
              </div>
              {detection.decisionSource === "MANUALLY_OVERRIDDEN" && detection.primaryCategory !== company.businessCategory && (
                <div className="text-[10px] text-amber-300/90">
                  Detected: {detection.primaryCategory}
                </div>
              )}
              {detection.secondaryFacets && detection.secondaryFacets.length > 0 && (
                <div className="text-[10px] text-cyan-300/90 truncate" title={detection.secondaryFacets.join(", ")}>
                  Facets: {detection.secondaryFacets.map(f => f.replace(/_/g, " ")).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-brand-surface border border-brand-borderSubtle space-y-1">
          <div className="text-brand-textMuted flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Target Market</span>
          </div>
          <div className="font-semibold text-white uppercase">{company.targetMarket}</div>
        </div>

        <div className="p-3 rounded-lg bg-brand-surface border border-brand-borderSubtle space-y-1">
          <div className="text-brand-textMuted flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Language</span>
          </div>
          <div className="font-semibold text-white uppercase">{company.preferredLanguage}</div>
        </div>

        <div className="p-3 rounded-lg bg-brand-surface border border-brand-borderSubtle space-y-1">
          <div className="text-brand-textMuted flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Catalogue Version</span>
          </div>
          <div className="font-semibold text-white">v{report.reportVersion} (100 Pts)</div>
        </div>
      </div>
    </div>
  );
}
