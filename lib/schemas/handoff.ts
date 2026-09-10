import { z } from "zod";

/**
 * The ClearPath handoff — interest, facilitation, and the structured request.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE CORRECTION THESE TYPES EXIST FOR
 * ─────────────────────────────────────────────────────────────────────────
 * The innovator does NOT trigger hospital intake. Before this, "Request
 * clinical trial" on the matching screen wrote a submission straight into a
 * hospital's inbox, which skipped the only thing ClearPath actually does:
 * validate that the fit is real, get the innovator's permission to share, and
 * approach the hospital on their behalf.
 *
 * Interest goes to ClearPath. ClearPath validates and approaches. Only once
 * BOTH sides have indicated willingness does a structured request form open.
 * Without that layer the platform is a directory with a verdict attached.
 *
 *   Assessed → Interest with ClearPath → Hospital approached → Hospital received
 */

// ═════════════════════════════════════════════════════════════════════════
// S10 · Interest, expressed TO CLEARPATH
// ═════════════════════════════════════════════════════════════════════════

/**
 * Who the interest was submitted to. A literal with ONE value, on purpose:
 * making it a field that could name a hospital is what allowed the old flow to
 * exist. Interest cannot be addressed to a hospital, and the type says so.
 */
export const InterestRecipientEnum = z.literal("CLEARPATH");

export const PreferredModeEnum = z.enum(["TRIAL_UNDER_CHARTER", "ROUTINE_DEPLOYMENT"]);
export type PreferredMode = z.infer<typeof PreferredModeEnum>;

/**
 * Permission to share the card with a matched hospital.
 *
 * A REAL GATE, not a checkbox. Nothing about this tool reaches any hospital
 * until the innovator grants it, and facilitation refuses to proceed without
 * it. The scope is fixed at the whole card — an innovator cannot grant
 * permission to share a verdict with its conditions removed, because that
 * would be sharing a verdict with its meaning removed.
 */
export const SharingPermissionSchema = z.object({
  granted: z.boolean(),
  scope: z.literal("CARD_IN_FULL_CONDITIONS_INTACT"),
  grantedAt: z.string().nullable(),
  /** Stated explicitly so a reader knows what is NOT going over. */
  excludes: z.array(z.string()),
});
export type SharingPermission = z.infer<typeof SharingPermissionSchema>;

export const InterestStateEnum = z.literal("INTEREST_RECEIVED_BY_CLEARPATH");

export const InterestRecordSchema = z.object({
  id: z.string(),
  toolId: z.string(),
  slug: z.string(),
  /** The card version the innovator is offering to share. */
  cardId: z.string(),
  cardVersion: z.string(),
  submittedTo: InterestRecipientEnum,
  contact: z.object({ name: z.string(), role: z.string() }),
  /** What the innovator wants out of this, in their words. */
  objective: z.string(),
  /**
   * Card items this engagement is meant to close. Item ids rather than prose,
   * so the request's condition plan can be checked against what was promised.
   */
  targetConditionItemIds: z.array(z.string()),
  geography: z.object({ state: z.string(), districtPreferred: z.string().optional() }),
  preferredMode: PreferredModeEnum,
  sharingPermission: SharingPermissionSchema,
  state: InterestStateEnum,
  createdAt: z.string(),
});
export type InterestRecord = z.infer<typeof InterestRecordSchema>;

// ═════════════════════════════════════════════════════════════════════════
// S11 · Facilitation
// ═════════════════════════════════════════════════════════════════════════

/**
 * The four states, in order. This is the governance firewall made visible.
 *
 * FIT_VALIDATED       ClearPath checks the card against the site's own
 *                     operating profile and problem register — the records the
 *                     site published before this tool arrived.
 * SHARING_CONFIRMED   the innovator's permission is confirmed and scoped.
 * HOSPITAL_APPROACHED a curated introduction pack goes to the hospital.
 * BOTH_SIDES_WILLING  the hospital indicates it will receive a request. ONLY
 *                     now does the request form open.
 */
export const FacilitationStepEnum = z.enum([
  "FIT_VALIDATED",
  "SHARING_CONFIRMED",
  "HOSPITAL_APPROACHED",
  "BOTH_SIDES_WILLING",
]);
export type FacilitationStep = z.infer<typeof FacilitationStepEnum>;

export const FACILITATION_ORDER: FacilitationStep[] = [
  "FIT_VALIDATED",
  "SHARING_CONFIRMED",
  "HOSPITAL_APPROACHED",
  "BOTH_SIDES_WILLING",
];

export const FACILITATION_LABEL: Record<FacilitationStep, string> = {
  FIT_VALIDATED: "Fit validated",
  SHARING_CONFIRMED: "Sharing confirmed",
  HOSPITAL_APPROACHED: "Hospital approached",
  BOTH_SIDES_WILLING: "Both sides willing",
};

export const FacilitationEntrySchema = z.object({
  step: FacilitationStepEnum,
  completed: z.boolean(),
  /** null while the step is still ahead. */
  at: z.string().nullable(),
  detail: z.string(),
  /** Supporting lines — what was checked, what was sent. */
  points: z.array(z.string()),
});
export type FacilitationEntry = z.infer<typeof FacilitationEntrySchema>;

export const FacilitationRecordSchema = z.object({
  id: z.string(),
  interestId: z.string(),
  toolId: z.string(),
  slug: z.string(),
  hospitalId: z.string(),
  hospitalName: z.string(),
  entries: z.array(FacilitationEntrySchema),
  /** The furthest completed step, or null before anything has happened. */
  currentStep: FacilitationStepEnum.nullable(),
});
export type FacilitationRecord = z.infer<typeof FacilitationRecordSchema>;

// ═════════════════════════════════════════════════════════════════════════
// S12 · The structured deployment request
// ═════════════════════════════════════════════════════════════════════════

/**
 * A plan for ONE open condition, with a NAMED SUPPLIER.
 *
 * Structured rather than free text on purpose. This is the object a hospital
 * reads when deciding whether to accept, and "we'll sort out the validation"
 * in a paragraph is not something a hospital can hold anyone to. Every open
 * condition gets a row, someone's name is against it, and a prerequisite that
 * must be true before day 1 is a field rather than a sentence buried in prose.
 */
export const ConditionPlanSchema = z.object({
  /** The card item this closes, e.g. "D1.B.01". */
  itemId: z.string(),
  /** Its legacy gate id, for a readable row. */
  gateId: z.string(),
  label: z.string(),
  blocks: z.enum(["TRIAL", "ROUTINE_DEPLOYMENT"]),
  /** How this engagement closes it. */
  plan: z.string(),
  /** WHO supplies it. Never blank — an unowned plan is a wish. */
  suppliedBy: z.string(),
  /** Something that must be true before day 1, if any. */
  prerequisite: z
    .object({ description: z.string(), dueBy: z.string() })
    .nullable(),
});
export type ConditionPlan = z.infer<typeof ConditionPlanSchema>;

/** Support intensity over time — the taper, as steps rather than a sentence. */
export const SupportPhaseSchema = z.object({
  fromWeek: z.number(),
  /** null = to the end of the engagement. */
  toWeek: z.number().nullable(),
  level: z.string(),
});
export type SupportPhase = z.infer<typeof SupportPhaseSchema>;

/**
 * What the hospital can do with this once received. UNDER_ASSESSMENT is a
 * hospital working through it — a delay, not a denial — and COUNTERED is a
 * hospital proposing different terms rather than refusing.
 */
export const RequestStatusEnum = z.enum([
  "DRAFT",
  "SENT",
  "RECEIVED",
  "UNDER_ASSESSMENT",
  "ACCEPTED",
  "DECLINED",
  "COUNTERED",
]);
export type RequestStatus = z.infer<typeof RequestStatusEnum>;

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent to hospital",
  RECEIVED: "Hospital received",
  UNDER_ASSESSMENT: "Under assessment",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  COUNTERED: "Countered",
};

export const DeploymentRequestSchema = z.object({
  id: z.string(),
  facilitationId: z.string(),
  toolId: z.string(),
  slug: z.string(),
  toolName: z.string(),
  hospitalId: z.string(),
  hospitalName: z.string(),
  /** The exact card version the hospital is being asked to act on. */
  cardId: z.string(),
  cardVersion: z.string(),

  mode: z.enum(["trial", "deployment"]),
  /**
   * The register entry this claims to address, by id.
   *
   * Hospital intake needs to name it — a request that says "cervical screening"
   * in prose cannot be checked against the register the site actually
   * published, and the site is the only party entitled to say what its
   * priorities are. Nullable because a request may legitimately address
   * something the site has not ranked; that is a finding for intake, not a
   * reason to refuse the request.
   */
  problemRegisterEntryId: z.string().nullable(),
  /** The single question the engagement answers. */
  question: z.string(),
  scope: z.object({
    sites: z.number(),
    siteType: z.string(),
    days: z.number(),
    participants: z.number(),
    operatorCadre: z.string(),
  }),
  supportTaper: z.array(SupportPhaseSchema),
  devices: z.object({
    count: z.number(),
    description: z.string(),
    offlineCapture: z.boolean(),
    replacementHours: z.number(),
  }),
  training: z.object({ hoursPerOperator: z.number(), operatorCount: z.number() }),
  /**
   * The hospital's own data, out. Formats and notice period are fields because
   * "on request" with an undefined notice period is how export becomes
   * theoretical.
   */
  dataExport: z.object({
    formats: z.array(z.string()),
    onRequest: z.boolean(),
    noticePeriodDays: z.number(),
  }),
  modelPolicy: z.object({
    frozenForDuration: z.boolean(),
    onChange: z.enum(["STOP_AND_REVIEW", "NOTIFY", "NONE"]),
  }),
  conditionPlans: z.array(ConditionPlanSchema),

  status: RequestStatusEnum,
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  /** Set by the hospital in Phase 6. Not written from the innovator side. */
  hospitalResponse: z
    .object({ status: RequestStatusEnum, at: z.string(), note: z.string() })
    .nullable(),
});
export type DeploymentRequest = z.infer<typeof DeploymentRequestSchema>;

/** The journey state shown to the innovator across Act A. */
export const HandoffStateEnum = z.enum([
  "ASSESSED",
  "INTEREST_WITH_CLEARPATH",
  "HOSPITAL_APPROACHED",
  "HOSPITAL_RECEIVED",
]);
export type HandoffState = z.infer<typeof HandoffStateEnum>;

export const HANDOFF_STATE_LABEL: Record<HandoffState, string> = {
  ASSESSED: "Assessed",
  INTEREST_WITH_CLEARPATH: "Interest with ClearPath",
  HOSPITAL_APPROACHED: "Hospital approached",
  HOSPITAL_RECEIVED: "Hospital received",
};
