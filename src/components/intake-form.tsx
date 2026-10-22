"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScanRequestSchema, ScanRequest } from "@/types";
import {
  Globe,
  Building,
  Target,
  Sparkles,
  ShieldAlert,
  Search,
  Users,
  Compass,
} from "lucide-react";

interface IntakeFormProps {
  onSubmit: (data: ScanRequest) => void;
  isLoading: boolean;
}

export function IntakeForm({ onSubmit, isLoading }: IntakeFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScanRequest>({
    resolver: zodResolver(ScanRequestSchema),
    defaultValues: {
      targetUrl: "",
      platformName: "",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      businessGoal: "Improve organic search visibility and conversion rate",
      targetAudience: "Online shoppers and prospective clients",
      competitors: [],
      maxPages: 50,
      maxDepth: 3,
    },
  });

  const handleFormSubmit = (data: ScanRequest) => {
    // Clean competitors array if string was split
    const cleanedCompetitors = (data.competitors || [])
      .map((c) => c.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, ""))
      .filter(Boolean)
      .slice(0, 3);

    onSubmit({
      ...data,
      competitors: cleanedCompetitors,
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
          <span>Website Owner Audit Intake</span>
        </h2>
        <p className="text-sm text-brand-textMuted">
          Enter a public domain (e.g. <span className="text-brand-tealLight font-mono">naffeez.com</span>) or HTTPS URL.
          SiteIntel Pulse performs a bounded, non-invasive assessment strictly adhering to robots.txt.
        </p>
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
            placeholder="e.g. naffeez.com or https://store.example.com"
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
              placeholder="e.g. Naffeez Apparel"
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
          <select
            id="businessCategory"
            disabled={isLoading}
            {...register("businessCategory")}
            className="w-full px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border focus:border-brand-teal text-white text-sm"
          >
            <option value="ecommerce">E-Commerce &amp; Online Retail</option>
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

      {/* Advanced Scope / Competitor Expansion Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-semibold text-brand-tealLight hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{showAdvanced ? "Hide Market & Benchmark Settings" : "+ Add Competitors, Market & Target Goals"}</span>
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
                  // Manually pass to hook form via register
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-white placeholder-brand-textMuted/50 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Scope Disclaimer */}
      <div className="rounded-lg bg-brand-surface p-3.5 border border-brand-borderSubtle flex items-start gap-2.5 text-xs text-brand-textMuted">
        <ShieldAlert className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
        <span>
          <strong>Bounded Public Scope:</strong> SiteIntel Pulse conducts a safe, non-destructive public assessment
          (max 50 pages). No login bypasses, destructive payloads, or private systems are accessed.
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-teal to-brand-tealDark text-white font-bold shadow-lg shadow-brand-teal/20 hover:shadow-brand-teal/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:pointer-events-none"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Initializing Scan Pipeline...</span>
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            <span>Start Owner Audit</span>
          </>
        )}
      </button>
    </form>
  );
}
