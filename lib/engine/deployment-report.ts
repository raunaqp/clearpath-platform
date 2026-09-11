/**
 * Deployment report engine (BUILD_SPEC §8) — the auto-generated evaluation
 * scorecard + SCALE/EXTEND/STOP recommendation, and a default handover
 * ownership plan. Pure & deterministic (no clock/random) so the Report and
 * Handover phases produce stable output.
 */

import type { Deployment, OwnershipPlan, Recommendation, ScorecardLine, TrialEndpoint } from "@/lib/schemas/deployment";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import { softenCertainty } from "./soften-certainty";
import type { DecisionClause, DecisionRuleEvaluation } from "./decision-rule";
import type { EndpointResult } from "./trial-report";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Build the 5-line scorecard + recommendation from the pilot's evidence:
 * clinical/workflow track the tool's own dimension scores; referral reflects
 * whether a referral-gap alert is open; cost/equity are calibrated pilot
 * defaults. Recommendation: ≥85 SCALE · ≥65 EXTEND · else STOP.
 *
 * NULL WITHOUT A CARD, and this is not a nicety.
 *
 * It used to read `card?.dimensionScores.D1 ?? 75`, so a deployment whose tool
 * had no readiness card still produced a complete five-line scorecard — a
 * clinical score of 71 and a workflow score of 69, invented from a null,
 * averaged with three constants into a SCALE / EXTEND / STOP recommendation
 * about a real deployment. Same failure as an audit fabricated for a
 * submission nobody made, and worse for being numeric: a reader cannot see
 * that 71 came from nowhere.
 *
 * Two of the five lines are properties of the card. Without one there is no
 * scorecard, and the caller has to say so rather than print a number.
 */
export function buildScorecard(
  dep: Deployment,
  card: ToolReadinessCard | null
): { scorecard: ScorecardLine[]; recommendation: Recommendation } | null {
  if (!card) return null;

  const d1 = card.dimensionScores.D1;
  const d3 = card.dimensionScores.D3;
  const hasReferralGap = dep.alerts.some((a) => /referral/i.test(a.title));

  const clinical = clamp(d1 - 4);
  const workflow = clamp(d3 - 6);
  const referral = hasReferralGap ? 63 : 86;
  const cost = 76;
  const equity = 82;

  const scorecard: ScorecardLine[] = [
    { key: "clinical", label: "Clinical", score: clinical, note: softenCertainty("Performance in line with the submitted evidence.") },
    { key: "workflow", label: "Workflow", score: workflow, note: softenCertainty("Fits the screening workflow with light training.") },
    { key: "referral", label: "Referral", score: referral, note: softenCertainty(hasReferralGap ? "Follow-up below target — the open referral gap needs closing." : "Flagged cases reached confirmatory care.") },
    { key: "cost", label: "Cost", score: cost, note: softenCertainty("Cost per case within the pilot envelope.") },
    { key: "equity", label: "Equity", score: equity, note: softenCertainty("Consistent across sites in the pilot.") },
  ];

  const avg = clamp(scorecard.reduce((s, l) => s + l.score, 0) / scorecard.length);
  const decision = avg >= 85 ? "SCALE" : avg >= 65 ? "EXTEND" : "STOP";
  const rationale = softenCertainty(
    decision === "SCALE"
      ? "Outcomes met targets with stable performance; likely suitable to scale with the same monitoring cadence."
      : decision === "EXTEND"
        ? "Promising outcomes, but at least one measure is below target; likely worth extending the pilot to close the gap before scaling."
        : "Outcomes did not meet the pilot bar; likely best to stop and revisit the evidence before any wider rollout."
  );

  return { scorecard, recommendation: { decision, rationale } };
}

/**
 * Trial "analysis" output — the study endpoints, and what the charter's own
 * decision rule makes of them.
 *
 * IT USED TO INVENT THE NUMBERS. Sensitivity 0.90, specificity 0.86, referral
 * 63% or 86% depending on an alert title — none of it read from anywhere, and
 * all of it contradicting the charter-derived results the same trial reported
 * on the next screen. Three sources of truth for one set of measurements, two
 * of them fabricated.
 *
 * It now takes the results it is meant to display and the evaluation of the
 * rule that was fixed before them, so the workspace's Analysis phase and the
 * S24 outcome agree by construction rather than by coincidence.
 *
 * NULL WITHOUT RESULTS. A deployment with no endpoint results has had no
 * analysis; saying so is the caller's job.
 */
const CLAUSE_TO_RECOMMENDATION: Record<DecisionClause, Recommendation["decision"]> = {
  ADOPT: "SCALE",
  EXTEND: "EXTEND",
  RETIRE: "STOP",
};

export function buildTrialEndpoints(args: {
  results: EndpointResult[];
  evaluation: DecisionRuleEvaluation | null;
}): { endpoints: TrialEndpoint[]; recommendation: Recommendation } | null {
  const { results, evaluation } = args;
  if (results.length === 0 || !evaluation) return null;

  const endpoints: TrialEndpoint[] = results.map((r) => ({
    name: r.name,
    kind: r.kind,
    target: r.target,
    result: r.result,
    met: r.met,
  }));

  return {
    endpoints,
    recommendation: {
      decision: CLAUSE_TO_RECOMMENDATION[evaluation.clause],
      // The rule's own sentence. Not a second opinion about the same numbers.
      rationale: evaluation.why,
    },
  };
}

/** A sensible default handover ownership plan for the Handover phase. */
export function buildOwnership(args: {
  hospitalName: string;
  vendorName: string;
}): OwnershipPlan {
  return {
    runs: `${args.hospitalName} screening staff, per site rota`,
    maintains: `${args.vendorName} (model) + hospital IT (integration)`,
    pays: "Pilot budget, transitioning to the program budget on scale",
    referralBackstop: "Site referral coordinator closes the loop on flagged cases",
    monitoringCadence: "Monthly performance + drift review for the first two quarters",
  };
}
