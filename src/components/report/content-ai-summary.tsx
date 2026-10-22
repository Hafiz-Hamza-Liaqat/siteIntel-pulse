import React from "react";
import { OwnerReport } from "@/types";
import { Sparkles, Bot, FileText, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";

interface ContentAiSummaryProps {
  report: OwnerReport;
}

export function ContentAiSummary({ report }: ContentAiSummaryProps) {
  const content = report.contentTrustAiSummary;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-teal" />
            <span>Content Quality, Trust &amp; AI-Search Readiness</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Prepares your brand for generative AI citations (ChatGPT, Perplexity, Claude) and customer trust.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 9 of 13
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-cyan" />
            <span>Knowledge Resources</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            {content.blogOrResourcePresent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Blog / FAQ Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Opportunity to Add</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Captures informational search intent.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-brand-cyan" />
            <span>AI Crawler Policy</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-status-pass" />
            <span>{content.aiCrawlerPolicy}</span>
          </div>
          <p className="text-xs text-brand-textMuted">Governs whether AI engines can parse your content.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-brand-cyan" />
            <span>Entity Knowledge Schema</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            {content.entitySchemaPresent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Configured</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Missing Entity Schema</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Anchors brand entity in LLM knowledge graphs.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand-cyan" />
            <span>Trust &amp; Ownership</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            {content.contactOrTrustSignalsPresent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Trust Signals Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Sparse Trust Pages</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">About Us, Contact, and Privacy Policy links.</p>
        </div>
      </div>
    </div>
  );
}
