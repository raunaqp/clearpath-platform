/**
 * Hospital intake audit engine (BUILD_SPEC §7).
 *
 *   runHospitalAudit(input) → AuditResult
 *
 * The private-hospital intake checklist — 13 gates across "Should we pilot? /
 * Can we run? / Who owns it?", including the liability + billing gates a vendor
 * card doesn't cover. Same verdict rule as the tool engine:
 *   any fail → NOTYET · else any partial → CONDITIONS · else DEPLOY
 * Score = mean gate value × 100, rounded.
 *
 * This is the neutrality point: the hospital's audit is theirs, computed
 * independently of the vendor's Readiness Card — even though it can be
 * PRE-FILLED from the vendor card where gates overlap (`prefillFromToolCard`).
 */

import { GATE_VALUE, type GateResult, type GateStatus } from "@/lib/schemas/gate";
import type { AuditResult, AuditVerdict } from "@/lib/schemas/audit";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import {
  HOSPITAL_GATES,
  HOSPITAL_GATE_ORDER,
  type HospitalGateId,
  type ToolGateId,
} from "./gates";
import { softenAuditResult } from "./soften-certainty";

export type HospitalAuditInput = {
  id: string;
  submissionId: string;
  auditor: string;
  gateAnswers: Partial<Record<HospitalGateId, GateStatus>>;
  notes?: Partial<Record<HospitalGateId, string>>;
  createdAt: string;
};

/** Verdict rule — identical to the tool engine. */
export function deriveAuditVerdict(results: GateResult[]): AuditVerdict {
  if (results.some((r) => r.status === "fail")) return "NOTYET";
  if (results.some((r) => r.status === "partial")) return "CONDITIONS";
  return "DEPLOY";
}

/**
 * Seed hospital-gate answers from a vendor Readiness Card, using the
 * `vendorGate` overlaps in gates.ts. Hospital-only gates (integration,
 * liability, named owners, billing) are NOT seeded — they start undefined for
 * the hospital to answer. The hospital can override any seeded value.
 */
export function prefillFromToolCard(
  card: ToolReadinessCard
): Partial<Record<HospitalGateId, GateStatus>> {
  const byGate: Partial<Record<ToolGateId, GateStatus>> = {};
  for (const r of card.gateResults) {
    byGate[r.gateId as ToolGateId] = r.status;
  }
  const seeded: Partial<Record<HospitalGateId, GateStatus>> = {};
  for (const h of HOSPITAL_GATE_ORDER) {
    const overlap = HOSPITAL_GATES[h].vendorGate;
    if (overlap && byGate[overlap] !== undefined) {
      seeded[h] = byGate[overlap];
    }
  }
  return seeded;
}

export function runHospitalAudit(input: HospitalAuditInput): AuditResult {
  const statusOf = (h: HospitalGateId): GateStatus =>
    input.gateAnswers[h] ?? "fail";

  // Unanswered gates default to `fail` for the math but carry `answered: false`
  // so the UI can grey them out rather than show an assessed fail.
  const gateResults: GateResult[] = HOSPITAL_GATE_ORDER.map((h) => ({
    gateId: h,
    status: statusOf(h),
    answered: input.gateAnswers[h] !== undefined,
    ...(input.notes?.[h] ? { note: input.notes[h] } : {}),
  }));

  const verdict = deriveAuditVerdict(gateResults);

  const total = gateResults.reduce((sum, r) => sum + GATE_VALUE[r.status], 0);
  const score = Math.round((total / gateResults.length) * 100);

  const result: AuditResult = {
    id: input.id,
    submissionId: input.submissionId,
    verdict,
    score,
    gateResults,
    auditor: input.auditor,
    createdAt: input.createdAt,
  };

  return softenAuditResult(result);
}
