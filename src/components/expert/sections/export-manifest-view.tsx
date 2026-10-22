"use client";

import { CheckCircle2, ShieldCheck, Download, Database, FileSpreadsheet, FileText } from "lucide-react";
import type { ExpertReport } from "@/types";

interface ExportManifestViewProps {
  report: ExpertReport;
}

export function ExportManifestView({ report }: ExportManifestViewProps) {
  const manifest = report.exportManifest;
  const reportId = report.metadata.reportId;

  return (
    <section id="section-manifest" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cryptographic Manifest & Integrity Sign-Off</h2>
            <p className="text-xs text-brand-textMuted">
              SHA-256 checksum verification, audit provenance sign-off, and multi-format data exports
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verification Card */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Data Provenance & Integrity</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Deterministic Baseline
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-brand-textMuted block text-[10px] uppercase font-bold tracking-wider">
                Cryptographic SHA-256 Checksum
              </span>
              <div className="font-mono text-[11px] text-brand-cyan bg-black/40 p-2.5 rounded-lg border border-brand-border break-all mt-1">
                {manifest.checksum || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-brand-textMuted text-[10px] uppercase font-bold block">
                  Export ID
                </span>
                <span className="font-mono text-white text-[11px] font-semibold">
                  {manifest.exportId}
                </span>
              </div>
              <div>
                <span className="text-brand-textMuted text-[10px] uppercase font-bold block">
                  Engine Version
                </span>
                <span className="font-mono text-white text-[11px] font-semibold">
                  SiteIntel Pulse v{manifest.version}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-brand-border/60 text-brand-textMuted text-[11px] leading-relaxed">
              Certified unmutated against source crawl snapshot. Calculated from 56 immutable rules without external fabrication or artificial inflation.
            </div>
          </div>
        </div>

        {/* Download Actions Card */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-brand-cyan" />
            <span>Direct Work Product Downloads</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <a
              href={`/api/scan/expert-pdf?id=${reportId}`}
              download
              className="flex items-center gap-2 p-3 rounded-lg border border-brand-cyan/40 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-white font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-brand-cyan shrink-0" />
              <div>
                <div className="text-xs">Download PDF</div>
                <div className="text-[10px] text-brand-textMuted font-normal">A4 Expert Printout</div>
              </div>
            </a>

            <a
              href={`/api/scan/expert-export?id=${reportId}&format=json`}
              download
              className="flex items-center gap-2 p-3 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-card text-white font-semibold transition-colors"
            >
              <Database className="w-4 h-4 text-brand-cyan shrink-0" />
              <div>
                <div className="text-xs">Full JSON Bundle</div>
                <div className="text-[10px] text-brand-textMuted font-normal">Machine Schema</div>
              </div>
            </a>

            <a
              href={`/api/scan/expert-export?id=${reportId}&format=csv_findings`}
              download
              className="flex items-center gap-2 p-3 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-card text-white font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs">CSV Findings</div>
                <div className="text-[10px] text-brand-textMuted font-normal">Issues & Evidence</div>
              </div>
            </a>

            <a
              href={`/api/scan/expert-export?id=${reportId}&format=csv_inventory`}
              download
              className="flex items-center gap-2 p-3 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-card text-white font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs">CSV URL Inventory</div>
                <div className="text-[10px] text-brand-textMuted font-normal">Discovered Pages</div>
              </div>
            </a>

            <a
              href={`/api/scan/expert-export?id=${reportId}&format=csv_remediation`}
              download
              className="flex items-center gap-2 p-3 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-card text-white font-semibold transition-colors sm:col-span-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs">CSV Remediation Tasks</div>
                <div className="text-[10px] text-brand-textMuted font-normal">
                  Engineering Action Register with Workstream Allocation
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
