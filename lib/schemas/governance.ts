import { z } from "zod";

/**
 * Hospital governance — the audit's owners, the committee's verdict, the
 * placement decision and the trial charter.
 *
 * These four are the institution's own record. The vendor's Readiness Card is
 * an INPUT to them and never a conclusion: the hospital forms its own verdict,
 * and where the two disagree the hospital's governs deployment at its site.
 */

// ═════════════════════════════════════════════════════════════════════════
// S17 · Who owned each gate, and what they looked at
// ═════════════════════════════════════════════════════════════════════════

/**
 * A named individual against every gate.
 *
 * Not a committee, not a department — a person. Six months later, when the tool
 * is being defended or discontinued, "the committee assessed consent" is not
 * something anyone can be asked about; "R. Venkatesan, Data Protection Officer"
 * is. `evidence` records what they actually looked at, so a pass is checkable
 * rather than asserted.
 */
export const AuditAssignmentSchema = z.object({
  gateId: z.string(),
  ownerName: z.string(),
  ownerRole: z.string(),
  evidence: z.string().nullable(),
});
export type AuditAssignment = z.infer<typeof AuditAssignmentSchema>;

// ═════════════════════════════════════════════════════════════════════════
// S18 · The committee verdict
// ═════════════════════════════════════════════════════════════════════════

export const CommitteeDecisionEnum = z.enum([
  "DEPLOY",
  "TRIAL_UNDER_CHARTER",
  "CONDITIONAL_HOLD",
  "DECLINE",
]);
export type CommitteeDecision = z.infer<typeof CommitteeDecisionEnum>;

export const COMMITTEE_DECISION_LABEL: Record<CommitteeDecision, string> = {
  DEPLOY: "Deploy",
  TRIAL_UNDER_CHARTER: "Trial under charter",
  CONDITIONAL_HOLD: "Conditional hold",
  DECLINE: "Decline",
};

/** A declared conflict, and whether the member stood down over it. */
export const ConflictSchema = z.object({
  member: z.string(),
  nature: z.string(),
  recused: z.boolean(),
});

/**
 * A dissent, recorded whether or not it changed the outcome.
 *
 * A verdict that records only agreement is a verdict nobody can audit. Where a
 * dissent was accepted, the record says so and points at where it landed — here,
 * into the charter's review points.
 */
export const DissentSchema = z.object({
  member: z.string(),
  position: z.string(),
  resolution: z.string(),
  accepted: z.boolean(),
});

/**
 * IMMUTABLE AND ATTRIBUTABLE.
 *
 * This is the institution's protection six months later. A verdict that could
 * be edited is a verdict that proves nothing about what was decided at the
 * time — so the store is append-only, and a reversal is a NEW verdict carrying
 * `supersedes`, never a change to the old one.
 */
export const CommitteeVerdictSchema = z.object({
  id: z.string(),
  slug: z.string(),
  requestId: z.string(),
  hospitalId: z.string(),
  hospitalName: z.string(),
  decision: CommitteeDecisionEnum,
  decidedAt: z.string(),
  chair: z.object({ name: z.string(), role: z.string() }),
  quorum: z.object({ present: z.number(), total: z.number() }),
  conflicts: z.array(ConflictSchema),
  /** Conditions this site attaches, over and above the card's. */
  localConditions: z.array(z.string()),
  dissent: z.array(DissentSchema),
  /** The verdict this one replaces. null on a first verdict. */
  supersedes: z.string().nullable(),
  /** 1, 2, 3 … Increments on each superseding verdict. */
  revision: z.number(),
});
export type CommitteeVerdict = z.infer<typeof CommitteeVerdictSchema>;

// ═════════════════════════════════════════════════════════════════════════
// S19 · Placement and site fit
// ═════════════════════════════════════════════════════════════════════════

export const TouchpointSchema = z.object({ actor: z.string(), action: z.string() });

export const PlacementRecordSchema = z.object({
  id: z.string(),
  slug: z.string(),
  hospitalId: z.string(),
  /** Where in the existing pathway the tool sits. */
  pathwayPosition: z.string(),
  /**
   * What the tool REMOVES. null means nothing is removed — which is a WARNING,
   * not a neutral answer: additive work at the frontline is the commonest cause
   * of a tool being quietly abandoned once the pilot team stops visiting. The
   * UI renders null as a flag rather than a blank.
   */
  replaces: z.string().nullable(),
  touchpoints: z.array(TouchpointSchema),
  /** Who may act on the output. Not always the person holding the device. */
  decisionAuthority: z.object({ role: z.string(), note: z.string() }),
  integration: z.object({
    emrWriteBack: z.boolean(),
    note: z.string(),
    exportCadence: z.string(),
  }),
  consentPoint: z.object({
    when: z.string(),
    language: z.string(),
    medium: z.string(),
    beforeCapture: z.boolean(),
  }),
  /**
   * A NUMBER, not prose. S23 measures observed load against this estimate, and
   * "about two minutes" cannot be compared to anything.
   */
  loadDeltaMinutesPerPatient: z.number(),
  /** What continues to run alongside, so a failure is not a gap in care. */
  fallback: z.string(),
});
export type PlacementRecord = z.infer<typeof PlacementRecordSchema>;

// ═════════════════════════════════════════════════════════════════════════
// S20 · The trial charter
// ═════════════════════════════════════════════════════════════════════════

/**
 * An endpoint, with WHERE IT CAME FROM attached.
 *
 * `derivedFrom` is the whole point. An endpoint traceable to a success
 * definition the site published before it saw any tool cannot have been fitted
 * to the data; one that appears for the first time in the charter can. The two
 * are distinguished here rather than left to a reader's trust.
 */
export const EndpointSchema = z.object({
  name: z.string(),
  threshold: z.string(),
  kind: z.enum(["primary", "secondary"]),
  derivedFrom: z.enum(["SUCCESS_DEFINITION_LITERAL", "SUCCESS_DEFINITION_OPERATIONALISED"]),
  /** The sentence in the success definition this rests on. */
  sourceText: z.string(),
});
export type Endpoint = z.infer<typeof EndpointSchema>;

export const TrialCharterSchema = z.object({
  id: z.string(),
  slug: z.string(),
  hospitalId: z.string(),
  requestId: z.string(),
  verdictId: z.string(),
  /** ONE named individual. There is no charter without one. */
  owner: z.object({ name: z.string(), role: z.string() }),
  question: z.string(),
  endpoints: z.array(EndpointSchema),
  scope: z.object({ participants: z.number(), days: z.number(), sites: z.number() }),
  stops: z.object({
    safety: z.string(),
    futility: z.string(),
    operational: z.string(),
  }),
  /**
   * FIXED NOW, BEFORE ANY DATA EXISTS.
   *
   * This single field is what makes the S24 outcome defensible rather than
   * negotiated once the numbers are in. Writing it afterwards is how a trial
   * that missed its endpoints becomes a trial that "showed promise".
   */
  decisionRule: z.object({ adopt: z.string(), extend: z.string(), retire: z.string() }),
  budget: z.object({ amount: z.number(), currency: z.string(), display: z.string() }),
  commitments: z.object({
    /** Mirrored from the vendor's DeploymentRequest — read, never retyped. */
    supportTaper: z.array(
      z.object({ fromWeek: z.number(), toWeek: z.number().nullable(), level: z.string() })
    ),
    modelVersionFrozen: z.boolean(),
  }),
  reviewPoints: z.array(
    z.object({ day: z.number(), name: z.string(), authorityToStop: z.boolean() })
  ),
  exit: z.object({
    deviceReturnDays: z.number(),
    dataExport: z.string(),
    followUp: z.string(),
  }),
  /** Provenance for the endpoints — the register entry and when it was published. */
  derivation: z.object({
    registerEntryId: z.string(),
    registerEntryName: z.string(),
    successDefinition: z.string(),
    publishedAt: z.string(),
    toolSubmittedAt: z.string(),
  }),
  createdAt: z.string(),
});
export type TrialCharter = z.infer<typeof TrialCharterSchema>;
