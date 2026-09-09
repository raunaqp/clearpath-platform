/**
 * Remediation — closing one condition, and reissuing the card.
 *
 * A SCOPED DELTA, NOT A RE-ASSESSMENT. Attaching a residency addendum is not
 * grounds for re-reading sixteen other gates. This module touches exactly one
 * item, recomputes exactly its cluster and its dimension, and carries every
 * other dimension's score forward from the previous card untouched. The verdict
 * and gate summary are recomputed, but only as READS over the already-resolved
 * levels — nothing is re-scored.
 *
 * That constraint is not a performance trick. A vendor who fixes one thing and
 * watches four unrelated numbers move learns that the assessment is noise.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHO CLEARS A CONDITION
 * The engine does not read the document. Attaching evidence records an ASSESSOR
 * score against the item, with the assessor named and their note attached —
 * which is truthful about what happened, and slots into `final()`'s resolution
 * order above the AI score and the vendor's own claim. Nothing here infers a
 * level from a PDF.
 */

import type { Evidence } from "@/lib/schemas/evidence";
import type { ItemScore, Level } from "@/lib/schemas/score";
import type {
  CardCondition,
  DimensionId,
  DimensionScore,
  ReadinessCard,
} from "@/lib/schemas/readiness-card";
import { getItem } from "./item-bank";
import {
  clusterAggregate,
  dimensionAggregate,
  resolveAll,
  round1,
  UNSCORED,
  type FinalLevel,
  type ScoredSet,
} from "./score";
import {
  SCOPE_NOTE,
  buildGateSummary,
  derivePlacement,
  deriveVerdict,
} from "./verdict";
import { softenCertainty } from "./soften-certainty";

/** What moved, and what did not. The point of a scoped delta is that it is small. */
export type RemediationDelta = {
  itemId: string;
  legacyGateId?: string;
  clusterCode: string;
  dimension: DimensionId;
  levelBefore: FinalLevel;
  levelAfter: Level;
  clusterMeanBefore: number | null;
  clusterMeanAfter: number | null;
  dimensionMeanBefore: number;
  dimensionMeanAfter: number;
  /** Conditions this cleared. */
  conditionsCleared: CardCondition[];
  /** Conditions still open, in their original order. */
  conditionsRemaining: CardCondition[];
  /** Dimensions deliberately NOT recomputed — carried forward verbatim. */
  dimensionsUntouched: DimensionId[];
  evidenceId: string;
};

export type RemediationInput = {
  /** The card being remediated. */
  card: ReadinessCard;
  /** Scores as they stand. Not mutated — a new map is returned. */
  scored: ScoredSet;
  /** The condition's item. Evidence must be bound to it. */
  itemId: string;
  /** The document being attached. */
  evidence: Evidence;
  /** Every document on the submission, including the new one — for expiry. */
  allEvidence: Evidence[];
  assessorId: string;
  /** What the assessor scored the item at on seeing the document. */
  clearedToLevel: Level;
  note: string;
  issuedAt: string;
};

export type RemediationResult = {
  card: ReadinessCard;
  delta: RemediationDelta;
  scored: ScoredSet;
};

/**
 * Reissue the card with one item re-scored.
 *
 * Version increments, `issuedAt` moves, and `expiresAt` does NOT: expiry is
 * anchored to the original assessment. A card that renewed its own twelve
 * months every time a vendor cleared a condition would never expire, which
 * defeats the point of dating it.
 */
export function applyRemediation(input: RemediationInput): RemediationResult {
  const item = getItem(input.itemId);
  if (!item) throw new Error(`Remediation: no item ${input.itemId} in the bank.`);

  // Unbound evidence does not count, ever. Attaching a document to the
  // submission at large and hoping it lands somewhere is the behaviour the
  // itemRefs minimum exists to stop, so it fails loudly rather than quietly
  // producing a reissue that changed nothing.
  if (!input.evidence.itemRefs.includes(input.itemId)) {
    throw new Error(
      `Remediation: evidence ${input.evidence.id} is not bound to ${input.itemId} — ` +
        `it counts for nothing. Bind it via itemRefs.`
    );
  }
  if (!item.acceptsEvidence.includes(input.evidence.type)) {
    throw new Error(
      `Remediation: ${input.itemId} does not accept ${input.evidence.type} evidence ` +
        `(accepts: ${item.acceptsEvidence.join(", ") || "nothing yet — this is a stub"}).`
    );
  }

  const path = input.scored.path;

  // ── before ─────────────────────────────────────────────────────────────
  const resolvedBefore = resolveAll(input.scored);
  const levelBefore = resolvedBefore.get(input.itemId) ?? UNSCORED;
  const clusterBefore = clusterAggregate(item.clusterCode, resolvedBefore, path).mean;
  const dimensionBefore = input.card.dimensionScores[item.dimension]?.mean ?? 0;

  // ── the one change: an assessor scores this item, having seen the document ─
  const prior = input.scored.scores.get(input.itemId);
  const nextScore: ItemScore = {
    itemId: input.itemId,
    aiScore: prior?.aiScore ?? null,
    assessorScores: [
      ...(prior?.assessorScores ?? []),
      {
        assessorId: input.assessorId,
        level: input.clearedToLevel,
        note: input.note,
        coiDeclared: false,
      },
    ],
    adjudicated: prior?.adjudicated ?? null,
  };
  const nextScores = new Map(input.scored.scores);
  nextScores.set(input.itemId, nextScore);
  const nextScored: ScoredSet = { ...input.scored, scores: nextScores };

  // ── after: ONLY this item is re-resolved ───────────────────────────────
  const resolvedAfter = new Map(resolvedBefore);
  resolvedAfter.set(input.itemId, input.clearedToLevel);

  const clusterAfter = clusterAggregate(item.clusterCode, resolvedAfter, path).mean;
  const affected = dimensionAggregate(item.dimension, resolvedAfter, path);
  const dimensionAfter = affected.mean === null ? 0 : round1(affected.mean);

  // Every other dimension is carried forward verbatim. Not recomputed and
  // arriving at the same answer — not recomputed at all.
  const dimensionsUntouched = (["D1", "D2", "D3", "D4"] as DimensionId[]).filter(
    (d) => d !== item.dimension
  );
  const dimensionScores = { ...input.card.dimensionScores } as Record<DimensionId, DimensionScore>;
  dimensionScores[item.dimension] = {
    mean: dimensionAfter,
    itemsScored: affected.itemsScored,
    itemsTotal: affected.itemsTotal,
  };

  // ── conditions: filtered, not re-derived ───────────────────────────────
  // An item at the top of the ladder no longer carries a condition. Every other
  // condition is passed through exactly as it was written.
  const cleared = input.card.conditions.filter(
    (c) => c.itemId === input.itemId && input.clearedToLevel >= 2
  );
  const remaining = input.card.conditions.filter((c) => !cleared.includes(c));

  const verdict = deriveVerdict(resolvedAfter, path);
  const version = input.card.version + 1;

  const card: ReadinessCard = {
    ...input.card,
    version,
    issuedAt: input.issuedAt,
    // firstIssuedAt and expiresAt are carried through by the spread, on purpose.
    scopeNote: SCOPE_NOTE,
    dimensionScores,
    verdict,
    conditions: remaining,
    placement: derivePlacement(input.card.context, verdict, remaining),
    gateSummary: buildGateSummary(resolvedAfter, path),
    // Carried forward. Clearing a gate does not author a stub cluster, so the
    // coverage gaps this card is silent about are exactly the ones it was
    // silent about before.
    couldNotEstablish: input.card.couldNotEstablish,
    changeLog: [
      ...input.card.changeLog,
      {
        version,
        at: input.issuedAt,
        summary: softenCertainty(
          describeChange(item.legacyGateId ?? item.id, cleared, input.evidence.name)
        ),
      },
    ],
  };

  return {
    card,
    scored: nextScored,
    delta: {
      itemId: input.itemId,
      legacyGateId: item.legacyGateId,
      clusterCode: item.clusterCode,
      dimension: item.dimension,
      levelBefore,
      levelAfter: input.clearedToLevel,
      clusterMeanBefore: clusterBefore === null ? null : round1(clusterBefore),
      clusterMeanAfter: clusterAfter === null ? null : round1(clusterAfter),
      dimensionMeanBefore: dimensionBefore,
      dimensionMeanAfter: dimensionAfter,
      conditionsCleared: cleared,
      conditionsRemaining: remaining,
      dimensionsUntouched,
      evidenceId: input.evidence.id,
    },
  };
}

/**
 * The changelog line. It names the gate, the document, and — the part that
 * matters to a reader deciding whether they can start — what kind of condition
 * went away.
 */
function describeChange(
  gateLabel: string,
  cleared: CardCondition[],
  evidenceName: string
): string {
  if (cleared.length === 0) {
    return `${gateLabel} re-scored — ${evidenceName} attached. Condition remains open.`;
  }
  const scope = cleared[0].blocks === "TRIAL" ? "Trial-blocking" : "Deployment-blocking";
  return `${gateLabel} cleared — ${evidenceName} attached. ${scope} condition removed.`;
}
