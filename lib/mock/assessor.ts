/**
 * S5c — the assessor review record and queue.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AN EXCEPTION QUEUE, NOT A SCORING SURFACE
 * ─────────────────────────────────────────────────────────────────────────
 * The assessor sees ONLY the items the automated pass could not support.
 * Everything else carries forward untouched and is not re-opened — which is the
 * whole economics of the funded model: a human touches the handful of gates
 * with nothing behind them, not 112 items.
 *
 * REUSES THE S18 MECHANISM, not its shape. A committee verdict has a chair, a
 * quorum and dissent; an assessor review has one person and a conflict
 * position. Forcing one into the other would put "quorum of 1" on screen. What
 * they share — attributable, dated, append-only, a reversal being a new record
 * — lives in `append-only.ts` and both call it.
 */

import type { Attribution } from "@/lib/schemas/attributable";
import { appendOnlyGuard, inForce } from "./append-only";
import { runAssessment } from "@/lib/engine/assessment-run";
import { legacyGateToItemId, getItem } from "@/lib/engine/item-bank";
import { getCardV2, seededDeclaration } from "./cards-v2";
import { applyBindings, getAnswers } from "./clarifications";

const KEY = "clearpath-assessor-reviews-v1";

export type ReviewedItem = {
  itemId: string;
  gateId: string;
  question: string;
  /** What the assessor concluded. */
  outcome: "SUPPORTED" | "NOT_SUPPORTED";
  note: string;
};

export type AssessorReview = {
  id: string;
  revision: number;
  supersedes: string | null;
  decidedAt: string;
  slug: string;
  toolName: string;
  assessor: Attribution;
  /** Only the items the automated pass could not support. */
  reviewed: ReviewedItem[];
  /** Items carried forward untouched — counted, never re-opened. */
  carriedForward: number;
  /** Recorded on the card: this issued by human review, not automatically. */
  issuedBy: "HUMAN_REVIEW";
};

let reviews: AssessorReview[] | null = null;
function load(): AssessorReview[] {
  if (reviews) return reviews;
  reviews = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) reviews = JSON.parse(raw) as AssessorReview[];
    } catch {
      reviews = [];
    }
  }
  return reviews;
}
function persist() {
  if (typeof window === "undefined" || !reviews) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(reviews));
  } catch {
    // Demo nicety only.
  }
}
export function resetAssessorReviews() {
  reviews = [];
  persist();
}

// ═════════════════════════════════════════════════════════════════════════
// The queue
// ═════════════════════════════════════════════════════════════════════════

export type QueueEntry = {
  slug: string;
  toolName: string;
  /** Gates with nothing bound that also block a trial — the reason to look first. */
  trialBlockingUnsupported: string[];
  unsupported: string[];
  coverage: "high" | "moderate" | "limited";
  reviewed: boolean;
};

const CANDIDATES = ["cerviai", "retinascan", "chestxr", "symptombot"];

/**
 * The queue, sorted by unsupported trial-blocking gates first.
 *
 * A gate that blocks a trial with nothing behind it is where a human's time is
 * worth most: nothing downstream can start until it is resolved, and no amount
 * of automated confidence can resolve it.
 */
export function assessorQueue(): QueueEntry[] {
  const entries: QueueEntry[] = [];
  for (const slug of CANDIDATES) {
    const view = getCardV2(slug);
    const declaration = seededDeclaration(slug);
    if (!view || !declaration) continue;
    const evidence = applyBindings(view.evidence, getAnswers(slug));
    const run = runAssessment({ declaration, evidence, conditions: view.card.conditions });
    if (run.outcome !== "UNDER_ASSESSMENT") continue;

    const trialBlocking = run.discrepancies
      .filter((d) => d.kind === "UNEVIDENCED")
      .map((d) => d.gateId)
      .filter((g) => run.unsupportedGates.includes(g));

    entries.push({
      slug,
      toolName: view.tool.name,
      trialBlockingUnsupported: trialBlocking,
      unsupported: run.unsupportedGates,
      coverage: run.evidenceCoverage,
      reviewed: !!currentReview(slug),
    });
  }
  return entries.sort(
    (a, b) =>
      b.trialBlockingUnsupported.length - a.trialBlockingUnsupported.length ||
      b.unsupported.length - a.unsupported.length
  );
}

/** The items an assessor is asked to look at — and nothing else. */
export function itemsForReview(slug: string): ReviewedItem[] {
  const view = getCardV2(slug);
  const declaration = seededDeclaration(slug);
  if (!view || !declaration) return [];
  const evidence = applyBindings(view.evidence, getAnswers(slug));
  const run = runAssessment({ declaration, evidence, conditions: view.card.conditions });
  return run.unsupportedGates.map((gateId) => {
    const itemId = legacyGateToItemId(gateId) ?? gateId;
    return {
      itemId,
      gateId,
      question: getItem(itemId)?.text ?? itemId,
      outcome: "SUPPORTED" as const,
      note: "",
    };
  });
}

/** How many items the assessor is NOT being asked to re-open. */
export function carriedForwardCount(slug: string): number {
  const view = getCardV2(slug);
  if (!view) return 0;
  const gates = view.card.gateSummary;
  const total = gates.pass + gates.fail + gates.unscored;
  return total - itemsForReview(slug).length;
}

// ═════════════════════════════════════════════════════════════════════════
// The record
// ═════════════════════════════════════════════════════════════════════════

export function getReviews(slug: string): AssessorReview[] {
  return load().filter((r) => r.slug === slug).sort((a, b) => a.revision - b.revision);
}
export function currentReview(slug: string): AssessorReview | undefined {
  return inForce(getReviews(slug));
}

export type RecordReviewInput = {
  slug: string;
  toolName: string;
  assessor: Attribution;
  reviewed: ReviewedItem[];
  supersedes?: string;
  at?: string;
};

/**
 * Record a review. Requires a NAMED assessor and a conflict position — an
 * anonymous review is not attributable, and an attributable record that nobody
 * is attributed to is the one thing this cannot be.
 */
export function recordReview(input: RecordReviewInput): AssessorReview {
  if (!input.assessor.name.trim() || !input.assessor.role.trim()) {
    throw new Error("Assessor review: a named assessor and role are required. An anonymous review is not an attributable record.");
  }
  if (input.assessor.conflictPosition !== "NONE" && !input.assessor.conflictNote?.trim()) {
    throw new Error("Assessor review: a declared or recused conflict needs a note saying what it is.");
  }

  const { revision, supersedes } = appendOnlyGuard({
    existing: getReviews(input.slug),
    supersedes: input.supersedes,
    label: "Assessor review",
    subject: input.slug,
  });

  const review: AssessorReview = {
    id: `review-${input.slug}-${revision}`,
    revision,
    supersedes,
    decidedAt: input.at ?? new Date().toISOString(),
    slug: input.slug,
    toolName: input.toolName,
    assessor: input.assessor,
    reviewed: input.reviewed,
    carriedForward: carriedForwardCount(input.slug),
    issuedBy: "HUMAN_REVIEW",
  };
  const rows = load();
  rows.push(review);
  persist();
  return review;
}
