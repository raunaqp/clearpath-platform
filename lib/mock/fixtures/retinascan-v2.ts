/**
 * RetinaScan — the submission that routes to HUMAN REVIEW.
 *
 * Seeded deliberately rather than left to fall out of placeholder provenance.
 * The demo needs a case where a perfectly reasonable submission is held for an
 * assessor, and it needs to be held for a REASON a vendor can act on: three of
 * its five open conditions have no document bound to them at all.
 *
 * Nothing here is a failure. RetinaScan fails no gate. Three gates simply have
 * NOTHING ON FILE — fairness across subgroups, whether it runs in the site's
 * real conditions, and whether data can be got back out — so the assessment
 * cannot say either way about any of them. That is exactly the situation a
 * person should look at, and exactly the situation a threshold should not
 * resolve on its own.
 *
 * It is also why the card reads TRIAL_ONLY rather than a conditional pass. An
 * unestablished gate caps the verdict; it does not sink it. Before the
 * declaration fallback was removed these three resolved from the vendor's own
 * answers and the card read CONDITIONALLY_DEPLOYABLE — a conditional pass on
 * three gates nobody had evidence for.
 */

import type { Evidence } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type { SelfDeclaration } from "@/lib/schemas/score";
import { evaluateAll } from "@/lib/engine/evidence";
import { legacyGateToItemId } from "@/lib/engine/item-bank";

export const RETINASCAN_TOOL_SLUG = "retinascan";
export const RETINASCAN_TOOL_VERSION = "RetinaScan 1.8";
export const RETINASCAN_MODEL_VERSION = "retina-dr-2026.03";
export const RETINASCAN_ISSUED_AT = "2026-09-15T00:00:00.000Z";

export const RETINASCAN_CONTEXT: SubmissionContext = {
  entity: { name: "RetinaScan Systems", verified: true, conflictsDeclared: [] },
  buildStatus: "DEPLOYABLE_BUILD",
  exactClaim:
    "Detects referable diabetic retinopathy from fundus images and flags for " +
    "ophthalmology referral, in diabetic adults screened at PHC level by a staff nurse.",
  outOfScope: ["Glaucoma", "Paediatric retinopathy", "Diagnosis without ophthalmologist confirmation"],
  path: "PUBLIC_PROCUREMENT",
  careLevel: "PHC",
  operatorCadre: "STAFF_NURSE",
  programmeLine: "NP-NCD diabetic retinopathy screening",
  geography: "Nashik district, Maharashtra",
  deploymentModes: ["OPD_QUEUE"],
  population: {
    ageRange: "40-70",
    sex: "ALL",
    comorbidity: "Diagnosed type 2 diabetes",
    geography: "Nashik district, Maharashtra",
  },
  autonomyLevel: "RECOMMENDS",
};

/** The existing 17-gate fixture on the 0-2 ladder. Five gates at 1, none at 0. */
export const RETINASCAN_DECLARATION: SelfDeclaration = {
  submissionId: "sub-retinascan",
  gateAnswers: {
    G1: 1, G2: 2, G3: 2, G4: 2,
    // Fairness across skin tones is still firming up — and nothing is on file.
    G17: 1,
    G5: 2,
    // Fundus camera access at PHC is not fully proven — and nothing is on file.
    G6: 1,
    G7: 2,
    G8: 2, G9: 2, G10: 1, G11: 2,
    G12: 2,
    // Export format to confirm — and nothing is on file.
    G13: 1,
    G14: 2, G15: 2, G16: 2,
  },
  clarificationAnswers: [],
};

type Seed = {
  id: string;
  itemRefs: string[];
  type: Evidence["type"];
  independence: Evidence["independence"];
  name: string;
  generatedBy: string;
  /** Who paid. Distinct from who produced it — a funder is a conflict surface. */
  fundedBy?: string;
  setting: string;
  cadre: string;
  sampleN: number | null;
  documentDate: string;
  dateFrom?: string;
  dateTo?: string;
  validUntil?: string | null;
  limitation: string | null;
  path?: string;
};

function toEvidence(s: Seed): Evidence {
  return {
    id: s.id,
    submissionId: "sub-retinascan",
    itemRefs: s.itemRefs,
    type: s.type,
    independence: s.independence,
    name: s.name,
    ...(s.path ? { path: s.path } : {}),
    provenance: {
      generatedBy: s.generatedBy,
      fundedBy: s.fundedBy ?? s.generatedBy,
      population: {
        setting: s.setting,
        cadre: s.cadre,
        sampleN: s.sampleN,
        dateFrom: s.documentDate,
        dateTo: s.documentDate,
      },
      documentDate: s.documentDate,
      validUntil: s.validUntil ?? null,
    },
    limitation: s.limitation,
    generalisability: { limited: false, reason: null },
    expired: false,
  };
}

/**
 * Note what is NOT here: nothing bound to fairness (G17), operability (G6) or
 * export (G13). Those three gates come back UNSCORED, and the assessment run
 * holds the submission for an assessor on exactly that set.
 *
 * The rest is a normal operational file — a district that has actually run the
 * thing. Without it the hole would have been ten gates wide and "held for
 * three specific reasons" would have been a fiction.
 */
const SEEDS: Seed[] = [
  {
    id: "ev-retinascan-validation",
    itemRefs: [legacyGateToItemId("G1")!, legacyGateToItemId("G2")!],
    type: "VALIDATION_STUDY",
    independence: "PARTNER_GENERATED",
    name: "Predicate-based validation study",
    generatedBy: "Regional eye institute",
    setting: "private tertiary hospital",
    cadre: "specialist",
    sampleN: 2100,
    documentDate: "2026-04-22",
    limitation:
      "Fundus images captured and read at a tertiary eye institute. It does not " +
      "cover image quality from a PHC camera operated by a staff nurse.",
    path: "/sample-docs/retinascan-validation-study.pdf",
  },
  {
    // Filed and bound to the regulatory gate. RetinaScan's remaining gaps are
    // about BINDINGS, not missing documents — which is what makes it resolvable
    // by clarification rather than by a new submission.
    id: "ev-retinascan-cdsco",
    itemRefs: [legacyGateToItemId("G4")!],
    type: "REGULATORY",
    independence: "INDEPENDENT",
    name: "CDSCO licence — diabetic retinopathy screening",
    generatedBy: "CDSCO",
    setting: "primary health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-02-18",
    validUntil: "2028-02-18",
    limitation: null,
    path: "/sample-docs/retinascan-dpdp-policy.pdf",
  },
  {
    id: "ev-retinascan-dpdp",
    itemRefs: [legacyGateToItemId("G14")!, legacyGateToItemId("G15")!],
    type: "AUDIT",
    independence: "VENDOR_GENERATED",
    name: "DPDP privacy policy",
    generatedBy: "RetinaScan Systems",
    setting: "primary health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-06-30",
    limitation: "States the policy. It is not an independent audit of the controls it describes.",
    path: "/sample-docs/retinascan-dpdp-policy.pdf",
  },
  {
    id: "ev-retinascan-manual",
    itemRefs: [legacyGateToItemId("G10")!, legacyGateToItemId("G3")!],
    type: "TRAINING_CURRICULUM",
    independence: "VENDOR_GENERATED",
    name: "User manual and operator training",
    generatedBy: "RetinaScan Systems",
    setting: "primary health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-05-14",
    limitation:
      "Describes the intended training. No competence data from operators who " +
      "have completed it.",
    path: "/sample-docs/retinascan-user-manual.pdf",
  },
  {
    id: "ev-retinascan-field",
    itemRefs: [
      legacyGateToItemId("G5")!,
      legacyGateToItemId("G8")!,
      legacyGateToItemId("G9")!,
      legacyGateToItemId("G11")!,
    ],
    type: "FIELD_LOG",
    independence: "PARTNER_GENERATED",
    name: "NP-NCD screening clinic field log",
    generatedBy: "District Health Society, Nashik",
    fundedBy: "State programme budget",
    setting: "primary health centre",
    cadre: "staff nurse",
    sampleN: 880,
    documentDate: "2026-07-22",
    dateFrom: "2026-04-06",
    dateTo: "2026-07-10",
    limitation:
      "880 screenings across five PHCs: referral actions taken on a flag, " +
      "time per case against the pre-tool baseline, and how many patients " +
      "reached ophthalmology. One district, one screening season.",
  },
  {
    id: "ev-retinascan-sla",
    itemRefs: [legacyGateToItemId("G7")!, legacyGateToItemId("G12")!],
    type: "SLA",
    independence: "PARTNER_GENERATED",
    name: "Service agreement and exit terms",
    generatedBy: "District Health Society, Nashik",
    fundedBy: "State programme budget",
    setting: "primary health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-06-19",
    validUntil: "2028-06-18",
    limitation:
      "Executed agreement: the district owns the fundus images and the reads, " +
      "and data is returned within 30 days of termination. It says nothing " +
      "about the FORMAT that data comes back in.",
  },
  {
    id: "ev-retinascan-dashboard",
    itemRefs: [legacyGateToItemId("G16")!],
    type: "INTEGRATION_SPEC",
    independence: "PARTNER_GENERATED",
    name: "District performance dashboard specification",
    generatedBy: "State HMIS integration team",
    fundedBy: "State programme budget",
    setting: "primary health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-08-05",
    limitation:
      "A read-only view the district opens itself: screening volume, flag " +
      "rate and referral completion. Not routed through the vendor. Referral " +
      "outcomes depend on the ophthalmology unit reporting back.",
  },
];

export const RETINASCAN_EVIDENCE: Evidence[] = evaluateAll(
  SEEDS.map(toEvidence),
  RETINASCAN_CONTEXT,
  new Date(RETINASCAN_ISSUED_AT)
);
