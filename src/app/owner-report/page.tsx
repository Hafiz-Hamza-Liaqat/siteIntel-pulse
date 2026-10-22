"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ScanRequest, OwnerReport, JobStatus } from "@/types";
import { IntakeForm } from "@/components/intake-form";
import { ReportViewer } from "@/components/report/report-viewer";
import {
  Activity,
  AlertCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
} from "lucide-react";

export default function OwnerReportPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-24 text-center text-brand-textMuted">
          <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span>Loading Owner Audit Platform...</span>
        </div>
      }
    >
      <OwnerReportContent />
    </React.Suspense>
  );
}

function OwnerReportContent() {
  const searchParams = useSearchParams();
  const initialReportId = searchParams.get("reportId") || searchParams.get("id");

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [discoveredCount, setDiscoveredCount] = useState<number>(0);
  const [testedCount, setTestedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [report, setReport] = useState<OwnerReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load report directly if reportId exists in URL
  useEffect(() => {
    if (initialReportId && !report) {
      fetch(`/api/scan/report?id=${initialReportId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setReport(data);
          }
        })
        .catch(() => {});
    }
  }, [initialReportId, report]);

  // Handle Scan Submission
  const handleStartScan = async (data: ScanRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);
    setJobStatus("queued");
    setCurrentStage("Submitting audit request to safe intake queue...");
    setProgressPercentage(5);

    try {
      const payload: ScanRequest = {
        ...data,
        reportType: "owner",
      };

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        if (res.status === 401) {
          throw new Error("Authentication required. Please sign in to run a website audit.");
        }
        throw new Error(json.error || "Failed to start audit.");
      }

      const jobId = json.jobId;
      setActiveJobId(jobId);

      // If report already ready (cached)
      if (json.reportId) {
        const repRes = await fetch(`/api/scan/report?id=${json.reportId}`);
        const repData = await repRes.json();
        setReport(repData);
        setIsLoading(false);
        return;
      }

      // Begin polling job status
      startPolling(jobId);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
      setIsLoading(false);
      setJobStatus(null);
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
        setCurrentStage(data.currentStage || "Processing...");
        setProgressPercentage(data.progressPercentage || 0);
        setDiscoveredCount(data.discoveredCount || 0);
        setTestedCount(data.testedCount || 0);

        if (data.status === "completed") {
          clearInterval(pollIntervalRef.current!);
          setIsLoading(false);

          // Fetch completed report
          const repRes = await fetch(`/api/scan/report?jobId=${jobId}`);
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
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setIsCanceling(false);
    }
  };

  // Reset audit form
  const handleNewAudit = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setReport(null);
    setActiveJobId(null);
    setJobStatus(null);
    setIsLoading(false);
    setErrorMessage(null);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* If Report is ready, render the full 13-section viewer */}
      {report ? (
        <ReportViewer report={report} onNewScan={handleNewAudit} />
      ) : (
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header Description */}
          <div className="text-center space-y-3 pt-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/15 border border-brand-teal/30 text-brand-tealLight text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Company A Website Owner Audit</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Website Intelligence &amp; Growth Audit
            </h1>
            <p className="text-sm sm:text-base text-brand-textMuted max-w-xl mx-auto">
              Evaluate technical health, SEO discoverability, mobile speed, security posture, and AI search
              readiness in plain business terms.
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <strong className="font-semibold block text-white">Scan Notice:</strong>
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
                    <h3 className="font-bold text-white text-base">Audit in Progress</h3>
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

          {/* Form when not scanning */}
          {!isLoading && <IntakeForm onSubmit={handleStartScan} isLoading={isLoading} defaultReportType="owner" />}
        </div>
      )}
    </div>
  );
}
