/**
 * Evidence engine — generalisability and expiry.
 *
 * THE RULE THAT MATTERS: evidence is ALWAYS ACCEPTED. Where it does not match
 * the submission context it is FLAGGED, with a reason that names the mismatch
 * in words a reader can argue with. It is never silently down-weighted.
 *
 * Silent discounting is the thing to avoid. If the engine quietly halved the
 * value of a hospital study being applied to a community deployment, the
 * judgement would live inside the arithmetic where nobody could see it or
 * disagree with it. Flagging puts it in front of an assessor instead: here is
 * the study, here is why it may not transfer, you decide.
 */

import type { Evidence, Generalisability } from "@/lib/schemas/evidence";
import type { SubmissionContext, ContextCareLevel, OperatorCadre } from "@/lib/schemas/context";
import { CARE_LEVEL_LABEL, OPERATOR_CADRE_LABEL } from "@/lib/schemas/context";

/**
 * Setting strings an evidence document may use, mapped to the context care
 * levels they satisfy. Free text is matched case-insensitively against these
 * synonyms; anything unrecognised is treated as a mismatch and says so, rather
 * than being waved through.
 */
const SETTING_SYNONYMS: Record<ContextCareLevel, string[]> = {
  SUB_CENTRE: ["sub_centre", "sub-centre", "sub centre", "subcentre", "hwc", "health and wellness centre"],
  PHC: ["phc", "primary health centre", "primary care", "primary health center"],
  CHC: ["chc", "community health centre", "community health center"],
  DISTRICT_HOSPITAL: ["district_hospital", "district hospital", "district", "secondary public hospital"],
  PRIVATE_SECONDARY: ["private_secondary", "private secondary", "private secondary hospital"],
  PRIVATE_TERTIARY: ["private_tertiary", "private tertiary", "tertiary hospital", "teaching hospital", "medical college"],
  PRIVATE_CLINIC: ["private_clinic", "private clinic", "clinic", "nursing home"],
};

const CADRE_SYNONYMS: Record<OperatorCadre, string[]> = {
  NO_OPERATOR: ["no_operator", "no operator", "automated", "unattended"],
  SELF_PROVIDED: ["self_provided", "vendor operator", "vendor-provided", "vendor staff"],
  ANM: ["anm", "auxiliary nurse midwife", "asha", "frontline worker", "chw", "community health worker"],
  MO: ["mo", "medical officer"],
  STAFF_NURSE: ["staff_nurse", "staff nurse", "nurse"],
  LAB_TECHNICIAN: ["lab_technician", "lab technician", "laboratory technician", "lab tech", "phlebotomist"],
  CLINICIAN: ["clinician", "physician", "doctor", "general practitioner"],
  SPECIALIST: ["specialist", "consultant", "obstetrician", "pathologist", "radiologist"],
  PATIENT: ["patient", "self-administered", "consumer"],
};

function matches(value: string, synonyms: string[]): boolean {
  const v = value.trim().toLowerCase();
  return synonyms.some((s) => v === s || v.includes(s));
}

/**
 * Does the evidence's setting satisfy the context's care level? Exact-or-
 * synonym only. This deliberately does NOT treat a tertiary study as covering
 * a sub-centre "because it is harder" — a specialist-run study at a teaching
 * hospital tells you very little about a camp, and the asymmetry runs the
 * other way as often as not.
 */
export function settingMatches(setting: string, careLevel: ContextCareLevel): boolean {
  return matches(setting, SETTING_SYNONYMS[careLevel]);
}

export function cadreMatches(cadre: string, operatorCadre: OperatorCadre): boolean {
  return matches(cadre, CADRE_SYNONYMS[operatorCadre]);
}

/**
 * Flag evidence that may not transfer to this context, with a reason naming
 * the actual mismatch — "hospital-population evidence, community deployment",
 * not "generalisability: limited".
 */
export function computeGeneralisability(
  evidence: Evidence,
  context: SubmissionContext
): Generalisability {
  const pop = evidence.provenance.population;
  const settingOk = settingMatches(pop.setting, context.careLevel);
  const cadreOk = cadreMatches(pop.cadre, context.operatorCadre);

  if (settingOk && cadreOk) return { limited: false, reason: null };

  const parts: string[] = [];
  if (!settingOk) {
    parts.push(
      `generated in ${pop.setting}, being applied to a ${CARE_LEVEL_LABEL[context.careLevel]} deployment`
    );
  }
  if (!cadreOk) {
    parts.push(
      `operated by ${pop.cadre} in the study, by ${OPERATOR_CADRE_LABEL[context.operatorCadre]} in this context`
    );
  }

  const n = pop.sampleN === null ? "" : ` (n=${pop.sampleN})`;
  return {
    limited: true,
    reason: `${evidence.name}${n}: ${parts.join("; ")}. Accepted as evidence and flagged — an assessor decides what it is worth here.`,
  };
}

/** Expired if the document states a validUntil that has passed. */
export function computeExpiry(evidence: Evidence, today: Date = new Date()): boolean {
  const until = evidence.provenance.validUntil;
  if (!until) return false;
  const d = new Date(until);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < today.getTime();
}

/** Apply both computations. The vendor never authors either field. */
export function evaluateEvidence(
  evidence: Evidence,
  context: SubmissionContext,
  today: Date = new Date()
): Evidence {
  return {
    ...evidence,
    generalisability: computeGeneralisability(evidence, context),
    expired: computeExpiry(evidence, today),
  };
}

export function evaluateAll(
  evidence: Evidence[],
  context: SubmissionContext,
  today: Date = new Date()
): Evidence[] {
  return evidence.map((e) => evaluateEvidence(e, context, today));
}

/** Evidence bound to an item. Unbound evidence reaches nothing, by design. */
export function evidenceForItem(evidence: Evidence[], itemId: string): Evidence[] {
  return evidence.filter((e) => e.itemRefs.includes(itemId));
}

/** Item ids that have at least one document pointed at them. */
export function itemsWithEvidence(evidence: Evidence[]): Set<string> {
  const s = new Set<string>();
  for (const e of evidence) for (const ref of e.itemRefs) s.add(ref);
  return s;
}

/**
 * The earliest stated expiry among regulatory documents bound to D1.D items.
 * Feeds the card's expiry rule: a card cannot outlive the licence it rests on.
 */
export function earliestRegulatoryExpiry(
  evidence: Evidence[],
  itemClusterOf: (itemId: string) => string | undefined
): string | null {
  const dates = evidence
    .filter((e) => e.type === "REGULATORY")
    .filter((e) => e.itemRefs.some((r) => itemClusterOf(r) === "D1.D"))
    .map((e) => e.provenance.validUntil)
    .filter((d): d is string => !!d);

  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b));
}
