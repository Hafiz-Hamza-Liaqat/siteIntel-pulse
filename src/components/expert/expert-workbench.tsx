"use client";

import { useState } from "react";
import type { ExpertReport } from "@/types";
import { ExpertHeader } from "./expert-header";
import { ExpertNavigation } from "./expert-navigation";
import { ExpertSummaryView } from "./sections/expert-summary-view";
import { UrlInventoryView } from "./sections/url-inventory-view";
import { SeoDiagnosticsView } from "./sections/seo-diagnostics-view";
import { LinkAuditView } from "./sections/link-audit-view";
import { PerformanceDiagnosticsView } from "./sections/performance-diagnostics-view";
import { ResponsiveMatrixView } from "./sections/responsive-matrix-view";
import { SecurityDiagnosticsView } from "./sections/security-diagnostics-view";
import { AuthAssessmentView } from "./sections/auth-assessment-view";
import { ContentDiagnosticsView } from "./sections/content-diagnostics-view";
import { GeoAeoView } from "./sections/geo-aeo-view";
import { IntegrationsView } from "./sections/integrations-view";
import { ConversionUxView } from "./sections/conversion-ux-view";
import { CompetitorBenchmarkView } from "./sections/competitor-benchmark-view";
import { FindingExplorerView } from "./sections/finding-explorer-view";
import { RemediationPlannerView } from "./sections/remediation-planner-view";
import { ExportManifestView } from "./sections/export-manifest-view";
import { IntakeForm } from "@/components/intake-form";
import { X } from "lucide-react";

interface ExpertWorkbenchProps {
  report: ExpertReport;
}

export function ExpertWorkbench({ report }: ExpertWorkbenchProps) {
  const [showScanModal, setShowScanModal] = useState(false);

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header with actions & KPIs */}
        <ExpertHeader
          report={report}
          onNewScanClick={() => setShowScanModal(true)}
        />

        {/* Main Layout: Sticky Sidebar Navigation + 19 Diagnostic Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Left Column: Navigation Sidebar */}
          <aside className="lg:col-span-1 lg:sticky lg:top-8 bg-brand-surface/80 backdrop-blur-md rounded-2xl border border-brand-border p-4 shadow-lg hidden lg:block">
            <ExpertNavigation
              findingCount={report.findings.length}
              criticalCount={report.executiveSummary.issueTotals.critical}
              taskCount={report.remediationRegister.length}
              urlCount={report.urlInventory.length}
            />
          </aside>

          {/* Right Column: 19 Detailed Sections */}
          <div className="lg:col-span-3 space-y-16">
            {/* 1-4: Executive Summary, Scope, Platform, 56-Rule Score Ledger */}
            <ExpertSummaryView report={report} />

            {/* 5: Discovered Page Inventory */}
            <UrlInventoryView inventory={report.urlInventory} />

            {/* 6: Technical SEO Deep-Dive */}
            <SeoDiagnosticsView seo={report.seoDiagnostics} />

            {/* 7: Link Architecture & Broken Links */}
            <LinkAuditView links={report.linkAudit} />

            {/* 8: Core Web Vitals & Lab Diagnostics */}
            <PerformanceDiagnosticsView performance={report.performanceDiagnostics} />

            {/* 9: Responsive Multi-Viewport Matrix (7 Viewports) */}
            <ResponsiveMatrixView responsive={report.responsiveDiagnostics} />

            {/* 10: Public Security Configuration */}
            <SecurityDiagnosticsView security={report.securityDiagnostics} />

            {/* 11: Authentication Posture & Session Controls */}
            <AuthAssessmentView auth={report.authenticationAssessment} />

            {/* 12: Content Quality Diagnostics */}
            <ContentDiagnosticsView inventory={report.urlInventory} />

            {/* 13: GEO, AEO & AI Readiness */}
            <GeoAeoView geo={report.geoAeoDiagnostics} />

            {/* 14: Analytics, Tags & Consent Integrations */}
            <IntegrationsView integrations={report.integrations} />

            {/* 15: Conversion & UX Flow Diagnostics */}
            <ConversionUxView report={report} />

            {/* 16: Competitor Benchmark Analysis */}
            <CompetitorBenchmarkView
              companyDomain={report.metadata.companyA.domain}
              companyScore={report.executiveSummary.overallScore.score}
              competitors={report.competitorComparisons}
            />

            {/* 17: Diagnostic Finding Ledger (With live search & multi-facet filters) */}
            <FindingExplorerView findings={report.findings} />

            {/* 18: Specialist Remediation Action Plan */}
            <RemediationPlannerView tasks={report.remediationRegister} />

            {/* 19: Cryptographic Manifest & Multi-Format Exports */}
            <ExportManifestView report={report} />
          </div>
        </div>
      </div>

      {/* New Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div>
                <h2 className="text-lg font-bold text-white">Launch New Audit Scan</h2>
                <p className="text-xs text-brand-textMuted">
                  Inspect domain technical health and project both Owner &amp; Expert reports
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="p-1 rounded-lg hover:bg-brand-card text-brand-textMuted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <IntakeForm
              onSubmit={async (data) => {
                setShowScanModal(false);
                window.location.href = `/expert-audit?target=${encodeURIComponent(data.targetUrl)}`;
              }}
              isLoading={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
