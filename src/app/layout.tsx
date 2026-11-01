import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Activity, Shield, FileText, Info, Mail, Lock } from "lucide-react";
import {
  siteConfig,
  getMetadataBase,
  getCanonicalUrl,
  isProductionDomainConfigured,
} from "@/lib/seo/site-config";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: siteConfig.defaultTitle,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
  keywords: [
    "website audit",
    "technical seo audit",
    "core web vitals audit",
    "performance assessment",
    "mobile responsiveness test",
    "website security review",
    "growth intelligence",
    "dual-audience website report",
  ],
  authors: [{ name: "SiteIntel Pulse Team" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    url: isProductionDomainConfigured() ? getCanonicalUrl("/") : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-brand-bg text-brand-text min-h-screen flex flex-col selection:bg-brand-teal selection:text-white">
        {/* Navigation Bar */}
        <header className="border-b border-brand-border bg-brand-card/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-brand-teal to-brand-cyan flex items-center justify-center text-white shadow-md shadow-brand-teal/20">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-brand-teal transition-colors">
                  SiteIntel <span className="text-brand-teal">Pulse</span>
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-3 text-xs sm:text-sm font-medium shrink-0">
              <Link
                href="/about"
                className="px-2.5 py-1.5 rounded-lg text-brand-textMuted hover:text-white hover:bg-brand-surface transition-colors hidden md:inline-flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>About</span>
              </Link>

              <Link
                href="/owner-report"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-brand-teal/15 text-brand-tealLight border border-brand-teal/30 hover:bg-brand-teal/25 transition-colors flex items-center gap-1 sm:gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden min-[420px]:inline">Owner </span><span>Report</span>
              </Link>

              <Link
                href="/expert-audit"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-brand-textMuted hover:text-white hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors flex items-center gap-1 sm:gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-cyan" />
                <span className="hidden min-[420px]:inline">Expert </span><span>Audit</span>
              </Link>

              <Link
                href="/login"
                className="px-2.5 py-1.5 rounded-lg text-brand-textMuted hover:text-white hover:bg-brand-surface border border-brand-borderSubtle transition-colors flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-brand-teal" />
                <span>Sign In</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-brand-border bg-brand-card py-12 text-xs text-brand-textMuted">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand Col */}
              <div className="md:col-span-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-teal to-brand-cyan flex items-center justify-center text-white">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-base text-white">SiteIntel Pulse</span>
                </div>
                <p className="text-xs text-brand-textMuted leading-relaxed">
                  Evidence-based website health, SEO, performance, security, and growth intelligence. Understand your website, find what to fix, and grow with confidence.
                </p>
              </div>

              {/* Product Col */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider">Product</h4>
                <ul className="space-y-1.5">
                  <li>
                    <Link href="/" className="hover:text-brand-teal transition-colors">
                      Free Website Audit
                    </Link>
                  </li>
                  <li>
                    <Link href="/owner-report" className="hover:text-brand-teal transition-colors">
                      Website Owner Report
                    </Link>
                  </li>
                  <li>
                    <Link href="/expert-audit" className="hover:text-brand-teal transition-colors">
                      Expert Diagnostic Workbench
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company & Support Col */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider">Company</h4>
                <ul className="space-y-1.5">
                  <li>
                    <Link href="/about" className="hover:text-brand-teal transition-colors">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-brand-teal transition-colors">
                      Contact &amp; Support
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal & Trust Col */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider">Legal &amp; Trust</h4>
                <ul className="space-y-1.5">
                  <li>
                    <Link href="/privacy" className="hover:text-brand-teal transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-brand-teal transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/disclaimer" className="hover:text-brand-teal transition-colors">
                      Methodology &amp; Disclaimer
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-brand-borderSubtle flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-brand-textMuted">
              <div>
                &copy; {new Date().getFullYear()} SiteIntel Pulse. All rights reserved.
              </div>
              <div className="flex items-center gap-4">
                <span>Deterministic 56-Rule Catalogue</span>
                <span>&bull;</span>
                <span>Multi-Tenant Isolation</span>
                <span>&bull;</span>
                <span>Honest Evidence Scoring</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
