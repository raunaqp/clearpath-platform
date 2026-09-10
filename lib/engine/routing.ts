/**
 * Routing — TWO SEPARATE MECHANISMS. They are not blended, and they are not
 * two halves of one score.
 *
 *   MECHANISM A · clarifying questions   doc-versus-claim. Where the evidence
 *                                        and the vendor's own 17-gate answer
 *                                        disagree, ask about it.
 *
 *   MECHANISM B · routing                confidence AND groundedness, reported
 *                                        as two numbers, deciding whether a
 *                                        card can issue without a human.
 *
 * Keeping them apart is the point. A blended score hides which condition
 * failed, and the UI has to be able to say "confidence 82%, grounded 64%" —
 * that sentence is what makes human review legible to the reviewer who has to
 * act on it. "Routing score 0.71" tells them nothing they can do anything with.
 */

import type { AssessmentItem } from "@/lib/schemas/item";
import type { Evidence } from "@/lib/schemas/evidence";
import type {
  ItemScore,
  Level,
  LegacyGateId,
  SelfDeclaration,
} from "@/lib/schemas/score";
import { gateItems, itemForLegacyGate, itemsForPath } from "./item-bank";
import { itemsWithEvidence } from "./evidence";
import { softenCertainty } from "./soften-certainty";

// ═════════════════════════════════════════════════════════════════════════
// MECHANISM A — clarifying questions (doc vs what the gate requires)
// ═════════════════════════════════════════════════════════════════════════

export type Discrepancy = {
  gateId: LegacyGateId;
  itemId: string;
  /** What the evidence supports. null = no evidence was found for this gate. */
  evidenceSupports: Level | null;
  /** Ranking weight. Higher is asked about first. */
  materiality: number;
};

/**
 * The most questions a submission may ask. Hard cap.
 *
 * Not a UI nicety: a vendor asked twenty questions answers none of them
 * carefully, and a list of twenty is a way of avoiding a decision about which
 * three actually matter. Five forces the ranking to do real work.
 */
export const MAX_CLARIFYING_QUESTIONS = 5;

export type DiscrepancyInput = {
  /** What the assessment established per item, from the AI or an assessor. */
  scores: Map<string, ItemScore>;
  evidence: Evidence[];
  path: "PUBLIC" | "PRIVATE";
  /**
   * What the DOCUMENTS bound to an item can carry, where no AI or assessor has
   * scored it. Without this the ranking is blind: every gate looks equally
   * unsupported and the five questions come out in alphabetical order.
   */
  supportsFromEvidence?: (itemId: string) => Level | null;
  /**
   * Item ids currently stopping this submission from issuing — the unsupported
   * gates from the assessment run. Questions about these come first.
   */
  blockingItemIds?: string[];
};

/**
 * Materiality — what makes one gap worth spending one of five questions on.
 *
 *   +100  the item is a gate at all
 *   +50   this gate is BLOCKING the submission from issuing
 *   +10   per level of gap between what the GATE REQUIRES (2) and what the
 *         evidence reaches
 *
 * BLOCKING DOMINATES. Ask first about what is actually holding the submission
 * up; gap size decides the order among the rest. Without a declaration EVERY
 * gate is a candidate, so this ranking is the only thing choosing the five.
 *
 * ── THE ANSWERABILITY PENALTY IS GONE, AND WHY ───────────────────────────
 * There was a -20 for "nothing on file", on the reasoning that this ranking
 * decides which questions get ASKED and there the criterion is answerability:
 * a gap against a document that exists can be closed by pointing at section 4,
 * where "you sent us nothing" produces "we will send something" and resolves
 * nothing.
 *
 * The reasoning was sound and the rule became unreachable. Once gates resolve
 * from documents, a gate with nothing on file is UNSCORED, every unscored gate
 * is in the run's unsupported set, and every caller passes that set as
 * `blockingItemIds` — so +50 applied to exactly the gates -20 was meant to
 * demote, and outweighed it every time. It fired only for a hypothetical
 * caller passing a narrower set, and there is no such caller.
 *
 * Removing it does not reorder anything today: the nulls all moved together
 * and the tie-break on gate id is unchanged.
 */
/** What every gate has to reach. Fixed, and not something a submitter sets. */
const GATE_REQUIRES: Level = 2;

function materialityOf(
  item: AssessmentItem,
  supports: Level | null,
  blocking: boolean
): number {
  const gap = GATE_REQUIRES - (supports ?? 0);
  let m = item.isGate ? 100 : 0;
  if (blocking) m += 50;
  m += Math.max(0, gap) * 10;
  return m;
}

export function findDiscrepancies(input: DiscrepancyInput): Discrepancy[] {
  const out: Discrepancy[] = [];
  const withEvidence = itemsWithEvidence(input.evidence);
  const blocking = new Set(input.blockingItemIds ?? []);

  // Iterate the GATES. There is no declaration to iterate any more — the
  // question is what each gate requires against what is on file for it, which
  // is the same question for every submission.
  for (const item of gateItems(input.path)) {
    const gateId = (item.legacyGateId ?? item.id) as LegacyGateId;

    const score = input.scores.get(item.id);
    // No evidence bound to the item, or nothing scored it → nothing supports it.
    const supports: Level | null =
      !withEvidence.has(item.id)
        ? null
        : !score
          ? (input.supportsFromEvidence?.(item.id) ?? null)
          : score.adjudicated ??
          (score.assessorScores.length > 0
            ? (Math.round(
                score.assessorScores.reduce((s, a) => s + a.level, 0) /
                  score.assessorScores.length
              ) as Level)
            : (score.aiScore?.level ?? null));

    // A gate the evidence already carries is not something to ask about.
    if (supports !== null && supports >= GATE_REQUIRES) continue;

    out.push({
      gateId,
      itemId: item.id,
      evidenceSupports: supports,
      materiality: materialityOf(item, supports, blocking.has(item.id)),
    });
  }

  // Gate items first, then by gap size. Ties broken by gate id for stability.
  return out.sort(
    (a, b) => b.materiality - a.materiality || a.gateId.localeCompare(b.gateId)
  );
}

export type ClarifyingQuestion = {
  id: string;
  gateId: LegacyGateId;
  itemId: string;
  question: string;
  /** Shown under the question so the vendor knows why they are being asked. */
  why: string;
};

const LEVEL_WORD: Record<Level, string> = {
  0: "absent",
  1: "requires support",
  2: "system-owned",
};

/** Build the questions, ranked, CAPPED AT FIVE. */
export function buildClarifyingQuestions(
  discrepancies: Discrepancy[]
): ClarifyingQuestion[] {
  return discrepancies.slice(0, MAX_CLARIFYING_QUESTIONS).map((d) => {
    const item = itemForLegacyGate(d.gateId);
    const subject = item?.text ?? d.itemId;
    const why =
      d.evidenceSupports === null
        ? `Nothing on file is bound to ${d.itemId}, so ${d.gateId} is not established either way.`
        : `The evidence on file for ${d.gateId} reads as "${LEVEL_WORD[d.evidenceSupports]}", short of what this gate requires.`;

    return {
      id: `q-${d.gateId}`,
      gateId: d.gateId,
      itemId: d.itemId,
      question: softenCertainty(
        `Which document, or which part of one, supports your answer here? ${subject}`
      ),
      why: softenCertainty(why),
    };
  });
}

/**
 * Feed answers back into scoring.
 *
 * An answered clarification raises the CONFIDENCE of the AI score on that
 * item — the assessment now knows where to look, so its own read of the item
 * is better founded. It deliberately does NOT raise the LEVEL: a vendor
 * answering a question is not evidence, and letting an answer move a score
 * would make the questions a way to talk a card up.
 *
 * HONEST LIMITATION: with no model in the loop, the size of that confidence
 * lift (`CLARIFICATION_CONFIDENCE_LIFT`) is a number chosen here, not a
 * measurement. See the note at the top of fixtures/ai-assessment.ts.
 */
export const CLARIFICATION_CONFIDENCE_LIFT = 0.18;

export function applyClarificationAnswers(
  scores: Map<string, ItemScore>,
  selfDeclaration: SelfDeclaration,
  questions: ClarifyingQuestion[]
): Map<string, ItemScore> {
  const answered = new Set(selfDeclaration.clarificationAnswers.map((a) => a.questionId));
  const next = new Map(scores);

  for (const q of questions) {
    if (!answered.has(q.id)) continue;
    const score = next.get(q.itemId);
    if (!score?.aiScore) continue;
    next.set(q.itemId, {
      ...score,
      aiScore: {
        ...score.aiScore,
        confidence: Math.min(1, score.aiScore.confidence + CLARIFICATION_CONFIDENCE_LIFT),
      },
    });
  }

  return next;
}

// ═════════════════════════════════════════════════════════════════════════
// MECHANISM B — routing (confidence + groundedness)
// ═════════════════════════════════════════════════════════════════════════

export type RouteInputs = {
  /** Mean confidence over SCORED items only. */
  meanConfidence: number;
  /** Items with >=1 citation / scored items. */
  groundedRate: number;
  /** Gate items the AI scored while citing nothing. An absolute bar. */
  ungroundedGates: string[];
};

export const CONFIDENCE_THRESHOLD = 0.7;
export const GROUNDED_THRESHOLD = 0.7;

export type RouteDecision = "AUTO_ISSUE" | "HUMAN_REVIEW";

export type RouteResult = {
  decision: RouteDecision;
  inputs: RouteInputs;
  /**
   * Which conditions failed, named individually. TWO NUMBERS, NOT ONE
   * COMPOSITE — a reviewer needs to know whether the model was unsure or
   * could not point at a document, because those call for different work.
   */
  failed: Array<"confidence" | "groundedness" | "ungrounded_gates">;
  /** The sentence the UI shows. */
  explanation: string;
};

export function route(inputs: RouteInputs): RouteResult {
  const failed: RouteResult["failed"] = [];
  if (inputs.meanConfidence < CONFIDENCE_THRESHOLD) failed.push("confidence");
  if (inputs.groundedRate < GROUNDED_THRESHOLD) failed.push("groundedness");
  if (inputs.ungroundedGates.length > 0) failed.push("ungrounded_gates");

  const decision: RouteDecision = failed.length === 0 ? "AUTO_ISSUE" : "HUMAN_REVIEW";
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const head = `Confidence ${pct(inputs.meanConfidence)}, grounded ${pct(inputs.groundedRate)}.`;

  if (decision === "AUTO_ISSUE") {
    return {
      decision,
      inputs,
      failed,
      explanation: softenCertainty(`${head} Above both thresholds with every gate cited, so the card issues without human review.`),
    };
  }

  const reasons: string[] = [];
  if (failed.includes("confidence")) {
    reasons.push(`confidence is below ${pct(CONFIDENCE_THRESHOLD)}`);
  }
  if (failed.includes("groundedness")) {
    reasons.push(`groundedness is below ${pct(GROUNDED_THRESHOLD)}`);
  }
  if (failed.includes("ungrounded_gates")) {
    reasons.push(
      `${inputs.ungroundedGates.length} gate ${inputs.ungroundedGates.length === 1 ? "item was" : "items were"} scored without a citation (${inputs.ungroundedGates.join(", ")})`
    );
  }

  return {
    decision,
    inputs,
    failed,
    explanation: softenCertainty(
      `${head} Routed to an assessor because ${reasons.join(", and ")}. This is a delay, not a denial — the assessor reviews only the low-confidence and uncited items, then the card issues.`
    ),
  };
}

/**
 * HUMAN_REVIEW sets the submission state to UNDER_ASSESSMENT.
 * There is deliberately NO rejected state at this step. Routing decides who
 * looks, not whether the tool is any good.
 */
export const HUMAN_REVIEW_STATE = "UNDER_ASSESSMENT" as const;

export type RouteComputeInput = {
  scores: Map<string, ItemScore>;
  evidence: Evidence[];
  path: "PUBLIC" | "PRIVATE";
};

/**
 * A citation grounds a score only if it points at something real: an Evidence
 * id that exists, or a framework cluster code that exists. A citation pointing
 * at nothing is WORSE than no citation — it passes this check while grounding
 * nothing, which defeats the whole mechanism silently.
 */
export function isGroundedCitation(
  citation: { evidenceId?: string; frameworkRef?: string },
  evidenceIds: Set<string>,
  clusterCodes: Set<string>
): boolean {
  if (citation.evidenceId) return evidenceIds.has(citation.evidenceId);
  if (citation.frameworkRef) return clusterCodes.has(citation.frameworkRef);
  return false;
}

/**
 * DENOMINATORS. Both means are taken over items that are:
 *   - not stubs                (an unwritten item cannot be scored)
 *   - actually scored by the AI
 *   - have at least one document bound to them
 *
 * An item with nothing attached is never counted as confident OR grounded.
 * Counting it either way would let a submission improve its rates by attaching
 * less.
 */
export function computeRouteInputs(input: RouteComputeInput): RouteInputs {
  const evidenceIds = new Set(input.evidence.map((e) => e.id));
  const clusterCodes = new Set(itemsForPath(input.path).map((i) => i.clusterCode));
  const withEvidence = itemsWithEvidence(input.evidence);
  const gateIds = new Set(gateItems(input.path).map((i) => i.id));

  let confidenceSum = 0;
  let counted = 0;
  let grounded = 0;
  const ungroundedGates: string[] = [];

  for (const item of itemsForPath(input.path)) {
    if (item.status !== "active" || item.text === null) continue; // stub
    const score = input.scores.get(item.id);
    if (!score?.aiScore) continue; // not scored by the AI
    if (!withEvidence.has(item.id)) continue; // nothing attached

    const real = score.aiScore.citations.filter((c) =>
      isGroundedCitation(c, evidenceIds, clusterCodes)
    );

    confidenceSum += score.aiScore.confidence;
    counted += 1;
    if (real.length > 0) grounded += 1;
    else if (gateIds.has(item.id)) ungroundedGates.push(item.id);
  }

  return {
    meanConfidence: counted === 0 ? 0 : confidenceSum / counted,
    groundedRate: counted === 0 ? 0 : grounded / counted,
    ungroundedGates,
  };
}

/**
 * An ungrounded GATE is an absolute bar, checked separately from the rates
 * above. A gate item the AI scored without being able to cite anything is the
 * one case a high average must not carry through: it is precisely where a
 * confident-sounding guess does the most damage.
 */
export function ungroundedGateItems(input: RouteComputeInput): string[] {
  return computeRouteInputs(input).ungroundedGates;
}
