import type { GateStatus } from "@/lib/schemas/gate";
import type { ToolGateId } from "@/lib/engine/gates";

/**
 * Seed gate answers per tool. These are the raw questionnaire outputs from
 * Journey A — the engine (`runToolAssessment`) turns them into the cards, so
 * the demo verdicts are genuinely COMPUTED, not hard-coded.
 *
 * Verdict rule reminder: any fail → NOT YET · else any partial → CONDITIONS ·
 * else DEPLOY.
 */
// Partial: a tool answers the D2 variant for its buyer (public G5–G7 or private
// GP1–GP5), so not every gate id is present in every map.
export type ToolGateAnswers = Partial<Record<ToolGateId, GateStatus>>;

/** CerviAI → CONDITIONS. Strong tool; two things to firm up — India-population
 *  validation (G1, dimension D1) and DPDP residency (G15, dimension D4). No
 *  fails. Gives D1 = 88 and D4 = 90, matching the demo story. */
export const CERVIAI_ANSWERS: ToolGateAnswers = {
  G1: "partial", // validated abroad; India-population study underway
  G2: "pass",
  G3: "pass",
  G4: "pass",
  G17: "pass", // fairness/bias assessed (BODH)
  G5: "pass",
  G6: "pass", // operable in camp conditions
  G7: "pass",
  G8: "pass",
  G9: "pass",
  G10: "pass",
  G11: "pass",
  G12: "pass",
  G13: "pass",
  G14: "pass",
  G15: "partial", // DPDP residency to confirm
  G16: "pass",
};

/** ChestXR-TB → DEPLOY. All 17 gates clear. */
export const CHESTXR_ANSWERS: ToolGateAnswers = {
  G1: "pass",
  G2: "pass",
  G3: "pass",
  G4: "pass",
  G17: "pass",
  G5: "pass",
  G6: "pass",
  G7: "pass",
  G8: "pass",
  G9: "pass",
  G10: "pass",
  G11: "pass",
  G12: "pass",
  G13: "pass",
  G14: "pass",
  G15: "pass",
  G16: "pass",
};

/** SymptomBot → NOT YET. Patient-facing with weak evidence, no safe-fail, no
 *  realistic human-in-the-loop, no consent basis, no performance visibility. */
export const SYMPTOMBOT_ANSWERS: ToolGateAnswers = {
  G1: "fail", // no independent validation
  G2: "fail", // no override / failure modes documented
  G3: "fail", // no realistic human-in-the-loop (autonomous chat)
  G4: "partial",
  G17: "fail", // no fairness/bias evaluation
  G5: "partial",
  G6: "partial",
  G7: "pass",
  G8: "partial", // returns a suggestion, weakly actionable
  G9: "pass",
  G10: "pass",
  G11: "partial",
  G12: "partial",
  G13: "partial",
  G14: "fail", // no informed-consent basis
  G15: "partial",
  G16: "fail", // no direct performance visibility
};

/** RetinaScan → CONDITIONS. Firm up validation, real-world operability,
 *  learnability, and export. No fails. */
export const RETINASCAN_ANSWERS: ToolGateAnswers = {
  G1: "partial", // predicate exists; local validation firming up
  G2: "pass",
  G3: "pass",
  G4: "pass",
  G17: "partial", // fairness across skin tones firming up
  G5: "pass",
  G6: "partial", // fundus camera access at PHC not fully proven
  G7: "pass",
  G8: "pass",
  G9: "pass",
  G10: "partial", // needs operator training
  G11: "pass",
  G12: "pass",
  G13: "partial", // export format to confirm
  G14: "pass",
  G15: "pass",
  G16: "pass",
};

/** EmbryoGrade AI → CONDITIONS. Strong specialty tool; local validation and
 *  export interoperability still firming up. Placeholder specialty evidence.
 *  PRIVATE buyer (Lakeview): D2 uses the private variant (GP1–GP5). G5–G7 remain
 *  so placement (which reads G6) is unchanged; they no longer feed the verdict. */
export const EMBRYOGRADE_ANSWERS: ToolGateAnswers = {
  G1: "partial", // multi-centre validation abroad; local IVF-cohort study underway
  G2: "pass",
  G3: "pass",
  G4: "pass",
  G17: "partial", // fairness across clinics firming up
  G5: "pass",
  G6: "pass",
  G7: "pass",
  // D2 private variant — all cleared (preserves CONDITIONS from G1/G17/G13)
  GP1: "pass", // ROI / payback
  GP2: "pass", // liability & indemnity
  GP3: "pass", // reimbursement & billing
  GP4: "pass", // service-line fit
  GP5: "pass", // capital vs operating cost
  G8: "pass",
  G9: "pass",
  G10: "pass",
  G11: "pass",
  G12: "pass",
  G13: "partial", // EMR export format to confirm
  G14: "pass",
  G15: "pass",
  G16: "pass",
};

/** OvaReserve → CONDITIONS. Decision-support predictor; local calibration and
 *  performance visibility to firm up. Placeholder specialty evidence.
 *  PRIVATE buyer (Lakeview): D2 uses the private variant (GP1–GP5). */
export const OVARESERVE_ANSWERS: ToolGateAnswers = {
  G1: "partial", // predictor validated on external cohort; local calibration pending
  G2: "pass",
  G3: "pass",
  G4: "pass",
  G17: "pass",
  G5: "pass",
  G6: "pass",
  G7: "pass",
  // D2 private variant — all cleared (preserves CONDITIONS from G1/G16)
  GP1: "pass", // ROI / payback
  GP2: "pass", // liability & indemnity
  GP3: "pass", // reimbursement & billing
  GP4: "pass", // service-line fit
  GP5: "pass", // capital vs operating cost
  G8: "pass",
  G9: "pass",
  G10: "pass",
  G11: "pass",
  G12: "pass",
  G13: "pass",
  G14: "pass",
  G15: "pass",
  G16: "partial", // ongoing performance visibility to set up
};

/** Lookup by tool id — consumed by the store when it computes cards. */
export const TOOL_GATE_ANSWERS: Record<string, ToolGateAnswers> = {
  "tool-cerviai": CERVIAI_ANSWERS,
  "tool-chestxr": CHESTXR_ANSWERS,
  "tool-symptombot": SYMPTOMBOT_ANSWERS,
  "tool-retinascan": RETINASCAN_ANSWERS,
  "tool-embryograde": EMBRYOGRADE_ANSWERS,
  "tool-ovareserve": OVARESERVE_ANSWERS,
};
