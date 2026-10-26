import React from "react";
import { DimensionScorecard } from "@/types";
import { Layers, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

interface DimensionScorecardsGridProps {
  scorecards?: DimensionScorecard[];
}

export function DimensionScorecardsGrid({ scorecards }: DimensionScorecardsGridProps) {
  if (!scorecards || scorecards.length === 0) return null;

  const getScoreColor = (score: number, coverage: number) => {
    if (coverage < 50) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    if (score >= 85) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 70) return "text-teal-400 border-teal-500/30 bg-teal-500/10";
    if (score >= 50) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "HIGH":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "MEDIUM":
        return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    }
  };

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-teal" />
            <span>Diagnostic Dimension Scorecards</span>
          </h2>
          <p className="text-xs text-brand-textMuted">
            9 specialized diagnostic overlays synthesized from verified catalogue evidence. Non-additive to the core 100-point catalogue.
          </p>
        </div>
        <span className="self-start sm:self-auto text-xs font-semibold text-brand-tealLight bg-brand-teal/10 px-3 py-1 rounded-md border border-brand-teal/30">
          Non-Additive Diagnostic Views
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scorecards.map((card, idx) => {
          const cardId = card.id || `card-${idx}`;
          const cardName = card.name || (card as unknown as { title?: string }).title || "Diagnostic Dimension";
          const cardDesc = card.description || (card as unknown as { formulaNote?: string }).formulaNote || "";
          const covPct = card.coveragePercentage ?? (card as unknown as { coveragePct?: number }).coveragePct ?? 0;
          const isIncomplete = covPct < 50;
          return (
            <div
              key={cardId}
              className="rounded-xl bg-brand-surface border border-brand-borderSubtle p-5 flex flex-col justify-between space-y-4 hover:border-brand-border transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white leading-snug">{cardName}</h3>
                  <div className={`px-2.5 py-1 rounded-lg border font-mono font-black text-sm shrink-0 ${getScoreColor(card.score, covPct)}`}>
                    {isIncomplete ? `${card.score}% (Prov)` : `${card.score}%`}
                  </div>
                </div>
                {cardDesc && <p className="text-[11px] text-brand-textMuted leading-relaxed">{cardDesc}</p>}
              </div>

              <div className="space-y-2.5 pt-2 border-t border-brand-borderSubtle/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-textMuted">Observed Rating</span>
                  <span className={`font-semibold ${isIncomplete ? "text-amber-400" : "text-white"}`}>
                    {card.ratingBand}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-brand-textMuted">
                    <span>Dimension Coverage</span>
                    <span className="font-mono">{covPct}%</span>
                  </div>
                  <div className="w-full bg-brand-card h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isIncomplete ? "bg-amber-400" : "bg-brand-teal"}`}
                      style={{ width: `${covPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-brand-textMuted">
                    Rules Assessed: <strong className="text-white">{card.evaluatedTestsCount}/{card.totalTestsCount}</strong>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getConfidenceBadge(card.confidence)}`}>
                    {card.confidence} Confidence
                  </span>
                </div>

                {card.missingEvidenceNotes && (
                  <div className="text-[10px] text-amber-400/90 bg-amber-400/10 p-2 rounded border border-amber-400/20 leading-tight">
                    {card.missingEvidenceNotes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
