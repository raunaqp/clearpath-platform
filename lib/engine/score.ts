/**
 * Score resolution — turning several opinions about one item into one level.
 *
 * RESOLUTION ORDER
 *   adjudicated            a lead assessor resolved a disagreement. Final.
 *   mean(assessorScores)   human assessors, rounded to the ladder.
 *   aiScore.level          the AI's read.
 *   evidence               what the DOCUMENTS bound to the item establish.
 *   UNSCORED               nobody established this.
 *
 * THERE IS NO SELF-DECLARED RUNG, AND THAT IS THE POINT.
 * It used to sit between the AI and UNSCORED: the vendor's own answer to a
 * 17-gate questionnaire, used "only where nobody has looked yet". In practice
 * nobody had looked at almost anything — every seeded card resolved fifteen of
 * its seventeen gates from that answer — so the engine was self-certifying
 * underneath a UI that had stopped. A card is a claim about what documents
 * show; a gate nothing documents reaches now comes back UNSCORED and says so.
 *
 * UNSCORED IS NOT ZERO.
 * It is `null` everywhere in this file and it never coerces to 0. "We could
 * not establish this" and "this failed" are different findings about a tool.
 * Collapsing them turns a hole in the evidence into an accusation, and — worse
 * for the vendor — lets a missing document read as an assessed failure. They
 * are counted separately, excluded from means, and surfaced on the card as
 * `couldNotEstablish`.
 */

import type { AssessmentItem } from "@/lib/schemas/item";
import type { Evidence } from "@/lib/schemas/evidence";
import type { DimensionId } from "@/lib/schemas/readiness-card";
import type { ItemScore, Level } from "@/lib/schemas/score";
import { activeItems, itemsForDimension, itemsForPath } from "./item-bank";

/** A resolved level, or null for UNSCORED. Never 0-for-missing. */
export type FinalLevel = Level | null;

export const UNSCORED = null;

/** Round a mean onto the 0-2 ladder. .5 rounds up, consistently. */
function toLevel(mean: number): Level {
  const r = Math.round(mean);
  return (r < 0 ? 0 : r > 2 ? 2 : r) as Level;
}

export type FinalInput = {
  item: AssessmentItem;
  score?: ItemScore;
  /** Every document on the submission. Only those bound to this item count. */
  evidence?: Evidence[];
};

/**
 * What the DOCUMENTS bound to an item establish, on the 0-2 ladder.
 *
 *   null   nothing is bound. Nobody established this either way, and that is
 *          reported as an absence rather than a failing.
 *   0      everything bound has LAPSED. There was evidence; there is not now.
 *          This is the only route to zero from documents, because zero is an
 *          assessed finding and an expired licence is exactly that.
 *   1      evidence exists but cannot carry the item alone — either it was
 *          generated somewhere this deployment is not, or every document that
 *          does transfer is the claimant's own and states a limitation.
 *   2      at least one document transfers to this context AND is either
 *          independent of the claimant or carries no stated limitation.
 *
 * A document generated elsewhere is deliberately 1, not 0: it is real evidence
 * that needs local support to carry, which is what "requires support" means.
 * Calling it 0 would turn a transferability question into an accusation.
 */
export function evidenceLevel(itemId: string, evidence: Evidence[]): FinalLevel {
  const bound = evidence.filter((e) => e.itemRefs.includes(itemId));
  if (bound.length === 0) return UNSCORED;

  const live = bound.filter((e) => !e.expired);
  if (live.length === 0) return 0;

  const transfers = live.filter((e) => !e.generalisability.limited);
  if (transfers.length === 0) return 1;

  const standsAlone = transfers.filter(
    (e) => e.independence !== "VENDOR_GENERATED" || e.limitation === null
  );
  return standsAlone.length > 0 ? 2 : 1;
}

/**
 * Resolve one item to a final level.
 *
 * A stub is ALWAYS unscored, whatever anyone attached to it. An item with no
 * authored text cannot have been assessed against, so a score on one is a data
 * error rather than a finding, and it must not reach a denominator.
 */
export function final({ item, score, evidence }: FinalInput): FinalLevel {
  if (item.status !== "active" || item.text === null) return UNSCORED;

  if (score) {
    if (score.adjudicated !== null && score.adjudicated !== undefined) {
      return score.adjudicated;
    }
    if (score.assessorScores.length > 0) {
      const sum = score.assessorScores.reduce((s, a) => s + a.level, 0);
      return toLevel(sum / score.assessorScores.length);
    }
    if (score.aiScore) return score.aiScore.level;
  }

  if (evidence && evidence.length > 0) return evidenceLevel(item.id, evidence);

  return UNSCORED;
}

/** Which input actually decided the level — for "why does it say that?". */
export type ScoreSource =
  | "adjudicated"
  | "assessor"
  | "ai"
  | "evidence"
  | "unscored";

export function finalSource({ item, score, evidence }: FinalInput): ScoreSource {
  if (item.status !== "active" || item.text === null) return "unscored";
  if (score) {
    if (score.adjudicated !== null && score.adjudicated !== undefined) return "adjudicated";
    if (score.assessorScores.length > 0) return "assessor";
    if (score.aiScore) return "ai";
  }
  if (evidence && evidenceLevel(item.id, evidence) !== UNSCORED) return "evidence";
  return "unscored";
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────────────────────────────────────

export type ScoredSet = {
  path: "PUBLIC" | "PRIVATE";
  scores: Map<string, ItemScore>;
  /** The submission's documents. The last resort before UNSCORED. */
  evidence?: Evidence[];
};

/** Resolve every item on the path. Stubs come back UNSCORED by construction. */
export function resolveAll(set: ScoredSet): Map<string, FinalLevel> {
  const out = new Map<string, FinalLevel>();
  for (const item of itemsForPath(set.path)) {
    out.set(
      item.id,
      final({ item, score: set.scores.get(item.id), evidence: set.evidence })
    );
  }
  return out;
}

export type Aggregate = {
  /** Mean over SCORED items only. null when nothing in the group was scored. */
  mean: number | null;
  itemsScored: number;
  /** Every item in the group, stubs included — the honest denominator context. */
  itemsTotal: number;
  /** Authored items nobody established. Tracked, never averaged in. */
  unscoredIds: string[];
  /** Stubs in the group. Excluded from everything; reported for transparency. */
  stubIds: string[];
};

function aggregate(items: AssessmentItem[], resolved: Map<string, FinalLevel>): Aggregate {
  let sum = 0;
  let n = 0;
  const unscoredIds: string[] = [];
  const stubIds: string[] = [];

  for (const item of items) {
    if (item.status !== "active" || item.text === null) {
      stubIds.push(item.id);
      continue;
    }
    const level = resolved.get(item.id) ?? UNSCORED;
    if (level === UNSCORED) {
      unscoredIds.push(item.id);
      continue;
    }
    sum += level;
    n += 1;
  }

  return {
    mean: n === 0 ? null : sum / n,
    itemsScored: n,
    itemsTotal: items.length,
    unscoredIds,
    stubIds,
  };
}

/** Round a 0-2 mean to one decimal, the way /framework renders it. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function dimensionAggregate(
  dimension: DimensionId,
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE" = "PUBLIC"
): Aggregate {
  return aggregate(itemsForDimension(dimension, path), resolved);
}

export function clusterAggregate(
  clusterCode: string,
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE" = "PUBLIC"
): Aggregate {
  return aggregate(
    itemsForPath(path).filter((i) => i.clusterCode === clusterCode),
    resolved
  );
}

/** Authored items on the path that nobody established either way. */
export function couldNotEstablish(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE" = "PUBLIC"
): string[] {
  return activeItems(path)
    .filter((i) => (resolved.get(i.id) ?? UNSCORED) === UNSCORED)
    .map((i) => i.id);
}
