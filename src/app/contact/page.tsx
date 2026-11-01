import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Bug, ShieldAlert, Clock, HelpCircle, ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "Contact Us — SiteIntel Pulse Support & Communication",
  description:
    "Reach the SiteIntel Pulse team for platform inquiries, support, bug reports, and technical assistance.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Us — SiteIntel Pulse Support & Communication",
    description:
      "Reach the SiteIntel Pulse team for platform inquiries, support, bug reports, and technical assistance.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-semibold uppercase tracking-wider">
          <Mail className="w-3.5 h-3.5" />
          <span>Support &amp; Communication</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Contact the SiteIntel Pulse Team
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-brand-textMuted leading-relaxed">
          Have questions about your website audit, need assistance interpreting a technical diagnostic, or want to report an issue? We are here to help.
        </p>
      </section>

      {/* Contact Channels Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel 1: Platform Inquiries & Support */}
        <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-4">
          <div className="w-10 h-10 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">General Inquiries &amp; Audit Help</h2>
            <p className="text-xs text-brand-textMuted">
              Questions regarding audit results, score interpretation, or platform capabilities.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-brand-surface border border-brand-borderSubtle text-xs text-brand-textMuted space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <Clock className="w-3.5 h-3.5 text-brand-teal" />
              <span>Response Window: 1–2 Business Days</span>
            </div>
            <p>
              Our engineering team responds to inquiries submitted through our verified community channels and platform support tickets.
            </p>
          </div>
          <p className="text-xs text-brand-textMuted">
            For account inquiries or tenant configuration assistance, registered users can submit requests directly from their dashboard.
          </p>
        </div>

        {/* Channel 2: Technical Issues & Bug Reports */}
        <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-4">
          <div className="w-10 h-10 rounded-lg bg-brand-cyan/15 text-brand-cyan flex items-center justify-center">
            <Bug className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Bug Reports &amp; Feature Feedback</h2>
            <p className="text-xs text-brand-textMuted">
              Report crawler regressions, parser anomalies, or false positives.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-brand-surface border border-brand-borderSubtle text-xs text-brand-textMuted space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <HelpCircle className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Public Issue Tracker</span>
            </div>
            <p>
              Please provide the audit URL, scan timestamp, and observed finding details to help our engineering team reproduce the issue deterministically.
            </p>
          </div>
          <div>
            <a
              href="https://github.com/siteintel-pulse"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-cyan hover:text-white transition-colors"
            >
              <span>Visit Public Issue Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Responsible Security Disclosure */}
      <section className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
        <div className="flex items-center gap-2 text-white">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold">Responsible Vulnerability Disclosure</h2>
        </div>
        <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
          We take platform security and tenant data isolation seriously. If you identify a potential security vulnerability in SiteIntel Pulse, please report it responsibly with technical reproduction steps. We acknowledge submissions within 48 hours and prioritize remediation before public disclosure.
        </p>
      </section>

      {/* Helpful Links */}
      <section className="border-t border-brand-borderSubtle pt-8 text-center space-y-3">
        <h3 className="text-sm font-semibold text-white">Looking for documentation?</h3>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-brand-textMuted">
          <Link href="/about" className="hover:text-brand-teal transition-colors">
            About Our Methodology &rarr;
          </Link>
          <Link href="/privacy" className="hover:text-brand-teal transition-colors">
            Privacy Disclosures &rarr;
          </Link>
          <Link href="/disclaimer" className="hover:text-brand-teal transition-colors">
            Audit Limitations &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
