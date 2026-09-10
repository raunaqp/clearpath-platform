/**
 * CerviAI — the Phase 2 flagship card, v1.0 and its v1.1 reissue.
 *
 * Everything on the rendered card is ENGINE OUTPUT. This file holds only the
 * three things an engine cannot invent: where the tool is being deployed, what
 * the vendor declared, and which documents are on file. Verdict, conditions,
 * blocking scope, dimension means, placement, expiry and the changelog all fall
 * out of `buildReadinessCard` / `applyRemediation`.
 *
 * The declaration is the existing 17-gate fixture, translated to the 0-2
 * ladder: partial → 1 ("requires support"), pass → 2 ("system-owned"). G1 and
 * G15 sit at 1, which is what "2 conditions" means — neither is a failure.
 */

import type { Evidence } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type { ItemScore, SelfDeclaration } from "@/lib/schemas/score";
import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import { buildReadinessCard } from "@/lib/engine/verdict";
import { applyRemediation, type RemediationResult } from "@/lib/engine/remediation";
import { makeCardId } from "@/lib/engine/card-id";
import { evaluateAll } from "@/lib/engine/evidence";
import { legacyGateToItemId } from "@/lib/engine/item-bank";
import type { ScoredSet } from "@/lib/engine/score";

export const CERVIAI_TOOL_SLUG = "cerviai";
export const CERVIAI_TOOL_VERSION = "CerviAI 2.3.1";
export const CERVIAI_MODEL_VERSION = "cerv-vision-2026.07";

/** v1.0 issue date. The card id and the expiry are both anchored to it. */
export const CERVIAI_ISSUED_AT = "2026-09-15T00:00:00.000Z";
/** v1.1 reissue date, one week later. */
export const CERVIAI_REISSUED_AT = "2026-09-22T00:00:00.000Z";

/** The G15 item — DPDP residency and security. Resolved, never hard-coded. */
export const CERVIAI_G15_ITEM = legacyGateToItemId("G15")!;
/** The G1 item — independent validation. */
export const CERVIAI_G1_ITEM = legacyGateToItemId("G1")!;

// ═════════════════════════════════════════════════════════════════════════
// Context — the card is valid HERE and nowhere else
// ═════════════════════════════════════════════════════════════════════════

export const CERVIAI_CONTEXT: SubmissionContext = {
  entity: { name: "CerviAI Health", verified: true, conflictsDeclared: [] },
  buildStatus: "DEPLOYABLE_BUILD",
  exactClaim:
    "Flags cervical abnormalities from VIA and colposcopy images for colposcopy referral, " +
    "in women 30-65 screened at CHC level by a staff nurse.",
  // Declared by the vendor BEFORE seeing a result, which is what makes an
  // exclusion worth anything.
  outOfScope: [
    "Pregnancy",
    "Post-treatment surveillance",
    "Sub-centre placement",
  ],
  path: "PUBLIC_PROCUREMENT",
  careLevel: "CHC",
  operatorCadre: "STAFF_NURSE",
  programmeLine: "NP-NCD cervical cancer screening",
  geography: "Coimbatore district, Tamil Nadu",
  // Two modes, not one: the same device in outreach camps and again in the
  // clinic queue, with the same operator.
  deploymentModes: ["CAMP", "OPD_QUEUE"],
  population: {
    ageRange: "30-65",
    sex: "FEMALE",
    pregnancyStatus: "Non-pregnant",
    comorbidity: "No prior cervical treatment",
    geography: "Coimbatore district, Tamil Nadu",
  },
  autonomyLevel: "RECOMMENDS",
};

// ═════════════════════════════════════════════════════════════════════════
// Self-declaration — the vendor's own 17-gate answers
// ═════════════════════════════════════════════════════════════════════════

export const CERVIAI_DECLARATION: SelfDeclaration = {
  submissionId: "sub-cerviai",
  gateAnswers: {
    // Validated abroad, single-centre; an India-population study is underway.
    G1: 1,
    G2: 2, G3: 2, G4: 2, G17: 2,
    G5: 2, G6: 2, G7: 2,
    G8: 2, G9: 2, G10: 2, G11: 2,
    G12: 2, G13: 2, G14: 2,
    // A secondary processing environment is hosted outside India.
    G15: 1,
    G16: 2,
  },
  clarificationAnswers: [],
};

// ═════════════════════════════════════════════════════════════════════════
// Evidence on file
// ═════════════════════════════════════════════════════════════════════════

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
  path?: string;
  /** One stated limitation. null only where the document type has none. */
  limitation: string | null;
};

/**
 * `generalisability` and `expired` are placeholders — `evaluateAll()` overwrites
 * both against the context. A vendor never authors either; they are findings.
 */
function toEvidence(s: Seed): Evidence {
  return {
    id: s.id,
    submissionId: "sub-cerviai",
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
        dateFrom: s.dateFrom ?? s.documentDate,
        dateTo: s.dateTo ?? s.documentDate,
      },
      documentDate: s.documentDate,
      validUntil: s.validUntil ?? null,
    },
    limitation: s.limitation,
    generalisability: { limited: false, reason: null },
    expired: false,
  };
}

const SEEDS: Seed[] = [
  {
    // TRIPS generalisability on both axes against a CHC / staff-nurse context:
    // a single non-Indian centre, read by specialists. It remains the strongest
    // evidence on file and it is still accepted — flagged, not discounted.
    id: "ev-cerviai-validation",
    itemRefs: [CERVIAI_G1_ITEM, legacyGateToItemId("G17")!],
    type: "VALIDATION_STUDY",
    independence: "INDEPENDENT",
    name: "Independent validation study",
    generatedBy: "University screening consortium",
    setting: "private tertiary hospital",
    cadre: "specialist",
    sampleN: 4200,
    documentDate: "2026-03-10",
    limitation:
      "Single centre, non-Indian cohort, images read by specialists. It does not " +
      "show how the tool performs when a staff nurse operates it in a camp.",
    path: "/sample-docs/cerviai-validation-study.pdf",
  },
  {
    id: "ev-cerviai-cdsco",
    itemRefs: [legacyGateToItemId("G4")!],
    type: "REGULATORY",
    independence: "INDEPENDENT",
    name: "CDSCO MD-15 licence — Class C",
    generatedBy: "CDSCO",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-01-15",
    // Runs past the card's own 12-month expiry, so the DEFAULT sets the date.
    validUntil: "2028-01-15",
    // A licence is a fact, not a finding — there is nothing for it to fail to show.
    limitation: null,
    path: "/sample-docs/cerviai-cdsco-md15.pdf",
  },
  {
    id: "ev-cerviai-dpdp",
    itemRefs: [legacyGateToItemId("G14")!, CERVIAI_G15_ITEM],
    type: "AUDIT",
    independence: "VENDOR_GENERATED",
    name: "DPDP privacy policy",
    generatedBy: "CerviAI Health",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-08-20",
    limitation:
      "A secondary processing environment is hosted outside India. The policy " +
      "states the arrangement; it does not evidence a residency control over it.",
    path: "/sample-docs/cerviai-dpdp-policy.pdf",
  },
  {
    id: "ev-cerviai-eval",
    itemRefs: [
      legacyGateToItemId("G2")!,
      legacyGateToItemId("G3")!,
      legacyGateToItemId("G8")!,
    ],
    type: "STUDY",
    independence: "VENDOR_GENERATED",
    name: "Clinical evaluation report",
    generatedBy: "CerviAI Health",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: 1150,
    documentDate: "2026-05-04",
    limitation:
      "1,150 images across two sites, analysed by the vendor. No independent " +
      "replication.",
    path: "/sample-docs/cerviai-clinical-eval-report.pdf",
  },
  {
    id: "ev-cerviai-ethics",
    itemRefs: [legacyGateToItemId("G14")!],
    type: "CONSENT_ARTEFACT",
    independence: "INDEPENDENT",
    name: "Ethics approval",
    generatedBy: "Institutional ethics committee",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-02-11",
    limitation:
      "Covers the validation study only. It is not an approval for routine " +
      "screening use.",
    path: "/sample-docs/cerviai-ethics-approval.pdf",
  },
  /**
   * ─────────────────────────────────────────────────────────────────────
   * THE OPERATIONAL FILE
   * ─────────────────────────────────────────────────────────────────────
   * Everything above is what a vendor sends to prove the tool works. What
   * follows is what a district sends back to prove it can be run — and it is
   * the half a thin submission leaves out.
   *
   * Five documents covered eight of seventeen gates, for a Class C device
   * about to see 1,000 women across four CHCs in 90 days. No hospital would
   * accept that and no serious vendor would send it; it only looked complete
   * because the engine was filling the rest in from the vendor's own answers.
   *
   * Each of these is produced or countersigned by the district, not by the
   * vendor, because that is who holds the facts. And each states what it does
   * not show — a field log that claims no limits is not more credible.
   */
  {
    // Subgroup behaviour, NOT accuracy. Deliberately a different question from
    // G1: without colposcopy-confirmed outcomes this cohort cannot establish
    // how well the tool performs, only whether it performs DIFFERENTLY across
    // groups. That is why G17 clears here and G1 stays open.
    id: "ev-cerviai-subgroup",
    itemRefs: [legacyGateToItemId("G17")!],
    type: "AUDIT",
    independence: "INDEPENDENT",
    name: "Subgroup and device-variation analysis",
    generatedBy: "Tamil Nadu State Health Society evaluation cell",
    fundedBy: "State programme budget",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: 2400,
    documentDate: "2026-07-18",
    dateFrom: "2026-02-01",
    dateTo: "2026-06-30",
    limitation:
      "Compares output rates across skin-tone band, age group and the four " +
      "colposcope models in use. No colposcopy-confirmed outcomes were " +
      "available, so it shows whether the tool behaves differently between " +
      "groups — not how accurate it is in any of them.",
  },
  {
    id: "ev-cerviai-field",
    itemRefs: [
      legacyGateToItemId("G2")!,
      legacyGateToItemId("G3")!,
      legacyGateToItemId("G5")!,
      legacyGateToItemId("G8")!,
      legacyGateToItemId("G9")!,
      legacyGateToItemId("G11")!,
    ],
    type: "FIELD_LOG",
    independence: "PARTNER_GENERATED",
    name: "CHC field evaluation log",
    generatedBy: "District Health Society, Coimbatore",
    fundedBy: "State programme budget",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: 612,
    documentDate: "2026-08-02",
    dateFrom: "2026-05-12",
    dateTo: "2026-07-25",
    limitation:
      "612 screenings across four CHCs over eleven weeks: 47 nurse overrides " +
      "and how each was resolved, referral actions taken, and time per case " +
      "against the pre-tool baseline. One district, camp-day volumes only.",
  },
  {
    id: "ev-cerviai-conditions",
    itemRefs: [legacyGateToItemId("G6")!],
    type: "FIELD_LOG",
    independence: "PARTNER_GENERATED",
    name: "Site operating-conditions survey",
    generatedBy: "District Health Society, Coimbatore",
    fundedBy: "State programme budget",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: 4,
    documentDate: "2026-06-14",
    limitation:
      "Power backup hours, mobile connectivity and colposcope availability " +
      "recorded at each of the four CHCs. Surveyed in the dry season; " +
      "monsoon connectivity is untested.",
  },
  {
    id: "ev-cerviai-sla",
    itemRefs: [legacyGateToItemId("G7")!, legacyGateToItemId("G12")!],
    type: "SLA",
    independence: "PARTNER_GENERATED",
    name: "Service agreement and exit terms",
    generatedBy: "District Health Society, Coimbatore",
    fundedBy: "State programme budget",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-06-30",
    validUntil: "2028-06-29",
    limitation:
      "Executed agreement: the district owns the images and the reads, data " +
      "returned within 30 days of termination, replacement device within 72 " +
      "hours. The replacement time is contractual and has not been tested in " +
      "service.",
  },
  {
    id: "ev-cerviai-export",
    itemRefs: [legacyGateToItemId("G13")!],
    type: "INTEGRATION_SPEC",
    independence: "PARTNER_GENERATED",
    name: "Data-flow diagram and export specification",
    generatedBy: "State HMIS integration team",
    fundedBy: "State programme budget",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-07-04",
    limitation:
      "Names every store the image and the read pass through, and specifies " +
      "CSV and HL7 export on request. Verified against the state HMIS " +
      "staging instance, not the live one.",
  },
  {
    id: "ev-cerviai-training",
    itemRefs: [legacyGateToItemId("G10")!],
    type: "TRAINING_CURRICULUM",
    independence: "PARTNER_GENERATED",
    name: "Training curriculum and competency records",
    generatedBy: "District Training Centre, Coimbatore",
    fundedBy: "State programme budget",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: 24,
    documentDate: "2026-05-08",
    limitation:
      "Six hours over two days for 24 staff nurses, with competency assessed " +
      "at the end. Initial competency only — there is no re-test at three " +
      "months, so retention is unknown.",
  },
  {
    id: "ev-cerviai-pms",
    itemRefs: [legacyGateToItemId("G16")!],
    type: "INTEGRATION_SPEC",
    independence: "PARTNER_GENERATED",
    name: "Post-market surveillance plan and district dashboard",
    generatedBy: "District Health Society, Coimbatore",
    fundedBy: "State programme budget",
    setting: "community health centre",
    cadre: "staff nurse",
    sampleN: null,
    documentDate: "2026-08-11",
    limitation:
      "A read-only dashboard the district opens itself: throughput, positive " +
      "rate and override rate, refreshed nightly and not routed through the " +
      "vendor. Outcome linkage depends on the district cancer registry, " +
      "which lags about six months.",
  },
];

export const CERVIAI_EVIDENCE: Evidence[] = evaluateAll(
  SEEDS.map(toEvidence),
  CERVIAI_CONTEXT,
  new Date(CERVIAI_ISSUED_AT)
);

/**
 * The document the vendor attaches in remediation. Bound to the G15 item — an
 * addendum filed against the submission at large would count for nothing, and
 * `applyRemediation` throws rather than quietly reissuing an unchanged card.
 */
export const CERVIAI_REMEDIATION_EVIDENCE: Evidence = toEvidence({
  id: "ev-cerviai-dpdp-addendum",
  itemRefs: [CERVIAI_G15_ITEM],
  type: "SLA",
  independence: "VENDOR_GENERATED",
  name: "DPDP data-residency addendum",
  generatedBy: "CerviAI Health",
  setting: "community health centre",
  cadre: "staff nurse",
  sampleN: null,
  documentDate: "2026-09-20",
  limitation:
    "A contractual commitment to India-resident processing. It is not an audit " +
    "of the environment it commits to.",
  path: "/sample-docs/cerviai-dpdp-policy.pdf",
});

// ═════════════════════════════════════════════════════════════════════════
// Building the cards
// ═════════════════════════════════════════════════════════════════════════

/**
 * No AI pass and no assessor has looked yet — every item resolves off the
 * vendor's own declaration, which is exactly what the demo wizard produces.
 * That is also why the card's limitations section matters: a self-declared
 * screening establishes very little on its own.
 */
export function cerviaiScoredSet(): ScoredSet {
  return {
    path: "PUBLIC",
    scores: new Map<string, ItemScore>(),
    evidence: CERVIAI_EVIDENCE,
  };
}

export const CERVIAI_CARD_ID = makeCardId(CERVIAI_TOOL_SLUG, CERVIAI_ISSUED_AT);

export function buildCerviaiCardV1(): ReadinessCard {
  return buildReadinessCard({
    id: CERVIAI_CARD_ID,
    issuedAt: CERVIAI_ISSUED_AT,
    context: CERVIAI_CONTEXT,
    toolVersion: CERVIAI_TOOL_VERSION,
    modelVersion: CERVIAI_MODEL_VERSION,
    scored: cerviaiScoredSet(),
    evidence: CERVIAI_EVIDENCE,
  });
}

/**
 * v1.1 — the residency addendum clears G15. A scoped delta: D4 is recomputed,
 * D1/D2/D3 are carried forward untouched, and the expiry does not move.
 */
export function buildCerviaiCardV11(card = buildCerviaiCardV1()): RemediationResult {
  return applyRemediation({
    card,
    scored: cerviaiScoredSet(),
    itemId: CERVIAI_G15_ITEM,
    evidence: CERVIAI_REMEDIATION_EVIDENCE,
    allEvidence: [...CERVIAI_EVIDENCE, CERVIAI_REMEDIATION_EVIDENCE],
    assessorId: "assessor-01",
    clearedToLevel: 2,
    note: "Residency addendum places all processing within India, including the secondary environment.",
    issuedAt: CERVIAI_REISSUED_AT,
  });
}
