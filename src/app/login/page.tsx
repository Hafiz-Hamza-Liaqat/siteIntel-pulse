"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Building, Key } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Security Hardening: Staging presets are NEVER rendered in production mode
  const showStagingPresets =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ENABLE_STAGING_PRESETS === "true";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed.");
      }

      // Route based on role
      if (data.user.role === "owner" || data.user.tenantId === "tenant_comp_b") {
        router.push("/expert-audit");
      } else {
        router.push("/owner-report");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (preset: "companya" | "companyb") => {
    if (preset === "companya") {
      setEmail("admin@companya.test");
      setPassword("CompanyA_Auditor_2026!");
    } else {
      setEmail("lead@companyb.test");
      setPassword("CompanyB_Technical_2026!");
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan group-hover:bg-brand-cyan/20 transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-brand-textPrimary font-heading">
            SiteIntel<span className="text-brand-cyan">Pulse</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white font-heading">
          Sign In to Your Tenant Workspace
        </h2>
        <p className="mt-2 text-sm text-brand-textMuted">
          Multi-tenant secure authentication with server-side authorization
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-brand-card/90 border border-brand-border/80 py-8 px-6 shadow-2xl rounded-xl sm:px-10 backdrop-blur-md">
          {error && (
            <div
              data-testid="auth-error-banner"
              className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-500/40 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textMuted mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textMuted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-brand-dark/80 border border-brand-border text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-cyan transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-textMuted mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textMuted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-brand-dark/80 border border-brand-border text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-cyan transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-brand-cyan text-brand-dark font-semibold text-sm hover:bg-brand-cyan/90 transition-colors shadow-lg shadow-brand-cyan/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Staging & Test Preset Selectors (Rendered ONLY in non-production with opt-in flag) */}
          {showStagingPresets && (
            <div data-testid="staging-presets-panel" className="mt-8 pt-6 border-t border-brand-border/60">
              <div className="text-xs font-medium text-brand-textMuted text-center mb-3">
                Staging & Controlled Evaluation Accounts:
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="preset-companya-btn"
                  onClick={() => handleQuickFill("companya")}
                  className="p-3 rounded-lg border border-brand-border/60 bg-brand-dark/50 hover:border-brand-cyan/40 hover:bg-brand-cyan/5 text-left transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan mb-1">
                    <Building className="w-3.5 h-3.5" />
                    Company A
                  </div>
                  <div className="text-[11px] text-brand-textMuted">Audit Lead</div>
                  <div className="text-[10px] text-brand-textMuted/70 font-mono mt-0.5 truncate">
                    admin@companya.test
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="preset-companyb-btn"
                  onClick={() => handleQuickFill("companyb")}
                  className="p-3 rounded-lg border border-brand-border/60 bg-brand-dark/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-left transition-all"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                    <Key className="w-3.5 h-3.5" />
                    Company B
                  </div>
                  <div className="text-[11px] text-brand-textMuted">Technical Director</div>
                  <div className="text-[10px] text-brand-textMuted/70 font-mono mt-0.5 truncate">
                    lead@companyb.test
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
