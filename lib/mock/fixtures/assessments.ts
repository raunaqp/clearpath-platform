/**
 * v2 assessment fixtures — contexts, evidence and self-declarations for the
 * five Phase 1 demo submissions, plus the assembly that turns them into a
 * scored set the engines can run over.
 *
 * The AI's item scores live in `ai-assessment.ts` behind `getAiAssessment`, so
 * the model hook stays swappable. This file holds everything that is NOT the
 * model: what the vendor claimed, what documents exist, and where the tool is
 * being deployed.
 *
 * Every evidence id referenced by a citation in `ai-assessment.ts` resolves to
 * a record here. `scripts/phase1-acceptance.ts` asserts that, because a
 * citation pointing at nothing passes the groundedness check while grounding
 * nothing.
 */

import type { Evidence } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type { ItemScore, SelfDeclaration } from "@/lib/schemas/score";
import { getAiAssessment, type AssessmentKey } from "./ai-assessment";

/** Fixed clock, so fixtures do not drift with the calendar. */
export const ASSESSMENT_DATE = "2026-09-09T00:00:00.000Z";

// ═════════════════════════════════════════════════════════════════════════
// Contexts
// ═════════════════════════════════════════════════════════════════════════

/**
 * The golden trace's context. NeoScan POC-Hb is being deployed for antenatal
 * anaemia screening at a district hospital, operated by ANMs, in camps and the
 * OPD queue, recommending a referral rather than deciding one.
 *
 * The card that comes out is valid HERE. The same device, the same evidence,
 * pointed at a sub-centre with no operator would need its own card.
 */
export const NEOSCAN_CONTEXT: SubmissionContext = {
  entity: { name: "NeoScan Devices", verified: true, conflictsDeclared: [] },
  buildStatus: "DEPLOYABLE_BUILD",
  exactClaim:
    "Measures haemoglobin at the point of care and recommends referral for " +
    "antenatal anaemia, in pregnant women screened by an ANM.",
  outOfScope: ["Paediatric use", "Diagnosis of anaemia subtype"],
  path: "PUBLIC_PROCUREMENT",
  careLevel: "DISTRICT_HOSPITAL",
  operatorCadre: "ANM",
  programmeLine: "Anaemia Mukt Bharat — antenatal screening",
  geography: "Punjab",
  deploymentModes: ["CAMP", "OPD_QUEUE"],
  population: {
    ageRange: "15-49",
    sex: "FEMALE",
    pregnancyStatus: "Pregnant, any trimester",
    comorbidity: "None required",
    geography: "Rural Punjab — community outreach catchment",
  },
  autonomyLevel: "RECOMMENDS",
};

/** A generic public-procurement PHC context for the routing fixtures. */
const PHC_CONTEXT: SubmissionContext = {
  entity: { name: "Demo vendor", verified: false, conflictsDeclared: [] },
  buildStatus: "DEPLOYABLE_BUILD",
  exactClaim: "Screens for a condition at PHC level and informs a clinician.",
  outOfScope: [],
  path: "PUBLIC_PROCUREMENT",
  careLevel: "PHC",
  operatorCadre: "STAFF_NURSE",
  programmeLine: "General screening",
  geography: "Punjab",
  deploymentModes: ["OPD_QUEUE"],
  population: {
    ageRange: "18+",
    sex: "ALL",
    geography: "Rural Punjab",
  },
  autonomyLevel: "INFORMS",
};

export const ASSESSMENT_CONTEXTS: Record<AssessmentKey, SubmissionContext> = {
  neoscan: NEOSCAN_CONTEXT,
  "auto-issue": PHC_CONTEXT,
  "low-confidence": PHC_CONTEXT,
  "ungrounded-gate": PHC_CONTEXT,
  clarification: PHC_CONTEXT,
};

// ═════════════════════════════════════════════════════════════════════════
// Evidence
// ═════════════════════════════════════════════════════════════════════════

type EvSeed = {
  id: string;
  itemRefs: string[];
  type: Evidence["type"];
  independence: Evidence["independence"];
  name: string;
  generatedBy: string;
  fundedBy: string;
  setting: string;
  cadre: string;
  sampleN: number | null;
  dateFrom: string;
  dateTo: string;
  documentDate: string;
  validUntil?: string | null;
};

/**
 * `generalisability` and `expired` are placeholders here and are OVERWRITTEN
 * by `evaluateAll()` against the submission context. A vendor never authors
 * either field — they are findings, not claims.
 */
function toEvidence(submissionId: string, s: EvSeed): Evidence {
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
        dateFrom: s.dateFrom,
        dateTo: s.dateTo,
      },
      documentDate: s.documentDate,
      validUntil: s.validUntil ?? null,
    },
    // Routing fixtures exist to exercise the routing rule, not the evidence
    // form; a stated limitation is not what is under test there.
    limitation: null,
    generalisability: { limited: false, reason: null },
    expired: false,
  };
}

const NEOSCAN_EVIDENCE: EvSeed[] = [
  {
    // TRIPS THE GENERALISABILITY FLAG, deliberately and on both axes.
    // Generated at a private tertiary hospital with lab technicians running
    // the device; deployed at a district hospital with ANMs running it in
    // camps. Hospital-population evidence, community deployment. It is still
    // the best validation evidence on file and it is still accepted — it is
    // flagged, and an assessor decides what it is worth here.
    id: "ev-neoscan-validation",
    itemRefs: ["D1.B.01", "D1.C.01", "D1.C.03"],
    type: "VALIDATION_STUDY",
    independence: "INDEPENDENT",
    name: "Multi-centre validation against venous CBC",
    generatedBy: "Independent academic consortium",
    fundedBy: "Public research grant",
    setting: "private tertiary hospital",
    cadre: "lab technician",
    sampleN: 1240,
    dateFrom: "2025-01-10",
    dateTo: "2025-08-30",
    documentDate: "2025-11-02",
  },
  {
    id: "ev-neoscan-field",
    itemRefs: ["D1.B.01", "D1.C.02", "D2.B.01", "D3.A.01", "D3.B.01", "D3.C.01", "D3.D.01"],
    type: "FIELD_LOG",
    independence: "PARTNER_GENERATED",
    name: "Camp field evaluation, 14 camp days",
    generatedBy: "District health society",
    fundedBy: "State programme budget",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: 612,
    dateFrom: "2026-02-03",
    dateTo: "2026-04-18",
    documentDate: "2026-05-20",
  },
  {
    id: "ev-neoscan-manual",
    itemRefs: ["D1.C.01", "D1.C.02"],
    type: "AUDIT",
    independence: "VENDOR_GENERATED",
    name: "Device manual and documented failure modes",
    generatedBy: "NeoScan",
    fundedBy: "NeoScan",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: null,
    dateFrom: "2026-01-01",
    dateTo: "2026-01-01",
    documentDate: "2026-01-15",
  },
  {
    id: "ev-neoscan-fairness",
    itemRefs: ["D1.C.03"],
    type: "STUDY",
    independence: "INDEPENDENT",
    name: "Subgroup performance analysis (skin tone, trimester, age)",
    generatedBy: "Independent academic consortium",
    fundedBy: "Public research grant",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: 480,
    dateFrom: "2025-06-01",
    dateTo: "2026-01-31",
    documentDate: "2026-03-04",
  },
  {
    // Sets the card's expiry: this licence lapses before the 12-month default,
    // so the card cannot outlive its own legal basis.
    id: "ev-neoscan-cdsco",
    itemRefs: ["D1.D.01"],
    type: "REGULATORY",
    independence: "INDEPENDENT",
    name: "CDSCO licence — point-of-care haemoglobin",
    generatedBy: "CDSCO",
    fundedBy: "n/a",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: null,
    dateFrom: "2024-04-01",
    dateTo: "2024-04-01",
    documentDate: "2024-04-12",
    validUntil: "2027-03-31",
  },
  {
    id: "ev-neoscan-programme",
    itemRefs: ["D2.A.01"],
    type: "AUDIT",
    independence: "PARTNER_GENERATED",
    name: "State programme priority note — antenatal anaemia",
    generatedBy: "Department of Health",
    fundedBy: "State programme budget",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: null,
    dateFrom: "2026-01-01",
    dateTo: "2026-01-01",
    documentDate: "2026-01-20",
  },
  {
    id: "ev-neoscan-sla",
    itemRefs: ["D2.C.01", "D4.C.01"],
    type: "SLA",
    independence: "VENDOR_GENERATED",
    name: "Service agreement — ownership, term and exit",
    generatedBy: "NeoScan",
    fundedBy: "NeoScan",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: null,
    dateFrom: "2026-01-01",
    dateTo: "2026-01-01",
    documentDate: "2026-02-01",
  },
  {
    id: "ev-neoscan-training",
    itemRefs: ["D3.A.01"],
    type: "TRAINING_CURRICULUM",
    independence: "VENDOR_GENERATED",
    name: "ANM half-day training curriculum and competence checklist",
    generatedBy: "NeoScan",
    fundedBy: "NeoScan",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: 38,
    dateFrom: "2026-02-01",
    dateTo: "2026-02-28",
    documentDate: "2026-03-10",
  },
  {
    id: "ev-neoscan-integration",
    itemRefs: ["D4.C.02", "D4.D.01"],
    type: "INTEGRATION_SPEC",
    independence: "VENDOR_GENERATED",
    name: "Integration specification and reporting interface",
    generatedBy: "NeoScan",
    fundedBy: "NeoScan",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: null,
    dateFrom: "2026-01-01",
    dateTo: "2026-01-01",
    documentDate: "2026-02-14",
  },
  {
    id: "ev-neoscan-consent",
    itemRefs: ["D4.E.01"],
    type: "CONSENT_ARTEFACT",
    independence: "VENDOR_GENERATED",
    name: "Patient consent form — antenatal screening, Punjabi and Hindi",
    generatedBy: "NeoScan",
    fundedBy: "NeoScan",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: null,
    dateFrom: "2026-01-01",
    dateTo: "2026-01-01",
    documentDate: "2026-02-02",
  },
  {
    id: "ev-neoscan-dpdp",
    itemRefs: ["D4.F.01"],
    type: "AUDIT",
    independence: "PARTNER_GENERATED",
    name: "DPDP posture and data-residency audit",
    generatedBy: "Independent security auditor",
    fundedBy: "NeoScan",
    setting: "district hospital",
    cadre: "ANM",
    sampleN: null,
    dateFrom: "2026-03-01",
    dateTo: "2026-03-31",
    documentDate: "2026-04-08",
  },
];

/**
 * The routing fixtures need documents bound to the right items and nothing
 * more — their content is not what is under test, the routing rule is. Built
 * from a compact table so the binding stays obvious.
 *
 * The three D4 items at the end of each set are deliberately left WITHOUT
 * evidence, which is what puts them outside both routing denominators. See the
 * note in ai-assessment.ts.
 */
const ROUTING_BINDINGS: Array<[suffix: string, itemRefs: string[], type: Evidence["type"], name: string]> = [
  ["validation", ["D1.B.01", "D1.C.01", "D1.C.03"], "VALIDATION_STUDY", "Validation study"],
  ["manual", ["D1.C.01", "D1.C.02"], "AUDIT", "Device manual and failure modes"],
  ["cdsco", ["D1.D.01"], "REGULATORY", "CDSCO licence"],
  ["programme", ["D2.A.01"], "AUDIT", "Programme priority note"],
  ["field", ["D1.C.02", "D2.B.01", "D3.B.01", "D3.C.01", "D3.D.01"], "FIELD_LOG", "Field evaluation log"],
  ["sla", ["D2.C.01", "D4.C.01"], "SLA", "Service agreement"],
  ["training", ["D3.A.01"], "TRAINING_CURRICULUM", "Training curriculum"],
  ["integration", ["D4.C.02"], "INTEGRATION_SPEC", "Integration specification"],
  ["consent", ["D4.E.01"], "CONSENT_ARTEFACT", "Patient consent artefact"],
  ["dpdp", ["D4.F.01"], "AUDIT", "DPDP and residency audit"],
];

function routingEvidence(prefix: string, only?: string[]): EvSeed[] {
  return ROUTING_BINDINGS.filter(([suffix]) => !only || only.includes(suffix)).map(
    ([suffix, itemRefs, type, name]) => ({
      id: `ev-${prefix}-${suffix}`,
      itemRefs,
      type,
      independence: "PARTNER_GENERATED" as const,
      name,
      generatedBy: "Partner organisation",
      fundedBy: "Programme budget",
      setting: "primary health centre",
      cadre: "staff nurse",
      sampleN: null,
      dateFrom: "2026-01-01",
      dateTo: "2026-06-30",
      documentDate: "2026-07-15",
    })
  );
}

// Each routing fixture binds evidence to exactly 14 items (11 for the
// clarification fixture), which sets the denominator size the target rates
// are computed against.
const AUTO_EVIDENCE = routingEvidence("auto", [
  "validation", "cdsco", "programme", "field", "sla", "training", "integration",
]);
const LOWCONF_EVIDENCE = routingEvidence("lowconf", [
  "validation", "manual", "cdsco", "programme", "field", "sla", "training", "integration",
]);
const UNG_EVIDENCE = routingEvidence("ung", [
  "validation", "cdsco", "programme", "field", "sla", "training", "integration",
]);
const CLAR_EVIDENCE = routingEvidence("clar", [
  "validation", "manual", "cdsco", "programme", "field", "training", "integration", "consent", "dpdp",
]);

export const ASSESSMENT_EVIDENCE: Record<AssessmentKey, Evidence[]> = {
  neoscan: NEOSCAN_EVIDENCE.map((s) => toEvidence("sub-neoscan", s)),
  "auto-issue": AUTO_EVIDENCE.map((s) => toEvidence("sub-auto-issue", s)),
  "low-confidence": LOWCONF_EVIDENCE.map((s) => toEvidence("sub-low-confidence", s)),
  "ungrounded-gate": UNG_EVIDENCE.map((s) => toEvidence("sub-ungrounded-gate", s)),
  clarification: CLAR_EVIDENCE.map((s) => toEvidence("sub-clarification", s)),
};

// ═════════════════════════════════════════════════════════════════════════
// Self-declarations — the vendor's 17-gate answers
// ═════════════════════════════════════════════════════════════════════════

/** NeoScan's own answers. Honest, except for the export gate. */
export const NEOSCAN_DECLARATION: SelfDeclaration = {
  submissionId: "sub-neoscan",
  gateAnswers: {
    G1: 2, G2: 2, G3: 2, G4: 2, G17: 2,
    G5: 2, G6: 2, G7: 2,
    G8: 2, G9: 2, G10: 2, G11: 2,
    // The vendor believes a PDF summary on request counts as portability.
    // The assessment does not. This is the one doc-versus-claim gap here.
    G12: 2, G13: 2, G14: 2, G15: 2, G16: 2,
  },
  clarificationAnswers: [],
};

/**
 * The clarification fixture's vendor claims EVERYTHING at "system-owned"
 * while the evidence reaches 0 on five gates and 1 on six more. Eleven
 * discrepancies, ranked, capped at five questions.
 */
export const CLARIFICATION_DECLARATION: SelfDeclaration = {
  submissionId: "sub-clarification",
  gateAnswers: {
    // Claimed at "system-owned" WITH a document on file that reaches 0.
    // Gap of 2 against evidence that exists — the five most material
    // discrepancies, and the five that get asked about.
    G1: 2, G3: 2, G6: 2, G13: 2, G14: 2,
    // Claimed at "system-owned" with a document that reaches 1. Gap of 1.
    G2: 2, G17: 2, G4: 2, G5: 2, G10: 2, G15: 2,
    // Claimed at "requires support" with nothing assessed against them.
    // Still discrepancies — a claim with nothing behind it — but a smaller
    // gap, so they rank below the contradicted ones rather than above.
    G7: 1, G8: 1, G9: 1, G11: 1, G12: 1, G16: 1,
  },
  clarificationAnswers: [],
};

/**
 * The same declaration after the vendor answers the five questions. The
 * answers are pointers to documents, which is all a clarification can be — an
 * answer is not evidence and never moves a LEVEL, only the confidence with
 * which the item was read. See routing.ts.
 */
export const CLARIFICATION_ANSWERED: SelfDeclaration = {
  ...CLARIFICATION_DECLARATION,
  /**
   * ANSWERS FOLLOW THE QUESTIONS, not the other way round.
   *
   * These are keyed to the five the ranking actually asks. When the -20
   * answerability penalty was removed the ranking changed, and answers to
   * questions nobody asks lift nothing — G3 and G6 dropped out, G11 and G12
   * came in. Leaving the old keys in place would have made the recompute look
   * weaker than it is for a reason that has nothing to do with the evidence.
   */
  clarificationAnswers: [
    { questionId: "q-G1", answer: "Section 4 of the attached study is the independent arm, run by the district health society rather than by us.", answeredAt: ASSESSMENT_DATE },
    { questionId: "q-G11", answer: "The field log's week-3 onward rows are nurses choosing to run it before the camp queue builds; nobody asked them to.", answeredAt: ASSESSMENT_DATE },
    { questionId: "q-G12", answer: "Clause 7 of the service agreement: images and reads are the district's, and we hold them as processor only.", answeredAt: ASSESSMENT_DATE },
    { questionId: "q-G13", answer: "Integration spec appendix B is the export path; it was mislabelled as import in the contents page.", answeredAt: ASSESSMENT_DATE },
    { questionId: "q-G14", answer: "The consent artefact covers screening generally; the antenatal-specific wording is in the annexure.", answeredAt: ASSESSMENT_DATE },
  ],
};

const GENERIC_DECLARATION = (submissionId: string): SelfDeclaration => ({
  submissionId,
  gateAnswers: {
    G1: 2, G2: 2, G3: 2, G4: 2, G17: 2,
    G5: 2, G6: 2, G7: 2,
    G8: 2, G9: 2, G10: 2, G11: 2,
    G12: 2, G13: 2, G14: 2, G15: 2, G16: 2,
  },
  clarificationAnswers: [],
});

export const ASSESSMENT_DECLARATIONS: Record<AssessmentKey, SelfDeclaration> = {
  neoscan: NEOSCAN_DECLARATION,
  "auto-issue": GENERIC_DECLARATION("sub-auto-issue"),
  "low-confidence": GENERIC_DECLARATION("sub-low-confidence"),
  "ungrounded-gate": GENERIC_DECLARATION("sub-ungrounded-gate"),
  clarification: CLARIFICATION_DECLARATION,
};

// ═════════════════════════════════════════════════════════════════════════
// Assembly
// ═════════════════════════════════════════════════════════════════════════

/**
 * Build the ItemScore map for a fixture. No assessor has looked at these and
 * nothing is adjudicated, so every item resolves off its AI score — which is
 * exactly the state a submission is in when routing decides whether a human
 * needs to.
 */
export function buildScores(toolKey: AssessmentKey): Map<string, ItemScore> {
  const map = new Map<string, ItemScore>();
  for (const aiScore of getAiAssessment(toolKey)) {
    map.set(aiScore.itemId, {
      itemId: aiScore.itemId,
      aiScore,
      assessorScores: [],
      adjudicated: null,
    });
  }
  return map;
}

export type AssessmentFixture = {
  key: AssessmentKey;
  submissionId: string;
  context: SubmissionContext;
  evidence: Evidence[];
  selfDeclaration: SelfDeclaration;
  scores: Map<string, ItemScore>;
};

export function getAssessmentFixture(key: AssessmentKey): AssessmentFixture {
  return {
    key,
    submissionId: `sub-${key}`,
    context: ASSESSMENT_CONTEXTS[key],
    evidence: ASSESSMENT_EVIDENCE[key],
    selfDeclaration: ASSESSMENT_DECLARATIONS[key],
    scores: buildScores(key),
  };
}
