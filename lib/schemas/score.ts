import { z } from "zod";

/**
 * Scoring types for the 0-2 maturity ladder (see /framework):
 *   0  Absent / fails      — fails outright and needs changes to fit here
 *   1  Requires support    — only functions through specific support
 *   2  System-owned        — built into how the system runs, survives staff changes
 *
 * UNSCORED is NOT a level. It is the absence of one, and it is modelled as
 * `null` rather than 0 throughout. "We could not establish this" and "this
 * failed" are different findings about a tool and they must never collapse
 * into each other — collapsing them turns a gap in the evidence into an
 * accusation, and lets a missing document look like a assessed failure.
 */

export const LevelEnum = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type Level = 0 | 1 | 2;

/** The top of the ladder — what a gate item has to reach to clear. */
export const MAX_LEVEL: Level = 2;

/**
 * Where a score came from. `evidenceId` points at a real Evidence record;
 * `frameworkRef` at a cluster code. A citation that points at neither is
 * WORSE than no citation: it passes the groundedness check while grounding
 * nothing. `isGroundedCitation` is the guard.
 */
export const CitationSchema = z.object({
  evidenceId: z.string().optional(),
  frameworkRef: z.string().optional(),
  quote: z.string().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const AiItemScoreSchema = z.object({
  itemId: z.string(),
  level: LevelEnum,
  /** 0-1. See the honest-limitation note in fixtures/ai-assessment.ts. */
  confidence: z.number().min(0).max(1),
  /** An EMPTY ARRAY MEANS UNGROUNDED. It is not a formatting detail. */
  citations: z.array(CitationSchema),
  rationale: z.string(),
});
export type AiItemScore = z.infer<typeof AiItemScoreSchema>;

/** A human assessor's score, with a conflict-of-interest declaration. */
export const AssessorScoreSchema = z.object({
  assessorId: z.string(),
  level: LevelEnum,
  note: z.string().optional(),
  coiDeclared: z.boolean(),
});
export type AssessorScore = z.infer<typeof AssessorScoreSchema>;

export const ItemScoreSchema = z.object({
  itemId: z.string(),
  aiScore: AiItemScoreSchema.nullable(),
  assessorScores: z.array(AssessorScoreSchema),
  /** Set when a lead assessor resolves a disagreement. Wins over everything. */
  adjudicated: LevelEnum.nullable(),
});
export type ItemScore = z.infer<typeof ItemScoreSchema>;

/** The 17 legacy gate ids, as they appear on a self-declaration. */
export const LegacyGateIdEnum = z.enum([
  "G1", "G2", "G3", "G4", "G17",
  "G5", "G6", "G7",
  "GP1", "GP2", "GP3", "GP4", "GP5",
  "G8", "G9", "G10", "G11",
  "G12", "G13", "G14", "G15", "G16",
]);
export type LegacyGateId = z.infer<typeof LegacyGateIdEnum>;

export const ClarificationAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  answeredAt: z.string(),
});
export type ClarificationAnswer = z.infer<typeof ClarificationAnswerSchema>;

/**
 * What the VENDOR says about their own tool.
 *
 * The vendor does not score 112 items — asking them to would produce 112
 * pieces of marketing. They answer the 17-gate wizard, and that self-
 * declaration is stored HERE, separately from the assessment, so a claim can
 * never be mistaken for a finding. `routing.ts` compares the two.
 */
export const SelfDeclarationSchema = z.object({
  submissionId: z.string(),
  /**
   * PARTIAL by design. A vendor answers the 17 gates on their own path — the
   * public D2 gates or the private GP1-GP5, never both — so requiring every
   * key would make an honest declaration invalid.
   */
  gateAnswers: z.partialRecord(LegacyGateIdEnum, LevelEnum),
  clarificationAnswers: z.array(ClarificationAnswerSchema),
});
export type SelfDeclaration = z.infer<typeof SelfDeclarationSchema>;
