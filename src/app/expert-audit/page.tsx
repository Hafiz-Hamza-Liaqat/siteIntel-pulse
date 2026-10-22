"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Terminal,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Activity,
  Layers,
  RotateCcw,
  XCircle,
  FileText,
  Play,
  CheckCircle,
} from "lucide-react";
import type { ExpertReport, ScanRequest, JobStatus } from "@/types";
import { ExpertWorkbench } from "@/components/expert/expert-workbench";
import { IntakeForm } from "@/components/intake-form";

export default function ExpertAuditPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-24 text-center text-brand-textMuted">
          <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span>Loading Company B Expert Diagnostic Workbench...</span>
        </div>
      }
    >
      <ExpertAuditContent />
    </React.Suspense>
  );
}

function ExpertAuditContent() {
  const searchParams = useSearchParams();
  const initialReportId = searchParams.get("id") || searchParams.get("reportId");
  const initialJobId = searchParams.get("jobId");

  const [report, setReport] = useState<ExpertReport | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(initialJobId);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [discoveredCount, setDiscoveredCount] = useState<number>(0);
  const [testedCount, setTestedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load report directly if id or reportId exists in URL
  useEffect(() => {
    const reportKey = initialReportId || initialJobId;
    if (reportKey && !report) {
      setIsLoading(true);
      const queryParam = initialReportId ? `id=${initialReportId}` : `jobId=${initialJobId}`;
      fetch(`/api/scan/expert-report?${queryParam}`)
        .then((res) => {
          if (!res.ok) throw new Error("Report not found");
          return res.json();
        })
        .then((data) => {
          if (!data.error) {
            setReport(data);
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [initialReportId, initialJobId, report]);

  // Handle Scan Submission
  const handleStartScan = async (data: ScanRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);
    setJobStatus("queued");
    setCurrentStage("Enqueuing audit request...");
    setProgressPercentage(5);

    try {
      const payload: ScanRequest = {
        ...data,
        reportType: "expert",
      };

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        if (res.status === 401) {
          throw new Error("Authentication required. Please sign in to launch an audit workbench.");
        }
        throw new Error(json.error || "Failed to start audit.");
      }

      const jobId = json.jobId;
      setActiveJobId(jobId);

      // Begin polling
      startPolling(jobId);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
      setIsLoading(false);
      setJobStatus(null);
    }
  };

  // Launch instant controlled demonstration workbench
  const handleLaunchDemo = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/scan/expert-demo", { method: "POST" });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      } else {
        throw new Error(data.error || "Failed to generate demo report");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not launch demo workbench");
    } finally {
      setIsLoading(false);
    }
  };

  // Poll scan status until completion
  const startPolling = (jobId: string) => {
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

          // Fetch completed expert report
          const repRes = await fetch(`/api/scan/expert-report?jobId=${jobId}`);
          const repData = await repRes.json();
          if (!repData.error) {
            setReport(repData);
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
      setCurrentStage("Canceling scan safely...");
    } catch (err) {
      console.error("Cancel request failed", err);
    } finally {
      setIsCanceling(false);
    }
  };

  // If report is loaded, render the complete 19-section workbench!
  if (report) {
    return <ExpertWorkbench report={report} />;
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-brand-textMuted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Hero Notice */}
      <div className="rounded-2xl border border-brand-cyan/40 bg-brand-card p-6 sm:p-8 space-y-6 shadow-2xl shadow-brand-cyan/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-bold tracking-wide uppercase">
            <Terminal className="w-3.5 h-3.5" />
            <span>Milestone 2 • Company B Workbench</span>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Status: Fully Operational
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Company B — Expert Diagnostic Workbench
          </h1>
          <p className="text-brand-textMuted text-sm sm:text-base leading-relaxed">
            The Company B Diagnostic Workbench provides SEO specialists, developers, UI/UX designers,
            and cybersecurity professionals with deep technical evidence, 56-rule score ledgers,
            exact DOM elements, and workstream remediation plans for Company A platforms.
          </p>
        </div>

        {/* Quick Launch Demo Banner */}
        <div className="p-4 rounded-xl bg-brand-surface border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-bold text-white text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-cyan" />
              <span>Instant Controlled Demonstration</span>
            </div>
            <p className="text-xs text-brand-textMuted">
              Load a comprehensive e-commerce audit with all 19 diagnostic sections and 56 evaluated rules.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLaunchDemo}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-cyan hover:bg-brand-cyanHover text-brand-dark font-bold text-xs transition-all shadow-md shadow-brand-cyan/20 shrink-0 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Load Demo Workbench</span>
          </button>
        </div>
      </div>

      {/* In-Flight Scan Progress Card */}
      {isLoading && (
        <div className="p-6 rounded-2xl border border-brand-cyan/40 bg-brand-card space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-cyan">
              <Activity className="w-5 h-5 animate-spin" />
              <span className="font-bold text-sm">Autonomous Audit in Progress</span>
            </div>
            <span className="text-xs font-mono text-brand-textMuted">
              {progressPercentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-brand-surface overflow-hidden border border-brand-border">
            <div
              className="h-full bg-gradient-to-r from-brand-cyan to-brand-teal transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-brand-textMuted">
            <div>
              Stage: <strong className="text-white">{currentStage}</strong>
            </div>
            <div className="flex items-center gap-3">
              <span>Discovered: <strong className="text-white">{discoveredCount}</strong></span>
              <span>•</span>
              <span>Tested: <strong className="text-white">{testedCount}</strong></span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleCancelScan}
              disabled={isCanceling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isCanceling ? "Canceling..." : "Cancel Audit"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message Card */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Custom Scan Intake Form */}
      {!isLoading && (
        <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-cyan" />
              <span>Launch Live Target Audit</span>
            </h2>
            <p className="text-xs text-brand-textMuted">
              Provide a public HTTP or HTTPS domain to initiate safe discovery and evidence collection.
            </p>
          </div>

          <IntakeForm
            onSubmit={handleStartScan}
            isLoading={isLoading}
            defaultReportType="expert"
          />
        </div>
      )}
    </div>
  );
}
