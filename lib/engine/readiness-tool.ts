/**
 * Tool readiness engine (BUILD_SPEC §7) — the "real part".
 *
 *   runToolAssessment(input) → ToolReadinessCard
 *
 * Rules, verbatim from the spec:
 *   - Verdict:         any fail → NOT YET · else any partial → CONDITIONS · else DEPLOY
 *   - Dimension score: mean of gate values (pass 1 · partial 0.5 · fail 0) → %
 *   - Conditions:      fails (required) + partials (firm up), each with fix text
 *   - Placement:       from intended level of care + whether G6 (operable) passes
 *
 * Pure & deterministic: `id` and `createdAt` are passed in by the caller (the
 * mock api layer) so the engine has no clock/uuid dependency and stays testable.
 */

import { GATE_VALUE, type GateResult, type GateStatus } from "@/lib/schemas/gate";
import type { CareLevel } from "@/lib/schemas/tool";
import type {
  Condition,
  DimensionId,
  ToolReadinessCard,
  ToolVerdict,
} from "@/lib/schemas/readiness-card";
import {
  TOOL_GATES,
  dimensionGates,
  toolGateOrder,
  type ToolGateId,
  type BuyerType,
} from "./gates";
import { softenToolCard } from "./soften-certainty";

export type ToolAssessmentInput = {
  id: string;
  toolId: string;
  toolName: string;
  careLevel: CareLevel;
  /** Yes/Partial/No per gate. Missing gates are treated as `fail` (no evidence). */
  gateAnswers: Partial<Record<ToolGateId, GateStatus>>;
  /** Optional per-gate evidence notes shown on the card. */
  notes?: Partial<Record<ToolGateId, string>>;
  /**
   * Buyer type — selects the D2 (System Fit) variant. Defaults to "public"
   * (the back-compatible public-procurement framing). D1/D3/D4 never vary.
   */
  buyerType?: BuyerType;
  docIds: string[];
  createdAt: string;
};

/** Verdict rule (BUILD_SPEC §7): any fail → NOTYET · any partial → CONDITIONS · else DEPLOY. */
export function deriveVerdict(results: GateResult[]): ToolVerdict {
  if (results.some((r) => r.status === "fail")) return "NOTYET";
  if (results.some((r) => r.status === "partial")) return "CONDITIONS";
  return "DEPLOY";
}

/** Dimension score = mean gate value × 100, rounded (BUILD_SPEC §7). */
function scoreDimension(
  dimension: DimensionId,
  statusOf: (g: ToolGateId) => GateStatus,
  buyer: BuyerType
): number {
  const gates = dimensionGates(dimension, buyer);
  const total = gates.reduce((sum, g) => sum + GATE_VALUE[statusOf(g)], 0);
  return Math.round((total / gates.length) * 100);
}

const CARE_LEVEL_LABEL: Record<CareLevel, string> = {
  tertiary: "tertiary / referral centres",
  secondary: "district & secondary hospitals",
  primary: "primary health centres (PHC)",
  community: "community health centres (CHC) & sub-centres",
  home: "patient-facing / home use",
};

/** Placement — from intended level of care + whether G6 (operable) passes. */
function derivePlacement(careLevel: CareLevel, g6: GateStatus): string {
  const label = CARE_LEVEL_LABEL[careLevel];
  if (g6 === "pass") {
    return `Suitable for placement at ${label} — its intended level of care — based on submitted evidence of operability.`;
  }
  if (g6 === "partial") {
    return `Placement at ${label} is plausible under a supervised pilot; operability in real conditions is not yet fully demonstrated.`;
  }
  return `Not yet operable in real conditions — keep to a controlled setting before placement at ${label}.`;
}

function deriveSummary(
  verdict: ToolVerdict,
  toolName: string,
  requiredCount: number,
  firmUpCount: number,
  totalGates: number
): string {
  switch (verdict) {
    case "DEPLOY":
      return `Based on submitted evidence, ${toolName} looks ready to deploy — all ${totalGates} gates clear.`;
    case "CONDITIONS":
      return `Based on submitted evidence, ${toolName} is likely deployable with conditions — ${requiredCount} required ${plural(requiredCount, "fix", "fixes")} and ${firmUpCount} to firm up.`;
    case "NOTYET":
      return `Based on submitted evidence, ${toolName} is not yet ready — ${requiredCount} required ${plural(requiredCount, "gate", "gates")} to clear first.`;
  }
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function runToolAssessment(input: ToolAssessmentInput): ToolReadinessCard {
  const buyer: BuyerType = input.buyerType ?? "public";
  const order = toolGateOrder(buyer);
  const statusOf = (g: ToolGateId): GateStatus => input.gateAnswers[g] ?? "fail";

  // Gate results, in canonical gate order for this buyer's D2 variant.
  // Unanswered gates default to `fail` for the math but carry `answered: false`
  // so the UI can grey them out.
  const gateResults: GateResult[] = order.map((g) => ({
    gateId: g,
    status: statusOf(g),
    answered: input.gateAnswers[g] !== undefined,
    ...(input.notes?.[g] ? { note: input.notes[g] } : {}),
  }));

  const verdict = deriveVerdict(gateResults);

  const dimensionScores = {
    D1: scoreDimension("D1", statusOf, buyer),
    D2: scoreDimension("D2", statusOf, buyer),
    D3: scoreDimension("D3", statusOf, buyer),
    D4: scoreDimension("D4", statusOf, buyer),
  } as Record<DimensionId, number>;

  // Overall = mean of all active gate values × 100 (flat mean by gate count).
  const overallScore = Math.round(
    (gateResults.reduce((sum, r) => sum + GATE_VALUE[r.status], 0) /
      gateResults.length) *
      100
  );

  // Conditions: fails (required) first, then partials (firm up), each in gate order.
  const required: Condition[] = order.filter(
    (g) => statusOf(g) === "fail"
  ).map((g) => ({ gateId: g, kind: "required", fix: TOOL_GATES[g].fix }));
  const firmUp: Condition[] = order.filter(
    (g) => statusOf(g) === "partial"
  ).map((g) => ({ gateId: g, kind: "firm-up", fix: TOOL_GATES[g].fix }));
  const conditions = [...required, ...firmUp];

  const placement = derivePlacement(input.careLevel, statusOf("G6"));
  const summary = deriveSummary(verdict, input.toolName, required.length, firmUp.length, order.length);

  const card: ToolReadinessCard = {
    id: input.id,
    toolId: input.toolId,
    verdict,
    summary,
    overallScore,
    dimensionScores,
    gateResults,
    conditions,
    placement,
    docIds: input.docIds,
    createdAt: input.createdAt,
  };

  // Every user-visible string passes through the certainty post-processor.
  return softenToolCard(card);
}
