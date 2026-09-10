import type { Evidence } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type { SelfDeclaration } from "@/lib/schemas/score";
import { evaluateAll } from "@/lib/engine/evidence";
import { legacyGateToItemId } from "@/lib/engine/item-bank";

/**
 * Coverage fixtures — the states the engines can produce that nothing reached.
 *
 * A missing fixture is not a missing feature, but an unreachable state is an
 * undemonstrable one: the engine handles it, the harness asserts it, and a
 * viewer clicking through the product never sees it. These seed the remaining
 * card verdicts and the evidence edge cases onto tools that already exist,
 * rather than inventing a tool per state.
 *
 * Allocation, so each tool tells one story:
 *   chestxr      DEPLOYABLE — everything clears
 *   ovareserve   TRIAL_ONLY — a gate nobody could establish
 *   symptombot   NOT_DEPLOYABLE_IN_CONTEXT — a gate at zero
 *   embryograde  the evidence edge cases: an expired licence, an unbound file
 */

const AT = "2026-09-15T00:00:00.000Z";

function ctx(over: Partial<SubmissionContext>): SubmissionContext {
  return {
    entity: { name: "Demo vendor", verified: true, conflictsDeclared: [] },
    buildStatus: "DEPLOYABLE_BUILD",
    exactClaim: "Screens for a condition and informs a clinician.",
    outOfScope: [],
    path: "PUBLIC_PROCUREMENT",
    careLevel: "PHC",
    operatorCadre: "STAFF_NURSE",
    geography: "Tamil Nadu",
    deploymentModes: ["OPD_QUEUE"],
    population: { ageRange: "18+", sex: "ALL", geography: "Tamil Nadu" },
    autonomyLevel: "INFORMS",
    ...over,
  };
}

type Seed = {
  id: string;
  itemRefs: string[];
  type: Evidence["type"];
  independence: Evidence["independence"];
  name: string;
  documentDate: string;
  validUntil?: string | null;
  limitation: string | null;
};

function ev(submissionId: string, s: Seed): Evidence {
  return {
    id: s.id,
    submissionId,
    itemRefs: s.itemRefs,
    type: s.type,
    independence: s.independence,
    name: s.name,
    provenance: {
      generatedBy: "Partner organisation",
      fundedBy: "Programme budget",
      population: { setting: "primary health centre", cadre: "staff nurse", sampleN: null, dateFrom: s.documentDate, dateTo: s.documentDate },
      documentDate: s.documentDate,
      validUntil: s.validUntil ?? null,
    },
    limitation: s.limitation,
    generalisability: { limited: false, reason: null },
    expired: false,
  };
}

const G = (g: string) => legacyGateToItemId(g)!;
const ALL_GATES = ["G1","G2","G3","G4","G17","G5","G6","G7","G8","G9","G10","G11","G12","G13","G14","G15","G16"];

// ═════════════════════════════════════════════════════════════════════════
// chestxr · DEPLOYABLE — everything clears
// ═════════════════════════════════════════════════════════════════════════

export const CHESTXR_CONTEXT = ctx({
  entity: { name: "ChestXR Labs", verified: true, conflictsDeclared: [] },
  exactClaim: "Triages chest X-rays for tuberculosis and informs a clinician, at PHC level.",
  outOfScope: ["Paediatric imaging", "Diagnosis without confirmatory testing"],
  programmeLine: "NTEP tuberculosis case finding",
  geography: "Salem district, Tamil Nadu",
});

export const CHESTXR_DECLARATION: SelfDeclaration = {
  submissionId: "sub-chestxr",
  gateAnswers: Object.fromEntries(ALL_GATES.map((g) => [g, 2])) as SelfDeclaration["gateAnswers"],
  clarificationAnswers: [],
};

export const CHESTXR_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-chestxr", { id: "ev-chestxr-validation", itemRefs: [G("G1"), G("G17")], type: "VALIDATION_STUDY", independence: "INDEPENDENT", name: "Multi-centre validation including Indian sites", documentDate: "2026-01-20", limitation: null }),
    ev("sub-chestxr", { id: "ev-chestxr-cdsco", itemRefs: [G("G4")], type: "REGULATORY", independence: "INDEPENDENT", name: "CDSCO licence", documentDate: "2025-11-04", validUntil: "2028-11-04", limitation: null }),
    ev("sub-chestxr", { id: "ev-chestxr-eval", itemRefs: [G("G2"), G("G3"), G("G8")], type: "STUDY", independence: "PARTNER_GENERATED", name: "Clinical evaluation report", documentDate: "2026-02-11", limitation: null }),
    ev("sub-chestxr", { id: "ev-chestxr-dpdp", itemRefs: [G("G14"), G("G15")], type: "AUDIT", independence: "INDEPENDENT", name: "DPDP posture and residency audit", documentDate: "2026-03-02", limitation: null }),
    ev("sub-chestxr", { id: "ev-chestxr-integration", itemRefs: [G("G12"), G("G13"), G("G16")], type: "INTEGRATION_SPEC", independence: "PARTNER_GENERATED", name: "Integration and export specification", documentDate: "2026-02-25", limitation: null }),
    ev("sub-chestxr", { id: "ev-chestxr-field", itemRefs: [G("G5"), G("G6"), G("G7"), G("G9"), G("G10"), G("G11")], type: "FIELD_LOG", independence: "PARTNER_GENERATED", name: "PHC field evaluation", documentDate: "2026-04-08", limitation: null }),
  ],
  CHESTXR_CONTEXT,
  new Date(AT)
);

// ═════════════════════════════════════════════════════════════════════════
// ovareserve · TRIAL_ONLY — a gate nobody could establish
// ═════════════════════════════════════════════════════════════════════════

/**
 * TRIAL_ONLY comes from a gate that is UNSCORED, not one that failed. The
 * vendor left G16 unanswered and no document speaks to it, so the assessment
 * cannot say either way — and an unestablished gate caps the verdict rather
 * than sinking it. This is the distinction the whole scoring model rests on and
 * nothing reached it before.
 */
export const OVARESERVE_CONTEXT = ctx({
  entity: { name: "OvaReserve Diagnostics", verified: true, conflictsDeclared: [] },
  exactClaim: "Predicts ovarian reserve from hormone panels and informs a fertility clinician.",
  outOfScope: ["Embryo selection", "Use outside a fertility service"],
  path: "PRIVATE_INVESTMENT",
  careLevel: "PRIVATE_SECONDARY",
  operatorCadre: "CLINICIAN",
  geography: "Bengaluru, Karnataka",
});

export const OVARESERVE_DECLARATION: SelfDeclaration = {
  submissionId: "sub-ovareserve",
  // Note the absence of G16 — not a zero, an unanswered question.
  gateAnswers: Object.fromEntries(
    ALL_GATES.filter((g) => g !== "G16").map((g) => [g, 2])
  ) as SelfDeclaration["gateAnswers"],
  clarificationAnswers: [],
};

export const OVARESERVE_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-ovareserve", { id: "ev-ovareserve-validation", itemRefs: [G("G1"), G("G17")], type: "VALIDATION_STUDY", independence: "INDEPENDENT", name: "External cohort validation", documentDate: "2026-01-15", limitation: "Local calibration still pending." }),
    ev("sub-ovareserve", { id: "ev-ovareserve-manual", itemRefs: [G("G2"), G("G3"), G("G10")], type: "TRAINING_CURRICULUM", independence: "VENDOR_GENERATED", name: "Clinician user manual", documentDate: "2026-02-02", limitation: "Describes intended use; no competence data." }),
  ],
  OVARESERVE_CONTEXT,
  new Date(AT)
);

// ═════════════════════════════════════════════════════════════════════════
// symptombot · NOT_DEPLOYABLE_IN_CONTEXT — a gate at zero
// ═════════════════════════════════════════════════════════════════════════

/**
 * A v2 card, not the legacy path. G14 is at zero — no consent basis for a
 * patient-facing triage chat — and a gate at zero forces the verdict whatever
 * surrounds it. Everything else here is respectable, which is the point: this
 * is what "no averaging out of a gate" looks like on a real card.
 */
export const SYMPTOMBOT_CONTEXT = ctx({
  entity: { name: "SymptomBot Health", verified: false, conflictsDeclared: [] },
  exactClaim: "Lets patients self-triage symptoms over chat and recommends a level of care to seek.",
  outOfScope: ["Emergency presentations", "Paediatric use", "Any diagnostic claim"],
  careLevel: "PHC",
  operatorCadre: "PATIENT",
  deploymentModes: ["HOME_VISIT"],
  autonomyLevel: "RECOMMENDS",
  geography: "Not yet specified",
});

export const SYMPTOMBOT_DECLARATION: SelfDeclaration = {
  submissionId: "sub-symptombot",
  gateAnswers: {
    G1: 1, G2: 1, G3: 1, G4: 1, G17: 1,
    G5: 2, G6: 2, G7: 2,
    G8: 1, G9: 2, G10: 2, G11: 1,
    G12: 2, G13: 1,
    // The zero. No informed-consent basis on file for a patient-facing tool.
    G14: 0,
    G15: 1, G16: 0,
  },
  clarificationAnswers: [],
};

export const SYMPTOMBOT_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-symptombot", { id: "ev-symptombot-eval", itemRefs: [G("G2"), G("G8")], type: "STUDY", independence: "VENDOR_GENERATED", name: "Internal evaluation", documentDate: "2026-01-09", limitation: "Internal only — not an independent study." }),
    ev("sub-symptombot", { id: "ev-symptombot-dpdp", itemRefs: [G("G15")], type: "AUDIT", independence: "VENDOR_GENERATED", name: "DPDP privacy policy", documentDate: "2026-02-14", limitation: "Consent basis for patient-initiated use is not established." }),
  ],
  SYMPTOMBOT_CONTEXT,
  new Date(AT)
);

// ═════════════════════════════════════════════════════════════════════════
// embryograde · the evidence edge cases
// ═════════════════════════════════════════════════════════════════════════

export const EMBRYOGRADE_CONTEXT = ctx({
  entity: { name: "EmbryoGrade AI", verified: true, conflictsDeclared: ["Co-authored the validation study with the trial site"] },
  exactClaim: "Grades blastocysts from time-lapse imaging and recommends transfer ranking to an embryologist.",
  outOfScope: ["Ovarian stimulation", "Genetic screening"],
  path: "PRIVATE_INVESTMENT",
  careLevel: "PRIVATE_TERTIARY",
  operatorCadre: "SPECIALIST",
  geography: "Bengaluru, Karnataka",
});

export const EMBRYOGRADE_DECLARATION: SelfDeclaration = {
  submissionId: "sub-embryograde",
  gateAnswers: Object.fromEntries(ALL_GATES.map((g) => [g, g === "G4" ? 1 : 2])) as SelfDeclaration["gateAnswers"],
  clarificationAnswers: [],
};

export const EMBRYOGRADE_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-embryograde", { id: "ev-embryograde-validation", itemRefs: [G("G1"), G("G17")], type: "VALIDATION_STUDY", independence: "PARTNER_GENERATED", name: "Multi-centre IVF validation", documentDate: "2025-09-30", limitation: "Co-authored with the trial site." }),
    /**
     * EXPIRED. The licence was real and has lapsed. `computeExpiry` marks it,
     * and a card cannot rest on a document whose own validity ran out — which
     * is a different finding from never having had one.
     */
    ev("sub-embryograde", { id: "ev-embryograde-cdsco", itemRefs: [G("G4")], type: "REGULATORY", independence: "INDEPENDENT", name: "CDSCO licence — Class C", documentDate: "2024-03-01", validUntil: "2026-03-01", limitation: null }),
    /**
     * UNBOUND. Filed, openable, and pointing at nothing — so it counts for
     * nothing, everywhere. The rule has been enforced since Phase 1 and could
     * not be shown until the schema stopped forbidding the state the upload
     * screen could already produce.
     */
    ev("sub-embryograde", { id: "ev-embryograde-unbound", itemRefs: [], type: "STUDY", independence: "VENDOR_GENERATED", name: "Time-lapse imaging white paper", documentDate: "2026-04-19", limitation: "General background; not offered against any specific item." }),
    ev("sub-embryograde", { id: "ev-embryograde-eval", itemRefs: [G("G2"), G("G3"), G("G8"), G("G14"), G("G15")], type: "STUDY", independence: "PARTNER_GENERATED", name: "Clinical evaluation report", documentDate: "2026-05-06", limitation: null }),
    ev("sub-embryograde", { id: "ev-embryograde-integration", itemRefs: [G("G12"), G("G13"), G("G16"), G("G5"), G("G6"), G("G7"), G("G9"), G("G10"), G("G11")], type: "INTEGRATION_SPEC", independence: "VENDOR_GENERATED", name: "Integration and operations pack", documentDate: "2026-05-20", limitation: null }),
  ],
  EMBRYOGRADE_CONTEXT,
  new Date("2026-09-15T00:00:00.000Z")
);
