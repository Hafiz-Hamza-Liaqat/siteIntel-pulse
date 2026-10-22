"use client";

import { Bot, HelpCircle, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import type { ExpertReport } from "@/types";

interface GeoAeoViewProps {
  geo: ExpertReport["geoAeoDiagnostics"];
}

export function GeoAeoView({ geo }: GeoAeoViewProps) {
  const crawlers = Object.entries(geo.crawlerPolicies || {});

  return (
    <section id="section-geo-aeo" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">GEO, AEO & AI Readiness</h2>
            <p className="text-xs text-brand-textMuted">
              Generative Engine Optimization, answer-engine schema, and AI agent crawler permissions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Crawler Access Policies */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-brand-cyan" />
            <span>Robots.txt AI Crawler Directives</span>
          </h3>

          <div className="space-y-2 text-xs">
            {crawlers.map(([bot, policy]) => (
              <div
                key={bot}
                className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between"
              >
                <div>
                  <strong className="text-white block font-mono">{bot}</strong>
                  <span className="text-brand-textMuted text-[11px]">
                    Autonomous LLM scraping & indexing user-agent
                  </span>
                </div>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                    policy.includes("Disallowed") || policy.includes("Blocked")
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {policy}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Answer Readiness */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-cyan" />
            <span>Direct Answer & Structured Entities</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">FAQPage Structured Data</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Enables Google Perplexity & ChatGPT to extract Q&A pairs directly
                </span>
              </div>
              <span
                className={`font-bold font-mono ${
                  geo.directAnswerReadiness.faqSchemaPresent
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {geo.directAnswerReadiness.faqSchemaPresent ? "PRESENT" : "MISSING"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">HowTo Structured Data</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Supports step-by-step procedural ingestion by AI agents
                </span>
              </div>
              <span
                className={`font-bold font-mono ${
                  geo.directAnswerReadiness.howToSchemaPresent
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {geo.directAnswerReadiness.howToSchemaPresent ? "PRESENT" : "MISSING"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">llms.txt Machine Knowledge</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Standard machine-readable summary at /llms.txt
                </span>
              </div>
              <span className="font-bold font-mono text-slate-400">
                RECOMMENDED
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
