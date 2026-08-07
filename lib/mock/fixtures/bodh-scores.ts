import type { GateStatus } from "@/lib/schemas/gate";
import type { ToolGateId } from "@/lib/engine/gates";

/**
 * BODH validation scores (mock hook). BODH is a validation platform; this
 * fixture stands in for a real `getBodhScore(toolId)` call. Structured so the
 * body can later hit the real BODH API with no UI change.
 *
 * Each axis is 0–100. The scores pre-fill the clinical (G1), fairness (G17),
 * and safety (G2) gates via `bodhToGate`.
 */
export type BodhScore = { accuracy: number; fairness: number; safety: number };

export const BODH_SCORES: Record<string, BodhScore> = {
  "tool-cerviai": { accuracy: 90, fairness: 88, safety: 92 },
  "tool-chestxr": { accuracy: 94, fairness: 91, safety: 95 },
  "tool-symptombot": { accuracy: 62, fairness: 55, safety: 60 },
  "tool-retinascan": { accuracy: 89, fairness: 76, safety: 88 },
};

const DEFAULT_BODH: BodhScore = { accuracy: 82, fairness: 80, safety: 84 };

export function getBodhScore(toolId: string): BodhScore {
  return BODH_SCORES[toolId] ?? DEFAULT_BODH;
}

/** Map a BODH axis (0–100) to a gate status: ≥85 pass · ≥70 partial · else fail. */
export function bodhToGate(score: number): GateStatus {
  if (score >= 85) return "pass";
  if (score >= 70) return "partial";
  return "fail";
}

/** The gate answers a BODH score pre-fills: clinical (G1), fairness (G17),
 *  safety (G2). */
export function bodhToGateAnswers(b: BodhScore): Partial<Record<ToolGateId, GateStatus>> {
  return {
    G1: bodhToGate(b.accuracy),
    G17: bodhToGate(b.fairness),
    G2: bodhToGate(b.safety),
  };
}
