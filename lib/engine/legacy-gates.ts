/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  LEGACY ADAPTER — v2 ReadinessCard  →  v1 ToolReadinessCard           ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * WHY THIS EXISTS
 * The hospital audit, the mock store, the registry, the PDF report and ~14 UI
 * components all read the v1 card shape. Rewriting them is a later phase.
 * This file is the ONLY thing that produces a v1 card, so the old shape has
 * exactly one author instead of being reconstructed ad hoc in five places.
 *
 * RULES FOR THIS FILE
 *   - Nothing new may read TOOL_GATES directly. Read the item bank.
 *   - Nothing new may read a v1 card. Read the v2 card.
 *   - This file is not where behaviour goes. It is a projection, and it is
 *     lossy on purpose — see WHAT IS LOST below.
 *
 * WHAT IS LOST IN THE PROJECTION
 *   - UNSCORED collapses to `fail` + `answered: false`. v1 has no third
 *     state, so "we could not establish this" becomes an unanswered gate.
 *     This is the projection's worst loss and the reason not to build on it.
 *   - TRIAL_ONLY has no v1 equivalent and maps to CONDITIONS.
 *   - The context the card is bound to disappears entirely. v1 cards claim
 *     deployability full stop.
 *   - 95 stub items disappear. A v1 card reports on 17 gates and looks
 *     complete while 85% of the framework is unassessed.
 *
 * ── THE `d1 - 4` TRAP, ANSWERED ──────────────────────────────────────────
 * `deployment-report.ts::buildScorecard()` reads `card.dimensionScores.D1` as
 * a 0-100 NUMBER and computes `clamp(d1 - 4)`. The v2 card carries 0-2 means.
 * Handed a v2 card directly, D1 = 1.6 would give `clamp(1.6 - 4)` = 0 — a
 * clinical score of zero on a perfectly good tool, with NO TYPE ERROR, because
 * both shapes are `number`. Silently wrong output is worse than a crash.
 *
 * The adapter closes it by rescaling in `toPercent()` below: every v2 mean is
 * multiplied by 50 (0-2 → 0-100) before it is written to a v1 card, so
 * D1 = 1.6 reaches buildScorecard as 80 and `d1 - 4` = 76, exactly as it did
 * before Phase 1. `assertLegacyScale()` then re-checks the projected numbers
 * are in 0-100 and throws if not, so a future change that forgets the rescale
 * fails loudly at the boundary instead of quietly halving hospitals' scorecards.
 */

import { GATE_VALUE, type GateResult, type GateStatus } from "@/lib/schemas/gate";
import type {
  Condition,
  DimensionId,
  ReadinessCard,
  ToolReadinessCard,
  ToolVerdict,
} from "@/lib/schemas/readiness-card";
import type { ContextCareLevel } from "@/lib/schemas/context";
import { CARE_LEVEL_LABEL } from "@/lib/schemas/context";
import { getItem, itemIdToLegacyGate, itemsForPath, legacyGateToItemId } from "./item-bank";
import { UNSCORED, type FinalLevel } from "./score";
import { GATE_CLEARS_AT } from "./verdict";
import { softenToolCard } from "./soften-certainty";

/** v2 means are 0-2; v1 scores are 0-100. THE rescale. Do not remove. */
const V2_TO_V1_SCALE = 50;

function toPercent(mean: number): number {
  return Math.round(mean * V2_TO_V1_SCALE);
}

/**
 * v2 verdicts → v1 verdicts. Lossy; TRIAL_ONLY has no v1 equivalent and is
 * mapped to CONDITIONS rather than NOTYET, because it is not a refusal.
 */
const VERDICT_MAP: Record<ReadinessCard["verdict"], ToolVerdict> = {
  DEPLOYABLE: "DEPLOY",
  CONDITIONALLY_DEPLOYABLE: "CONDITIONS",
  TRIAL_ONLY: "CONDITIONS",
  NOT_DEPLOYABLE_IN_CONTEXT: "NOTYET",
};

/** 0-2 level → v1 gate status. UNSCORED has no v1 home; see WHAT IS LOST. */
function toGateStatus(level: FinalLevel): GateStatus {
  if (level === UNSCORED) return "fail";
  if (level >= GATE_CLEARS_AT) return "pass";
  if (level === 1) return "partial";
  return "fail";
}

/** v2 care levels → the v1 placement vocabulary. */
const PLACEMENT_LABEL: Record<ContextCareLevel, string> = {
  SUB_CENTRE: "community health centres (CHC) & sub-centres",
  PHC: "primary health centres (PHC)",
  CHC: "community health centres (CHC) & sub-centres",
  DISTRICT_HOSPITAL: "district & secondary hospitals",
  PRIVATE_SECONDARY: "private secondary hospitals",
  PRIVATE_TERTIARY: "tertiary / referral centres",
  PRIVATE_CLINIC: "private clinics",
};

export type LegacyProjectionInput = {
  card: ReadinessCard;
  /** Resolved levels from `resolveAll()` — the v2 source of the gate results. */
  resolved: Map<string, FinalLevel>;
  toolId: string;
  toolName: string;
  /** Evidence / document ids to list on the v1 card. */
  docIds: string[];
};

/**
 * Project a v2 card down to the v1 shape. The ONLY producer of a v1 card.
 */
export function toLegacyCard(input: LegacyProjectionInput): ToolReadinessCard {
  const { card, resolved } = input;
  const path = card.context.path === "PRIVATE_INVESTMENT" ? "PRIVATE" : "PUBLIC";
  const verdict = VERDICT_MAP[card.verdict];

  // ── gate results, in item-bank order, keyed by their legacy gate id ──────
  const gateResults: GateResult[] = itemsForPath(path)
    .filter((i) => i.isGate && i.legacyGateId)
    .map((item) => {
      const level = resolved.get(item.id) ?? UNSCORED;
      return {
        gateId: item.legacyGateId as string,
        status: toGateStatus(level),
        // UNSCORED becomes "not answered" — the closest v1 has to it.
        answered: level !== UNSCORED,
      };
    });

  // ── dimension scores, RESCALED 0-2 → 0-100 ──────────────────────────────
  const dimensionScores = {} as Record<DimensionId, number>;
  for (const d of ["D1", "D2", "D3", "D4"] as DimensionId[]) {
    dimensionScores[d] = toPercent(card.dimensionScores[d]?.mean ?? 0);
  }

  /**
   * v1's headline number, reconstructed because ~20 screens require one.
   * It is the flat mean of the v1 gate values, matching what
   * `runToolAssessment` produced before Phase 1 — NOT a mean over 112 items.
   * The v2 card deliberately has no equivalent field; see the note in
   * readiness-card.ts.
   */
  const overallScore =
    gateResults.length === 0
      ? 0
      : Math.round(
          (gateResults.reduce((s, r) => s + GATE_VALUE[r.status], 0) / gateResults.length) * 100
        );

  // ── conditions: v2 item ids back to v1 gate ids where one exists ─────────
  const conditions: Condition[] = card.conditions.map((c) => ({
    gateId: itemIdToLegacyGate(c.itemId) ?? c.itemId,
    kind: c.kind === "gate_fail" ? "required" : "firm-up",
    fix: c.fix,
  }));

  const g6ItemId = legacyGateToItemId("G6");
  const g6 = g6ItemId ? toGateStatus(resolved.get(g6ItemId) ?? UNSCORED) : "fail";
  const placement = derivePlacement(card.context.careLevel, g6);

  const required = conditions.filter((c) => c.kind === "required").length;
  const firmUp = conditions.filter((c) => c.kind === "firm-up").length;

  const legacy: ToolReadinessCard = {
    id: card.id,
    toolId: input.toolId,
    verdict,
    summary: deriveSummary(card, input.toolName, required, firmUp, gateResults.length),
    overallScore,
    dimensionScores,
    gateResults,
    conditions,
    placement,
    docIds: input.docIds,
    createdAt: card.issuedAt,
  };

  assertLegacyScale(legacy);
  return softenToolCard(legacy);
}

function derivePlacement(careLevel: ContextCareLevel, g6: GateStatus): string {
  const label = PLACEMENT_LABEL[careLevel] ?? CARE_LEVEL_LABEL[careLevel];
  if (g6 === "pass") {
    return `Suitable for placement at ${label} — its intended level of care — based on submitted evidence of operability.`;
  }
  if (g6 === "partial") {
    return `Placement at ${label} is plausible under a supervised pilot; operability in real conditions is not yet fully demonstrated.`;
  }
  return `Not yet operable in real conditions — keep to a controlled setting before placement at ${label}.`;
}

function deriveSummary(
  card: ReadinessCard,
  toolName: string,
  required: number,
  firmUp: number,
  totalGates: number
): string {
  const p = (n: number, one: string, many: string) => (n === 1 ? one : many);
  switch (card.verdict) {
    case "DEPLOYABLE":
      return `Based on submitted evidence, ${toolName} looks ready to deploy — all ${totalGates} gates clear.`;
    case "TRIAL_ONLY":
      return `Based on submitted evidence, ${toolName} looks suitable for a supervised trial rather than deployment — ${required} required ${p(required, "gate", "gates")} to clear first.`;
    case "CONDITIONALLY_DEPLOYABLE":
      return `Based on submitted evidence, ${toolName} is likely deployable with conditions — ${required} required ${p(required, "fix", "fixes")} and ${firmUp} to firm up.`;
    case "NOT_DEPLOYABLE_IN_CONTEXT":
      return `Based on submitted evidence, ${toolName} is not yet ready in this context — ${required} required ${p(required, "gate", "gates")} to clear first.`;
  }
}

/**
 * Guard the boundary. Every v1 consumer treats these as 0-100 and some do
 * arithmetic on them (`buildScorecard` computes `d1 - 4`). If a future change
 * forgets `toPercent`, this throws instead of shipping halved scorecards that
 * look plausible.
 */
export function assertLegacyScale(card: ToolReadinessCard): void {
  const bad = Object.entries(card.dimensionScores).filter(
    ([, v]) => typeof v !== "number" || v < 0 || v > 100
  );
  if (bad.length > 0) {
    throw new Error(
      `Legacy adapter: dimension scores must be 0-100, got ${JSON.stringify(Object.fromEntries(bad))}. ` +
        `A v2 0-2 mean has probably reached a v1 consumer without toPercent().`
    );
  }
  if (card.overallScore < 0 || card.overallScore > 100) {
    throw new Error(`Legacy adapter: overallScore must be 0-100, got ${card.overallScore}.`);
  }
  // A v2 mean that slipped through unscaled lands in 0-2 and looks like a
  // legitimate, very low percentage. Catch the specific shape of that bug.
  const allTiny = Object.values(card.dimensionScores).every((v) => v <= 2);
  const anyScored = card.gateResults.some((r) => r.status !== "fail");
  if (allTiny && anyScored) {
    throw new Error(
      "Legacy adapter: every dimension score is <= 2 while gates are passing. " +
        "This is the 0-2-mean-reaching-a-0-100-consumer bug; check toPercent()."
    );
  }
}

/** The v2 item behind a v1 gate id — for consumers being migrated. */
export function itemForGate(gateId: string) {
  const id = legacyGateToItemId(gateId);
  return id ? getItem(id) : undefined;
}
