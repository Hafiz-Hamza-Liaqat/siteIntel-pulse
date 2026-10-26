"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScanRequestSchema, ScanRequest, ReportType } from "@/types";
import {
  Globe,
  Building,
  Target,
  Sparkles,
  ShieldAlert,
  Search,
  Users,
  Compass,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface IntakeFormProps {
  onSubmit: (data: ScanRequest) => void;
  isLoading: boolean;
  defaultReportType?: ReportType;
}

export function IntakeForm({ onSubmit, isLoading, defaultReportType = "owner" }: IntakeFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScanRequest>({
    resolver: zodResolver(ScanRequestSchema),
    defaultValues: {
      targetUrl: "",
      reportType: defaultReportType,
      platformName: "",
      businessCategory: "auto",
      targetMarket: "US",
      preferredLanguage: "en",
      businessGoal: "Improve organic search visibility and conversion rate",
      targetAudience: "Online shoppers and prospective clients",
      competitors: [],
      maxPages: 50,
      maxDepth: 3,
    },
  });

  const selectedReportType = watch("reportType") || "owner";

  const handleFormSubmit = (data: ScanRequest) => {
    // Clean competitors array if string was split
    const cleanedCompetitors = (data.competitors || [])
      .map((c) => c.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, ""))
      .filter(Boolean)
      .slice(0, 3);

    const sanitizeNum = (v: any) => (typeof v === "number" && !isNaN(v) ? v : undefined);

    onSubmit({
      ...data,
      reportType: selectedReportType,
      competitors: cleanedCompetitors,
      monthlySessions: sanitizeNum(data.monthlySessions),
      averageOrderValue: sanitizeNum(data.averageOrderValue),
      leadConversionRatePct: sanitizeNum(data.leadConversionRatePct),
      leadToCustomerRatePct: sanitizeNum(data.leadToCustomerRatePct),
      customerValue: sanitizeNum(data.customerValue),
      subscriptionRevenue: sanitizeNum(data.subscriptionRevenue),
      grossMarginPct: sanitizeNum(data.grossMarginPct),
    });
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl"
    >
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Globe className="w-6 h-6 text-brand-teal" />
          <span>Website Audit Intake &amp; Intelligence</span>
        </h2>
        <p className="text-sm text-brand-textMuted">
          Enter a public domain (e.g. <span className="text-brand-tealLight font-mono">example.com</span>) or HTTPS URL.
          Select exactly one report perspective. SiteIntel Pulse performs a bounded, non-invasive assessment strictly adhering to robots.txt.
        </p>
      </div>

      {/* Report Type Selector (Single-Report Selection Requirement) */}
      <div className="space-y-2.5">
        <label className="block text-sm font-semibold text-white flex items-center justify-between">
          <span>Choose Report Type <span className="text-red-400">*</span></span>
          <span className="text-xs text-brand-textMuted font-normal">Strictly 1 report generated per scan</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Option A: Owner Report */}
          <div
            onClick={() => setValue("reportType", "owner")}
            className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
              selectedReportType === "owner"
                ? "border-brand-teal bg-brand-teal/10 shadow-md shadow-brand-teal/10"
                : "border-brand-border bg-brand-surface/60 hover:border-brand-borderSubtle hover:bg-brand-surface"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedReportType === "owner"
                        ? "bg-brand-teal text-white"
                        : "bg-brand-surface border border-brand-border text-brand-textMuted"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-tealLight">Company A</span>
                    <h3 className="text-sm font-bold text-white leading-tight">Website Owner Report</h3>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedReportType === "owner"
                      ? "border-brand-teal bg-brand-teal text-white"
                      : "border-brand-border bg-brand-surface"
                  }`}
                >
                  {selectedReportType === "owner" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className="text-xs text-brand-textMuted leading-relaxed">
                Executive summary, 100-point composite score, business impact themes, competitor benchmarks, and PDF export. Tailored for platform founders and decision-makers.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-brand-borderSubtle/50 text-[11px] font-medium text-brand-tealLight">
              ✓ Bounded Non-invasive • Executive Insights
            </div>
          </div>

          {/* Option B: Expert Diagnostic Report */}
          <div
            onClick={() => setValue("reportType", "expert")}
            className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
              selectedReportType === "expert"
                ? "border-brand-cyan bg-brand-cyan/10 shadow-md shadow-brand-cyan/10"
                : "border-brand-border bg-brand-surface/60 hover:border-brand-borderSubtle hover:bg-brand-surface"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedReportType === "expert"
                        ? "bg-brand-cyan text-brand-bg font-bold"
                        : "bg-brand-surface border border-brand-border text-brand-textMuted"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">Company B</span>
                    <h3 className="text-sm font-bold text-white leading-tight">Expert Diagnostic Report</h3>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedReportType === "expert"
                      ? "border-brand-cyan bg-brand-cyan text-brand-bg font-bold"
                      : "border-brand-border bg-brand-surface"
                  }`}
                >
                  {selectedReportType === "expert" && <CheckCircle2 className="w-3.5 h-3.5 text-brand-bg" />}
                </div>
              </div>
              <p className="text-xs text-brand-textMuted leading-relaxed">
                Deep technical findings ledger, code snippets, URL inventory, reproduction steps, remediation tasks, and CSV/PDF export. Tailored for engineers and consultants.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-brand-borderSubtle/50 text-[11px] font-medium text-brand-cyan">
              ✓ 56-Rule Findings Ledger • Remediation Register
            </div>
          </div>
        </div>

        {errors.reportType && (
          <p className="text-xs text-red-400 font-medium">{errors.reportType.message}</p>
        )}
      </div>

      {/* Main Website URL Input */}
      <div className="space-y-2">
        <label htmlFor="targetUrl" className="block text-sm font-semibold text-white">
          Website Domain or URL <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-textMuted">
            <Globe className="w-5 h-5 text-brand-teal" />
          </div>
          <input
            id="targetUrl"
            type="text"
            placeholder="e.g. example.com or https://store.example.com"
            disabled={isLoading}
            {...register("targetUrl")}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-brand-surface border border-brand-border focus:border-brand-teal focus:ring-1 focus:ring-brand-teal text-white placeholder-brand-textMuted/60 text-base transition-colors"
          />
        </div>
        {errors.targetUrl && (
          <p className="text-xs text-red-400 font-medium">{errors.targetUrl.message}</p>
        )}
      </div>

      {/* Business Platform Name & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="platformName" className="block text-xs font-semibold text-brand-text uppercase tracking-wider">
            Platform / Brand Name (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textMuted">
              <Building className="w-4 h-4" />
            </div>
            <input
              id="platformName"
              type="text"
              placeholder="e.g. Acme Platform"
              disabled={isLoading}
              {...register("platformName")}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border focus:border-brand-teal text-white placeholder-brand-textMuted/50 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="businessCategory" className="block text-xs font-semibold text-brand-text uppercase tracking-wider">
            Business Category
          </label>
          <div className="relative">
            <select
              id="businessCategory"
              disabled={isLoading}
              {...register("businessCategory")}
              className="w-full px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border focus:border-brand-teal text-white text-sm"
            >
              <option value="auto">⚡ Auto-Detect from Crawl Evidence (Recommended)</option>
              <option value="ecommerce">Ecommerce &amp; Online Retail</option>
              <option value="job_board">Job Board &amp; Remote Work Marketplace</option>
              <option value="saas">SaaS &amp; Software Platform</option>
              <option value="marketplace">Marketplace &amp; Directory</option>
              <option value="publisher">Publisher &amp; Media Blog</option>
              <option value="local_service">Local Service Business</option>
              <option value="portfolio">Portfolio &amp; Agency</option>
              <option value="nonprofit">Nonprofit &amp; Community</option>
              <option value="other">General Commercial Platform</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Scope / Competitor Expansion Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-semibold text-brand-tealLight hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{showAdvanced ? "Hide Advanced Settings" : "+ Add Competitors, Target Market & Goals"}</span>
        </button>
      </div>

      {showAdvanced && (
        <div className="rounded-xl bg-brand-surface/70 border border-brand-borderSubtle p-4 space-y-4 pt-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="targetMarket" className="block text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
                Target Market / Country
              </label>
              <input
                id="targetMarket"
                type="text"
                placeholder="e.g. US, UK, Global"
                disabled={isLoading}
                {...register("targetMarket")}
                className="w-full px-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="preferredLanguage" className="block text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
                Preferred Language
              </label>
              <input
                id="preferredLanguage"
                type="text"
                placeholder="e.g. en, es, de"
                disabled={isLoading}
                {...register("preferredLanguage")}
                className="w-full px-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="competitorInput" className="block text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
              Competitor Domains for Benchmark (Up to 3, comma separated)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textMuted">
                <Users className="w-4 h-4" />
              </div>
              <input
                id="competitorInput"
                type="text"
                placeholder="e.g. competitor1.com, competitor2.com"
                disabled={isLoading}
                onChange={(e) => {
                  const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  setValue("competitors", arr);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-white placeholder-brand-textMuted/50 text-sm"
              />
            </div>
          </div>

          {/* Optional Commercial Inputs for Cost of Inaction Calculator */}
          <div className="pt-2 border-t border-brand-borderSubtle/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-tealLight uppercase tracking-wider">
                Cost of Inaction &amp; Revenue Opportunity Inputs (Optional)
              </span>
              <span className="text-[11px] text-brand-textMuted">Models financial upside from fixing friction</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="monthlySessions" className="block text-[11px] font-semibold text-brand-textMuted uppercase">
                  Monthly Sessions
                </label>
                <input
                  id="monthlySessions"
                  type="number"
                  placeholder="e.g. 50000"
                  disabled={isLoading}
                  {...register("monthlySessions", { valueAsNumber: true })}
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="averageOrderValue" className="block text-[11px] font-semibold text-brand-textMuted uppercase">
                  Avg Order Value (AOV)
                </label>
                <input
                  id="averageOrderValue"
                  type="number"
                  step="any"
                  placeholder="e.g. 85.00"
                  disabled={isLoading}
                  {...register("averageOrderValue", { valueAsNumber: true })}
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="customerValue" className="block text-[11px] font-semibold text-brand-textMuted uppercase">
                  Customer Value (ACV)
                </label>
                <input
                  id="customerValue"
                  type="number"
                  step="any"
                  placeholder="e.g. 750.00"
                  disabled={isLoading}
                  {...register("customerValue", { valueAsNumber: true })}
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label htmlFor="leadConversionRatePct" className="block text-[11px] font-semibold text-brand-textMuted uppercase">
                  Lead Rate (%)
                </label>
                <input
                  id="leadConversionRatePct"
                  type="number"
                  step="any"
                  placeholder="e.g. 2.5"
                  disabled={isLoading}
                  {...register("leadConversionRatePct", { valueAsNumber: true })}
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="leadToCustomerRatePct" className="block text-[11px] font-semibold text-brand-textMuted uppercase">
                  Close Rate (%)
                </label>
                <input
                  id="leadToCustomerRatePct"
                  type="number"
                  step="any"
                  placeholder="e.g. 15.0"
                  disabled={isLoading}
                  {...register("leadToCustomerRatePct", { valueAsNumber: true })}
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="grossMarginPct" className="block text-[11px] font-semibold text-brand-textMuted uppercase">
                  Gross Margin (%)
                </label>
                <input
                  id="grossMarginPct"
                  type="number"
                  step="any"
                  placeholder="e.g. 40"
                  disabled={isLoading}
                  {...register("grossMarginPct", { valueAsNumber: true })}
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="currency" className="block text-[11px] font-semibold text-brand-textMuted uppercase">
                  Currency
                </label>
                <select
                  id="currency"
                  disabled={isLoading}
                  {...register("currency")}
                  className="w-full px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white text-xs"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scope Disclaimer */}
      <div className="rounded-lg bg-brand-surface p-3.5 border border-brand-borderSubtle flex items-start gap-2.5 text-xs text-brand-textMuted">
        <ShieldAlert className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
        <span>
          <strong>Bounded Public Scope:</strong> SiteIntel Pulse conducts a safe, non-destructive public assessment
          (max 50 pages). No login bypasses, destructive payloads, or private systems are accessed. Strictly adheres to robots.txt.
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3.5 px-6 rounded-xl text-white font-bold shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:pointer-events-none ${
          selectedReportType === "expert"
            ? "bg-gradient-to-r from-teal-500 to-cyan-600 shadow-cyan-500/20 hover:shadow-cyan-500/35"
            : "bg-gradient-to-r from-brand-teal to-brand-tealDark shadow-brand-teal/20 hover:shadow-brand-teal/35"
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Initializing Scan Pipeline...</span>
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            <span>
              {selectedReportType === "expert"
                ? "Start Expert Audit"
                : "Start Owner Audit"}
            </span>
          </>
        )}
      </button>
    </form>
  );
}
