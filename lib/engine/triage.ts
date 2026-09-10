/**
 * S16 — triage. A short, cheap, high-mortality screen.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MOST SUBMISSIONS SHOULD DIE HERE, CORRECTLY
 * ─────────────────────────────────────────────────────────────────────────
 * This is the mechanism that removes most intake volume, and hiding it hides
 * why a hospital can afford to run a real audit on the few that survive. Four
 * questions, each answerable in minutes from records the site already holds —
 * no document reading, no scoring, no meeting.
 *
 * Each finding is reported SEPARATELY. A single triage score would hide which
 * question failed, and the question that failed is the entire content of a
 * decline: "not on our register" and "no colposcopy pathway" send a vendor to
 * completely different places.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TRIAGE READS. IT DOES NOT CREATE.
 * ─────────────────────────────────────────────────────────────────────────
 * The site profile (S13) and the problem register (S14) are the site's own
 * records, authored before any tool arrived. If a hospital has no register, the
 * first question has NO ANSWER — and that is modelled as UNANSWERABLE, which
 * blocks advancing. It is deliberately not a silent pass: a site that has never
 * written down its priorities cannot be said to have found a match against
 * them, and letting it through would let the whole chronology argument collapse
 * into a formality.
 */

import type { DeploymentRequest } from "@/lib/schemas/handoff";
import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import type { ProblemRegister, SiteOperatingProfile } from "@/lib/schemas/site-profile";
import { CARE_LEVEL_SHORT, DEPLOYMENT_MODE_LABEL, OPERATOR_CADRE_LABEL } from "@/lib/schemas/context";
import { getItem } from "./item-bank";
import { softenCertainty } from "./soften-certainty";

export type TriageCheckKey =
  | "problem_fit"
  | "context_validity"
  | "infrastructure_floor"
  | "conditions_satisfiable";

/**
 * `unanswerable` is NOT a fail. A fail is "we looked and it does not hold"; an
 * unanswerable is "we have no record to look at". They send the hospital to
 * different work — one declines a request, the other says go and publish a
 * register — so they are never collapsed.
 */
export type TriageStatus = "pass" | "fail" | "unanswerable";

export type TriageCheck = {
  key: TriageCheckKey;
  question: string;
  status: TriageStatus;
  finding: string;
};

export type TriageOutcome = "ADVANCE" | "PARK" | "DECLINE";

export type TriageAssessment = {
  checks: TriageCheck[];
  /** True only when all four passed. */
  canAdvance: boolean;
  /** Why advancing is unavailable, when it is. */
  blockedBy: TriageCheckKey[];
};

export type TriageInput = {
  request: DeploymentRequest;
  card: ReadinessCard;
  profile: SiteOperatingProfile | undefined;
  register: ProblemRegister | undefined;
};

export function runTriage(input: TriageInput): TriageAssessment {
  const { request, card, profile, register } = input;
  const ctx = card.context;
  const checks: TriageCheck[] = [];

  // ── 1 · Problem fit ─────────────────────────────────────────────────────
  if (!register) {
    checks.push({
      key: "problem_fit",
      question: "Does this map to a ranked entry on our problem register?",
      status: "unanswerable",
      finding: softenCertainty(
        "This site has not published a problem register, so there is nothing to map the claim against. The question cannot be answered and the request cannot advance — publishing a register is the work here, not declining this request."
      ),
    });
  } else {
    const entry = register.entries.find((e) => e.id === request.problemRegisterEntryId);
    checks.push({
      key: "problem_fit",
      question: "Does this map to a ranked entry on our problem register?",
      status: entry ? "pass" : "fail",
      finding: softenCertainty(
        entry
          ? `Register #${entry.rank} of ${register.entries.length}, ${entry.name.toLowerCase()}.`
          : "Nothing on our register matches the claim. The request addresses something we have not ranked."
      ),
    });
  }

  // ── 2 · Context validity ────────────────────────────────────────────────
  // Does the card's context sit INSIDE what we run? A card is valid only in the
  // context it was issued for, so a site that does not contain that context
  // cannot rely on the verdict however good it is.
  const levelOk = profile?.careLevels.includes(ctx.careLevel) ?? false;
  const cadreOk = profile?.cadres.includes(ctx.operatorCadre) ?? false;
  const modesOk = ctx.deploymentModes.every((m) => profile?.deploymentModes.includes(m)) ?? false;
  checks.push({
    key: "context_validity",
    question: "Does the card's context sit inside ours?",
    status: !profile ? "unanswerable" : levelOk && cadreOk && modesOk ? "pass" : "fail",
    finding: softenCertainty(
      !profile
        ? "This site has not baselined an operating profile, so there is nothing to contain the card's context."
        : levelOk && cadreOk && modesOk
          ? `Card ${CARE_LEVEL_SHORT[ctx.careLevel]} / ${OPERATOR_CADRE_LABEL[ctx.operatorCadre]} / ${ctx.deploymentModes.map((m) => DEPLOYMENT_MODE_LABEL[m]).join(" and ")}; we run that.`
          : [
              !levelOk ? `we do not operate at ${CARE_LEVEL_SHORT[ctx.careLevel]} level` : null,
              !cadreOk ? `we do not staff a ${OPERATOR_CADRE_LABEL[ctx.operatorCadre]} for this` : null,
              !modesOk ? "we do not run the deployment modes the card assumes" : null,
            ]
              .filter(Boolean)
              .join("; ")
              .replace(/^./, (c) => c.toUpperCase()) + ". The card is not valid here."
    ),
  });

  // ── 3 · Infrastructure floor ────────────────────────────────────────────
  // The request's STATED requirements against our MEASURED baseline. Not a
  // judgement about the tool — a comparison of two written records.
  const infra = profile?.infrastructure;
  const needsOffline = request.devices.offlineCapture || ctx.deploymentModes.includes("CAMP");
  const offlineOk = !needsOffline || (infra?.offlineCaptureSupported ?? false);
  const referral = referralPathwayFor(ctx.exactClaim);
  const referralOk = !referral || (infra?.referralPathways.includes(referral) ?? false);
  const bits: string[] = [];
  if (infra) {
    if (needsOffline) bits.push(`offline capture ${infra.offlineCaptureSupported ? "supported" : "not supported"}`);
    if (referral) bits.push(`${referral} pathway ${referralOk ? "present" : "absent"}`);
  }
  checks.push({
    key: "infrastructure_floor",
    question: "Do the stated requirements clear our measured baseline?",
    status: !infra ? "unanswerable" : offlineOk && referralOk ? "pass" : "fail",
    finding: softenCertainty(
      !infra
        ? "No baselined profile to compare the requirements against."
        : `${bits.join(", ")}.${!referralOk && referral ? " A positive flag would have nowhere to go." : ""}`
    ),
  });

  // ── 4 · Conditions satisfiable ──────────────────────────────────────────
  // Can WE supply the scaffolding? A condition the innovator owns is not our
  // problem at triage; a condition needing something from us is.
  const trialBlocking = card.conditions.filter((c) => c.blocks === "TRIAL");
  const fromUs = request.conditionPlans.filter(
    (p) => !/innovator/i.test(p.suppliedBy)
  );
  const gate = (itemId: string) => getItem(itemId)?.legacyGateId ?? itemId;
  checks.push({
    key: "conditions_satisfiable",
    question: "Can we supply the scaffolding the open conditions need?",
    status: trialBlocking.length === 0 ? "pass" : "fail",
    finding: softenCertainty(
      card.conditions.length === 0
        ? "No open conditions."
        : trialBlocking.length === 0
          ? `${card.conditions.map((c) => gate(c.itemId)).join(", ")} ${card.conditions.length === 1 ? "does" : "do"} not block a supervised trial. ${fromUs.length === 0 ? "Nothing is required from us." : `${fromUs.length} ${fromUs.length === 1 ? "plan needs" : "plans need"} something from us.`}`
          : `${trialBlocking.map((c) => gate(c.itemId)).join(", ")} ${trialBlocking.length === 1 ? "blocks" : "block"} a trial and must be cleared before anything starts.`
    ),
  });

  const blockedBy = checks.filter((c) => c.status !== "pass").map((c) => c.key);
  return { checks, canAdvance: blockedBy.length === 0, blockedBy };
}

/**
 * Which referral pathway a claim implies. Keyword-based, as in matching — the
 * item bank still has no field for it, D1.A being four unauthored stubs.
 */
function referralPathwayFor(claim: string): string | null {
  const c = claim.toLowerCase();
  if (c.includes("colposcopy")) return "colposcopy";
  if (c.includes("ophthalmology") || c.includes("retinopathy")) return "ophthalmology";
  if (c.includes("tuberculosis")) return "TB confirmatory";
  return null;
}

export const TRIAGE_OUTCOME_LABEL: Record<TriageOutcome, string> = {
  ADVANCE: "Advance to audit",
  PARK: "Park with a revisit date",
  DECLINE: "Decline with reason",
};
