"use client";

import React, { useState } from "react";
import { OwnerReport, ResultStatus } from "@/types";
import { CoverSection } from "./cover-section";
import { ExecutiveSnapshot } from "./executive-snapshot";
import { PlatformProfile } from "./platform-profile";
import { ScoreCoverageDetails } from "./score-coverage-details";
import { IssueDistribution } from "./issue-distribution";
import { TechnicalSeoSummary } from "./technical-seo-summary";
import { PerformanceResponsiveSummary } from "./performance-responsive-summary";
import { SecurityAuthSummary } from "./security-auth-summary";
import { ContentAiSummary } from "./content-ai-summary";
import { AnalyticsSummary } from "./analytics-summary";
import { CompetitorSnapshot } from "./competitor-snapshot";
import { PriorityOpportunityPlan } from "./priority-opportunity-plan";
import { MethodologyDisclaimers } from "./methodology-disclaimers";
import { DimensionScorecardsGrid } from "./dimension-scorecards-grid";
import { CostOfInactionCard } from "./cost-of-inaction-card";
import {
  Download,
  Printer,
  Share2,
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from "lucide-react";

interface ReportViewerProps {
  report: OwnerReport;
  onNewScan: () => void;
}

export function ReportViewer({ report, onNewScan }: ReportViewerProps) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | ResultStatus>("ALL");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const url = `/api/scan/pdf?id=${report.reportId}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = `SiteIntel-Pulse-Owner-Report-${report.companyIdentity.domain}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/owner-report?reportId=${report.reportId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 3000);
  };

  // Filtered results if user toggles status filter
  const filteredResults =
    statusFilter === "ALL"
      ? report.results
      : report.results.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Action Toolbar (Sticky in dark dashboard) */}
      <div className="sticky top-16 z-40 bg-brand-bg/90 backdrop-blur border-b border-brand-border py-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onNewScan}
              className="px-4 py-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceHover text-brand-text border border-brand-border text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-brand-teal" />
              <span>Start New Audit</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceHover text-brand-text border border-brand-border text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-brand-cyan" />
              <span className="hidden sm:inline">Print Report</span>
            </button>

            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceHover text-brand-text border border-brand-border text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4 text-brand-tealLight" />
              <span>{copyFeedback ? "Link Copied!" : "Share Report"}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2 rounded-xl bg-brand-teal hover:bg-brand-tealDark text-white text-xs font-bold shadow-md shadow-brand-teal/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 13 Sections Rendered in Exact Order */}
      <div className="space-y-8">
        {/* Section 1: Cover and Report Identity */}
        <CoverSection report={report} />

        {/* Section 2: Executive Snapshot */}
        <ExecutiveSnapshot report={report} />

        {/* Section 3: Platform Profile */}
        <PlatformProfile report={report} />

        {/* Section 4: Score and Coverage Details */}
        <ScoreCoverageDetails report={report} />

        {/* Diagnostic Dimension Scorecards (Non-Additive Diagnostic Overlays) */}
        <DimensionScorecardsGrid scorecards={report.dimensionScorecards} />

        {/* Section 5: Issue Distribution */}
        <IssueDistribution report={report} />

        {/* Section 6: Technical Health and SEO */}
        <TechnicalSeoSummary report={report} />

        {/* Section 7: Performance and Responsive Experience */}
        <PerformanceResponsiveSummary report={report} />

        {/* Section 8: Security and Authentication Overview */}
        <SecurityAuthSummary report={report} />

        {/* Section 9: Content, Trust and AI Readiness */}
        <ContentAiSummary report={report} />

        {/* Section 10: Analytics and Tracking */}
        <AnalyticsSummary report={report} />

        {/* Section 11: Competitor Snapshot */}
        <CompetitorSnapshot report={report} />

        {/* Section 12: Priority Opportunity Plan */}
        <PriorityOpportunityPlan report={report} />

        {/* Cost of Inaction & Revenue Opportunity Calculator */}
        <CostOfInactionCard costOfInaction={report.costOfInaction} />

        {/* Section 13: Methodology and Next Steps */}
        <MethodologyDisclaimers report={report} />
      </div>

      {/* Bottom Floating Return Button */}
      <div className="pt-6 pb-12 text-center no-print">
        <button
          onClick={onNewScan}
          className="px-6 py-3 rounded-xl bg-brand-surface hover:bg-brand-surfaceHover text-brand-text border border-brand-border text-sm font-bold transition-colors inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-brand-teal" />
          <span>Audit Another Website Domain</span>
        </button>
      </div>
    </div>
  );
}
