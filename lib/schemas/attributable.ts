import { z } from "zod";

/**
 * The shared shape behind every decision this platform records.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS ACTUALLY SHARED BETWEEN A COMMITTEE VERDICT AND AN ASSESSOR REVIEW
 * ─────────────────────────────────────────────────────────────────────────
 * Not the fields. A committee has a chair, a quorum and dissent; an assessor
 * has none of those, and forcing one into the other's shape would leave a
 * "quorum of 1" on screen, which is worse than no quorum at all.
 *
 * What they share is the MECHANISM: a decision, attributable to a named person
 * with a declared conflict position, dated, and APPEND-ONLY — a reversal is a
 * new record pointing at the one it replaces, never an edit. That is the part
 * worth having in one place, because it is the part that makes either record
 * worth anything six months later.
 *
 * `appendOnlyGuard` in lib/mock/append-only.ts enforces it for both.
 */

/**
 * A conflict-of-interest position. REQUIRED, and `NONE` is a declaration rather
 * than an absence — the difference between "I have no conflict" and never being
 * asked is the whole value of asking.
 */
export const ConflictPositionEnum = z.enum(["NONE", "DECLARED", "RECUSED"]);
export type ConflictPosition = z.infer<typeof ConflictPositionEnum>;

export const AttributionSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  conflictPosition: ConflictPositionEnum,
  /** Required when the position is anything but NONE. */
  conflictNote: z.string().nullable(),
});
export type Attribution = z.infer<typeof AttributionSchema>;

/** The fields every append-only decision record carries. */
export const AttributableRecordSchema = z.object({
  id: z.string(),
  /** 1, 2, 3 … Increments with each superseding record. */
  revision: z.number(),
  /** The record this one replaces. null on a first record. */
  supersedes: z.string().nullable(),
  decidedAt: z.string(),
});
export type AttributableRecord = z.infer<typeof AttributableRecordSchema>;
