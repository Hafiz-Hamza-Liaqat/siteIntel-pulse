"use client";

import { Link2, AlertOctagon, CheckCircle2, ExternalLink, HelpCircle } from "lucide-react";
import type { ExpertReport } from "@/types";

interface LinkAuditViewProps {
  links: ExpertReport["linkAudit"];
}

export function LinkAuditView({ links }: LinkAuditViewProps) {
  return (
    <section id="section-links" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Link Architecture & Orphan Analysis</h2>
            <p className="text-xs text-brand-textMuted">
              Internal connectivity, broken status codes, outbound link equity, and orphan candidates
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Internal Links Discovered
          </div>
          <div className="text-2xl font-black text-white">{links.internalLinks.length}</div>
          <p className="text-xs text-brand-textMuted">Crawled within origin host boundary</p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Outbound Links
          </div>
          <div className="text-2xl font-black text-white">{links.outboundLinks.length}</div>
          <p className="text-xs text-brand-textMuted">External domain references tested</p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Broken Links (4xx / 5xx)
          </div>
          <div
            className={`text-2xl font-black ${
              links.brokenLinks.length > 0 ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {links.brokenLinks.length}
          </div>
          <p className="text-xs text-brand-textMuted">HTTP 404, 410, or server error targets</p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Orphan Candidates
          </div>
          <div
            className={`text-2xl font-black ${
              links.orphanCandidates.length > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {links.orphanCandidates.length}
          </div>
          <p className="text-xs text-brand-textMuted">In sitemap without inbound links</p>
        </div>
      </div>

      {/* Broken Links Table */}
      {links.brokenLinks.length > 0 && (
        <div className="p-5 rounded-xl border border-rose-500/30 bg-brand-card space-y-3">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" />
            <span>Broken Links Ledger ({links.brokenLinks.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-brand-textMuted border-b border-brand-border">
                <tr>
                  <th className="py-2 px-3">Broken Target URL</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Anchor Text</th>
                  <th className="py-2 px-3">Found On Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {links.brokenLinks.map((b, idx) => (
                  <tr key={idx} className="hover:bg-brand-surface/40">
                    <td className="py-2.5 px-3 font-mono text-rose-300 truncate max-w-xs" title={b.targetUrl}>
                      {b.targetUrl}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {b.statusCode || "Failed"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{b.anchorText || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-brand-textMuted truncate max-w-xs" title={b.sourceUrl}>
                      {b.sourceUrl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
