/**
 * Score resolution — turning several opinions about one item into one level.
 *
 * RESOLUTION ORDER
 *   adjudicated            a lead assessor resolved a disagreement. Final.
 *   mean(assessorScores)   human assessors, rounded to the ladder.
 *   aiScore.level          the AI's read.
 *   selfDeclared           the vendor's own 17-gate answer. Weakest input,
 *                          and it is a CLAIM — used only where nobody has
 *                          looked yet, never to overrule someone who has.
 *   UNSCORED               nobody established this.
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
import type { DimensionId } from "@/lib/schemas/readiness-card";
import type { ItemScore, Level, SelfDeclaration } from "@/lib/schemas/score";
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
  selfDeclaration?: SelfDeclaration;
};

/**
 * Resolve one item to a final level.
 *
 * A stub is ALWAYS unscored, whatever anyone attached to it. An item with no
 * authored text cannot have been assessed against, so a score on one is a data
 * error rather than a finding, and it must not reach a denominator.
 */
export function final({ item, score, selfDeclaration }: FinalInput): FinalLevel {
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

  if (selfDeclaration && item.legacyGateId) {
    const declared = selfDeclaration.gateAnswers[
      item.legacyGateId as keyof typeof selfDeclaration.gateAnswers
    ];
    if (declared !== undefined) return declared;
  }

  return UNSCORED;
}

/** Which input actually decided the level — for "why does it say that?". */
export type ScoreSource =
  | "adjudicated"
  | "assessor"
  | "ai"
  | "self_declared"
  | "unscored";

export function finalSource({ item, score, selfDeclaration }: FinalInput): ScoreSource {
  if (item.status !== "active" || item.text === null) return "unscored";
  if (score) {
    if (score.adjudicated !== null && score.adjudicated !== undefined) return "adjudicated";
    if (score.assessorScores.length > 0) return "assessor";
    if (score.aiScore) return "ai";
  }
  if (selfDeclaration && item.legacyGateId) {
    const declared = selfDeclaration.gateAnswers[
      item.legacyGateId as keyof typeof selfDeclaration.gateAnswers
    ];
    if (declared !== undefined) return "self_declared";
  }
  return "unscored";
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────────────────────────────────────

export type ScoredSet = {
  path: "PUBLIC" | "PRIVATE";
  scores: Map<string, ItemScore>;
  selfDeclaration?: SelfDeclaration;
};

/** Resolve every item on the path. Stubs come back UNSCORED by construction. */
export function resolveAll(set: ScoredSet): Map<string, FinalLevel> {
  const out = new Map<string, FinalLevel>();
  for (const item of itemsForPath(set.path)) {
    out.set(
      item.id,
      final({ item, score: set.scores.get(item.id), selfDeclaration: set.selfDeclaration })
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
