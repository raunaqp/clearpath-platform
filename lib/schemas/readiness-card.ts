import { z } from "zod";
import { GateResultSchema } from "./gate";

/**
 * Tool Readiness Card — the hero artifact of Journey A (BUILD_SPEC §3, §6).
 *
 * Produced by `runToolAssessment()` from the 17 tool gates. Every user-visible
 * string is run through `softenCertainty()` before it reaches the UI.
 */

/** DEPLOY (green) · CONDITIONS (amber) · NOT YET (coral). */
export const ToolVerdictEnum = z.enum(["DEPLOY", "CONDITIONS", "NOTYET"]);
export type ToolVerdict = z.infer<typeof ToolVerdictEnum>;

/** The 4 dimensions. D1 clinical/regulatory · D2 system fit · D3 UX/workflow ·
 *  D4 tech/data governance. */
export const DimensionIdEnum = z.enum(["D1", "D2", "D3", "D4"]);
export type DimensionId = z.infer<typeof DimensionIdEnum>;

/**
 * A condition to meet before/while deploying:
 *   - "required"  → a failed gate (blocks a clean DEPLOY)
 *   - "firm-up"   → a partial gate (deploy with conditions, tighten this)
 */
export const ConditionSchema = z.object({
  gateId: z.string(),
  kind: z.enum(["required", "firm-up"]),
  fix: z.string(),
});
export type Condition = z.infer<typeof ConditionSchema>;

export const ToolReadinessCardSchema = z.object({
  id: z.string(),
  toolId: z.string(),
  verdict: ToolVerdictEnum,
  /** One-line calibrated summary, softened. */
  summary: z.string(),
  /** Overall readiness score (0–100) = mean of all 17 gate values × 100. The
   *  scorecard headline number (score-first idiom). */
  overallScore: z.number(),
  /** Percent (0–100) per dimension = mean gate value × 100, rounded. */
  dimensionScores: z.record(DimensionIdEnum, z.number()),
  gateResults: z.array(GateResultSchema),
  conditions: z.array(ConditionSchema),
  /** Placement recommendation — level of care given operability (G6). */
  placement: z.string(),
  /** Document ids attached as evidence. */
  docIds: z.array(z.string()),
  createdAt: z.string(),
});
export type ToolReadinessCard = z.infer<typeof ToolReadinessCardSchema>;
