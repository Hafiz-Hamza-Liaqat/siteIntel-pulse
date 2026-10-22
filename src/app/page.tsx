"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ScanRequest,
  OwnerReport,
  ExpertReport,
  JobStatus,
  ReportType,
} from "@/types";
import { IntakeForm } from "@/components/intake-form";
import { ReportViewer } from "@/components/report/report-viewer";
import { ExpertWorkbench } from "@/components/expert/expert-workbench";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Gauge,
  Smartphone,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  BarChart3,
  Layers,
  Activity,
  AlertCircle,
  XCircle,
  RotateCcw,
  Compass,
} from "lucide-react";

export default function HomePage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [discoveredCount, setDiscoveredCount] = useState<number>(0);
  const [testedCount, setTestedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedReportType, setSelectedReportType] = useState<ReportType>("owner");
  const [ownerReport, setOwnerReport] = useState<OwnerReport | null>(null);
  const [expertReport, setExpertReport] = useState<ExpertReport | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Handle Scan Submission
  const handleStartScan = async (data: ScanRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setOwnerReport(null);
    setExpertReport(null);
    setSelectedReportType(data.reportType);
    setJobStatus("queued");
    setCurrentStage("Submitting audit request to safe intake pipeline...");
    setProgressPercentage(5);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to start audit.");
      }

      const jobId = json.jobId;
      setActiveJobId(jobId);

      // If report is already completed (cached for this tenant)
      if (json.status === "completed") {
        if (data.reportType === "expert") {
          const repRes = await fetch(`/api/scan/expert-report?jobId=${jobId}`);
          const repData = await repRes.json();
          if (!repData.error) {
            setExpertReport(repData);
            setIsLoading(false);
            return;
          }
        } else {
          const repRes = await fetch(`/api/scan/report?jobId=${jobId}`);
          const repData = await repRes.json();
          if (!repData.error) {
            setOwnerReport(repData);
            setIsLoading(false);
            return;
          }
        }
      }

      // Begin polling job status
      startPolling(jobId, data.reportType);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
      setIsLoading(false);
      setJobStatus(null);
    }
  };

  // Poll scan status until completion
  const startPolling = (jobId: string, expectedType: ReportType) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan?id=${jobId}`);
        if (!res.ok) return;

        const data = await res.json();
        setJobStatus(data.status);
        setCurrentStage(data.currentStage || "Processing audit...");
        setProgressPercentage(data.progressPercentage || 0);
        setDiscoveredCount(data.discoveredCount || 0);
        setTestedCount(data.testedCount || 0);

        if (data.status === "completed") {
          clearInterval(pollIntervalRef.current!);
          setIsLoading(false);

          if (expectedType === "expert") {
            const repRes = await fetch(`/api/scan/expert-report?jobId=${jobId}`);
            const repData = await repRes.json();
            if (!repData.error) {
              setExpertReport(repData);
            } else {
              setErrorMessage(repData.error || "Failed to load expert report.");
            }
          } else {
            const repRes = await fetch(`/api/scan/report?jobId=${jobId}`);
            const repData = await repRes.json();
            if (!repData.error) {
              setOwnerReport(repData);
            } else {
              setErrorMessage(repData.error || "Failed to load owner report.");
            }
          }
        } else if (data.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          setIsLoading(false);
          setErrorMessage(data.errorMessage || "Scan encountered a fatal error.");
        } else if (data.status === "canceled") {
          clearInterval(pollIntervalRef.current!);
          setIsLoading(false);
          setErrorMessage("Scan was canceled by user.");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);
  };

  // Cancel in-flight scan
  const handleCancelScan = async () => {
    if (!activeJobId) return;
    setIsCanceling(true);

    try {
      await fetch("/api/scan/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: activeJobId }),
      });
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setIsCanceling(false);
    }
  };

  // Reset audit form to start fresh
  const handleNewAudit = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setOwnerReport(null);
    setExpertReport(null);
    setActiveJobId(null);
    setJobStatus(null);
    setIsLoading(false);
    setErrorMessage(null);
  };

  // 1. Render Completed Owner Report
  if (ownerReport) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-brand-borderSubtle">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-brand-teal/20 text-brand-tealLight text-xs font-bold uppercase tracking-wider">
              Live Owner Report
            </span>
            <span className="text-xs text-brand-textMuted font-mono">
              Job: {activeJobId || ownerReport.scanId}
            </span>
          </div>
          <button
            onClick={handleNewAudit}
            className="px-4 py-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceHover text-white border border-brand-border text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand-teal" />
            <span>Start New Audit</span>
          </button>
        </div>

        <ReportViewer report={ownerReport} onNewScan={handleNewAudit} />
      </div>
    );
  }

  // 2. Render Completed Expert Diagnostic Report
  if (expertReport) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-brand-borderSubtle">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider">
              Live Expert Report
            </span>
            <span className="text-xs text-brand-textMuted font-mono">
              Job: {activeJobId || expertReport.metadata.scanId}
            </span>
          </div>
          <button
            onClick={handleNewAudit}
            className="px-4 py-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceHover text-white border border-brand-border text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Start New Audit</span>
          </button>
        </div>

        <ExpertWorkbench report={expertReport} />
      </div>
    );
  }

  // 3. Render Live Audit Intake Platform
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-5 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-teal/10 border border-brand-teal/30 text-brand-tealLight text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Public Live Audit Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Discover Issues. Prove with Evidence.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal via-brand-tealLight to-brand-cyan">
            Improve. Grow.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-brand-textMuted max-w-2xl mx-auto">
          SiteIntel Pulse audits technical health, SEO discoverability, mobile performance, security posture,
          and AI search readiness into rigorous, evidence-backed reports.
        </p>
      </section>

      {/* Main Audit Intake Container */}
      <section className="max-w-3xl mx-auto space-y-6">
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <strong className="font-semibold block text-white">Scan Error:</strong>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Scan Progress Card */}
        {isLoading && (
          <div className="rounded-2xl border border-brand-teal/40 bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-teal/20 text-brand-tealLight flex items-center justify-center animate-pulse">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Generating {selectedReportType === "expert" ? "Expert Diagnostic" : "Owner"} Report
                  </h3>
                  <p className="text-xs text-brand-textMuted capitalize">
                    Stage: <span className="text-brand-tealLight font-semibold">{jobStatus?.replace("_", " ")}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelScan}
                disabled={isCanceling}
                className="px-3.5 py-1.5 rounded-lg bg-brand-surface hover:bg-brand-surfaceHover text-red-400 border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{isCanceling ? "Canceling..." : "Cancel Scan"}</span>
              </button>
            </div>

            {/* Real Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-brand-textMuted font-medium">
                <span className="truncate pr-2">{currentStage}</span>
                <span className="font-mono text-brand-tealLight font-bold">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-brand-surface h-3 rounded-full overflow-hidden border border-brand-borderSubtle">
                <div
                  className="h-full bg-gradient-to-r from-brand-teal to-brand-cyan transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Discovery & Audit Statistics Counter */}
            <div className="grid grid-cols-2 gap-4 text-center text-xs pt-1">
              <div className="p-3 rounded-xl bg-brand-surface border border-brand-borderSubtle">
                <span className="text-xl font-bold text-white block">{discoveredCount}</span>
                <span className="text-brand-textMuted text-[11px] uppercase font-semibold">Pages Discovered</span>
              </div>
              <div className="p-3 rounded-xl bg-brand-surface border border-brand-borderSubtle">
                <span className="text-xl font-bold text-brand-tealLight block">{testedCount}</span>
                <span className="text-brand-textMuted text-[11px] uppercase font-semibold">Pages Tested</span>
              </div>
            </div>
          </div>
        )}

        {/* Intake Form (When not actively scanning) */}
        {!isLoading && (
          <IntakeForm
            onSubmit={handleStartScan}
            isLoading={isLoading}
            defaultReportType={selectedReportType}
          />
        )}
      </section>

      {/* Two Audiences Architecture Card Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Audience 1: Company A */}
        <div className="rounded-2xl border-2 border-brand-teal/40 bg-brand-card p-8 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-brand-teal/5">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-teal/20 text-brand-tealLight flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-tealLight">Company A Platform</span>
              <h2 className="text-2xl font-bold text-white">Company A — Website Owner Report</h2>
            </div>

            <p className="text-brand-textMuted text-sm leading-relaxed">
              Designed for platform founders, executives, and e-commerce managers. Explains why your platform
              needs improvement, identifies key risks in business terms, and delivers an evidence-based
              growth roadmap without overwhelming code trivia.
            </p>

            <ul className="space-y-2.5 pt-2 text-sm text-brand-text">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>100-point deterministic score ledger across 11 core categories</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>Executive snapshot, platform profile &amp; priority opportunity plan</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>Safe, non-invasive crawler with SSRF &amp; resource protections</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>High-fidelity downloadable PDF &amp; print-ready report</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <Link
              href="/owner-report"
              className="w-full py-3 px-4 rounded-xl bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-tealLight border border-brand-teal/40 font-bold transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>Launch Owner Audit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Audience 2: Company B */}
        <div className="rounded-2xl border border-brand-cyan/40 bg-brand-card p-8 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-cyan-500/5">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-brand-surface border-l border-b border-brand-border text-brand-cyan text-xs font-bold rounded-bl-xl uppercase tracking-wider">
            Milestone 2 Preview
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center border border-brand-cyan/30">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">Company B Advisory</span>
              <h2 className="text-2xl font-bold text-white">Company B — Expert Diagnostic Workbench</h2>
            </div>

            <p className="text-brand-textMuted text-sm leading-relaxed">
              Reserved for technical agencies, developers, and cybersecurity teams. Projects the shared
              evidence ledger into exact DOM selectors, network traces, reproduction steps, code fix
              instructions, and remediation task management.
            </p>

            <ul className="space-y-2.5 pt-2 text-sm text-brand-text">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>56-rule deterministic findings ledger with severity and impact</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>Exact DOM selector maps &amp; reproduction steps for engineers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>Actionable remediation planner with status tracking and CSV export</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>Comprehensive Expert PDF diagnostic report download</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <Link
              href="/expert-audit"
              className="w-full py-3 px-4 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/40 font-bold transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>Milestone 2 Expert Preview</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillars: 11 Categories, 100 Points */}
      <section className="space-y-8 pt-4">
        <div className="text-center space-y-2">
          <h3 className="text-xs uppercase font-bold tracking-widest text-brand-teal">
            Comprehensive Evidence Engine
          </h3>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">
            11 Audit Categories, Exactly 100 Catalogue Points
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Technical Health &amp; Crawlability</h4>
            <p className="text-sm text-brand-textMuted">
              12 points evaluating HTTPS reachability, redirect consistency, robots.txt, sitemaps, and broken internal links.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Technical &amp; On-Page SEO</h4>
            <p className="text-sm text-brand-textMuted">
              18 points auditing titles, meta descriptions, heading outlines, canonical tags, slug readability, and JSON-LD schema.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Performance &amp; Core Web Vitals</h4>
            <p className="text-sm text-brand-textMuted">
              10 points testing mobile/desktop lab scores, render-blocking scripts, page weight, and real-user CrUX field data.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Responsive &amp; Accessibility</h4>
            <p className="text-sm text-brand-textMuted">
              10 points measuring horizontal overflow across 7 device widths (320px–1440px), touch targets, and accessibility markup.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Public Security &amp; Auth</h4>
            <p className="text-sm text-brand-textMuted">
              20 points observing TLS certificates, HSTS, CSP headers, mixed content, cookie security flags, and public login surfaces.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">GEO / AEO &amp; AI Readiness</h4>
            <p className="text-sm text-brand-textMuted">
              8 points checking AI crawler policies (GPTBot, ClaudeBot), server-side crawlability, and answer-ready structured content.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
