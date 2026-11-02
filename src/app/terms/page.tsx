import type { Metadata } from "next";
import Link from "next/link";
import { FileText, AlertTriangle, ShieldCheck, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — SiteIntel Pulse",
  description:
    "Terms of service, audit scope, user responsibilities, and service boundaries for the SiteIntel Pulse website intelligence platform.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service — SiteIntel Pulse",
    description:
      "Terms of service, audit scope, user responsibilities, and service boundaries for the SiteIntel Pulse website intelligence platform.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <section className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-semibold uppercase tracking-wider">
          <Scale className="w-3.5 h-3.5" />
          <span>User Agreement &amp; Operating Terms</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-sm text-brand-textMuted">
          Effective Date: 29 October 2026 &bull; Version 1.0
        </p>
        <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed pt-2">
          By accessing or using SiteIntel Pulse (&quot;the Platform&quot;), including running website audits, accessing the Owner Report, or using the Expert Diagnostic Workbench, you agree to comply with and be bound by these Terms of Service.
        </p>
      </section>

      {/* Sections */}
      <section className="space-y-10 text-sm text-brand-textMuted leading-relaxed">
        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            1. Nature and Scope of the Service
          </h2>
          <p>
            SiteIntel Pulse provides automated, non-destructive web intelligence, technical health diagnostics, SEO audits, and mobile responsiveness analysis. The Platform operates by requesting and analyzing publicly available web resources from the URLs specified by the user.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            2. Permitted Use and Authorization
          </h2>
          <p>You agree to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Only submit target URLs that you own, operate, or have explicit authorization to audit.</li>
            <li>Not use the Platform to conduct denial-of-service (DoS) attacks, spam, or abusive automated scanning.</li>
            <li>Respect the crawling page limits, rate limits, and concurrency caps enforced by the Platform.</li>
            <li>Not attempt to reverse-engineer, bypass multi-tenant boundaries, or access another tenant&apos;s reports.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            3. No Guarantee of SEO Rankings or Financial Outcomes
          </h2>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs sm:text-sm space-y-1">
            <strong>Important Notice:</strong>
            <p>
              SiteIntel Pulse is an observational diagnostic tool. We make no representations, warranties, or guarantees that implementing our recommendations will result in specific search engine rankings, increased organic traffic, indexing by search engines, citations in AI answer engines, or specific business revenue increases.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            4. Limitation of Automated Audits
          </h2>
          <p>
            Our automated scanner performs passive analysis of publicly accessible HTTP endpoints and HTML structures. It does not perform invasive penetration testing, source code audits, or authenticated application logic reviews. A clean bill of health on our Public Security check does NOT constitute a formal security certification (e.g., SOC 2, ISO 27001, or PCI-DSS).
          </p>
        </div>

        {/* Section 5 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            5. Intellectual Property &amp; Report Ownership
          </h2>
          <p>
            You retain all rights and ownership of your submitted target website content. Upon completion of an audit, you are granted full rights to download, view, reproduce, and share your generated Owner Reports, Expert PDFs, and CSV data ledgers for internal business or client advisory purposes.
          </p>
        </div>

        {/* Section 6 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            6. Service Availability &amp; Modifications
          </h2>
          <p>
            The Platform is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We reserve the right to update the 56-rule catalogue, adjust scoring heuristics, refine thresholds, or modify feature availability without prior notice to reflect evolving web standards and platform requirements.
          </p>
        </div>

        {/* Section 7 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            7. Governing Law &amp; Contact
          </h2>
          <p>
            For questions or disputes regarding these Terms of Service, please reach out through our <Link href="/contact" className="text-brand-teal hover:underline">Contact Page</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
