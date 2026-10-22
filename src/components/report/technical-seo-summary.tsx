import React from "react";
import { OwnerReport } from "@/types";
import { Search, CheckCircle2, AlertTriangle, FileCode, Link as LinkIcon } from "lucide-react";

interface TechnicalSeoSummaryProps {
  report: OwnerReport;
}

export function TechnicalSeoSummary({ report }: TechnicalSeoSummaryProps) {
  const summary = report.technicalHealthAndSeoSummary;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-brand-teal" />
            <span>Technical Health &amp; On-Page SEO Summary</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Key factors governing how effectively search engines discover, crawl, and rank your content.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 6 of 13
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <div className="text-xs font-semibold text-brand-textMuted uppercase">Title Tag Coverage</div>
          <div className="text-xl font-bold text-white">{summary.titlesHealthy} pages optimal</div>
          <p className="text-xs text-brand-textMuted">Titles configured with optimal length (30–60 chars).</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <div className="text-xs font-semibold text-brand-textMuted uppercase">Meta Descriptions</div>
          <div className="text-xl font-bold text-white">{summary.descriptionsHealthy} pages optimal</div>
          <p className="text-xs text-brand-textMuted">Meta descriptions configured with high relevance.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <div className="text-xs font-semibold text-brand-textMuted uppercase">Canonical Uniformity</div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            {summary.canonicalsConsistent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Consistent</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Review Needed</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Protects against duplicate parameter indexing.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <div className="text-xs font-semibold text-brand-textMuted uppercase">Broken Internal Links</div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            {summary.brokenLinksCount === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>0 Dead Links</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-fail" />
                <span>{summary.brokenLinksCount} Broken</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">404 or 5xx responses encountered while crawling.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <div className="text-xs font-semibold text-brand-textMuted uppercase">XML Sitemap Status</div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            {summary.sitemapAccessible ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Active &amp; Parsed</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Not Located</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Guides Googlebot to index newly published pages.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-1.5">
          <div className="text-xs font-semibold text-brand-textMuted uppercase">Structured Data (JSON-LD)</div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            {summary.structuredDataPresent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Schema Detected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <span>Missing</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Enables rich snippet star ratings and prices in SERPs.</p>
        </div>
      </div>
    </div>
  );
}
