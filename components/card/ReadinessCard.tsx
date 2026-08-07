import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { Tool } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import { VerdictSurface } from "./VerdictSurface";
import { ScoreChip } from "./ScoreChip";
import { AssessmentScorecard } from "./AssessmentScorecard";
import { AttachedEvidence } from "./AttachedEvidence";
import { VerdictBanner } from "./VerdictBanner";
import { ConditionsList } from "./ConditionsList";
import { BodhScore } from "./BodhScore";

/**
 * Readiness Card (BUILD_SPEC §3) — rebuilt on the ClearPath card (FIX 4/5).
 *
 * Structure, matching ClearPath's ReadinessCard:
 *   • verdict-tinted outer surface wrapping a white inner card
 *   • header: mono eyebrow + gates-clear chip, product name, one-line
 *     description as the subtitle (description-at-top)
 *   • body: the benchmark scorecard — overall score → four scored dimension
 *     rows → attached evidence
 *   • BELOW the card: the verdict band (states kept), placement, conditions
 *
 * All engine text is already softened; this component is presentation only.
 */
export function ReadinessCard({
  card,
  tool,
  docs,
}: {
  card: ToolReadinessCard;
  tool: Tool;
  docs: Document[];
}) {
  return (
    <article className="space-y-5">
      <VerdictSurface verdict={card.verdict}>
        <div className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-6 sm:px-6 sm:py-8 md:px-8">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
              Readiness assessment
            </p>
            <div className="shrink-0">
              <ScoreChip gateResults={card.gateResults} />
            </div>
          </div>
          <h1 className="mb-1 font-serif text-[clamp(24px,3vw,36px)] leading-tight text-[#0E1411]">
            {tool.name}
          </h1>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[#6B766F]">
            {tool.description}
          </p>

          {/* BODH validation score (feeds the clinical + fairness gates) */}
          {tool.bodhScore && (
            <div className="mb-6">
              <BodhScore score={tool.bodhScore} />
            </div>
          )}

          {/* Scorecard */}
          <AssessmentScorecard card={card} />

          {/* Attached evidence */}
          <div className="mt-8">
            <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
              Attached evidence
            </h2>
            <AttachedEvidence docs={docs} />
          </div>
        </div>
      </VerdictSurface>

      {/* Below the card — verdict band, placement, conditions */}
      <VerdictBanner verdict={card.verdict} summary={card.summary} />

      <div className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0F6E56]">
          Placement recommendation
        </p>
        <p className="mt-1 text-sm text-[#0E1411]">{card.placement}</p>
      </div>

      <section className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-5">
        <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
          Conditions to meet
        </h2>
        <ConditionsList conditions={card.conditions} />
      </section>
    </article>
  );
}
