"use client";

import { Target, CheckCircle2, AlertCircle, Phone, Mail, MessageSquare } from "lucide-react";
import type { ExpertReport } from "@/types";

interface ConversionUxViewProps {
  report: ExpertReport;
}

export function ConversionUxView({ report }: ConversionUxViewProps) {
  return (
    <section id="section-conversion" className="space-y-6">
      <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Conversion & UX Flow Diagnostics</h2>
            <p className="text-xs text-brand-textMuted">
              Above-the-fold CTA placement, interactive lead capture forms, and contact access points
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-2">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Primary Call-to-Action
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Visible Above the Fold</span>
          </div>
          <p className="text-xs text-brand-textMuted">
            Key intent button observed within standard 1080x720 desktop viewport viewport geometry
          </p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-2">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Form Accessibility & Inputs
          </div>
          <div className="text-lg font-bold text-white">
            Standard HTML5 Forms
          </div>
          <p className="text-xs text-brand-textMuted">
            Accessible labels, autocomplete attributes, and field validation feedback
          </p>
        </div>

        <div className="p-4 rounded-xl border border-brand-border bg-brand-card space-y-2">
          <div className="text-xs uppercase font-bold tracking-wider text-brand-textMuted">
            Trust & Support Channels
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-3">
            <Mail className="w-4 h-4 text-brand-cyan" />
            <Phone className="w-4 h-4 text-brand-cyan" />
            <MessageSquare className="w-4 h-4 text-brand-cyan" />
          </div>
          <p className="text-xs text-brand-textMuted">
            Public phone, email, contact link, or live chat assistance clues
          </p>
        </div>
      </div>
    </section>
  );
}
