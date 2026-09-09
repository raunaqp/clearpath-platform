import { z } from "zod";
import { GateResultSchema } from "./gate";
import { SubmissionContextSchema } from "./context";

/**
 * Readiness Card — the hero artifact of Journey A.
 *
 * This file holds TWO card shapes:
 *
 *   ReadinessCardSchema      the v2 card. Context-bound, 0-2 dimension means,
 *                            no composite score. THIS IS THE ONE TO BUILD ON.
 *
 *   ToolReadinessCardSchema  the v1 card, kept at the bottom under a LEGACY
 *                            banner. ~20 files still read it. It is produced
 *                            ONLY by `lib/engine/legacy-gates.ts`, which
 *                            projects a v2 card down to it. Do not add a new
 *                            reader of it.
 *
 * Every user-visible string on either shape is run through `softenCertainty()`
 * before it reaches the UI.
 */

/** The 4 dimensions. D1 clinical/regulatory · D2 system fit · D3 UX/workflow ·
 *  D4 tech/data governance. Shared by both card shapes and by the item bank. */
export const DimensionIdEnum = z.enum(["D1", "D2", "D3", "D4"]);
export type DimensionId = z.infer<typeof DimensionIdEnum>;

// ─────────────────────────────────────────────────────────────────────────
// v2 — the context-bound Readiness Card
// ─────────────────────────────────────────────────────────────────────────

/**
 * The four verdicts (as described on /framework).
 *
 * NOT_DEPLOYABLE_IN_CONTEXT is named the way it is on purpose. It is not
 * "this tool is bad" — it is "not here, not like this". The same tool can
 * carry a DEPLOYABLE card for a different context.
 */
export const CardVerdictEnum = z.enum([
  "DEPLOYABLE",
  "CONDITIONALLY_DEPLOYABLE",
  "TRIAL_ONLY",
  "NOT_DEPLOYABLE_IN_CONTEXT",
]);
export type CardVerdict = z.infer<typeof CardVerdictEnum>;

/**
 * A dimension's roll-up. `mean` is on the 0-2 ladder — NOT a percentage.
 * `itemsScored` and `itemsTotal` are carried alongside so a reader can see
 * that a 2.0 over 5 of 31 items is not the same claim as a 2.0 over 31 of 31.
 */
export const DimensionScoreSchema = z.object({
  mean: z.number(),
  itemsScored: z.number(),
  itemsTotal: z.number(),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

/**
 * What a condition stands in the way of.
 *
 *   TRIAL               cannot be worked around by running a trial. Running one
 *                       is the activity this condition gates — you cannot
 *                       establish a lawful basis for handling patient data by
 *                       handling patient data.
 *   ROUTINE_DEPLOYMENT  often IS resolved by running a supervised trial. Whether
 *                       the tool helps patients, fits the workflow, or survives
 *                       a real clinic is what a trial exists to find out.
 *
 * The card must say which, because "2 conditions" tells a reader nothing about
 * whether they can start next month or not at all.
 */
export const BlockingScopeEnum = z.enum(["TRIAL", "ROUTINE_DEPLOYMENT"]);
export type BlockingScope = z.infer<typeof BlockingScopeEnum>;

/**
 * Something to clear before, or while, deploying.
 *   gate_fail — a gate item that did not reach the top of the ladder
 *   firm_up   — a non-gate item sitting at or below "requires support"
 */
export const CardConditionSchema = z.object({
  itemId: z.string(),
  kind: z.enum(["gate_fail", "firm_up"]),
  blocks: BlockingScopeEnum,
  fix: z.string(),
  /** Who can clear it, and how — named so the condition is actionable. */
  clearedBy: z.string(),
});
export type CardCondition = z.infer<typeof CardConditionSchema>;

/**
 * Placement — where the card says the tool may go, and where it explicitly
 * does not. The excluded list is not decoration: a card that only says where a
 * tool fits gets read as silence-means-permission everywhere else.
 */
export const PlacementSchema = z.object({
  statement: z.string(),
  excluded: z.array(z.string()),
});
export type Placement = z.infer<typeof PlacementSchema>;

/** Gate roll-up. `unscored` is tracked separately from `fail` throughout. */
export const GateSummarySchema = z.object({
  pass: z.number(),
  fail: z.number(),
  unscored: z.number(),
  failedIds: z.array(z.string()),
  unscoredIds: z.array(z.string()),
});
export type GateSummary = z.infer<typeof GateSummarySchema>;

export const CardChangeLogEntrySchema = z.object({
  version: z.number(),
  at: z.string(),
  summary: z.string(),
});
export type CardChangeLogEntry = z.infer<typeof CardChangeLogEntrySchema>;

export const ReadinessCardSchema = z.object({
  /** CP-YYYY-MMDD-<TOOLSLUG>-NNN. Stable across reissues — it identifies the
   *  assessment, not the version. See `lib/engine/card-id.ts`. */
  id: z.string(),
  /** 1, 2, 3 … Displayed as v1.0, v1.1, v1.2 (see `versionLabel`). */
  version: z.number(),
  /** When THIS version was issued. Moves on every reissue. */
  issuedAt: z.string(),
  /**
   * When version 1 was issued. Never moves.
   *
   * Not in the Phase 2 brief, but the brief's own rules require it: expiry is
   * anchored to the original assessment, and the changelog has to be able to
   * date the v1.0 row after `issuedAt` has moved on. Deriving either from
   * `expiresAt` would be wrong the moment a regulatory licence sets the expiry
   * instead of the 12-month default.
   */
  firstIssuedAt: z.string(),
  /** Anchored to `firstIssuedAt`. A reissue carries it forward untouched. */
  expiresAt: z.string(),
  /** Which input set the expiry — the 12-month default or a licence date. */
  expiryBasis: z.string(),
  /**
   * FROZEN COPY of the context this card was issued for. The card is valid
   * ONLY inside it. Copied, not referenced, so a later edit to the submission
   * cannot silently re-scope a card that has already been issued.
   */
  context: SubmissionContextSchema,
  toolVersion: z.string(),
  modelVersion: z.string(),
  dimensionScores: z.record(DimensionIdEnum, DimensionScoreSchema),
  verdict: CardVerdictEnum,
  conditions: z.array(CardConditionSchema),
  placement: PlacementSchema,
  /**
   * One line stating demo scope versus funded scope. Set once in the engine
   * (`SCOPE_NOTE`), never per-card in a fixture — a scope caveat that can be
   * edited per fixture is a scope caveat that will eventually be edited off
   * the one card that most needed it.
   */
  scopeNote: z.string(),
  gateSummary: GateSummarySchema,
  /**
   * Items the assessment could not establish either way. This list is the
   * reason there is no composite score: these are absences, and an absence
   * cannot be averaged with a finding.
   */
  couldNotEstablish: z.array(z.string()),
  /**
   * One entry per REISSUE — the transitions, not the issues. A card at v1.0 has
   * an empty changelog because nothing has changed yet, so
   * `changeLog.length === version - 1` holds at every version. The v1.0 row a
   * reader sees is rendered from `firstIssuedAt`, not stored here.
   */
  changeLog: z.array(CardChangeLogEntrySchema),
});
export type ReadinessCard = z.infer<typeof ReadinessCardSchema>;

/** 1 → "v1.0", 2 → "v1.1". The only place version display is decided. */
export function versionLabel(version: number): string {
  return `v1.${version - 1}`;
}

/**
 * NO `overallScore` ON THE v2 CARD, DELIBERATELY.
 *
 * The output is a verdict, not a composite. A single 0-100 number invites
 * exactly the averaging-out that gates exist to prevent: a tool that cannot
 * export a hospital's own records scores 94/100 and reads as excellent. The
 * legacy adapter computes one because ~20 old screens need it; nothing new
 * should.
 */

// ─────────────────────────────────────────────────────────────────────────
// LEGACY — v1 card shape. Produced only by lib/engine/legacy-gates.ts.
// Do not add new readers. See the file docstring above.
// ─────────────────────────────────────────────────────────────────────────

/** DEPLOY (green) · CONDITIONS (amber) · NOT YET (coral). */
export const ToolVerdictEnum = z.enum(["DEPLOY", "CONDITIONS", "NOTYET"]);
export type ToolVerdict = z.infer<typeof ToolVerdictEnum>;

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
