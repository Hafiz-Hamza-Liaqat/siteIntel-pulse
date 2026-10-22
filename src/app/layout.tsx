import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Activity, Shield, FileText, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "SiteIntel Pulse — Website Intelligence & Growth Audit Platform",
  description:
    "Evidence-based website health, SEO, performance, security, and growth intelligence platform for platform owners.",
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-teal to-brand-cyan flex items-center justify-center text-white shadow-md shadow-brand-teal/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-brand-teal transition-colors">
                  SiteIntel <span className="text-brand-teal">Pulse</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-semibold text-brand-textMuted tracking-wider ml-2 px-1.5 py-0.5 rounded bg-brand-surface border border-brand-borderSubtle">
                  Milestone 1
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4 text-sm font-medium">
              <Link
                href="/owner-report"
                className="px-3.5 py-1.5 rounded-lg bg-brand-teal/15 text-brand-tealLight border border-brand-teal/30 hover:bg-brand-teal/25 transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Owner Report</span>
              </Link>

              <Link
                href="/expert-audit"
                className="px-3.5 py-1.5 rounded-lg text-brand-textMuted hover:text-white hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4 text-brand-cyan" />
                <span className="hidden sm:inline">Expert Audit</span>
                <span className="text-[10px] uppercase font-semibold px-1 py-0.2 rounded bg-brand-surface border border-brand-borderSubtle text-brand-cyan">
                  M2 Preview
                </span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-brand-border bg-brand-card py-8 text-center text-xs text-brand-textMuted">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-teal" />
              <span className="font-semibold text-white">SiteIntel Pulse</span>
              <span>— Discover Issues. Prove with Evidence. Improve. Grow.</span>
            </div>
            <div className="flex items-center gap-4 text-brand-textMuted">
              <span>Milestone 1: Complete Website Owner Audit Platform</span>
              <span className="hidden sm:inline">•</span>
              <Link href="/expert-audit" className="hover:text-brand-teal transition-colors flex items-center gap-1">
                <span>Milestone 2 Roadmap</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
