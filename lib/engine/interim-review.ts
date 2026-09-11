/**
 * The day-45 interim review — that it RAN, and that its stop rule DID NOT FIRE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AN UNFIRED STOP RULE IS EVIDENCE
 * ─────────────────────────────────────────────────────────────────────────
 * A trial that reports only its endpoints tells a reader what happened. It does
 * not tell them whether anyone was watching while it happened, and those are
 * different questions. The interim is where the second one is answered: the
 * rule existed before the data, it was evaluated at the day the charter named,
 * and it came back negative.
 *
 * Showing only fired stop rules would teach a reader that the platform reports
 * failures — the same mistake as showing only open alerts. Showing the unfired
 * one teaches them that the rule was real.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE THRESHOLD IS READ FROM THE CHARTER, NEVER RETYPED
 * ─────────────────────────────────────────────────────────────────────────
 * Same rule as the endpoints: the charter's `stops.futility` is the source, and
 * this parses the comparator and the bound out of it. An interim that carried
 * its own copy of "0.75" could drift from the charter that authorised it, and
 * a stop rule that disagrees with its own charter is worse than none.
 */

import type { TrialCharter, CommitteeVerdict } from "@/lib/schemas/governance";
import { softenCertainty } from "./soften-certainty";

/** What the charter's futility sentence actually says, once parsed. */
export type FutilityRule = {
  /** The measure named in the rule — "Sensitivity". */
  measure: string;
  /** "below" or "above". */
  direction: "below" | "above";
  threshold: number;
  /** The day the rule is evaluated on. */
  day: number;
};

/**
 * Parse the futility rule out of the charter's prose.
 *
 * Returns null rather than guessing. A sentence this cannot read is a sentence
 * nobody should claim to have evaluated.
 */
export function parseFutilityRule(text: string): FutilityRule | null {
  const m = text.match(/^(.+?)\s+(below|above)\s+([\d.]+)\s+at the day-(\d+)\s+interim/i);
  if (!m) return null;
  return {
    measure: m[1].trim(),
    direction: m[2].toLowerCase() as "below" | "above",
    threshold: Number(m[3]),
    day: Number(m[4]),
  };
}

export type InterimReview = {
  day: number;
  name: string;
  authorityToStop: boolean;
  /** The charter's futility sentence, verbatim. */
  ruleText: string;
  rule: FutilityRule;
  /** What the measure read at the interim. */
  measured: number;
  measuredDisplay: string;
  /** Whether the stop rule fired. */
  fired: boolean;
  outcome: string;
  reviewedAt: string;
  reviewer: string;
  /**
   * The S18 dissent this review point exists because of, where there is one.
   * A review point that appeared from nowhere is a review point nobody owns.
   */
  tracesTo: { member: string; position: string; resolution: string } | null;
};

export type InterimInput = {
  charter: TrialCharter;
  verdict: CommitteeVerdict;
  measured: number;
  measuredDisplay: string;
  reviewedAt: string;
  reviewer: string;
};

/**
 * Evaluate the interim. NULL where the charter has no review point with
 * authority to stop, or no futility rule this can read — an interim that was
 * never authorised must not be reported as having run.
 */
export function evaluateInterim(input: InterimInput): InterimReview | null {
  const { charter, verdict, measured } = input;

  const rule = parseFutilityRule(charter.stops.futility);
  if (!rule) return null;

  const point = charter.reviewPoints.find((p) => p.day === rule.day && p.authorityToStop);
  if (!point) return null;

  const fired = rule.direction === "below" ? measured < rule.threshold : measured > rule.threshold;

  /**
   * The dissent that put this review point in the charter. Matched on the day
   * the dissent asked for, and only where the committee ACCEPTED it — a
   * dissent that was heard and rejected did not create anything.
   */
  const tracesTo =
    verdict.dissent.find((d) => d.accepted && new RegExp(`day-?\\s?${rule.day}\\b`).test(d.position)) ?? null;

  return {
    day: point.day,
    name: point.name,
    authorityToStop: point.authorityToStop,
    ruleText: charter.stops.futility,
    rule,
    measured,
    measuredDisplay: input.measuredDisplay,
    fired,
    outcome: softenCertainty(
      fired
        ? `${rule.measure} read ${input.measuredDisplay}, ${rule.direction} the ${rule.threshold} bound. The stop rule fired and the trial was halted at day ${rule.day}.`
        : `${rule.measure} read ${input.measuredDisplay} against a ${rule.threshold} bound. The stop rule was evaluated and did not fire; the trial continued to day ${charter.scope.days}.`
    ),
    reviewedAt: input.reviewedAt,
    reviewer: input.reviewer,
    tracesTo: tracesTo
      ? { member: tracesTo.member, position: tracesTo.position, resolution: tracesTo.resolution }
      : null,
  };
}
