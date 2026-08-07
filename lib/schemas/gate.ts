import { z } from "zod";

/**
 * Gate result — the atomic unit of every ClearPath assessment.
 *
 * A "gate" is a single yes/partial/no question the engine evaluates. Three
 * engines share this shape (BUILD_SPEC §7):
 *   - tool readiness  → 17 gates (G1–G16) across 4 dimensions
 *   - hospital intake → 13 gates (H1–H13) across 3 groups
 * (site readiness scores whole domains rather than gates — see `site.ts`.)
 *
 * `status` drives everything downstream:
 *   pass    → gate value 1.0
 *   partial → gate value 0.5
 *   fail    → gate value 0.0
 * and the verdict rule (any fail → NOT YET · else any partial → CONDITIONS ·
 * else DEPLOY) reads directly off these.
 */
export const GateStatusEnum = z.enum(["pass", "partial", "fail"]);
export type GateStatus = z.infer<typeof GateStatusEnum>;

export const GateResultSchema = z.object({
  gateId: z.string(),
  status: GateStatusEnum,
  /**
   * Whether the question was actually answered. Missing answers still count as
   * `fail` for the math (verdict + score) — "no evidence submitted" = not
   * passed — but the UI renders `answered: false` as a distinct grey "not
   * answered" state rather than an assessed fail. Absent = treated as answered
   * (back-compat with cards persisted before this field existed).
   */
  answered: z.boolean().optional(),
  /** Evidence / rationale the engine drew on. User-visible → softened. */
  note: z.string().optional(),
});
export type GateResult = z.infer<typeof GateResultSchema>;

/**
 * Numeric weight of a gate status. Single source of truth for the
 * pass 1 · partial 0.5 · fail 0 rule (BUILD_SPEC §7).
 */
export const GATE_VALUE: Record<GateStatus, number> = {
  pass: 1,
  partial: 0.5,
  fail: 0,
};
