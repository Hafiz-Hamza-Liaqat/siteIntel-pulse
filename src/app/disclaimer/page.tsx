import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ShieldAlert, BarChart2, CheckCircle, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Methodology & Service Disclaimer — SiteIntel Pulse",
  description:
    "Important disclaimers regarding automated scan limitations, non-guarantee of search rankings or financial outcomes, and non-evaluated check disclosures.",
  alternates: {
    canonical: "/disclaimer",
  },
  openGraph: {
    title: "Methodology & Service Disclaimer — SiteIntel Pulse",
    description:
      "Important disclaimers regarding automated scan limitations, non-guarantee of search rankings or financial outcomes, and non-evaluated check disclosures.",
    url: "/disclaimer",
  },
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <section className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-semibold uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Operational Transparency</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Methodology &amp; Service Disclaimer
        </h1>
        <p className="text-sm text-brand-textMuted">
          Effective Date: 29 October 2026 &bull; Version 1.0
        </p>
        <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed pt-2">
          SiteIntel Pulse is committed to honest, evidence-based reporting. This document outlines the technical boundaries of our audits, the methodology behind our scoring models, and critical service limitations.
        </p>
      </section>

      {/* Primary Disclaimers */}
      <section className="space-y-8 text-sm text-brand-textMuted leading-relaxed">
        {/* 1. No Ranking or Traffic Guarantees */}
        <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <BarChart2 className="w-5 h-5 text-brand-teal" />
            <h2>1. Search Engine &amp; AI Discovery Non-Guarantee</h2>
          </div>
          <p>
            SiteIntel Pulse evaluates technical SEO best practices, Core Web Vitals, crawlability, and schema markup based on published search engine documentation. However, search engine algorithms (including Google, Microsoft Bing, and AI search engines like ChatGPT Search and Perplexity) evaluate hundreds of complex, proprietary, and dynamic ranking signals.
          </p>
          <p className="text-xs text-brand-textMuted bg-brand-surface p-3 rounded-lg border border-brand-borderSubtle">
            <strong>Explicit Policy:</strong> We do NOT guarantee that resolving technical findings will result in page indexation, higher search rankings, featured snippets, AI answer citations, or traffic increases.
          </p>
        </div>

        {/* 2. Cost of Inaction (COI) Estimates */}
        <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <AlertCircle className="w-5 h-5 text-brand-cyan" />
            <h2>2. Cost of Inaction (COI) &amp; Financial Projections</h2>
          </div>
          <p>
            The Cost of Inaction ledgers in the Website Owner Report are heuristic estimations designed to quantify relative technical debt. They are calculated using mathematical models that weigh observed defect severities against user-entered monthly revenue or industry baseline assumptions.
          </p>
          <p className="text-xs text-brand-textMuted bg-brand-surface p-3 rounded-lg border border-brand-borderSubtle">
            <strong>Explicit Policy:</strong> COI figures are informational modeling tools and do NOT constitute financial, legal, or investment advice. Actual financial recovery depends on business model, market demand, competitor actions, and implementation quality.
          </p>
        </div>

        {/* 3. Security Check Boundaries */}
        <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2>3. Public Security Check Scope</h2>
          </div>
          <p>
            Our Public Security &amp; Auth audit observes publicly visible HTTP response headers (such as Content-Security-Policy, HSTS, X-Content-Type-Options), TLS certificate parameters, cookie flags, and exposed authentication surfaces.
          </p>
          <p className="text-xs text-brand-textMuted bg-brand-surface p-3 rounded-lg border border-brand-borderSubtle">
            <strong>Explicit Policy:</strong> This audit does NOT constitute a comprehensive security vulnerability scan, penetration test, or compliance audit (e.g., SOC 2, HIPAA, PCI-DSS). A passing score does not prove that a website is free of internal vulnerabilities or safe from cyberattacks.
          </p>
        </div>

        {/* 4. Non-Evaluated Checks and Passive Scan Limits */}
        <div className="p-6 rounded-xl bg-brand-card border border-brand-border space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h2>4. Disclosures on Non-Evaluated Rules (UNKNOWN / NOT TESTED)</h2>
          </div>
          <p>
            Passive web crawling cannot observe server-side databases, private APIs, authenticated dashboards, or third-party ad accounts. When evidence is inaccessible:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Rules are marked <span className="text-amber-400 font-semibold">UNKNOWN</span> or <span className="text-slate-400 font-semibold">NOT TESTED</span>.</li>
            <li>Such rules are excluded from score calculation or handled with provisional status warnings.</li>
            <li>We will never report a rule as &quot;PASS&quot; simply because we could not test it.</li>
          </ul>
        </div>
      </section>

      {/* Navigation Footer */}
      <section className="border-t border-brand-borderSubtle pt-6 text-center text-xs text-brand-textMuted">
        <p>
          Questions about our methodology? Read our <Link href="/about" className="text-brand-teal hover:underline">About Page</Link> or reach out via our <Link href="/contact" className="text-brand-teal hover:underline">Contact Page</Link>.
        </p>
      </section>
    </div>
  );
}
