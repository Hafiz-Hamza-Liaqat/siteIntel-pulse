import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Gauge,
  Smartphone,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  BarChart3,
  Layers,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6 sm:pt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/30 text-brand-tealLight text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Milestone 1 Live Production Release</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Discover Issues. Prove with Evidence.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal via-brand-tealLight to-brand-cyan">
            Improve. Grow.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-brand-textMuted max-w-2xl mx-auto">
          SiteIntel Pulse audits your technical health, SEO discoverability, speed, public security,
          content authority, and AI-readiness into a clear, business-oriented Website Owner Report.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/owner-report"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-brand-teal to-brand-tealDark text-white font-bold shadow-lg shadow-brand-teal/25 hover:shadow-brand-teal/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-base"
          >
            <FileText className="w-5 h-5" />
            <span>Launch Owner Audit</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/expert-audit"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-teal/50 text-brand-text font-semibold hover:bg-brand-surfaceHover transition-all flex items-center justify-center gap-2 text-base"
          >
            <Layers className="w-5 h-5 text-brand-cyan" />
            <span>Milestone 2 Expert Preview</span>
          </Link>
        </div>
      </section>

      {/* Two Audiences Architecture Card Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        {/* Audience 1: Company A (Milestone 1) */}
        <div className="rounded-2xl border-2 border-brand-teal/40 bg-brand-card p-8 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-brand-teal/5">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-brand-teal text-white text-xs font-bold rounded-bl-xl uppercase tracking-wider">
            Milestone 1 Complete
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-teal/20 text-brand-tealLight flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>

            <h2 className="text-2xl font-bold text-white">Company A — Website Owner Report</h2>
            <p className="text-brand-textMuted text-sm leading-relaxed">
              Designed for platform founders, executives, and e-commerce managers. Explains why your platform
              needs improvement, identifies key risks in business terms, and delivers an evidence-based
              growth roadmap without overwhelming code trivia.
            </p>

            <ul className="space-y-2.5 pt-2 text-sm text-brand-text">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>100-point deterministic score ledger across 11 core categories</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>Executive snapshot, platform profile &amp; priority opportunity plan</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>Safe, non-invasive crawler with SSRF &amp; resource protections</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-pass shrink-0" />
                <span>High-fidelity downloadable PDF &amp; print-ready report</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <Link
              href="/owner-report"
              className="w-full py-3 px-4 rounded-xl bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-tealLight border border-brand-teal/40 font-bold transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>Generate Owner Report</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Audience 2: Company B (Milestone 2) */}
        <div className="rounded-2xl border border-brand-border bg-brand-card/60 p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-brand-surface border-l border-b border-brand-border text-brand-cyan text-xs font-bold rounded-bl-xl uppercase tracking-wider">
            Milestone 2 Roadmap
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-surface text-brand-cyan flex items-center justify-center border border-brand-border">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h2 className="text-2xl font-bold text-white">Company B — Expert Diagnostic Workbench</h2>
            <p className="text-brand-textMuted text-sm leading-relaxed">
              Reserved for technical agencies, developers, and cybersecurity teams. Projects the shared
              evidence ledger into exact DOM selectors, network traces, authenticated audits, and code fix
              instructions.
            </p>

            <ul className="space-y-2.5 pt-2 text-sm text-brand-textMuted">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0" />
                <span>Authenticated security tests &amp; private repository integration</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0" />
                <span>Exact DOM selector maps &amp; reproduction steps for engineers</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0" />
                <span>Pre-work vs post-work fix verification scans</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan shrink-0" />
                <span>Authorized Search Console &amp; Google Analytics 4 deep connector</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <Link
              href="/expert-audit"
              className="w-full py-3 px-4 rounded-xl bg-brand-surface hover:bg-brand-surfaceHover text-brand-text border border-brand-border font-semibold transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>View Milestone 2 Preview</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="space-y-8 pt-4">
        <div className="text-center space-y-2">
          <h3 className="text-xs uppercase font-bold tracking-widest text-brand-teal">
            Comprehensive Evidence Engine
          </h3>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">
            11 Audit Categories, Exactly 100 Catalogue Points
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Technical Health &amp; Crawlability</h4>
            <p className="text-sm text-brand-textMuted">
              12 points evaluating HTTPS reachability, redirect consistency, robots.txt, sitemaps, and broken internal links.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Technical &amp; On-Page SEO</h4>
            <p className="text-sm text-brand-textMuted">
              18 points auditing titles, meta descriptions, heading outlines, canonical tags, slug readability, and JSON-LD schema.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Performance &amp; Core Web Vitals</h4>
            <p className="text-sm text-brand-textMuted">
              10 points testing mobile/desktop lab scores, render-blocking scripts, page weight, and real-user CrUX field data.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Responsive &amp; Accessibility</h4>
            <p className="text-sm text-brand-textMuted">
              10 points measuring horizontal overflow across 7 device widths (320px–1440px), touch targets, and accessibility markup.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Public Security &amp; Auth</h4>
            <p className="text-sm text-brand-textMuted">
              20 points observing TLS certificates, HSTS, CSP headers, mixed content, cookie security flags, and public login surfaces.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">GEO / AEO &amp; AI Readiness</h4>
            <p className="text-sm text-brand-textMuted">
              8 points checking AI crawler policies (GPTBot, ClaudeBot), server-side crawlability, and answer-ready structured content.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
