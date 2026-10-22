import React from "react";
import { OwnerReport } from "@/types";
import { Cpu, Globe, Lock, Code, FileText, CheckCircle2 } from "lucide-react";

interface PlatformProfileProps {
  report: OwnerReport;
}

export function PlatformProfile({ report }: PlatformProfileProps) {
  const profile = report.platformProfile;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-brand-teal" />
          <span>Platform Profile &amp; Infrastructure Indicators</span>
        </h2>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 3 of 13
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs uppercase font-semibold text-brand-textMuted flex items-center gap-1.5">
            <Code className="w-4 h-4 text-brand-cyan" />
            <span>Detected Technologies</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {profile.detectedTechnologies.map((tech, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md bg-brand-card text-brand-tealLight border border-brand-border text-xs font-semibold"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs uppercase font-semibold text-brand-textMuted flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-brand-cyan" />
            <span>Transport Security</span>
          </div>
          <div className="text-base font-bold text-white flex items-center gap-2 pt-1">
            <CheckCircle2 className="w-4 h-4 text-status-pass" />
            <span>{profile.httpsStatus}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs uppercase font-semibold text-brand-textMuted flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-brand-cyan" />
            <span>Canonical Hostname</span>
          </div>
          <div className="text-base font-mono font-bold text-white pt-1">{profile.preferredHost}</div>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs uppercase font-semibold text-brand-textMuted flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-brand-cyan" />
            <span>Pages In Scope</span>
          </div>
          <div className="text-base font-bold text-white pt-1">
            {report.executiveSnapshot.testedPageCount} tested / {profile.totalPagesDiscovered} discovered
          </div>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs uppercase font-semibold text-brand-textMuted flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-brand-cyan" />
            <span>Primary Language</span>
          </div>
          <div className="text-base font-bold text-white pt-1 uppercase">{profile.primaryLanguage}</div>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs uppercase font-semibold text-brand-textMuted flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-brand-cyan" />
            <span>Crawl Depth Reached</span>
          </div>
          <div className="text-base font-bold text-white pt-1">
            Level {report.executiveSnapshot.coverage.crawlDepthReached} of 3
          </div>
        </div>
      </div>
    </div>
  );
}
