"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart3,
  Globe,
  Layers,
  ListOrdered,
  FileCode,
  Search,
  Link2,
  Zap,
  Smartphone,
  Shield,
  Lock,
  FileText,
  Bot,
  PieChart,
  Target,
  Users,
  AlertTriangle,
  Wrench,
  CheckCircle2,
} from "lucide-react";

interface ExpertNavigationProps {
  findingCount: number;
  criticalCount: number;
  taskCount: number;
  urlCount: number;
}

export function ExpertNavigation({
  findingCount,
  criticalCount,
  taskCount,
  urlCount,
}: ExpertNavigationProps) {
  const [activeId, setActiveId] = useState("section-summary");

  const navItems = useMemo(
    () => [
      { id: "section-summary", label: "Executive Summary & Scores", icon: BarChart3 },
      { id: "section-scope", label: "Scope & Audit Parameters", icon: Globe },
      { id: "section-platform", label: "Platform & Detected Stack", icon: Layers },
      { id: "section-ledger", label: "56-Rule Score Ledger", icon: ListOrdered },
      { id: "section-urls", label: "Page Inventory & URLs", icon: FileCode, count: urlCount },
      { id: "section-seo", label: "Technical SEO Diagnostics", icon: Search },
      { id: "section-links", label: "Link Architecture & Status", icon: Link2 },
      { id: "section-performance", label: "Web Vitals & Performance", icon: Zap },
      { id: "section-responsive", label: "Responsive Matrix (7 Viewports)", icon: Smartphone },
      { id: "section-security", label: "Public Security Posture", icon: Shield },
      { id: "section-auth", label: "Authentication Posture", icon: Lock },
      { id: "section-content", label: "Content Quality Diagnostics", icon: FileText },
      { id: "section-geo-aeo", label: "GEO, AEO & AI Readiness", icon: Bot },
      { id: "section-analytics", label: "Analytics & Tag Tracking", icon: PieChart },
      { id: "section-conversion", label: "Conversion & UX Flow", icon: Target },
      { id: "section-competitors", label: "Competitor Benchmark", icon: Users },
      {
        id: "section-findings",
        label: "Diagnostic Finding Ledger",
        icon: AlertTriangle,
        count: findingCount,
        badgeColor: criticalCount > 0 ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : undefined,
      },
      { id: "section-remediation", label: "Specialist Remediation Plan", icon: Wrench, count: taskCount },
      { id: "section-manifest", label: "Integrity & Export Manifest", icon: CheckCircle2 },
    ],
    [findingCount, criticalCount, taskCount, urlCount]
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (let i = navItems.length - 1; i >= 0; i--) {
        const el = document.getElementById(navItems[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(navItems[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navItems]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <nav aria-label="Expert Diagnostic Sections" className="space-y-1">
      <div className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-brand-textMuted">
        Diagnostic Sections
      </div>

      <div className="space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left group ${
                isActive
                  ? "bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 shadow-sm"
                  : "text-brand-textMuted hover:text-white hover:bg-brand-surface border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    isActive ? "text-brand-cyan" : "text-brand-textMuted group-hover:text-white"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.count !== undefined && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight border ${
                    item.badgeColor ||
                    (isActive
                      ? "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30"
                      : "bg-brand-card text-brand-textMuted border-brand-border")
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
