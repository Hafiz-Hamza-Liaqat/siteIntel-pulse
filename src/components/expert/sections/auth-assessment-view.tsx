"use client";

import { Lock, CheckCircle2, AlertTriangle, ShieldAlert, KeyRound, Check } from "lucide-react";
import type { AuthenticationDiagnostic } from "@/types";

interface AuthAssessmentViewProps {
  auth: AuthenticationDiagnostic;
}

export function AuthAssessmentView({ auth }: AuthAssessmentViewProps) {
  return (
    <section id="section-auth" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Authentication Posture & Session Controls</h2>
            <p className="text-xs text-brand-textMuted">
              Observable login endpoints, session cookie flags, MFA triggers, and authorized test credentials
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Security Attributes */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-cyan" />
            <span>Session Cookie Attribute Verification</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">Secure Flag Enforced</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Ensures session tokens are transmitted solely over TLS
                </span>
              </div>
              <span
                className={`font-bold font-mono ${
                  auth.sessionSecurity.cookieSecure ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {auth.sessionSecurity.cookieSecure ? "ENFORCED" : "VULNERABLE"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">HttpOnly Flag Enforced</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Blocks JavaScript access to prevent XSS session hijacking
                </span>
              </div>
              <span
                className={`font-bold font-mono ${
                  auth.sessionSecurity.cookieHttpOnly ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {auth.sessionSecurity.cookieHttpOnly ? "ENFORCED" : "VULNERABLE"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-between">
              <div>
                <strong className="text-white block">SameSite Context Policy</strong>
                <span className="text-brand-textMuted text-[11px]">
                  Protects session context against cross-site request forgery (CSRF)
                </span>
              </div>
              <span className="text-brand-cyan font-bold font-mono">
                {auth.sessionSecurity.cookieSameSite}
              </span>
            </div>
          </div>
        </div>

        {/* Public Login Surfaces */}
        <div className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-cyan" />
            <span>Discovered Authentication Surfaces</span>
          </h3>

          {auth.publicLoginSurfaces.length === 0 ? (
            <div className="p-4 rounded-lg bg-brand-surface border border-brand-border text-xs text-brand-textMuted text-center">
              No public login or registration form action discovered during crawl.
            </div>
          ) : (
            <div className="space-y-2">
              {auth.publicLoginSurfaces.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-brand-surface border border-brand-border text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white text-[11px] truncate max-w-xs">{s.url}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      HTTPS
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-brand-textMuted">
                    <span>CSRF Token Clue: <strong className="text-slate-300">{s.hasCsrfClue ? "Detected" : "Unobserved"}</strong></span>
                    <span>•</span>
                    <span>Autocomplete Off: <strong className="text-slate-300">{s.hasAutocompleteProtection ? "Yes" : "Default"}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Untested Controls Disclosure */}
      <div className="p-4 rounded-xl border border-brand-border bg-brand-surface/60 text-xs text-brand-text space-y-2">
        <div className="font-bold text-white flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Excluded Deep Authentication Tests (Requires Owner Authorization):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-brand-textMuted pt-1">
          {auth.untestedControls.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
