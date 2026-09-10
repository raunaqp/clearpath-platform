/**
 * Clarification answers — attached to the ASSESSMENT, never to the declaration.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY NOT ON THE DECLARATION
 * ─────────────────────────────────────────────────────────────────────────
 * `SelfDeclaration` is what the vendor claimed at a point in time. It is the
 * record the assessment is checked AGAINST, and a record that moves while it is
 * being checked cannot support a finding — if answering a question could edit
 * the claim, "your declaration exceeds your evidence" would become unfalsifiable
 * because the claim would quietly follow the evidence.
 *
 * So the declaration stays immutable and answers live here, alongside the
 * assessment. `SelfDeclaration.clarificationAnswers` exists from Phase 1 and is
 * deliberately left unused by this path.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT AN ANSWER ACTUALLY DOES
 * ─────────────────────────────────────────────────────────────────────────
 * It supplies a BINDING, not new evidence. "Section 4 of the study we already
 * filed covers this" points an existing document at a gate it was never bound
 * to — which is a real and common situation, and it is the only thing an answer
 * can honestly change. An answer cannot conjure a document that was never
 * filed, and this module cannot either: `bindsEvidenceId` must name evidence
 * that already exists.
 */

import type { Evidence } from "@/lib/schemas/evidence";

const KEY = "clearpath-clarifications-v1";

export type ClarificationAnswer = {
  slug: string;
  questionId: string;
  gateId: string;
  itemId: string;
  answer: string;
  answeredAt: string;
  /** An already-filed document the answer points at. Never a new one. */
  bindsEvidenceId: string | null;
};

let answers: ClarificationAnswer[] | null = null;

function load(): ClarificationAnswer[] {
  if (answers) return answers;
  answers = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) answers = JSON.parse(raw) as ClarificationAnswer[];
    } catch {
      answers = [];
    }
  }
  return answers;
}
function persist() {
  if (typeof window === "undefined" || !answers) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(answers));
  } catch {
    // Demo nicety only.
  }
}

export function resetClarifications() {
  answers = [];
  persist();
}

export function getAnswers(slug: string): ClarificationAnswer[] {
  return load().filter((a) => a.slug === slug);
}

export function recordAnswer(input: Omit<ClarificationAnswer, "answeredAt"> & { at?: string }): ClarificationAnswer {
  const record: ClarificationAnswer = {
    ...input,
    answeredAt: input.at ?? new Date().toISOString(),
  };
  const rows = load();
  const i = rows.findIndex((a) => a.slug === input.slug && a.questionId === input.questionId);
  if (i >= 0) rows[i] = record;
  else rows.push(record);
  persist();
  return record;
}

/**
 * Apply the bindings an answer supplied.
 *
 * Returns a NEW evidence list with extra `itemRefs` where an answer pointed an
 * existing document at a gate. It never adds a document — if `bindsEvidenceId`
 * names something not already on file, the binding is dropped, because the one
 * thing an answer must not be able to do is invent evidence.
 */
export function applyBindings(evidence: Evidence[], answered: ClarificationAnswer[]): Evidence[] {
  if (answered.length === 0) return evidence;
  return evidence.map((e) => {
    const extra = answered
      .filter((a) => a.bindsEvidenceId === e.id && !e.itemRefs.includes(a.itemId))
      .map((a) => a.itemId);
    return extra.length === 0 ? e : { ...e, itemRefs: [...e.itemRefs, ...extra] };
  });
}
