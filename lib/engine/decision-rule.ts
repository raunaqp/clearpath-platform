/**
 * The S20 decision rule, EVALUATED rather than read.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A PREDICATE AND NOT THREE SENTENCES
 * ─────────────────────────────────────────────────────────────────────────
 * The rule was fixed at S20, before any data existed. That timing is the whole
 * mechanism: a rule written after the numbers are in is not a rule, it is a
 * justification, and it is how a trial that missed its endpoints becomes a
 * trial that "showed promise".
 *
 * But a rule nobody can execute gets interpreted, and interpretation happens
 * in the room where the result is already known. Three prose strings on a
 * charter meant S24 had to READ the rule and decide what it meant. Running it
 * removes that step: the committee is told which clause matched and which
 * comparisons produced it, and their job becomes checking the arithmetic
 * rather than negotiating the reading.
 *
 * The prose stays — it is what was agreed and what gets displayed. What is
 * added is `gatingEndpoint`, the one machine-readable field the predicate
 * needs to know which endpoint the adopt/extend split turns on.
 */

import type { TrialCharter } from "@/lib/schemas/governance";
import type { EndpointResult } from "./trial-report";
import { softenCertainty } from "./soften-certainty";

export type DecisionClause = "ADOPT" | "EXTEND" | "RETIRE";

export const DECISION_CLAUSE_LABEL: Record<DecisionClause, string> = {
  ADOPT: "Adopt",
  EXTEND: "Extend",
  RETIRE: "Retire",
};

/** One comparison that ran, and what it produced. */
export type RuleCheck = {
  label: string;
  /** The charter's threshold and the measured value, side by side. */
  target: string;
  actual: string;
  passed: boolean;
};

export type DecisionRuleEvaluation = {
  clause: DecisionClause;
  /** The clause text as written at S20, verbatim. */
  text: string;
  /** Every comparison the rule made, in the order it made them. */
  checks: RuleCheck[];
  /** One sentence naming what decided it. */
  why: string;
};

/**
 * Run the rule.
 *
 * NULL WHEN IT CANNOT BE RUN. If the charter names a gating endpoint that the
 * results do not contain, the rule has not been evaluated and the caller must
 * say so — silently falling through to a clause would produce a decision from
 * a missing input, which is the failure this build keeps finding.
 */
export function evaluateDecisionRule(
  charter: TrialCharter,
  results: EndpointResult[]
): DecisionRuleEvaluation | null {
  if (results.length === 0) return null;

  const primaries = results.filter((r) => r.kind === "primary");
  if (primaries.length === 0) return null;

  const gating = results.find((r) => r.name === charter.decisionRule.gatingEndpoint);
  if (!gating) return null;

  const checks: RuleCheck[] = primaries.map((p) => ({
    label: `${p.name} (primary)`,
    target: p.target,
    actual: p.result,
    passed: p.met,
  }));

  const allPrimariesMet = primaries.every((p) => p.met);

  // ── clause 3 first: a missed primary ends it, whatever else happened ────
  if (!allPrimariesMet) {
    const missed = primaries.filter((p) => !p.met).map((p) => p.name);
    return {
      clause: "RETIRE",
      text: charter.decisionRule.retire,
      checks,
      why: softenCertainty(
        `${missed.length === 1 ? "A primary endpoint was" : `${missed.length} primary endpoints were`} not met — ${missed.join(", ")}. The retire clause applies and no other clause is reachable.`
      ),
    };
  }

  // ── the adopt/extend split turns on the gating endpoint alone ───────────
  checks.push({
    label: `${gating.name} (gating)`,
    target: gating.target,
    actual: gating.result,
    passed: gating.met,
  });

  if (gating.met) {
    return {
      clause: "ADOPT",
      text: charter.decisionRule.adopt,
      checks,
      why: softenCertainty(
        `Every primary endpoint was met and ${gating.name} reached ${gating.result} against a target of ${gating.target}. The adopt clause applies.`
      ),
    };
  }

  return {
    clause: "EXTEND",
    text: charter.decisionRule.extend,
    checks,
    why: softenCertainty(
      `Every primary endpoint was met, but ${gating.name} reached ${gating.result} against a target of ${gating.target}. The extend clause applies — the shortfall is the question an extension has to answer.`
    ),
  };
}
