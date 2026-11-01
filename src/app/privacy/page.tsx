import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Database, EyeOff, Cookie, Server, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — SiteIntel Pulse",
  description:
    "Truthful disclosure of data collection, passive scan processing, retention policies, isolated guest sessions, and cookies for SiteIntel Pulse.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy — SiteIntel Pulse",
    description:
      "Truthful disclosure of data collection, passive scan processing, retention policies, isolated guest sessions, and cookies for SiteIntel Pulse.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <section className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Data Governance &amp; Transparency</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-brand-textMuted">
          Last Updated: 29 October 2026 &bull; Version 1.0
        </p>
        <p className="text-sm sm:text-base text-brand-textMuted leading-relaxed pt-2">
          This Privacy Policy provides an accurate, truthful disclosure of how SiteIntel Pulse collects, processes, and protects data when you use our website, submit website audits, or access our intelligence platform.
        </p>
      </section>

      {/* Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-brand-card border border-brand-border space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <EyeOff className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-sm">Zero Data Selling</h3>
          <p className="text-brand-textMuted">We never sell, rent, or trade your scan data, findings, or account details to third parties.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-card border border-brand-border space-y-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-sm">Isolated Guest Sessions</h3>
          <p className="text-brand-textMuted">Free scans run under isolated guest tenant IDs so users cannot see each other&apos;s reports.</p>
        </div>

        <div className="p-4 rounded-xl bg-brand-card border border-brand-border space-y-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Cookie className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-sm">Essential Cookies Only</h3>
          <p className="text-brand-textMuted">We do not set third-party advertising cookies or cross-site behavioral tracking scripts.</p>
        </div>
      </section>

      {/* Detailed Policy Sections */}
      <section className="space-y-10 text-sm text-brand-textMuted leading-relaxed">
        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            1. Information We Collect
          </h2>
          <p>We collect information in two categories:</p>
          <div className="space-y-3 pl-2">
            <div>
              <strong className="text-white">A. Website Audit Target Data:</strong> When you initiate a website audit, our crawler fetches publicly available web pages from the target URL you provide. This includes public HTML markup, HTTP response headers, TLS certificate configurations, robots.txt directives, and public XML sitemaps. Our scanner does not attempt to bypass login screens or access private, unauthenticated content.
            </div>
            <div>
              <strong className="text-white">B. Account &amp; Authentication Data:</strong> When an account is registered or provisioned, we store your email address, associated tenant organization name, and a cryptographically salted password hash (PBKDF2 with SHA-512 over 220,000 iterations). We never store raw or plain-text passwords.
            </div>
            <div>
              <strong className="text-white">C. Network &amp; Security Logs:</strong> For abuse prevention, DoS mitigation, and IP rate limiting, we process the client IP address forwarded by our trusted reverse proxy. Rate limit counters are stored ephemerally and aggregated by hour.
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To execute the requested website audit and generate the Owner Report and Expert Diagnostic.</li>
            <li>To calculate mathematical Cost of Inaction (COI) risk estimates based on observed technical findings.</li>
            <li>To enforce rate limits, concurrent scan limits, and defend the platform against automated abuse.</li>
            <li>To maintain tenant data isolation so no customer or guest can access another party&apos;s findings.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            3. Cookies and Local Storage
          </h2>
          <p>
            SiteIntel Pulse uses strictly necessary session cookies (specifically the <code className="text-brand-teal font-mono text-xs">sip_session</code> cookie) for authentication and guest session tracking.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 pt-1">
            <li>Cookies are configured with <code className="text-xs font-mono">HttpOnly</code>, <code className="text-xs font-mono">SameSite=Lax</code>, and <code className="text-xs font-mono">Secure</code> flags in production.</li>
            <li>We do NOT use third-party advertising cookies, marketing pixels, or cross-domain tracking beacons.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            4. Third-Party Services &amp; APIs
          </h2>
          <p>
            When performing specific audits (such as Core Web Vitals lab benchmarks), SiteIntel Pulse may query official public APIs, such as Google PageSpeed Insights. Only the public target URL is transmitted for analysis; no user identities, tokens, or private scan data are shared.
          </p>
        </div>

        {/* Section 5 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            5. Data Retention &amp; Security
          </h2>
          <p>
            Audit reports, raw crawl observations, and remediation task ledgers are stored in our durable SQLite database using Write-Ahead Logging (WAL) and POSIX file locks. Data is retained to allow users to review historical audit comparisons. Users and organization owners can request deletion of their tenant scan history at any time.
          </p>
        </div>

        {/* Section 6 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white border-b border-brand-border pb-2">
            6. Contact Regarding Privacy
          </h2>
          <p>
            If you have questions about our data practices or wish to request data deletion, please contact us via our <Link href="/contact" className="text-brand-teal hover:underline">Contact Page</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
