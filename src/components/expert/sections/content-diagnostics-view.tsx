"use client";

import { FileText, AlertTriangle, Image as ImageIcon, CheckCircle } from "lucide-react";
import type { PageDiagnostic } from "@/types";

interface ContentDiagnosticsViewProps {
  inventory: PageDiagnostic[];
}

export function ContentDiagnosticsView({ inventory }: ContentDiagnosticsViewProps) {
  const thinPages = inventory.filter((p) => p.wordCount > 0 && p.wordCount < 300);
  const totalWords = inventory.reduce((acc, p) => acc + p.wordCount, 0);
  const averageWords = inventory.length > 0 ? Math.round(totalWords / inventory.length) : 0;

  return (
    <section id="section-content" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Content Quality Diagnostics</h2>
            <p className="text-xs text-brand-textMuted">
              Word count density, thin content risk (&lt;300 words), and textual clarity
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Total Content Words Analyzed
          </div>
          <div className="text-2xl font-black text-white">{totalWords.toLocaleString()}</div>
          <p className="text-xs text-brand-textMuted">Extracted visible body text</p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Average Words Per Page
          </div>
          <div className="text-2xl font-black text-white">{averageWords.toLocaleString()}</div>
          <p className="text-xs text-brand-textMuted">Across {inventory.length} discovered pages</p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Thin Content Pages (&lt;300 words)
          </div>
          <div
            className={`text-2xl font-black ${
              thinPages.length > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {thinPages.length}
          </div>
          <p className="text-xs text-brand-textMuted">Prone to search engine low-value classification</p>
        </div>
      </div>

      {thinPages.length > 0 && (
        <div className="p-5 rounded-xl border border-amber-500/30 bg-brand-card space-y-3">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Thin Content Warning List ({thinPages.length} pages)</span>
          </h3>

          <div className="space-y-2">
            {thinPages.slice(0, 8).map((p) => (
              <div
                key={p.url}
                className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between text-xs"
              >
                <div className="truncate max-w-lg">
                  <div className="font-mono text-white truncate">{p.url}</div>
                  <div className="text-[11px] text-brand-textMuted mt-0.5">{p.title || "No Title"}</div>
                </div>
                <div className="font-mono text-amber-400 font-bold ml-4">
                  {p.wordCount} words
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
