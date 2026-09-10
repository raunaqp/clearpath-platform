/**
 * The clarification surface — S5a's data, and the recompute behind it.
 *
 * Separate from `api.ts` for the reason the other surfaces are: every route
 * compiles `api.ts`.
 */
import { buildClarifyingQuestions, findDiscrepancies } from "@/lib/engine/routing";
import { runAssessment, supportedLevel, type AssessmentRun } from "@/lib/engine/assessment-run";
import { legacyGateToItemId } from "@/lib/engine/item-bank";
import { getCardV2, seededDeclaration } from "./cards-v2";
import { applyBindings, getAnswers, recordAnswer, type ClarificationAnswer } from "./clarifications";
import { writtenQuestion } from "./fixtures/clarify-questions";
import type { Evidence } from "@/lib/schemas/evidence";

function latency<T>(value: T): Promise<T> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type ClarifyQuestion = {
  id: string;
  gateId: string;
  itemId: string;
  question: string;
  why: string;
  /** The already-filed document a truthful answer would point at. */
  binds: string | null;
  answer: ClarificationAnswer | null;
};

export type ClarifyState = {
  slug: string;
  toolName: string;
  /** Every discrepancy found. Only the top five are asked. */
  totalDiscrepancies: number;
  questions: ClarifyQuestion[];
  /** Routing as it stands with the answers given so far. */
  run: AssessmentRun;
  /** Routing as it was before any answer. */
  baseline: AssessmentRun;
  /** True where answering has actually moved the outcome. */
  routingMoved: boolean;
  /** True where the submission already cleared before any answer. */
  alreadyClear: boolean;
};

function supportsResolver(evidence: Evidence[]) {
  return (itemId: string) =>
    supportedLevel(evidence.filter((e) => e.itemRefs.includes(itemId)));
}

export function buildClarifyState(slug: string): ClarifyState | undefined {
  const view = getCardV2(slug);
  const declaration = seededDeclaration(slug);
  if (!view || !declaration) return undefined;

  const answers = getAnswers(slug);
  const withBindings = applyBindings(view.evidence, answers);

  const baseline = runAssessment({
    declaration,
    evidence: view.evidence,
    conditions: view.card.conditions,
  });
  const run = runAssessment({
    declaration,
    evidence: withBindings,
    conditions: view.card.conditions,
  });

  /**
   * Questions are ranked against the BASELINE, not the current state. If they
   * re-ranked as answers arrived, a question could vanish mid-flow because
   * answering an earlier one demoted it — and a vendor would be asked five
   * questions that were never the same five.
   */
  const blockingItemIds = baseline.unsupportedGates
    .map((g) => legacyGateToItemId(g))
    .filter((id): id is string => Boolean(id));

  const discrepancies = findDiscrepancies({
    selfDeclaration: declaration,
    scores: new Map(),
    evidence: view.evidence,
    path: "PUBLIC",
    supportsFromEvidence: supportsResolver(view.evidence),
    blockingItemIds,
  });

  const questions: ClarifyQuestion[] = buildClarifyingQuestions(discrepancies).map((q) => {
    const written = writtenQuestion(slug, q.gateId);
    return {
      id: q.id,
      gateId: q.gateId,
      itemId: q.itemId,
      question: written?.text ?? q.question,
      why: q.why,
      binds: written?.binds ?? null,
      answer: answers.find((a) => a.questionId === q.id) ?? null,
    };
  });

  return {
    slug,
    toolName: view.tool.name,
    totalDiscrepancies: discrepancies.length,
    questions,
    run,
    baseline,
    routingMoved: baseline.outcome !== run.outcome,
    alreadyClear: baseline.outcome === "ISSUE",
  };
}

export const getClarifyState = (slug: string) => latency(buildClarifyState(slug));

export const answerClarification = (input: {
  slug: string;
  questionId: string;
  gateId: string;
  itemId: string;
  answer: string;
  bindsEvidenceId: string | null;
}) => latency(recordAnswer(input));
