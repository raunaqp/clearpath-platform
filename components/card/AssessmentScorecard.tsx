import type { ToolReadinessCard, DimensionId } from "@/lib/schemas/readiness-card";
import { DIMENSIONS, TOOL_GATES, type ToolGateId } from "@/lib/engine/gates";
import { gateDisplayStatus, scoreAccent } from "@/lib/ui";
import { StatusChip } from "@/components/StatusChip";
import { ReadinessScore } from "./ReadinessScore";

/**
 * Assessment scorecard (FIX 5) — the benchmark-scorecard pattern in ClearPath's
 * visual language:
 *   1. a prominent overall SCORE at the top (score-first), with gate tallies
 *   2. the four dimensions D1–D4 as a 2×2 grid of scored blocks (ClearPath's
 *      RiskBlock metric idiom) — each block with a score bar and its gate
 *      results beneath — all inside one card boundary, no vertical scroll.
 * Verdict-forward, quantitative, clean. (The verdict word lives in the band
 * below the card.)
 */
export function AssessmentScorecard({ card }: { card: ToolReadinessCard }) {
  const pass = card.gateResults.filter((r) => r.status === "pass").length;
  const partial = card.gateResults.filter((r) => r.status === "partial").length;
  const fail = card.gateResults.filter((r) => r.status === "fail").length;
  const byId = new Map(card.gateResults.map((r) => [r.gateId, r]));
  const dims: DimensionId[] = ["D1", "D2", "D3", "D4"];
  // Gates present in THIS card, grouped by dimension — so the D2 rows follow the
  // card's buyer variant (public G5–G7 or private GP1–GP5), not a static list.
  const gatesByDim: Record<DimensionId, ToolGateId[]> = { D1: [], D2: [], D3: [], D4: [] };
  for (const r of card.gateResults) {
    const dim = TOOL_GATES[r.gateId as ToolGateId]?.dimension;
    if (dim) gatesByDim[dim].push(r.gateId as ToolGateId);
  }

  return (
    <div>
      {/* 1 · Overall score header */}
      <div className="mb-8 flex items-center gap-4 sm:gap-5">
        <ReadinessScore score={card.overallScore} verdict={card.verdict} />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">
            Overall readiness
          </p>
          <p className="font-serif text-2xl leading-tight text-[#0E1411]">
            {pass} of {card.gateResults.length} gates pass
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-[#6B766F]">
            {partial} to firm up · {fail} not met
          </p>
        </div>
      </div>

      {/* 2 · Four dimension rows */}
      <section>
        <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
          Assessment across four dimensions
        </h2>
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
          {dims.map((dim) => {
            const def = DIMENSIONS[dim];
            const score = card.dimensionScores[dim] ?? 0;
            const accent = scoreAccent(score);
            return (
              <div key={dim} className="rounded-lg border border-[#D9D5C8] bg-white px-4 py-3">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">
                      {dim}
                    </span>
                    <span className="font-serif text-lg text-[#0E1411]">{def.title}</span>
                  </div>
                  <span className="font-serif text-2xl tabular-nums" style={{ color: accent }}>
                    {score}%
                  </span>
                </div>

                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE3]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, backgroundColor: accent }}
                  />
                </div>

                <ul className="divide-y divide-[#E8E4D6]">
                  {gatesByDim[dim].map((gid: ToolGateId) => {
                    const gate = TOOL_GATES[gid];
                    const result = byId.get(gid);
                    const status = result ? gateDisplayStatus(result) : "notAnswered";
                    return (
                      <li key={gid} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-[#0E1411]">
                            <span className="text-[#6B766F]">{gid}</span> · {gate.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6B766F]">
                            {result?.note ?? gate.question}
                          </p>
                        </div>
                        <StatusChip status={status} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
