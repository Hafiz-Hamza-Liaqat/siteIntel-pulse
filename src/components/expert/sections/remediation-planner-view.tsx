"use client";

import { useState } from "react";
import { Wrench, CheckCircle2, Clock, CheckSquare, ChevronRight, Filter } from "lucide-react";
import type { RemediationTask } from "@/types";

interface RemediationPlannerViewProps {
  tasks: RemediationTask[];
}

export function RemediationPlannerView({ tasks }: RemediationPlannerViewProps) {
  const [activeWorkstream, setActiveWorkstream] = useState("ALL");

  const filteredTasks = tasks.filter((t) => {
    if (activeWorkstream !== "ALL" && t.workstream !== activeWorkstream) return false;
    return true;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">P0 • CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">P1 • HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">P2 • MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">P3 • LOW</span>;
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case "QUICK_FIX":
        return <span className="text-[10px] text-emerald-400 font-semibold">&lt; 2 hrs</span>;
      case "MODERATE":
        return <span className="text-[10px] text-teal-400 font-semibold">2 - 6 hrs</span>;
      case "COMPLEX":
        return <span className="text-[10px] text-amber-400 font-semibold">1 - 3 days</span>;
      default:
        return <span className="text-[10px] text-purple-400 font-semibold">Strategic Sprint</span>;
    }
  };

  return (
    <section id="section-remediation" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Specialist Remediation Action Plan</h2>
            <p className="text-xs text-brand-textMuted">
              Prioritized engineering tasks, workstream assignments, step-by-step procedures, and verification criteria
            </p>
          </div>
        </div>

        <div className="text-xs text-brand-textMuted">
          Showing <strong className="text-white">{filteredTasks.length}</strong> tasks
        </div>
      </div>

      {/* Workstream Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-brand-textMuted flex items-center gap-1 text-[11px] mr-1">
          <Filter className="w-3 h-3" />
          Workstream:
        </span>
        {[
          { id: "ALL", label: "All Workstreams" },
          { id: "seo", label: "SEO" },
          { id: "performance", label: "Performance" },
          { id: "security", label: "Security" },
          { id: "accessibility", label: "Accessibility" },
          { id: "analytics", label: "Analytics" },
          { id: "content", label: "Content" },
          { id: "ai_automation", label: "AI & GEO" },
          { id: "engineering", label: "Engineering" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveWorkstream(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeWorkstream === tab.id
                ? "bg-brand-cyan text-brand-dark font-bold shadow-sm"
                : "bg-brand-card text-brand-textMuted hover:text-white border border-brand-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="p-5 rounded-xl border border-brand-border bg-brand-card space-y-4 hover:border-brand-borderHover transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-cyan">
                    {task.id}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-brand-textMuted bg-brand-surface px-2 py-0.5 rounded border border-brand-border">
                    {task.workstream}
                  </span>
                </div>
                {getPriorityBadge(task.priority)}
              </div>

              <div>
                <h3 className="font-bold text-white text-sm leading-snug">
                  {task.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-brand-textMuted mt-1">
                  <span>Effort: <strong className="text-slate-300">{task.estimatedEffort.replace("_", " ")}</strong></span>
                  <span>•</span>
                  <span>Est. Hours: <strong className="text-brand-cyan">{task.estimatedHours || 2}h</strong></span>
                </div>
              </div>

              {/* Action Steps */}
              {task.actionSteps.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-brand-border/60">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-textMuted block">
                    Execution Steps
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {task.actionSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-brand-cyan shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Validation Steps */}
            <div className="pt-3 border-t border-brand-border/60 text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                Engineering Validation
              </span>
              <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                {task.validationProcedure}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
