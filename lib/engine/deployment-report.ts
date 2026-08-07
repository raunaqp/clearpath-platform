/**
 * Deployment report engine (BUILD_SPEC §8) — the auto-generated evaluation
 * scorecard + SCALE/EXTEND/STOP recommendation, and a default handover
 * ownership plan. Pure & deterministic (no clock/random) so the Report and
 * Handover phases produce stable output.
 */

import type { Deployment, OwnershipPlan, Recommendation, ScorecardLine, TrialEndpoint } from "@/lib/schemas/deployment";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import { softenCertainty } from "./soften-certainty";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Build the 5-line scorecard + recommendation from the pilot's evidence:
 * clinical/workflow track the tool's own dimension scores; referral reflects
 * whether a referral-gap alert is open; cost/equity are calibrated pilot
 * defaults. Recommendation: ≥85 SCALE · ≥65 EXTEND · else STOP.
 */
export function buildScorecard(
  dep: Deployment,
  card: ToolReadinessCard | null
): { scorecard: ScorecardLine[]; recommendation: Recommendation } {
  const d1 = card?.dimensionScores.D1 ?? 75;
  const d3 = card?.dimensionScores.D3 ?? 75;
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
 * Trial "analysis" output — study endpoints (vs the deployment operational
 * scorecard). Deterministic; the follow-up endpoint reflects an open referral
 * gap. Recommendation: all met → SCALE · one short → EXTEND · else STOP.
 */
export function buildTrialEndpoints(
  dep: Deployment
): { endpoints: TrialEndpoint[]; recommendation: Recommendation } {
  const hasReferralGap = dep.alerts.some((a) => /referral/i.test(a.title));
  const endpoints: TrialEndpoint[] = [
    { name: "Sensitivity for referable findings", kind: "primary", target: "≥ 0.85", result: "0.90", met: true },
    { name: "Specificity", kind: "primary", target: "≥ 0.80", result: "0.86", met: true },
    { name: "Follow-up / referral completion", kind: "secondary", target: "≥ 80%", result: hasReferralGap ? "63%" : "86%", met: !hasReferralGap },
    { name: "Time to referral", kind: "secondary", target: "≤ 14 days", result: "11 days", met: true },
  ];
  const met = endpoints.filter((e) => e.met).length;
  const decision = met === endpoints.length ? "SCALE" : met >= endpoints.length - 1 ? "EXTEND" : "STOP";
  const rationale = softenCertainty(
    decision === "SCALE"
      ? "All study endpoints met; likely suitable to move from trial toward wider use."
      : decision === "EXTEND"
        ? "Primary endpoints met but a secondary endpoint fell short; likely worth extending the trial to close the gap."
        : "Key endpoints not met; likely best to stop and revisit before continuing."
  );
  return { endpoints, recommendation: { decision, rationale } };
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
