/**
 * Divergence between the vendor's card and the hospital's own audit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DERIVED, NEVER SEEDED
 * ─────────────────────────────────────────────────────────────────────────
 * A hardcoded "the vendor says consent is fine, we say conditional" is a
 * sentence about one fixture. This finds the disagreement by comparing the two
 * records through the gate overlap `gates.ts` already declares — so it works on
 * any submission, and it cannot say a divergence exists where the records
 * agree.
 *
 * WHY IT MATTERS THAT BOTH ARE CORRECT. A vendor's card is scored against the
 * context it was issued for; a hospital's audit is scored against the hospital
 * it will actually run in. A vendor whose consent flow assumes digital capture
 * is not wrong about their own product — they are answering a different
 * question from the one a site asks about camps with paper forms. Presenting
 * this as the vendor being caught out would be both unfair and misleading; the
 * honest framing is that two correct assessments can disagree, and only one of
 * them governs deployment at a given site.
 */

import type { AuditResult } from "@/lib/schemas/audit";
import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import type { GateStatus } from "@/lib/schemas/gate";
import { HOSPITAL_GATES, HOSPITAL_GATE_ORDER, type HospitalGateId } from "./gates";
import { legacyGateToItemId } from "./item-bank";
import { softenCertainty } from "./soften-certainty";

export type Divergence = {
  hospitalGateId: HospitalGateId;
  hospitalGateTitle: string;
  vendorGateId: string;
  /** What the card records for the overlapping gate. */
  vendorLevel: 0 | 1 | 2;
  vendorReads: string;
  /** What this hospital's audit records. */
  hospitalStatus: GateStatus;
  hospitalReads: string;
};

const LEVEL_WORD: Record<number, string> = { 0: "not met", 1: "conditional", 2: "satisfied" };
const STATUS_WORD: Record<GateStatus, string> = {
  pass: "satisfied",
  partial: "conditional",
  fail: "not met",
};

/**
 * A divergence is the card reading a gate as CLEAR while the hospital reads it
 * as conditional or not met. The reverse — a hospital more satisfied than the
 * card — is not flagged: a site is entitled to accept something the framework
 * left open, and calling that a disagreement would pressure sites toward the
 * vendor's answer.
 */
export function findDivergences(args: {
  card: ReadinessCard;
  audit: AuditResult;
  resolvedLevels: Map<string, 0 | 1 | 2 | null>;
}): Divergence[] {
  const { card, audit, resolvedLevels } = args;
  const auditByGate = new Map(audit.gateResults.map((r) => [r.gateId as HospitalGateId, r]));
  const out: Divergence[] = [];

  for (const h of HOSPITAL_GATE_ORDER) {
    const def = HOSPITAL_GATES[h];
    const vendorGate = def.vendorGate;
    if (!vendorGate) continue; // hospital-only gate; nothing to diverge from

    const itemId = legacyGateToItemId(vendorGate);
    const vendorLevel = itemId ? resolvedLevels.get(itemId) : undefined;
    if (vendorLevel === undefined || vendorLevel === null) continue;

    const auditResult = auditByGate.get(h);
    if (!auditResult || auditResult.answered === false) continue;

    // Only "card clear, hospital not" counts. See the note above.
    if (vendorLevel === 2 && auditResult.status !== "pass") {
      out.push({
        hospitalGateId: h,
        hospitalGateTitle: def.title,
        vendorGateId: vendorGate,
        vendorLevel,
        vendorReads: softenCertainty(
          `The vendor's card records this as ${LEVEL_WORD[vendorLevel]}.`
        ),
        hospitalStatus: auditResult.status,
        hospitalReads: softenCertainty(
          `This hospital's audit records it as ${STATUS_WORD[auditResult.status]}.${auditResult.note ? ` ${auditResult.note}` : ""}`
        ),
      });
    }
  }

  void card;
  return out;
}

/**
 * The line the divergence panel carries. Kept here rather than in the page so
 * the framing cannot be softened by a layout edit.
 */
export const DIVERGENCE_FRAMING =
  "Both are correct. The hospital's verdict governs deployment at this site.";
