"use client";

import { useState, useMemo } from "react";
import {
  FileCode,
  Search,
  ExternalLink,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import type { PageDiagnostic } from "@/types";

interface UrlInventoryViewProps {
  inventory: PageDiagnostic[];
}

export function UrlInventoryView({ inventory }: UrlInventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [indexFilter, setIndexFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredUrls = useMemo(() => {
    return inventory.filter((p) => {
      // Search term
      if (
        searchTerm &&
        !p.url.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(p.title || "").toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Indexability filter
      if (indexFilter === "INDEXABLE" && p.indexabilityStatus !== "INDEXABLE") return false;
      if (indexFilter === "NOINDEX" && !p.indexabilityStatus.includes("NOINDEX")) return false;
      if (indexFilter === "CANONICALIZED" && p.canonicalStatus !== "SELF") return false;

      // Status filter
      if (statusFilter === "200" && (p.statusCode < 200 || p.statusCode >= 300)) return false;
      if (statusFilter === "3XX" && (p.statusCode < 300 || p.statusCode >= 400)) return false;
      if (statusFilter === "ERRORS" && p.statusCode < 400) return false;

      return true;
    });
  }, [inventory, searchTerm, indexFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUrls.length / pageSize) || 1;
  const paginatedUrls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUrls.slice(start, start + pageSize);
  }, [filteredUrls, currentPage, pageSize]);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {code}
        </span>
      );
    }
    if (code >= 300 && code < 400) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {code}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        {code}
      </span>
    );
  };

  return (
    <section id="section-urls" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Discovered Page Inventory</h2>
            <p className="text-xs text-brand-textMuted">
              Page-level URL diagnostics, HTTP responses, canonicalization status, and word counts
            </p>
          </div>
        </div>

        <div className="text-xs text-brand-textMuted">
          Showing <strong className="text-white">{filteredUrls.length}</strong> of {inventory.length} discovered pages
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-brand-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by URL path, query, or page title..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-card border border-brand-border text-white text-xs placeholder-brand-textMuted focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-brand-textMuted flex items-center gap-1 text-[11px]">
            <Filter className="w-3 h-3" />
            Index:
          </span>
          {["ALL", "INDEXABLE", "NOINDEX", "CANONICALIZED"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setIndexFilter(f);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                indexFilter === f
                  ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                  : "bg-brand-card text-brand-textMuted hover:text-white border border-brand-border"
              }`}
            >
              {f}
            </button>
          ))}

          <span className="text-brand-textMuted text-[11px] ml-2">Status:</span>
          {["ALL", "200", "3XX", "ERRORS"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setStatusFilter(f);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === f
                  ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                  : "bg-brand-card text-brand-textMuted hover:text-white border border-brand-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* URL Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-brand-surface/80 text-brand-textMuted font-semibold border-b border-brand-border">
            <tr>
              <th className="py-3 px-4">Discovered URL / Path</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Indexability</th>
              <th className="py-3 px-3">Canonical</th>
              <th className="py-3 px-3">Headings</th>
              <th className="py-3 px-3">Words</th>
              <th className="py-3 px-3">TTFB</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/60 text-brand-text">
            {paginatedUrls.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-brand-textMuted">
                  No discovered pages match the current search or filter criteria.
                </td>
              </tr>
            ) : (
              paginatedUrls.map((p) => (
                <tr key={p.url} className="hover:bg-brand-surface/40 transition-colors group">
                  {/* URL & Title */}
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-mono text-white text-[11px] truncate" title={p.url}>
                      {p.url}
                    </div>
                    {p.title && (
                      <div className="text-[11px] text-brand-textMuted truncate mt-0.5" title={p.title}>
                        {p.title}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-brand-textMuted mt-1">
                      <span>Depth: {p.crawlDepth}</span>
                      <span>•</span>
                      <span>Source: {p.discoverySource}</span>
                    </div>
                  </td>

                  {/* HTTP Status Code */}
                  <td className="py-3 px-3">{getStatusBadge(p.statusCode)}</td>

                  {/* Indexability */}
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.indexabilityStatus === "INDEXABLE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {p.indexabilityStatus}
                    </span>
                  </td>

                  {/* Canonical */}
                  <td className="py-3 px-3 text-[11px]">
                    <div className="font-mono text-slate-300">{p.canonicalStatus}</div>
                    {p.canonicalCandidate && p.canonicalCandidate !== p.url && (
                      <div
                        className="text-[10px] text-brand-textMuted truncate max-w-[140px]"
                        title={p.canonicalCandidate}
                      >
                        -&gt; {p.canonicalCandidate}
                      </div>
                    )}
                  </td>

                  {/* Headings */}
                  <td className="py-3 px-3 text-[11px]">
                    <span
                      className={
                        p.headingsOutline.h1.length === 1
                          ? "text-emerald-400"
                          : p.headingsOutline.h1.length === 0
                          ? "text-rose-400 font-bold"
                          : "text-amber-400 font-bold"
                      }
                    >
                      H1: {p.headingsOutline.h1.length}
                    </span>
                    <span className="text-brand-textMuted ml-1.5">
                      H2: {p.headingsOutline.h2.length}
                    </span>
                  </td>

                  {/* Word Count */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <span className={p.wordCount < 300 ? "text-amber-400 font-bold" : "text-white"}>
                      {p.wordCount.toLocaleString()}
                    </span>
                  </td>

                  {/* TTFB */}
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                    {p.responseTimeMs}ms
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(p.url)}
                        className="p-1 rounded hover:bg-brand-surface text-brand-textMuted hover:text-white transition-colors"
                        title="Copy page URL"
                      >
                        {copiedUrl === p.url ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-brand-surface text-brand-textMuted hover:text-white transition-colors"
                        title="Open page in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-brand-textMuted">
          <div>
            Page <strong className="text-white">{currentPage}</strong> of{" "}
            <strong className="text-white">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-brand-border bg-brand-card hover:bg-brand-surface disabled:opacity-40 disabled:cursor-not-allowed text-brand-text"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-brand-border bg-brand-card hover:bg-brand-surface disabled:opacity-40 disabled:cursor-not-allowed text-brand-text"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
