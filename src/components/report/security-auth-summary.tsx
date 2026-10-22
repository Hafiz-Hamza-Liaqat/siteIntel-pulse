import React from "react";
import { OwnerReport } from "@/types";
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Key, Shield } from "lucide-react";

interface SecurityAuthSummaryProps {
  report: OwnerReport;
}

export function SecurityAuthSummary({ report }: SecurityAuthSummaryProps) {
  const sec = report.securityAndAuthSummary;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-teal" />
            <span>Public Security &amp; Observable Authentication</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            Non-invasive passive evaluation of public encryption, HTTP security headers, and login transport.
          </p>
        </div>
        <span className="text-xs text-brand-textMuted bg-brand-surface px-2.5 py-1 rounded-md border border-brand-borderSubtle">
          Section 8 of 13
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-brand-cyan" />
            <span>HTTPS Encryption</span>
          </div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            {sec.httpsEnforced ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-pass" />
                <span>Strictly Enforced</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-status-fail" />
                <span>Unencrypted HTTP</span>
              </>
            )}
          </div>
          <p className="text-xs text-brand-textMuted">Protects customer credentials from network tampering.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-brand-cyan" />
            <span>Security Response Headers</span>
          </div>
          <div className="text-base font-bold text-white">
            {sec.securityHeadersConfigured} of {sec.totalSecurityHeadersChecked} Active
          </div>
          <p className="text-xs text-brand-textMuted">
            Evaluated HSTS, Content-Security-Policy, and X-Content-Type-Options.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-brand-surface border border-brand-borderSubtle space-y-2">
          <div className="text-xs font-semibold text-brand-textMuted uppercase flex items-center gap-1.5">
            <Key className="w-4 h-4 text-brand-cyan" />
            <span>Authentication Surfaces</span>
          </div>
          <div className="text-base font-bold text-white">
            {sec.authSurfacesFound} Login/Account Links
          </div>
          <p className="text-xs text-brand-textMuted">Public login endpoints operate over encrypted channels.</p>
        </div>
      </div>

      {/* Ethical Limitation Notice */}
      <div className="rounded-xl bg-brand-surface/70 border border-brand-borderSubtle p-4 text-xs text-brand-textMuted space-y-1">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-teal" />
          <span>Non-Invasive Diagnostic Boundary</span>
        </div>
        <p className="leading-relaxed">{sec.limitationsNote}</p>
      </div>
    </div>
  );
}
