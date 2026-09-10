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
  /** Who produced it. Not the same as who paid for it, and both are asked for. */
  generatedBy: string;
  fundedBy: string;
  setting: string;
  cadre: string;
  sampleN: number | null;
  documentDate: string;
  dateFrom?: string;
  dateTo?: string;
  validUntil?: string | null;
  /**
   * What this document does NOT show. Every evidential document has one — a
   * study, a log or an audit that claims no limits is not more credible, it is
   * less. A licence or an executed contract can legitimately carry null: it is
   * an instrument, not a finding, so there is nothing for it to fail to show.
   */
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
      generatedBy: s.generatedBy,
      fundedBy: s.fundedBy,
      population: {
        setting: s.setting,
        cadre: s.cadre,
        sampleN: s.sampleN,
        dateFrom: s.dateFrom ?? s.documentDate,
        dateTo: s.dateTo ?? s.documentDate,
      },
      documentDate: s.documentDate,
      validUntil: s.validUntil ?? null,
    },
    limitation: s.limitation,
    // Both are COMPUTED by evaluateAll against the declared context. Never
    // authored here — a fixture that set its own generalisability would be
    // asserting the answer to the question the engine exists to ask.
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

/**
 * THE BEST-EVIDENCED SUBMISSION ON THE PLATFORM, and the reference for what
 * "DEPLOYABLE" costs. Seven documents, every one of the 17 gates reached by at
 * least one that transfers to a PHC / staff-nurse deployment and is not the
 * claimant's own uncorroborated word.
 *
 * Note what that is NOT: it is not seven documents that claim everything is
 * fine. Every evidential document here states what it does not show. A
 * submission reaches DEPLOYABLE by covering the ground, not by being silent
 * about its limits.
 */
export const CHESTXR_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-chestxr", {
      id: "ev-chestxr-validation",
      itemRefs: [G("G1"), G("G17")],
      type: "VALIDATION_STUDY", independence: "INDEPENDENT",
      name: "Multi-centre validation including Indian sites",
      generatedBy: "National TB Elimination Programme evaluation cell",
      fundedBy: "Central TB Division",
      setting: "primary health centre", cadre: "staff nurse", sampleN: 18400,
      documentDate: "2026-01-20", dateFrom: "2024-11-01", dateTo: "2025-12-15",
      limitation:
        "Prospective across 22 PHCs in four states. Chest radiographs only — " +
        "it says nothing about performance on the portable units two of the " +
        "deploying districts use.",
    }),
    ev("sub-chestxr", {
      id: "ev-chestxr-cdsco",
      itemRefs: [G("G4")],
      type: "REGULATORY", independence: "INDEPENDENT",
      name: "CDSCO licence — Class B",
      generatedBy: "CDSCO", fundedBy: "Not applicable",
      setting: "primary health centre", cadre: "staff nurse", sampleN: null,
      documentDate: "2025-11-04", validUntil: "2028-11-04",
      // An instrument, not a finding. See the note on Seed.limitation.
      limitation: null,
    }),
    ev("sub-chestxr", {
      id: "ev-chestxr-eval",
      itemRefs: [G("G2"), G("G3"), G("G8")],
      type: "STUDY", independence: "PARTNER_GENERATED",
      name: "Clinical evaluation and override audit",
      generatedBy: "State TB Cell, Tamil Nadu",
      fundedBy: "State programme budget",
      setting: "primary health centre", cadre: "staff nurse", sampleN: 3100,
      documentDate: "2026-02-11", dateFrom: "2025-08-01", dateTo: "2026-01-31",
      limitation:
        "Records 214 clinician overrides and how each was resolved. Six months " +
        "of use; it does not cover what happens when a reader is new to the tool.",
    }),
    ev("sub-chestxr", {
      id: "ev-chestxr-dpdp",
      itemRefs: [G("G14"), G("G15")],
      type: "AUDIT", independence: "INDEPENDENT",
      name: "DPDP posture and residency audit",
      generatedBy: "Cert-In empanelled auditor",
      fundedBy: "ChestXR Diagnostics",
      setting: "primary health centre", cadre: "staff nurse", sampleN: null,
      documentDate: "2026-03-02", validUntil: "2027-03-02",
      limitation:
        "Confirms in-country storage and the consent notice served at " +
        "registration. Audited the configuration as at March 2026, not a " +
        "continuing control.",
    }),
    ev("sub-chestxr", {
      id: "ev-chestxr-integration",
      itemRefs: [G("G12"), G("G13"), G("G16")],
      type: "INTEGRATION_SPEC", independence: "PARTNER_GENERATED",
      name: "Integration, export and live-performance specification",
      generatedBy: "State HMIS integration team",
      fundedBy: "State programme budget",
      setting: "primary health centre", cadre: "staff nurse", sampleN: null,
      documentDate: "2026-02-25",
      limitation:
        "FHIR export and a read-only performance dashboard the district can " +
        "open itself. Verified against the state HMIS staging instance.",
    }),
    ev("sub-chestxr", {
      id: "ev-chestxr-field",
      itemRefs: [G("G5"), G("G6"), G("G9"), G("G11")],
      type: "FIELD_LOG", independence: "PARTNER_GENERATED",
      name: "PHC field evaluation — conditions and workload",
      generatedBy: "District Health Society, Salem",
      fundedBy: "State programme budget",
      setting: "primary health centre", cadre: "staff nurse", sampleN: 640,
      documentDate: "2026-04-08", dateFrom: "2026-01-06", dateTo: "2026-03-28",
      limitation:
        "Twelve weeks across six PHCs: power, connectivity, device uptime and " +
        "time-per-read against the pre-tool baseline. One district, one season.",
    }),
    ev("sub-chestxr", {
      id: "ev-chestxr-service",
      itemRefs: [G("G7"), G("G10")],
      type: "SLA", independence: "PARTNER_GENERATED",
      name: "Service agreement and training record",
      generatedBy: "District Health Society, Salem",
      fundedBy: "State programme budget",
      setting: "primary health centre", cadre: "staff nurse", sampleN: 38,
      documentDate: "2026-03-18", validUntil: "2027-03-17",
      limitation:
        "Executed agreement: 30-day data return on exit, 72-hour hardware " +
        "replacement, and 4 hours of training with competency signed off for " +
        "38 staff nurses. Replacement times are contractual, not yet observed.",
    }),
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

/**
 * Sixteen gates carried by document; G16 reached by nothing at all.
 *
 * That single hole is the whole fixture. TRIAL_ONLY comes from a gate NOBODY
 * COULD ESTABLISH, not from one that failed — `fail` stays at zero and
 * `unscored` is one. A tool can be well evidenced everywhere a reader looks
 * and still cap at a trial because of the one place nobody looked.
 *
 * G16 is "can the site see live performance independent of vendor reports?"
 * and there is genuinely nothing a vendor at this stage could file for it: the
 * clinic has no read-only instance, so the honest state is silence. Inventing
 * a dashboard specification here would be inventing a document that does not
 * exist.
 */
export const OVARESERVE_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-ovareserve", {
      id: "ev-ovareserve-validation",
      itemRefs: [G("G1"), G("G17")],
      type: "VALIDATION_STUDY", independence: "INDEPENDENT",
      name: "External cohort validation with subgroup breakdown",
      generatedBy: "Reproductive medicine research network",
      fundedBy: "Institutional research grant",
      setting: "private secondary hospital", cadre: "clinician", sampleN: 2870,
      documentDate: "2026-01-15", dateFrom: "2024-06-01", dateTo: "2025-11-30",
      limitation:
        "Three private fertility units, stratified by age band and BMI. " +
        "Local calibration to this clinic's assay platform is still pending.",
    }),
    ev("sub-ovareserve", {
      id: "ev-ovareserve-cdsco",
      itemRefs: [G("G4")],
      type: "REGULATORY", independence: "INDEPENDENT",
      name: "CDSCO licence — Class B",
      generatedBy: "CDSCO", fundedBy: "Not applicable",
      setting: "private secondary hospital", cadre: "clinician", sampleN: null,
      documentDate: "2025-08-12", validUntil: "2028-08-12",
      limitation: null,
    }),
    ev("sub-ovareserve", {
      id: "ev-ovareserve-eval",
      itemRefs: [G("G2"), G("G3"), G("G8"), G("G9"), G("G11")],
      type: "STUDY", independence: "PARTNER_GENERATED",
      name: "Clinical evaluation and consultation-time study",
      generatedBy: "Lakeview Fertility Centre clinical audit team",
      fundedBy: "Lakeview Fertility Centre",
      setting: "private secondary hospital", cadre: "clinician", sampleN: 410,
      documentDate: "2026-03-04", dateFrom: "2025-10-01", dateTo: "2026-02-20",
      limitation:
        "Records how the estimate was used in 410 consultations and the " +
        "override pathway when a clinician disagreed. Single site.",
    }),
    ev("sub-ovareserve", {
      id: "ev-ovareserve-training",
      itemRefs: [G("G10")],
      type: "TRAINING_CURRICULUM", independence: "PARTNER_GENERATED",
      name: "Clinician onboarding and competency record",
      generatedBy: "Lakeview Fertility Centre",
      fundedBy: "Lakeview Fertility Centre",
      setting: "private secondary hospital", cadre: "clinician", sampleN: 9,
      documentDate: "2026-02-02",
      limitation:
        "Two hours, nine clinicians, competency signed off at the end of the " +
        "session. No retention re-test.",
    }),
    ev("sub-ovareserve", {
      id: "ev-ovareserve-dpdp",
      itemRefs: [G("G14"), G("G15")],
      type: "AUDIT", independence: "INDEPENDENT",
      name: "DPDP consent and residency review",
      generatedBy: "Cert-In empanelled auditor",
      fundedBy: "OvaReserve Diagnostics",
      setting: "private secondary hospital", cadre: "clinician", sampleN: null,
      documentDate: "2026-02-26", validUntil: "2027-02-26",
      limitation:
        "Hormone panels held in-country; consent taken at the fertility " +
        "workup. Reviewed the configuration as at February 2026.",
    }),
    ev("sub-ovareserve", {
      id: "ev-ovareserve-service",
      itemRefs: [G("G5"), G("G6"), G("G7"), G("G12"), G("G13")],
      type: "SLA", independence: "PARTNER_GENERATED",
      name: "Service agreement, exit terms and export specification",
      generatedBy: "Lakeview Fertility Centre procurement",
      fundedBy: "Lakeview Fertility Centre",
      setting: "private secondary hospital", cadre: "clinician", sampleN: null,
      documentDate: "2026-03-11", validUntil: "2028-03-10",
      limitation:
        "Executed agreement: the clinic owns its panels, CSV and HL7 export " +
        "on request, 30-day data return on exit. Terms are contractual and " +
        "have not yet been exercised.",
    }),
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

/**
 * THE THIN SUBMISSION, and now thin for a checkable reason.
 *
 * Three documents. One of them — the CDSCO registration the whole regulatory
 * position rests on — HAS LAPSED, which puts G4 at zero, and a gate at zero
 * forces NOT_DEPLOYABLE_IN_CONTEXT whatever surrounds it. Expiry is the only
 * route to zero from documents, and it is the right one: "you had a licence
 * and it ran out" is an assessed finding, where "you sent us nothing" is an
 * absence.
 *
 * Everything else is silence. Nine gates have no document bound to them at
 * all, so the card reports them as gates it could not establish rather than
 * as failures — including consent (G14) for a patient-facing triage chat,
 * which is the gap a hospital would notice first.
 */
export const SYMPTOMBOT_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-symptombot", {
      id: "ev-symptombot-cdsco",
      itemRefs: [G("G4")],
      type: "REGULATORY", independence: "INDEPENDENT",
      name: "CDSCO registration — lapsed",
      generatedBy: "CDSCO", fundedBy: "Not applicable",
      setting: "primary health centre", cadre: "patient", sampleN: null,
      documentDate: "2023-06-01",
      // LAPSED. computeExpiry marks it against the issue date, and a card
      // cannot rest on a document whose own validity ran out.
      validUntil: "2025-06-01",
      limitation: null,
    }),
    ev("sub-symptombot", {
      id: "ev-symptombot-eval",
      itemRefs: [G("G2"), G("G8")],
      type: "STUDY", independence: "VENDOR_GENERATED",
      name: "Internal evaluation",
      generatedBy: "SymptomBot Health",
      fundedBy: "SymptomBot Health",
      setting: "primary health centre", cadre: "patient", sampleN: 900,
      documentDate: "2026-01-09", dateFrom: "2025-09-01", dateTo: "2025-12-20",
      limitation:
        "900 simulated conversations scored by the vendor's own clinicians. " +
        "No real patients and no independent replication.",
    }),
    ev("sub-symptombot", {
      id: "ev-symptombot-dpdp",
      itemRefs: [G("G15")],
      type: "AUDIT", independence: "VENDOR_GENERATED",
      name: "DPDP privacy policy",
      generatedBy: "SymptomBot Health",
      fundedBy: "SymptomBot Health",
      setting: "primary health centre", cadre: "patient", sampleN: null,
      documentDate: "2026-02-14",
      limitation:
        "States where conversation logs are stored. The consent basis for " +
        "patient-initiated use is not established anywhere on file.",
    }),
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

/**
 * The evidence edge cases, kept because each one is a state the engine has to
 * survive and nothing else in the fixtures reaches: a co-authored validation,
 * an EXPIRED licence, and a document filed against nothing at all.
 */
export const EMBRYOGRADE_EVIDENCE: Evidence[] = evaluateAll(
  [
    ev("sub-embryograde", {
      id: "ev-embryograde-validation",
      itemRefs: [G("G1"), G("G17")],
      type: "VALIDATION_STUDY", independence: "PARTNER_GENERATED",
      name: "Multi-centre IVF validation",
      generatedBy: "IVF research consortium",
      fundedBy: "EmbryoGrade AI",
      setting: "private tertiary hospital", cadre: "specialist", sampleN: 5200,
      documentDate: "2025-09-30", dateFrom: "2023-04-01", dateTo: "2025-06-30",
      limitation:
        "Co-authored with the trial site, and the vendor funded it. The " +
        "conflict is declared on the submission rather than left to be found.",
    }),
    /**
     * EXPIRED. The licence was real and has lapsed. `computeExpiry` marks it,
     * and a card cannot rest on a document whose own validity ran out — which
     * is a different finding from never having had one.
     */
    ev("sub-embryograde", {
      id: "ev-embryograde-cdsco",
      itemRefs: [G("G4")],
      type: "REGULATORY", independence: "INDEPENDENT",
      name: "CDSCO licence — Class C",
      generatedBy: "CDSCO", fundedBy: "Not applicable",
      setting: "private tertiary hospital", cadre: "specialist", sampleN: null,
      documentDate: "2024-03-01", validUntil: "2026-03-01",
      limitation: null,
    }),
    /**
     * UNBOUND. Filed, openable, and pointing at nothing — so it counts for
     * nothing, everywhere. The rule has been enforced since Phase 1 and could
     * not be shown until the schema stopped forbidding the state the upload
     * screen could already produce.
     */
    ev("sub-embryograde", {
      id: "ev-embryograde-unbound",
      itemRefs: [],
      type: "STUDY", independence: "VENDOR_GENERATED",
      name: "Time-lapse imaging white paper",
      generatedBy: "EmbryoGrade AI",
      fundedBy: "EmbryoGrade AI",
      setting: "private tertiary hospital", cadre: "specialist", sampleN: null,
      documentDate: "2026-04-19",
      limitation: "General background; not offered against any specific item.",
    }),
    ev("sub-embryograde", {
      id: "ev-embryograde-eval",
      itemRefs: [G("G2"), G("G3"), G("G8"), G("G9"), G("G11"), G("G14"), G("G15")],
      type: "STUDY", independence: "PARTNER_GENERATED",
      name: "Clinical evaluation, consent and data-handling report",
      generatedBy: "Embryology quality committee, partner network",
      fundedBy: "Partner network",
      setting: "private tertiary hospital", cadre: "specialist", sampleN: 1180,
      documentDate: "2026-05-06", dateFrom: "2025-07-01", dateTo: "2026-04-15",
      limitation:
        "Ranking advisory throughout; the embryologist selects. Covers consent " +
        "at the treatment cycle and where images are held. One network.",
    }),
    ev("sub-embryograde", {
      id: "ev-embryograde-integration",
      itemRefs: [G("G5"), G("G6"), G("G7"), G("G10"), G("G12"), G("G13"), G("G16")],
      type: "INTEGRATION_SPEC", independence: "PARTNER_GENERATED",
      name: "Integration and operations pack",
      generatedBy: "Partner network IT",
      fundedBy: "Partner network",
      setting: "private tertiary hospital", cadre: "specialist", sampleN: null,
      documentDate: "2026-05-20",
      limitation:
        "Covers image export, exit terms, incubator compatibility and the " +
        "unit's own performance view. Written against the network's current " +
        "incubator estate.",
    }),
  ],
  EMBRYOGRADE_CONTEXT,
  new Date("2026-09-15T00:00:00.000Z")
);
