/**
 * RetinaScan — the submission that routes to HUMAN REVIEW.
 *
 * Seeded deliberately rather than left to fall out of placeholder provenance.
 * The demo needs a case where a perfectly reasonable submission is held for an
 * assessor, and it needs to be held for a REASON a vendor can act on: three of
 * its five open conditions have no document bound to them at all.
 *
 * Nothing here is a failure. RetinaScan declares nothing dishonestly and fails
 * no gate. It has simply told us three things are only partly in place and
 * given us nothing to read about any of them — which is exactly the situation
 * a person should look at, and exactly the situation a threshold should not
 * resolve on its own.
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
  setting: string;
  cadre: string;
  sampleN: number | null;
  documentDate: string;
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
      fundedBy: s.generatedBy,
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
 * Three documents. Note what is NOT here: nothing bound to fairness (G17),
 * operability (G6) or export (G13) — the three gates RetinaScan itself declared
 * as only partly in place.
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
];

export const RETINASCAN_EVIDENCE: Evidence[] = evaluateAll(
  SEEDS.map(toEvidence),
  RETINASCAN_CONTEXT,
  new Date(RETINASCAN_ISSUED_AT)
);
