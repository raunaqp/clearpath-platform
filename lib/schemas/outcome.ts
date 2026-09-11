import { z } from "zod";
import { AttributionSchema } from "./attributable";

/**
 * S24-S27 — what happened at the end, and what happens next.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY AN OUTCOME DECISION IS NOT A COMMITTEE VERDICT
 * ─────────────────────────────────────────────────────────────────────────
 * `CommitteeDecision` is the INTAKE taxonomy — deploy, trial under charter,
 * conditional hold, decline. Those are answers to "should we let this in?".
 * An outcome answers a different question: "it ran, now what?" — adopt, extend,
 * retire. Forcing one into the other's enum would mean a record whose values do
 * not describe the decision it holds, and six months later nobody could tell
 * whether DEPLOY meant "let it in" or "keep it".
 *
 * Same reason an assessor review did not go into the committee verdict. The
 * SHARED parts — append-only, attributable, superseding rather than editing —
 * are reused exactly, because those are properties of any decision record.
 */

// ═════════════════════════════════════════════════════════════════════════
// S24 · The outcome decision
// ═════════════════════════════════════════════════════════════════════════

export const OutcomeDecisionEnum = z.enum(["ADOPT", "EXTEND", "RETIRE"]);
export type OutcomeDecisionKind = z.infer<typeof OutcomeDecisionEnum>;

export const OUTCOME_DECISION_LABEL: Record<OutcomeDecisionKind, string> = {
  ADOPT: "Adopt",
  EXTEND: "Extend",
  RETIRE: "Retire",
};

/**
 * What an EXTEND has to carry.
 *
 * An extension with no new question is a trial repeated in the hope of a
 * different answer, and an extension with no stop rule is one nobody has
 * agreed to end. Both are required by `assertOutcomeComplete`, not by
 * convention.
 */
export const ExtensionTermsSchema = z.object({
  newQuestion: z.string().min(1),
  newStopRule: z.string().min(1),
  days: z.number().positive(),
  sites: z.number().positive(),
  modelVersionUnchanged: z.boolean(),
  /** The trial owner continues, or a new one is named. */
  owner: z.object({ name: z.string().min(1), role: z.string().min(1) }),
  reviewOn: z.string().min(1),
});
export type ExtensionTerms = z.infer<typeof ExtensionTermsSchema>;

/**
 * What an ADOPT has to carry.
 *
 * A business-as-usual owner DISTINCT from the trial owner. A trial owner who
 * silently becomes the permanent owner is how a tool ends up run by whoever
 * happened to be interested during the pilot, and how it ends up unowned when
 * they move on.
 */
export const AdoptionTermsSchema = z.object({
  bauOwner: z.object({ name: z.string().min(1), role: z.string().min(1) }),
  fundingLine: z.string().min(1),
  reviewOn: z.string().min(1),
});
export type AdoptionTerms = z.infer<typeof AdoptionTermsSchema>;

/**
 * What a RETIRE has to carry.
 *
 * Stopping a tool is an operation, not an absence of one. Data has to go
 * somewhere, devices have to come back, and the patients already flagged by it
 * are still owed the follow-up the trial promised them.
 */
export const RetirementTermsSchema = z.object({
  dataPlan: z.string().min(1),
  devicePlan: z.string().min(1),
  patientContinuityPlan: z.string().min(1),
  effectiveFrom: z.string().min(1),
});
export type RetirementTerms = z.infer<typeof RetirementTermsSchema>;

export const OutcomeDecisionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  hospitalId: z.string(),
  hospitalName: z.string(),
  /** The charter this decision closes. */
  charterId: z.string(),
  decision: OutcomeDecisionEnum,
  decidedAt: z.string(),
  chair: AttributionSchema,
  quorum: z.object({ present: z.number(), total: z.number() }),
  dissent: z.array(
    z.object({ member: z.string(), position: z.string(), resolution: z.string(), accepted: z.boolean() })
  ),
  /**
   * THE RULE AS APPLIED, copied from the charter at decision time.
   *
   * Not a reference to the charter: a reader six months later has to be able
   * to see the sentence that was applied without trusting that the charter
   * still says what it said. The clause is the one the predicate matched.
   */
  ruleApplied: z.object({ clause: z.string(), text: z.string(), why: z.string() }),
  /** Exactly one of these, matching `decision`. Enforced, not assumed. */
  extension: ExtensionTermsSchema.nullable(),
  adoption: AdoptionTermsSchema.nullable(),
  retirement: RetirementTermsSchema.nullable(),
  supersedes: z.string().nullable(),
  revision: z.number(),
});
export type OutcomeDecision = z.infer<typeof OutcomeDecisionSchema>;

// ═════════════════════════════════════════════════════════════════════════
// S25 · Closeout and ownership
// ═════════════════════════════════════════════════════════════════════════

/**
 * A NAMED PERSON, never a function.
 *
 * "Site referral coordinator closes the loop" names nobody, so nobody does it.
 * An orphaned tool running unowned in a clinical pathway is the exact failure
 * this record exists to prevent, and naming a function instead of a person is
 * how it happens — the post is vacant and the record still reads as filled.
 */
export const OwnerSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  /** The organisation they belong to. A name with no employer is half a name. */
  org: z.string().min(1),
  detail: z.string().nullable(),
});
export type Owner = z.infer<typeof OwnerSchema>;

export const CloseoutSchema = z.object({
  id: z.string(),
  slug: z.string(),
  hospitalId: z.string(),
  /** The outcome decision this closeout implements. */
  decisionId: z.string(),
  runs: OwnerSchema,
  maintainsModel: OwnerSchema,
  maintainsIntegration: OwnerSchema,
  pays: z.string().min(1),
  referralBackstop: OwnerSchema,
  performanceMonitoring: OwnerSchema,
  monitoringCadence: z.string().min(1),
  handoverAt: z.string(),
  nextReviewAt: z.string(),
  /** What happens the moment any named post falls vacant. */
  ownerVacancyTrigger: z.string().min(1),
});
export type Closeout = z.infer<typeof CloseoutSchema>;

// ═════════════════════════════════════════════════════════════════════════
// S27 · Review schedule and triggers
// ═════════════════════════════════════════════════════════════════════════

export const TriggerKindEnum = z.enum([
  "SCHEDULED_REVIEW",
  "MODEL_VERSION_CHANGE",
  "CARD_EXPIRY",
  "MATERIAL_SAFETY_EVENT",
  "OWNER_VACANT",
  "USAGE_BELOW_FLOOR",
]);
export type TriggerKind = z.infer<typeof TriggerKindEnum>;

/** What firing DOES. A notice that changes no state is a notice nobody acts on. */
export const TriggerEffectEnum = z.enum([
  /** Due on its date, and nothing changes before it. Not every trigger bites. */
  "REVIEW_ON_SCHEDULE",
  "SUSPEND_CARD",
  "PAUSE_RUN",
  "EXPIRE_LISTING",
  "STOP_IMMEDIATELY",
  "FLAG_FOR_REVIEW",
  "BRING_REVIEW_FORWARD",
]);
export type TriggerEffect = z.infer<typeof TriggerEffectEnum>;

export const ReviewTriggerSchema = z.object({
  kind: TriggerKindEnum,
  label: z.string().min(1),
  /** "armed" — watching, not fired. "due" — a date it will fire on. */
  state: z.enum(["armed", "due", "fired"]),
  /** What it is watching, in the reader's terms. */
  watching: z.string().min(1),
  /** The date it fires on, where it has one. */
  dueAt: z.string().nullable(),
  effects: z.array(TriggerEffectEnum).min(1),
  /** What the reader sees change when it fires. */
  consequence: z.string().min(1),
});
export type ReviewTrigger = z.infer<typeof ReviewTriggerSchema>;
