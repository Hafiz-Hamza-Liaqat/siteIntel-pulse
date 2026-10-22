"use client";

import { useState } from "react";
import { Search, Code2, Tag, ChevronDown, ChevronRight, CheckCircle, AlertTriangle } from "lucide-react";
import type { ExpertReport } from "@/types";

interface SeoDiagnosticsViewProps {
  seo: ExpertReport["seoDiagnostics"];
}

export function SeoDiagnosticsView({ seo }: SeoDiagnosticsViewProps) {
  const [selectedSchema, setSelectedSchema] = useState<number | null>(null);

  return (
    <section id="section-seo" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Technical SEO Deep-Dive</h2>
            <p className="text-xs text-brand-textMuted">
              Metadata hygiene, heading outline hierarchy, Schema.org entities, and indexation controls
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schema.org Structured Data Entities */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-cyan" />
              <span>Schema.org JSON-LD Entities</span>
            </h3>
            <span className="text-xs font-mono text-brand-textMuted bg-brand-surface px-2 py-0.5 rounded border border-brand-border">
              {seo.structuredDataEntities.length} types detected
            </span>
          </div>

          {seo.structuredDataEntities.length === 0 ? (
            <div className="p-4 rounded-lg bg-brand-surface border border-brand-border text-xs text-brand-textMuted text-center">
              No JSON-LD structured data entities discovered on scanned templates.
            </div>
          ) : (
            <div className="space-y-2">
              {seo.structuredDataEntities.map((entity, idx) => {
                const typeName = entity["@type"] || entity.type || `Entity #${idx + 1}`;
                const isExpanded = selectedSchema === idx;

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-brand-border bg-brand-surface overflow-hidden text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSchema(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-brand-card transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-brand-cyan" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-brand-textMuted" />
                        )}
                        <span className="font-bold text-white">{typeName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        JSON-LD
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-brand-dark border-t border-brand-border/60">
                        <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 bg-black/40 rounded">
                          {JSON.stringify(entity, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Heading Outline & Metadata Rules */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-cyan" />
              <span>Heading Hierarchy Outline</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">H1 Tag Specification</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Exactly one descriptive H1 per indexable page template
                </span>
              </div>
              <span className="text-emerald-400 font-bold font-mono">1 per template</span>
            </div>

            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">Title Tag Range</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Between 30 and 65 characters to prevent SERP truncation
                </span>
              </div>
              <span className="text-slate-300 font-bold font-mono">30 - 65 chars</span>
            </div>

            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">Meta Description Range</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Between 70 and 160 characters for optimal snippet display
                </span>
              </div>
              <span className="text-slate-300 font-bold font-mono">70 - 160 chars</span>
            </div>

            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">Canonical Self-Referencing</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Explicit canonical link tags on primary discovered pages
                </span>
              </div>
              <span className="text-emerald-400 font-bold font-mono">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
