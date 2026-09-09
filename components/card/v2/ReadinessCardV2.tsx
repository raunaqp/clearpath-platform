import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Evidence } from "@/lib/schemas/evidence";
import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import type { Tool } from "@/lib/schemas/tool";
import { describeConditions } from "@/lib/engine/verdict";
import { CARD_VERDICT_STYLE } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { CardHeaderBlock, ContextBlock } from "./CardHeaderBlock";
import { GateSummaryChip } from "./GateSummaryChip";
import { BodhScore } from "../BodhScore";
import { ConditionsTable } from "./ConditionsTable";
import { DimensionsTable } from "./DimensionsTable";
import { Limitations } from "./Limitations";
import { ChangeLog } from "./ChangeLog";
import { EvidenceList } from "./EvidenceList";

/**
 * The v2 Readiness Card (S6).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS GONE, AND WHY IT IS GONE RATHER THAN DEMOTED
 * ─────────────────────────────────────────────────────────────────────────
 * The 94/100 disc, `overallScore` in any form, and the per-dimension
 * percentages. Not moved to a secondary position, not made smaller — removed.
 *
 * A demoted number is still the number a reader takes away. It is the one thing
 * on the card that can be repeated in a meeting without its context, and a
 * single figure is exactly the averaging-out that gates exist to prevent: a
 * tool that cannot give a hospital its own records back scores 94 and reads as
 * excellent. The verdict and its conditions cannot be averaged, which is the
 * entire argument for putting them here instead.
 *
 * Also gone: "0 required fixes and 2 to firm up", which counts paperwork. The
 * replacement says whether anyone can start.
 *
 * THE ONLY CARD. The v1 component this replaced was deleted once the last of
 * its four importers moved here — the innovator, the registry detail, the
 * hospital submission view and the card preview. One submission had been
 * rendering as two different cards depending on who opened it, which is
 * invisible in a linear walkthrough and obvious to anyone who clicks around.
 */
export function ReadinessCardV2({
  card,
  tool,
  evidence,
  contextIsReal,
  discrepancyCount,
  showRemediationLink = true,
}: {
  card: ReadinessCard;
  tool: Tool;
  evidence: Evidence[];
  contextIsReal: boolean;
  /**
   * Discrepancies raised at declaration. Optional: a card read by a hospital
   * from the registry has no declaration step behind it in that session, and a
   * count with nothing to relate it to explains nothing.
   */
  discrepancyCount?: number;
  /** The vendor's own view offers remediation; a hospital's read-only view does not. */
  showRemediationLink?: boolean;
}) {
  const v = CARD_VERDICT_STYLE[card.verdict];

  return (
    <article className="space-y-5">
      <div className={cn("rounded-2xl border p-4 sm:p-6", v.outer)}>
        <div className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-6 sm:px-6 sm:py-8 md:px-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
              Readiness card
            </p>
            {/* A count of discrete findings, not a composite. See GateSummaryChip. */}
            <div className="shrink-0">
              <GateSummaryChip gateSummary={card.gateSummary} />
            </div>
          </div>

          <CardHeaderBlock card={card} />
          <ContextBlock card={card} contextIsReal={contextIsReal} />

          {/* Verdict */}
          <div className={cn("mt-6 rounded-lg px-5 py-4", v.solid)}>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-80">Verdict</p>
            <p className="mt-1 font-serif text-2xl uppercase tracking-wide sm:text-3xl">
              {v.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed opacity-95">
              {describeConditions(card.conditions)}
            </p>
          </div>

          {/* Conditions */}
          <section className="mt-8">
            <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
              Conditions
            </h2>
            {/*
              Three numbers appear across this flow — discrepancies raised at
              declaration, gates not clear, conditions on the card — and without
              a sentence tying them together a reader assumes one of them is
              wrong. They are different things measured at different moments.
            */}
            {discrepancyCount !== undefined && (
              <p className="mb-3 text-sm leading-relaxed text-[#6B766F]">
                {discrepancyCount} {discrepancyCount === 1 ? "discrepancy was" : "discrepancies were"}{" "}
                raised when the declaration was checked against the evidence.{" "}
                {card.conditions.length === 0
                  ? "None survived assessment as a condition."
                  : `${card.conditions.length} ${card.conditions.length === 1 ? "became a condition" : "became conditions"}.`}{" "}
                A discrepancy is a question about a claim; a condition is what an
                assessment concluded still has to be closed.
              </p>
            )}
            <ConditionsTable conditions={card.conditions} />
          </section>

          {/* Dimensions + the scope line */}
          <section className="mt-8">
            <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
              Assessment across four dimensions
            </h2>
            <DimensionsTable card={card} />
            <p className="mt-4 rounded-lg bg-[#F4F2EA] px-4 py-3 text-sm leading-relaxed text-[#6B766F]">
              {card.scopeNote}
            </p>
          </section>

          {/* Third-party validation input — NOT a readiness score */}
          {tool.bodhScore && (
            <section className="mt-8">
              <h2 className="mb-1 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
                BODH validation score
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-[#6B766F]">
                A third-party validation platform&apos;s measurement of the model. It is an INPUT to
                the clinical and fairness gates, not a readiness verdict — the framework asks
                whether the tool works here, which is a different question from whether the model
                is accurate.
              </p>
              <BodhScore score={tool.bodhScore} />
            </section>
          )}

          {/* Evidence */}
          <section className="mt-8">
            <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
              Attached evidence
            </h2>
            <EvidenceList evidence={evidence} />
          </section>
        </div>
      </div>

      {/* Placement */}
      <section className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0F6E56]">
          Placement
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#0E1411]">{card.placement.statement}</p>
        {card.placement.excluded.map((line) => (
          <p key={line} className="mt-1 text-sm leading-relaxed text-[#993C1D]">
            {line}
          </p>
        ))}
      </section>

      <Limitations card={card} />
      <ChangeLog card={card} />

      {/* The remediation entry point — a route, not a modal. */}
      {showRemediationLink && card.conditions.length > 0 && (
        <Link
          href={`/submit/${tool.slug}/remediate`}
          className="flex items-center justify-between gap-4 rounded-xl border border-[#0F6E56]/40 bg-[#E3F0EB]/50 px-5 py-4 transition-colors hover:bg-[#E3F0EB]"
        >
          <div>
            <p className="font-serif text-lg text-[#0E1411]">Fix readiness gaps</p>
            <p className="mt-0.5 text-sm leading-relaxed text-[#6B766F]">
              Attach evidence against a specific condition and reissue the card.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#0F6E56]" />
        </Link>
      )}

      <p className="px-1 text-xs leading-relaxed text-[#6B766F]">
        Expiry basis: {card.expiryBasis}
      </p>
    </article>
  );
}
