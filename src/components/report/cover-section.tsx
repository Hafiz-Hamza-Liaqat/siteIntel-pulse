import React from "react";
import { OwnerReport } from "@/types";
import { Globe, Calendar, Hash, Tag, MapPin, Building } from "lucide-react";

interface CoverSectionProps {
  report: OwnerReport;
}

export function CoverSection({ report }: CoverSectionProps) {
  const company = report.companyIdentity;
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
        <div className="p-3 rounded-lg bg-brand-surface border border-brand-borderSubtle space-y-1">
          <div className="text-brand-textMuted flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Business Category</span>
          </div>
          <div className="font-semibold text-white capitalize">{company.businessCategory.replace("_", " ")}</div>
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
