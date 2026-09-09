/**
 * Verdict engine — the rule that decides what a card says.
 *
 * ORDER MATTERS. The rules are checked most-severe first and the first one
 * that fires wins:
 *
 *   1. any gate item final === 0        → NOT_DEPLOYABLE_IN_CONTEXT
 *   2. any gate item UNSCORED           → cap at TRIAL_ONLY
 *   3. D1 mean < 1.0, or D1.D mean < 1.0 → TRIAL_ONLY
 *   4. any gate item final === 1        → CONDITIONALLY_DEPLOYABLE   (see note)
 *   5. any non-gate item final <= 1     → CONDITIONALLY_DEPLOYABLE
 *   6. otherwise                        → DEPLOYABLE
 *
 * A GATE AT 0 FORCES NOT_DEPLOYABLE, whatever surrounds it. There is no
 * averaging out of a gate. A tool can be excellent on 111 items and still be
 * not-deployable here because it cannot give the hospital its own records
 * back. That is the entire reason gates exist as a separate mechanism from
 * scoring, and it is why the card carries no composite number for a strong
 * average to hide inside.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TWO INTERPRETATIONS WRITTEN DOWN, BECAUSE THEY ARE NOT OBVIOUS
 * ─────────────────────────────────────────────────────────────────────────
 * (a) WHAT COUNTS AS A GATE PASSING. A gate clears at level 2 ("system-
 *     owned"), not at level 1. A gate that only functions through specific
 *     support has not cleared — that is what a gate is for. So a gate at 1 is
 *     counted in `gateSummary.fail`, but only a gate at 0 triggers rule 1.
 *
 * (b) RULE 4 IS AN ADDITION. The specified rules cover a gate at 0 and a gate
 *     UNSCORED, then jump to non-gate items. They say nothing about a gate at
 *     1, which would leave a card reading DEPLOYABLE while its own gate
 *     summary reported a failure. A gate at 1 cannot be better than a non-gate
 *     at 1, so it lands at CONDITIONALLY_DEPLOYABLE. Flagged for review.
 */

import type { AssessmentItem } from "@/lib/schemas/item";
import type { Evidence } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type {
  CardCondition,
  CardVerdict,
  DimensionId,
  DimensionScore,
  GateSummary,
  ReadinessCard,
} from "@/lib/schemas/readiness-card";
import {
  clusterAggregate,
  couldNotEstablish,
  dimensionAggregate,
  resolveAll,
  round1,
  UNSCORED,
  type FinalLevel,
  type ScoredSet,
} from "./score";
import { getItem, gateItems, itemsForPath } from "./item-bank";
import { earliestRegulatoryExpiry } from "./evidence";
import { softenCertainty } from "./soften-certainty";

/** The level a gate has to reach to clear. See interpretation (a) above. */
export const GATE_CLEARS_AT = 2;

const DIMENSION_IDS: DimensionId[] = ["D1", "D2", "D3", "D4"];

export function buildGateSummary(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE"
): GateSummary {
  let pass = 0;
  const failedIds: string[] = [];
  const unscoredIds: string[] = [];

  for (const g of gateItems(path)) {
    const level = resolved.get(g.id) ?? UNSCORED;
    if (level === UNSCORED) unscoredIds.push(g.id);
    else if (level >= GATE_CLEARS_AT) pass += 1;
    else failedIds.push(g.id);
  }

  return {
    pass,
    fail: failedIds.length,
    unscored: unscoredIds.length,
    failedIds,
    unscoredIds,
  };
}

export function deriveVerdict(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE"
): CardVerdict {
  const items = itemsForPath(path);
  const levelOf = (i: AssessmentItem) => resolved.get(i.id) ?? UNSCORED;

  const gates = items.filter((i) => i.isGate);

  // 1. A gate at zero. No averaging out.
  if (gates.some((g) => levelOf(g) === 0)) return "NOT_DEPLOYABLE_IN_CONTEXT";

  // 2. A gate nobody could establish. Not a failure — but not a pass either.
  if (gates.some((g) => levelOf(g) === UNSCORED)) return "TRIAL_ONLY";

  // 3. D1 as a whole, and the regulatory cluster specifically, below "requires
  //    support". A null mean (nothing scored) does not fire this rule — that is
  //    an absence, and rule 2 already covers an unestablished gate.
  const d1 = dimensionAggregate("D1", resolved, path).mean;
  const d1d = clusterAggregate("D1.D", resolved, path).mean;
  if ((d1 !== null && d1 < 1.0) || (d1d !== null && d1d < 1.0)) return "TRIAL_ONLY";

  // 4. A gate that only functions with specific support. See note (b).
  if (gates.some((g) => levelOf(g) === 1)) return "CONDITIONALLY_DEPLOYABLE";

  // 5. Any authored non-gate item at or below "requires support".
  const nonGates = items.filter((i) => !i.isGate);
  if (nonGates.some((i) => { const l = levelOf(i); return l !== UNSCORED && l <= 1; })) {
    return "CONDITIONALLY_DEPLOYABLE";
  }

  return "DEPLOYABLE";
}

/**
 * Conditions, most severe first: gate failures, then firm-ups. `clearedBy`
 * names who can close it and with what, so a condition is an instruction
 * rather than a complaint.
 */
export function buildConditions(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE"
): CardCondition[] {
  const items = itemsForPath(path);
  const gateFails: CardCondition[] = [];
  const firmUps: CardCondition[] = [];

  for (const item of items) {
    const level = resolved.get(item.id) ?? UNSCORED;
    if (level === UNSCORED) continue;

    if (item.isGate && level < GATE_CLEARS_AT) {
      gateFails.push({
        itemId: item.id,
        kind: "gate_fail",
        fix: softenCertainty(item.fix ?? ""),
        clearedBy: clearedBy(item),
      });
    } else if (!item.isGate && level <= 1) {
      firmUps.push({
        itemId: item.id,
        kind: "firm_up",
        fix: softenCertainty(item.fix ?? ""),
        clearedBy: clearedBy(item),
      });
    }
  }

  return [...gateFails, ...firmUps];
}

function clearedBy(item: AssessmentItem): string {
  if (item.acceptsEvidence.length === 0) {
    return softenCertainty("An assessor, on review of evidence bound to this item.");
  }
  const kinds = item.acceptsEvidence.map((e) => e.toLowerCase().replace(/_/g, " ")).join(", ");
  return softenCertainty(
    `An assessor, on receipt of evidence of type: ${kinds}, bound to ${item.id}.`
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Expiry
// ─────────────────────────────────────────────────────────────────────────

export type ExpiryDecision = {
  expiresAt: string;
  source: "twelve_month_default" | "regulatory_licence";
  note: string;
};

/**
 * A card expires 12 months from issue, OR when the earliest regulatory licence
 * it rests on expires, whichever is SOONER. A card cannot outlive its own
 * legal basis — otherwise a hospital reads "deployable" off a card whose CDSCO
 * licence lapsed three months ago. Which input set the date is recorded, so
 * the reason is visible rather than inferred from a date.
 */
export function computeExpiresAt(
  issuedAt: string,
  evidence: Evidence[]
): ExpiryDecision {
  const issued = new Date(issuedAt);
  const twelve = new Date(issued);
  twelve.setMonth(twelve.getMonth() + 12);

  const licence = earliestRegulatoryExpiry(evidence, (id) => getItem(id)?.clusterCode);

  if (licence && new Date(licence).getTime() < twelve.getTime()) {
    return {
      expiresAt: new Date(licence).toISOString(),
      source: "regulatory_licence",
      note: softenCertainty(
        `Expiry set by the earliest regulatory licence bound to a D1.D item (${licence.slice(0, 10)}), which falls before the 12-month default.`
      ),
    };
  }

  return {
    expiresAt: twelve.toISOString(),
    source: "twelve_month_default",
    note: softenCertainty(
      "Expiry set by the 12-month default; no regulatory licence bound to a D1.D item expires sooner."
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Card assembly
// ─────────────────────────────────────────────────────────────────────────

export type CardInput = {
  id: string;
  issuedAt: string;
  context: SubmissionContext;
  toolVersion: string;
  modelVersion: string;
  scored: ScoredSet;
  evidence: Evidence[];
  /** Carried forward on a re-issue; a new card starts empty. */
  priorChangeLog?: ReadinessCard["changeLog"];
  version?: number;
  changeSummary?: string;
};

export function buildReadinessCard(input: CardInput): ReadinessCard {
  const path = input.scored.path;
  const resolved = resolveAll(input.scored);

  const dimensionScores = {} as Record<DimensionId, DimensionScore>;
  for (const d of DIMENSION_IDS) {
    const agg = dimensionAggregate(d, resolved, path);
    dimensionScores[d] = {
      mean: agg.mean === null ? 0 : round1(agg.mean),
      itemsScored: agg.itemsScored,
      itemsTotal: agg.itemsTotal,
    };
  }

  const expiry = computeExpiresAt(input.issuedAt, input.evidence);
  const version = input.version ?? 1;

  const changeLog = [
    ...(input.priorChangeLog ?? []),
    {
      version,
      at: input.issuedAt,
      summary: softenCertainty(input.changeSummary ?? "Card issued."),
    },
    // The expiry rule records which input set the date, per the spec.
    { version, at: input.issuedAt, summary: expiry.note },
  ];

  return {
    id: input.id,
    version,
    issuedAt: input.issuedAt,
    expiresAt: expiry.expiresAt,
    // Frozen copy — a later edit to the submission cannot re-scope an issued card.
    context: { ...input.context, population: { ...input.context.population } },
    toolVersion: input.toolVersion,
    modelVersion: input.modelVersion,
    dimensionScores,
    verdict: deriveVerdict(resolved, path),
    conditions: buildConditions(resolved, path),
    gateSummary: buildGateSummary(resolved, path),
    couldNotEstablish: couldNotEstablish(resolved, path),
    changeLog,
  };
}
