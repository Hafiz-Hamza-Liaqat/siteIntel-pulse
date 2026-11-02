import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Shield,
  FileText,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  BarChart3,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";
import { siteConfig } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "About SiteIntel Pulse — Evidence-Driven Website Auditing",
  description:
    "Learn about SiteIntel Pulse, our dual-audience reporting architecture, our 56-rule audit catalogue, and our commitment to honest, evidence-linked findings.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About SiteIntel Pulse — Evidence-Driven Website Auditing",
    description:
      "Learn about SiteIntel Pulse, our dual-audience reporting architecture, our 56-rule audit catalogue, and our commitment to honest, evidence-linked findings.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-semibold uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5" />
          <span>Evidence-Based Website Intelligence</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Understand Your Website. <br className="hidden sm:inline" />
          Find What to Fix. <span className="text-brand-teal">Grow with Confidence.</span>
        </h1>
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-brand-textMuted leading-relaxed">
          SiteIntel Pulse was engineered to replace noisy, subjective audit checklists with deterministic, evidence-linked diagnostics. Every finding is verifiable, every score is grounded in observed data, and every recommendation is mapped directly to developer action steps.
        </p>
      </section>

      {/* Core Philosophy & Differences */}
      <section className="space-y-8">
        <div className="border-b border-brand-border pb-4">
          <h2 className="text-2xl font-bold text-white">Our Engineering Philosophy</h2>
          <p className="text-sm text-brand-textMuted mt-1">
            Why traditional website audits mislead owners and how SiteIntel Pulse establishes honesty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Verifiable Evidence</h3>
            <p className="text-sm text-brand-textMuted leading-relaxed">
              We never report an issue without providing the exact HTTP status, response header, DOM element selector, or timing metric that proved it.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Honest Score Boundaries</h3>
            <p className="text-sm text-brand-textMuted leading-relaxed">
              When a check cannot be passively observed without deeper server credentials, we disclose it as <span className="text-amber-400 font-semibold">UNKNOWN</span> or <span className="text-slate-400 font-semibold">NOT TESTED</span> rather than fabricating compliance.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Cost of Inaction (COI)</h3>
            <p className="text-sm text-brand-textMuted leading-relaxed">
              Technical defects are translated into financial risk ranges, allowing business leaders and engineering teams to prioritize high-impact fixes rationally.
            </p>
          </div>
        </div>
      </section>

      {/* Dual Audience Architecture */}
      <section className="space-y-8">
        <div className="border-b border-brand-border pb-4">
          <h2 className="text-2xl font-bold text-white">Dual-Audience Architecture</h2>
          <p className="text-sm text-brand-textMuted mt-1">
            Tailored interfaces designed for distinct roles: non-technical owners and hands-on engineers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-brand-card border border-brand-teal/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-teal/20 text-brand-teal flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white">Website Owner Report</h3>
            </div>
            <p className="text-sm text-brand-textMuted leading-relaxed">
              Designed for founders, CMOs, and website owners who need actionable clarity without technical jargon. Features executive summaries, category health scores, prioritized business risks, and downloadable board-ready PDFs.
            </p>
            <ul className="text-xs text-brand-textMuted space-y-2 pt-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
                <span>Plain-English defect explanations and business consequences</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
                <span>Estimated revenue recovery through Cost of Inaction (COI)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
                <span>Provisional score transparency for partial scans</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link
                href="/owner-report"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal hover:text-white transition-colors"
              >
                <span>View Owner Report Platform</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="rounded-xl bg-brand-card border border-brand-cyan/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/20 text-brand-cyan flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white">Expert Diagnostic Workbench</h3>
            </div>
            <p className="text-sm text-brand-textMuted leading-relaxed">
              Built for full-stack developers, technical SEOs, and DevOps engineers. Displays full rule-by-rule ledgers, raw HTTP headers, DOM inspect data, and interactive remediation task registers with estimated engineering hours.
            </p>
            <ul className="text-xs text-brand-textMuted space-y-2 pt-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
                <span>Complete 56-rule catalogue evaluation ledger</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
                <span>Cryptographic SHA-256 audit manifest verification</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
                <span>Exportable CSV findings and comprehensive Expert PDF reports</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link
                href="/expert-audit"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-cyan hover:text-white transition-colors"
              >
                <span>Explore Expert Diagnostic Workbench</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The 11 Assessment Categories */}
      <section className="space-y-8">
        <div className="border-b border-brand-border pb-4">
          <h2 className="text-2xl font-bold text-white">Canonical 11-Category Catalogue (100 Points)</h2>
          <p className="text-sm text-brand-textMuted mt-1">
            A comprehensive, deterministic evaluation matrix covering every facet of modern web operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">1. Technical Health &amp; Crawlability</span>
            <p className="text-brand-textMuted mt-1">12 pts &bull; HTTPS, robots.txt, sitemaps, redirect chains, broken links.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">2. Technical &amp; On-Page SEO</span>
            <p className="text-brand-textMuted mt-1">18 pts &bull; Title &amp; description hygiene, headings, canonicals, schema.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">3. Performance &amp; Core Web Vitals</span>
            <p className="text-brand-textMuted mt-1">10 pts &bull; LCP, FCP, page weight, render-blocking scripts, CrUX data.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">4. Responsive &amp; Accessibility</span>
            <p className="text-brand-textMuted mt-1">10 pts &bull; Horizontal overflow (320px–1440px), touch targets, WCAG.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">5. Public Security &amp; Auth</span>
            <p className="text-brand-textMuted mt-1">20 pts &bull; TLS cipher suite, HSTS, CSP, cookie flags, exposed surfaces.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">6. Content Hygiene &amp; Usability</span>
            <p className="text-brand-textMuted mt-1">6 pts &bull; Thin content, spelling/grammar heuristics, readable text.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">7. Conversion Architecture</span>
            <p className="text-brand-textMuted mt-1">6 pts &bull; Primary CTA discovery, form accessibility, trust signals.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">8. Brand, Reputation &amp; Trust</span>
            <p className="text-brand-textMuted mt-1">6 pts &bull; Social presence, favicon, terms, privacy, copyright dates.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">9. Analytics &amp; Tooling Governance</span>
            <p className="text-brand-textMuted mt-1">4 pts &bull; Tag governance, GA4 property detection, duplicate trackers.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">10. GEO / AEO &amp; AI Readiness</span>
            <p className="text-brand-textMuted mt-1">8 pts &bull; AI bot directives, server-side crawlability, structured Q&amp;A.</p>
          </div>
          <div className="p-4 rounded-lg bg-brand-card border border-brand-border">
            <span className="font-bold text-white">11. Competitive Comparison Readiness</span>
            <p className="text-brand-textMuted mt-1">2 pts &bull; Comparative domain configuration and market benchmarking.</p>
          </div>
        </div>
      </section>

      {/* Architecture & Security */}
      <section className="p-8 rounded-2xl bg-brand-card border border-brand-border space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-teal" />
          <h2 className="text-xl font-bold text-white">Built on Resilient Native Architecture</h2>
        </div>
        <p className="text-sm text-brand-textMuted leading-relaxed">
          SiteIntel Pulse runs on native Node.js 22 and durable SQLite WAL storage, providing instantaneous local queries, transaction guarantees, and cryptographic data integrity. All customer scans run inside strictly partitioned multi-tenant boundaries with OWASP-compliant PBKDF2 authentication (220,000 iterations), SSRF DNS guards, and zero third-party data tracking.
        </p>
      </section>

      {/* CTA Section */}
      <section className="text-center py-6 space-y-4">
        <h2 className="text-2xl font-bold text-white">Ready to audit your website?</h2>
        <p className="text-sm text-brand-textMuted">
          Run a free, safe, passive website audit in seconds. No credit card required.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-teal to-brand-cyan text-white font-bold hover:shadow-lg hover:shadow-brand-teal/20 transition-all text-sm"
          >
            <span>Start Free Website Audit</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
