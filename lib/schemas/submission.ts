import { z } from "zod";

/**
 * Submission — a tool sent to a hospital for review (BUILD_SPEC §6).
 *
 * The state is split into THREE independent fields so the displayed stage is
 * always derived (never a single mutable enum that can contradict itself, e.g.
 * "approved for pilot" while the audit was never run). See `lib/stages.ts` for
 * the derivation.
 */

/** Has the hospital run its own intake audit yet? */
export const AuditStateEnum = z.enum(["not_run", "complete"]);
export type AuditState = z.infer<typeof AuditStateEnum>;

/** The hospital's decision. Only meaningful once audit = complete. */
export const DecisionStateEnum = z.enum(["pending", "approved", "rejected"]);
export type DecisionState = z.infer<typeof DecisionStateEnum>;

/** The pilot lifecycle. Only meaningful once decision = approved. */
export const PilotStateEnum = z.enum(["not_started", "ongoing", "complete"]);
export type PilotState = z.infer<typeof PilotStateEnum>;

/** What the vendor asked the hospital for — keyed off the site's readiness tier. */
export const RequestTypeEnum = z.enum(["trial", "deployment"]);
export type RequestType = z.infer<typeof RequestTypeEnum>;

export const SubmissionSchema = z.object({
  id: z.string(),
  toolId: z.string(),
  readinessCardId: z.string(),
  hospitalId: z.string(),
  audit: AuditStateEnum,
  decision: DecisionStateEnum,
  pilot: PilotStateEnum,
  /** The hospital chose not to assess this application (with a reason). */
  skipped: z.boolean().optional(),
  skipReason: z.string().optional(),
  /** trial (Tier B site) vs deployment (Tier A site). */
  requestType: RequestTypeEnum.optional(),
  /** Free-text reason captured on approve / reject. */
  decisionReason: z.string().optional(),
  createdAt: z.string(),
});
export type Submission = z.infer<typeof SubmissionSchema>;
