/**
 * S24-S27 — the outcome store.
 *
 * Append-only and attributable, on the SAME guard the committee verdict and
 * the assessor review use. A record that can be edited proves nothing about
 * what was decided at the time, and that is as true of "we adopted it" as of
 * "we let it in".
 */

import type { OutcomeDecision, OutcomeDecisionKind, Closeout } from "@/lib/schemas/outcome";
import type { TrialCharter } from "@/lib/schemas/governance";
import { appendOnlyGuard, inForce } from "./append-only";
import { buildCharter, currentVerdict } from "./governance";
import { buildTrialView } from "./api-trial";
import { evaluateDecisionRule } from "@/lib/engine/decision-rule";
import { OUTCOME_FIXTURES, CLOSEOUT_FIXTURES } from "./fixtures/outcomes";

/**
 * A branch is INCOMPLETE unless it carries what that branch requires.
 *
 * Extend needs a new question and a new stop rule: an extension with neither
 * is a trial repeated in the hope of a different answer, with nobody agreed on
 * how it ends. Adopt needs a business-as-usual owner DISTINCT from the trial
 * owner — a trial owner who silently becomes the permanent one is how a tool
 * ends up unowned when they move on. Retire needs somewhere for the data, the
 * devices and the already-flagged patients to go.
 *
 * Enforced here rather than trusted, because the branch that gets skipped is
 * always the one nobody looked at.
 */
export function assertOutcomeComplete(
  decision: OutcomeDecision,
  trialOwnerName: string
): void {
  const fail = (why: string) => {
    throw new Error(`outcome ${decision.slug}: ${why}`);
  };

  if (decision.decision === "EXTEND") {
    if (!decision.extension) fail("an EXTEND carries extension terms.");
    if (!decision.extension!.newQuestion.trim())
      fail("an EXTEND states the new question it is extending against — otherwise it is the same trial run again.");
    if (!decision.extension!.newStopRule.trim())
      fail("an EXTEND states a new stop rule — otherwise nobody has agreed how it ends.");
    if (decision.adoption || decision.retirement) fail("an EXTEND carries no adoption or retirement terms.");
  }

  if (decision.decision === "ADOPT") {
    if (!decision.adoption) fail("an ADOPT carries adoption terms.");
    if (decision.adoption!.bauOwner.name === trialOwnerName)
      fail(
        `an ADOPT names a business-as-usual owner distinct from the trial owner (${trialOwnerName}). A trial owner who quietly becomes the permanent one leaves the tool unowned when they move on.`
      );
    if (decision.extension || decision.retirement) fail("an ADOPT carries no extension or retirement terms.");
  }

  if (decision.decision === "RETIRE") {
    if (!decision.retirement) fail("a RETIRE carries retirement terms.");
    const r = decision.retirement!;
    if (!r.dataPlan.trim() || !r.devicePlan.trim() || !r.patientContinuityPlan.trim())
      fail("a RETIRE states where the data, the devices and the already-flagged patients go. Stopping is an operation, not an absence of one.");
    if (decision.extension || decision.adoption) fail("a RETIRE carries no extension or adoption terms.");
  }
}

const session: OutcomeDecision[] = [];

function allFor(slug: string): OutcomeDecision[] {
  return [...(OUTCOME_FIXTURES[slug] ?? []), ...session.filter((d) => d.slug === slug)];
}

/** The decision in force for this trial, or undefined where none was taken. */
export function currentOutcome(slug: string): OutcomeDecision | undefined {
  return inForce(allFor(slug));
}

export type RecordOutcomeInput = Omit<OutcomeDecision, "id" | "revision" | "supersedes"> & {
  supersedes?: string;
};

/**
 * APPEND ONLY. A reversal is a new record naming the one it replaces.
 */
export function recordOutcome(input: RecordOutcomeInput): OutcomeDecision {
  const existing = allFor(input.slug);
  const { revision, supersedes } = appendOnlyGuard({
    existing,
    supersedes: input.supersedes,
    label: "outcome decision",
    subject: input.slug,
  });

  const charter = buildCharter(input.slug);
  const record: OutcomeDecision = {
    ...input,
    id: `outcome-${input.slug}-${revision}`,
    revision,
    supersedes,
  };
  assertOutcomeComplete(record, charter?.owner.name ?? "");
  session.push(record);
  return record;
}

export function resetOutcomes(): void {
  session.length = 0;
}

/**
 * THE DECISION VIEW.
 *
 * UNDEFINED WHERE NO DECISION WAS TAKEN. A decision screen for a trial nobody
 * has decided about would be a committee deciding about nothing — the same
 * shape as a fourteen-gate audit for a submission that does not exist.
 *
 * `evaluation` is the rule RE-RUN NOW, and it is null where the charter or the
 * endpoint results are no longer reachable. That is why every decision carries
 * its own copy of the clause it applied: the record has to stand on its own six
 * months later, without trusting that the charter still says what it said. The
 * screen distinguishes the two states rather than implying both were re-run.
 */
export type OutcomeView = {
  decision: OutcomeDecision;
  charter: TrialCharter | undefined;
  /** The rule re-run against live results, where both still exist. */
  evaluation: ReturnType<typeof evaluateDecisionRule>;
  /** Whether the re-run agrees with what was recorded. null = not re-runnable. */
  agreesWithRule: boolean | null;
  closeout: Closeout | undefined;
};

export function buildOutcomeView(slug: string): OutcomeView | undefined {
  const decision = currentOutcome(slug);
  if (!decision) return undefined;

  const charter = buildCharter(slug);
  const trial = buildTrialView(slug);
  const evaluation =
    charter && trial && trial.endpoints.length > 0
      ? evaluateDecisionRule(charter, trial.endpoints)
      : null;

  return {
    decision,
    charter,
    evaluation,
    agreesWithRule: evaluation ? decision.decision === (evaluation.clause as OutcomeDecisionKind) : null,
    closeout: CLOSEOUT_FIXTURES[slug],
  };
}

/** The committee that took the outcome decision, for attribution on screen. */
export function outcomeQuorum(slug: string) {
  return currentVerdict(slug)?.quorum;
}
