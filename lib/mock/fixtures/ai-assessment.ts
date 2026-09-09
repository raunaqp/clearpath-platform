/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  HONEST LIMITATION — READ THIS BEFORE PUTTING A NUMBER ON A SCREEN    ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * There is no model in the loop here. Every `confidence` value in this file is
 * A DIAL WE SET, not a measurement of anything. It was chosen to make a
 * particular routing path demonstrable, and it would be the same number if the
 * underlying evidence were twice as good or half as good.
 *
 * It must NOT be presented to a user as a property of the system — not as
 * "the assessment is 82% confident", not as a gauge, not as a trend. Until a
 * real model produces these, the only honest framing is that this is a
 * scripted demonstration of what the routing rule DOES with a confidence
 * number, not a demonstration that the platform can produce one.
 *
 * The same caveat covers `CLARIFICATION_CONFIDENCE_LIFT` in routing.ts: the
 * amount an answered clarification raises confidence is a chosen constant.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS REAL HERE
 * `citations` are real. Every evidenceId below resolves to an Evidence record
 * in `assessments.ts`, and every frameworkRef resolves to a cluster code in
 * the item bank. `scripts/phase1-acceptance.ts` asserts this. A citation that
 * points at nothing is worse than no citation at all — it passes the
 * groundedness check while grounding nothing, which defeats the one mechanism
 * that is supposed to catch a confident guess.
 *
 * Follows the swappable-fixture pattern of `getAiSuggestion` / `getBodhScore`:
 * this is the only place the data lives, so the source can be replaced with a
 * real model call without touching a consumer.
 */

import type { AiItemScore, Citation, Level } from "@/lib/schemas/score";

/** Which demo submission an assessment belongs to. */
export type AssessmentKey =
  | "neoscan"
  | "auto-issue"
  | "low-confidence"
  | "ungrounded-gate"
  | "clarification";

/**
 * Compact row: [itemId, level, confidence, evidenceIds, rationale].
 * An EMPTY evidenceIds array means UNGROUNDED, deliberately — it is the
 * mechanism under test in the "ungrounded-gate" fixture, not an omission.
 */
type Row = [string, Level, number, string[], string];

function toScores(rows: Row[]): AiItemScore[] {
  return rows.map(([itemId, level, confidence, evidenceIds, rationale]) => ({
    itemId,
    level,
    confidence,
    citations: evidenceIds.map((evidenceId): Citation => ({ evidenceId })),
    rationale,
  }));
}

// ═════════════════════════════════════════════════════════════════════════
// NeoScan POC-Hb — the golden trace
// ═════════════════════════════════════════════════════════════════════════
// Point-of-care haemoglobin with an AI mode, antenatal anaemia screening at a
// district hospital, run by ANMs in camps and the OPD queue.
//
// Every gate reaches "system-owned" EXCEPT data portability (D4.C.02 / G13):
// the hospital cannot initiate an export of its own records in a usable
// schema. Exports exist, but only on vendor request and only as a PDF, which
// is a report rather than data.
const NEOSCAN: Row[] = [
  ["D1.B.01", 2, 0.88, ["ev-neoscan-validation", "ev-neoscan-field"], "Independent multi-centre validation against venous CBC, plus an independent field evaluation."],
  ["D1.C.01", 2, 0.86, ["ev-neoscan-validation", "ev-neoscan-manual"], "Documented failure modes; the device withholds a reading below a quality threshold rather than guessing."],
  ["D1.C.02", 2, 0.84, ["ev-neoscan-field", "ev-neoscan-manual"], "The ANM confirms or overrides every flagged reading before it reaches the register; the field log shows this happening under real camp load."],
  ["D1.C.03", 2, 0.83, ["ev-neoscan-fairness"], "Subgroup analysis across skin tone, trimester and age shows no material performance gap."],
  ["D1.D.01", 2, 0.91, ["ev-neoscan-cdsco"], "CDSCO licence on file and appropriate to a point-of-care haemoglobin claim at this autonomy level."],
  ["D2.A.01", 2, 0.85, ["ev-neoscan-programme"], "Antenatal anaemia screening is an active state programme priority with a named line."],
  ["D2.B.01", 2, 0.82, ["ev-neoscan-field"], "Runs on charge in camp conditions without mains power or connectivity; the field log covers 14 camp days."],
  ["D2.C.01", 2, 0.80, ["ev-neoscan-sla"], "The SLA provides a clean contractual exit with no minimum term."],
  ["D3.A.01", 2, 0.86, ["ev-neoscan-training", "ev-neoscan-field"], "ANMs reached competence within a half-day session; the curriculum and the post-training field log agree."],
  ["D3.B.01", 2, 0.81, ["ev-neoscan-field"], "Replaces a send-away venous draw, so net workload falls rather than rises."],
  ["D3.C.01", 2, 0.84, ["ev-neoscan-field"], "Output is a haemoglobin value with a referral threshold attached, not a bare score."],
  ["D3.D.01", 2, 0.79, ["ev-neoscan-field"], "ANMs kept using it through the unsupported weeks of the evaluation."],
  ["D4.C.01", 2, 0.87, ["ev-neoscan-sla"], "The SLA confirms in writing that the hospital retains ownership of its records."],
  // THE FAILING GATE. Ownership is contractually granted, but the hospital
  // cannot exercise it without asking the vendor, which is not portability.
  ["D4.C.02", 1, 0.85, ["ev-neoscan-integration"], "No hospital-initiated export of its own records in a usable schema. The integration spec offers a vendor-generated PDF summary on request; that is a report, not data the hospital can move."],
  ["D4.D.01", 2, 0.80, ["ev-neoscan-integration"], "A read-only performance dashboard is available to the site independently of vendor reports."],
  ["D4.E.01", 2, 0.82, ["ev-neoscan-consent"], "Consent artefact covers the antenatal screening use and is available in the local language."],
  ["D4.F.01", 2, 0.86, ["ev-neoscan-dpdp"], "Storage is India-resident and the security posture is documented against DPDP expectations."],
];

// ═════════════════════════════════════════════════════════════════════════
// (a) AUTO_ISSUE — the card issues with no human involvement
// ═════════════════════════════════════════════════════════════════════════
// Confidence mean 0.84 across 14 items in the denominator.
//
// NOTE ON GROUNDEDNESS: the spec asks for ~0.79 here. That is not reachable
// while the item bank is 95/112 stubs. Every ACTIVE item is a gate, so any
// ungrounded item is by definition an ungrounded GATE, which is an absolute
// bar. A groundedness below 1.0 therefore cannot coexist with AUTO_ISSUE. It
// ships at 1.00 and the routing decision — the thing the fixture exists to
// demonstrate — is unaffected. See the Phase 1 report.
const AUTO_ISSUE: Row[] = [
  ["D1.B.01", 2, 0.90, ["ev-auto-validation"], "Independent validation on an Indian cohort."],
  ["D1.C.01", 2, 0.88, ["ev-auto-validation"], "Failure modes documented with a clinician override."],
  ["D1.C.02", 2, 0.87, ["ev-auto-field"], "Human-in-the-loop step observed under real caseload."],
  ["D1.C.03", 2, 0.86, ["ev-auto-validation"], "Subgroup fairness assessed, no material gap."],
  ["D1.D.01", 2, 0.86, ["ev-auto-cdsco"], "Regulatory position clear for the intended use."],
  ["D2.A.01", 2, 0.85, ["ev-auto-programme"], "Addresses a prioritised programme line."],
  ["D2.B.01", 2, 0.84, ["ev-auto-field"], "Operable in real site conditions."],
  ["D2.C.01", 2, 0.84, ["ev-auto-sla"], "Clean contractual exit."],
  ["D3.A.01", 2, 0.83, ["ev-auto-training"], "Light training to competence."],
  ["D3.B.01", 2, 0.82, ["ev-auto-field"], "Net workload flat or lighter."],
  ["D3.C.01", 2, 0.82, ["ev-auto-field"], "Output maps to a clinical action."],
  ["D3.D.01", 2, 0.81, ["ev-auto-field"], "Sustained use after support tapered."],
  ["D4.C.01", 2, 0.80, ["ev-auto-sla"], "Hospital retains ownership."],
  ["D4.C.02", 2, 0.78, ["ev-auto-integration"], "Hospital-initiated export in a standard schema."],
  // OUT OF THE ROUTING DENOMINATOR. No evidence is bound to these three items
  // in assessments.ts, so both means skip them — an item with nothing attached
  // is never counted as confident OR grounded. Their citations are empty for
  // the same reason: nothing is attached, so there is nothing to cite. They are
  // skipped before the grounded check, so they do not register as ungrounded
  // gates either.
  ["D4.D.01", 2, 0.85, [], "Direct performance visibility."],
  ["D4.E.01", 2, 0.85, [], "Consent basis appropriate to the data use."],
  ["D4.F.01", 2, 0.85, [], "India-resident storage, DPDP-aligned controls."],
];

// ═════════════════════════════════════════════════════════════════════════
// (b) HUMAN_REVIEW on LOW CONFIDENCE — the confidence condition fires alone
// ═════════════════════════════════════════════════════════════════════════
// Confidence mean 0.58 across 14 items. Everything is cited, so groundedness
// passes and no gate is ungrounded: exactly one condition fails, which is what
// this fixture is for.
//
// (The spec asks for grounded ~0.81 here. Same structural reason as (a): a
// groundedness below 1.0 would drag an ungrounded-gate failure in with it and
// stop the confidence condition firing alone. Ships at 1.00.)
const LOW_CONFIDENCE: Row[] = [
  ["D1.B.01", 1, 0.66, ["ev-lowconf-validation"], "A validation study exists but its endpoint is a proxy; the read is uncertain."],
  ["D1.C.01", 1, 0.64, ["ev-lowconf-manual"], "Override is described but not evidenced in use."],
  ["D1.C.02", 1, 0.62, ["ev-lowconf-manual"], "Human-in-the-loop asserted in the manual, not observed."],
  ["D1.C.03", 1, 0.61, ["ev-lowconf-validation"], "Subgroup breakdown is present but underpowered."],
  ["D1.D.01", 2, 0.60, ["ev-lowconf-cdsco"], "Licence on file; the claim wording is close to but not identical to the intended use."],
  ["D2.A.01", 1, 0.59, ["ev-lowconf-programme"], "Programme fit inferred from a related line."],
  ["D2.B.01", 1, 0.58, ["ev-lowconf-field"], "One site's conditions only."],
  ["D2.C.01", 1, 0.58, ["ev-lowconf-sla"], "Exit terms present but vague on data."],
  ["D3.A.01", 1, 0.57, ["ev-lowconf-training"], "Curriculum exists; no competence data."],
  ["D3.B.01", 1, 0.56, ["ev-lowconf-field"], "Burden claim is self-reported."],
  ["D3.C.01", 1, 0.55, ["ev-lowconf-field"], "Action taken on output is not recorded."],
  ["D3.D.01", 1, 0.54, ["ev-lowconf-field"], "Too short an observation to judge sustained use."],
  ["D4.C.01", 1, 0.52, ["ev-lowconf-sla"], "Ownership implied rather than stated."],
  ["D4.C.02", 1, 0.50, ["ev-lowconf-integration"], "Export format undocumented."],
  // OUT OF THE ROUTING DENOMINATOR. No evidence is bound to these three items
  // in assessments.ts, so both means skip them — an item with nothing attached
  // is never counted as confident OR grounded. Their citations are empty for
  // the same reason: nothing is attached, so there is nothing to cite. They are
  // skipped before the grounded check, so they do not register as ungrounded
  // gates either.
  ["D4.D.01", 1, 0.62, [], "Monitoring is vendor-mediated."],
  ["D4.E.01", 1, 0.62, [], "Consent artefact is generic."],
  ["D4.F.01", 2, 0.62, [], "Residency stated; controls partly documented."],
];

// ═════════════════════════════════════════════════════════════════════════
// (c) HUMAN_REVIEW on GROUNDEDNESS — the case the demo needs most
// ═════════════════════════════════════════════════════════════════════════
// Confidence mean 0.82 — comfortably above the bar. Groundedness 9/14 = 0.64.
// FIVE GATE ITEMS ARE SCORED WITH ZERO CITATIONS.
//
// This is the one a blended score would wave through. The average says 82% and
// looks fine; the tool cannot point at a document for five of the seventeen
// things it is gated on. Two numbers catch it. One number does not.
const UNGROUNDED_GATE: Row[] = [
  ["D1.B.01", 2, 0.88, ["ev-ung-validation"], "Independent validation on file."],
  ["D1.C.01", 2, 0.86, ["ev-ung-validation"], "Failure modes documented."],
  // UNGROUNDED GATE — a confident read with nothing behind it.
  ["D1.C.02", 2, 0.85, [], "Reads as having a realistic human-in-the-loop step. No document on file establishes this."],
  ["D1.C.03", 2, 0.84, ["ev-ung-validation"], "Subgroup fairness reported."],
  ["D1.D.01", 2, 0.84, ["ev-ung-cdsco"], "Licence appropriate to the claim."],
  ["D2.A.01", 2, 0.83, ["ev-ung-programme"], "Prioritised programme line."],
  // UNGROUNDED GATE.
  ["D2.B.01", 2, 0.82, [], "Reads as operable in real conditions. Nothing on file evidences it."],
  ["D2.C.01", 2, 0.82, ["ev-ung-sla"], "Clean exit in the SLA."],
  ["D3.A.01", 2, 0.81, ["ev-ung-training"], "Training curriculum on file."],
  // UNGROUNDED GATE.
  ["D3.B.01", 2, 0.80, [], "Reads as not adding net burden. No workload evidence attached."],
  ["D3.C.01", 2, 0.80, ["ev-ung-field"], "Actionable output evidenced in the field log."],
  // UNGROUNDED GATE.
  ["D3.D.01", 2, 0.79, [], "Reads as sustained adoption. Nothing on file covers the period after support tapered."],
  ["D4.C.01", 2, 0.78, ["ev-ung-sla"], "Ownership stated in the SLA."],
  // UNGROUNDED GATE.
  ["D4.C.02", 2, 0.76, [], "Reads as exportable in a portable format. No integration spec on file."],
  // OUT OF THE ROUTING DENOMINATOR. No evidence is bound to these three items
  // in assessments.ts, so both means skip them — an item with nothing attached
  // is never counted as confident OR grounded. Their citations are empty for
  // the same reason: nothing is attached, so there is nothing to cite. They are
  // skipped before the grounded check, so they do not register as ungrounded
  // gates either.
  ["D4.D.01", 2, 0.84, [], "Direct performance visibility."],
  ["D4.E.01", 2, 0.83, [], "Consent basis on file."],
  ["D4.F.01", 2, 0.85, [], "DPDP-aligned residency and controls."],
];

// ═════════════════════════════════════════════════════════════════════════
// (d) CLARIFICATION — doc vs claim, and the recompute that follows
// ═════════════════════════════════════════════════════════════════════════
// 11 items in the denominator, mean confidence 0.66 — below the bar, so the
// submission routes to a human. The vendor's self-declaration overstates 11
// gates, so 11 discrepancies rank and the top 5 are asked about.
//
// The five most material sit on items that ARE in the denominator, which is
// why answering them moves the mean at all: 5 × 0.18 lift over 11 items is
// +0.082, taking 0.66 to 0.74 and across the 0.70 threshold. The card then
// issues. That transition is the demo's key moment and it is asserted in
// scripts/phase1-acceptance.ts.
const CLARIFICATION: Row[] = [
  // The five with the largest claim-versus-evidence gap — asked about first.
  ["D1.B.01", 0, 0.55, ["ev-clar-validation"], "The study on file is the vendor's own internal evaluation, not an independent one."],
  ["D1.C.02", 0, 0.55, ["ev-clar-manual"], "Nothing on file describes a human-in-the-loop step under real caseload."],
  ["D2.B.01", 0, 0.55, ["ev-clar-field"], "The field log is from a single supervised demonstration day."],
  ["D4.C.02", 0, 0.55, ["ev-clar-integration"], "The integration spec describes an import path only."],
  ["D4.E.01", 0, 0.55, ["ev-clar-consent"], "The consent artefact covers a different use than the one declared."],
  // The rest of the denominator — cited, moderately confident, no lift.
  ["D1.C.01", 1, 0.75, ["ev-clar-manual"], "Failure modes listed; override pathway thin."],
  ["D1.C.03", 1, 0.75, ["ev-clar-validation"], "Subgroup analysis present but narrow."],
  ["D1.D.01", 1, 0.75, ["ev-clar-cdsco"], "Licence on file; scope close to the claim."],
  ["D2.A.01", 1, 0.75, ["ev-clar-programme"], "Programme line named."],
  ["D3.A.01", 1, 0.75, ["ev-clar-training"], "Curriculum on file."],
  ["D4.F.01", 1, 0.76, ["ev-clar-dpdp"], "Residency stated."],
];

const ASSESSMENTS: Record<AssessmentKey, Row[]> = {
  neoscan: NEOSCAN,
  "auto-issue": AUTO_ISSUE,
  "low-confidence": LOW_CONFIDENCE,
  "ungrounded-gate": UNGROUNDED_GATE,
  clarification: CLARIFICATION,
};

/**
 * The swappable hook. No model call, no network — see the limitation note at
 * the top of this file before showing any of these numbers to a user.
 */
export function getAiAssessment(toolKey: AssessmentKey): AiItemScore[] {
  return toScores(ASSESSMENTS[toolKey] ?? []);
}

export const ASSESSMENT_KEYS = Object.keys(ASSESSMENTS) as AssessmentKey[];
