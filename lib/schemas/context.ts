import { z } from "zod";

/**
 * Submission context — WHERE and BY WHOM a tool is being deployed.
 *
 * This is the single most important addition of the v2 data model. The old
 * card asserted a tool was "deployable" full stop. A Readiness Card is valid
 * ONLY inside the context it was issued for: the same tool that is deployable
 * at a district hospital with a lab technician may be nothing of the kind at a
 * sub-centre with an ANM. The card carries a FROZEN COPY of this object so a
 * reader can never mistake one context's verdict for another's.
 *
 * NOTE ON NAMING: `CareLevelEnum` here is NOT the same enum as the one in
 * `tool.ts`. That one is the vendor's coarse intended level of care
 * (tertiary/secondary/primary/community/home); this one is the framework's
 * facility taxonomy, which distinguishes public tiers from private ones. The
 * schema barrel re-exports this one as `ContextCareLevelEnum` to keep both
 * reachable without a collision.
 */

/** Which procurement path the submission is on. Selects the D2 item variant. */
export const PathEnum = z.enum(["PUBLIC_PROCUREMENT", "PRIVATE_INVESTMENT"]);
export type SubmissionPath = z.infer<typeof PathEnum>;

/** Facility type the tool is being deployed into. */
export const CareLevelEnum = z.enum([
  "SUB_CENTRE",
  "PHC",
  "CHC",
  "DISTRICT_HOSPITAL",
  "PRIVATE_SECONDARY",
  "PRIVATE_TERTIARY",
  "PRIVATE_CLINIC",
]);
export type ContextCareLevel = z.infer<typeof CareLevelEnum>;

/**
 * Who actually operates the tool. Evidence generated with a specialist in the
 * loop does not transfer to an ANM without being flagged — see
 * `computeGeneralisability`.
 */
export const OperatorCadreEnum = z.enum([
  "NO_OPERATOR",
  "SELF_PROVIDED",
  "ANM",
  "MO",
  "STAFF_NURSE",
  "LAB_TECHNICIAN",
  "CLINICIAN",
  "SPECIALIST",
  "PATIENT",
]);
export type OperatorCadre = z.infer<typeof OperatorCadreEnum>;

/** How the tool reaches the patient. */
export const DeploymentModeEnum = z.enum(["CAMP", "OPD_QUEUE", "WARD", "HOME_VISIT"]);
export type DeploymentMode = z.infer<typeof DeploymentModeEnum>;

/**
 * How much of the decision the tool takes. INFORMS < RECOMMENDS < DECIDES.
 * Raising autonomy raises what the evidence has to carry.
 */
export const AutonomyEnum = z.enum(["INFORMS", "RECOMMENDS", "DECIDES"]);
export type Autonomy = z.infer<typeof AutonomyEnum>;

/** The patient population the tool is pointed at in this context. */
export const TargetPopulationSchema = z.object({
  ageRange: z.string(),
  sex: z.enum(["ALL", "FEMALE", "MALE"]),
  pregnancyStatus: z.string().optional(),
  comorbidity: z.string().optional(),
  geography: z.string(),
});
export type TargetPopulation = z.infer<typeof TargetPopulationSchema>;

/**
 * The submitting entity.
 *
 * `verified` is about the ORGANISATION, not the tool — whether ClearPath has
 * confirmed the company is who it says it is. It says nothing about the
 * evidence, and the card must never let the two be read as one.
 *
 * `conflictsDeclared` is a list rather than a boolean because an empty list and
 * an undeclared conflict look identical in a boolean, and the difference is the
 * whole value of asking.
 */
export const SubmittingEntitySchema = z.object({
  name: z.string(),
  verified: z.boolean(),
  conflictsDeclared: z.array(z.string()),
});
export type SubmittingEntity = z.infer<typeof SubmittingEntitySchema>;

/**
 * How far along the thing actually is.
 *
 * Only DEPLOYABLE_BUILD may be assessed. A readiness assessment of a prototype
 * would be a readiness assessment of an intention: the questions the framework
 * asks — does it fail safe under real caseload, do operators keep using it —
 * have no answers yet, and producing a card anyway would hand a vendor a
 * document that outlives the caveat attached to it.
 *
 * The screen says so plainly. Silently producing a weak card would be worse:
 * the vendor would read it as a hard assessment rather than a category error.
 */
export const BuildStatusEnum = z.enum(["DEPLOYABLE_BUILD", "PROTOTYPE", "CONCEPT"]);
export type BuildStatus = z.infer<typeof BuildStatusEnum>;

export const BUILD_STATUS_LABEL: Record<BuildStatus, string> = {
  DEPLOYABLE_BUILD: "Deployable build",
  PROTOTYPE: "Prototype",
  CONCEPT: "Concept",
};

/** Whether this build can be assessed at all. */
export function canBeAssessed(status: BuildStatus): boolean {
  return status === "DEPLOYABLE_BUILD";
}

export const SubmissionContextSchema = z.object({
  entity: SubmittingEntitySchema,
  buildStatus: BuildStatusEnum,
  /**
   * The single sentence the tool is being assessed against. Not marketing copy:
   * everything downstream — which items apply, what evidence has to cover, what
   * the verdict is a verdict ABOUT — is scoped by this one line.
   */
  exactClaim: z.string(),
  /**
   * What the vendor states the tool is NOT for. Declared up front rather than
   * discovered later, because an exclusion a vendor writes down before seeing
   * their result is worth more than one they add after.
   */
  outOfScope: z.array(z.string()),
  path: PathEnum,
  careLevel: CareLevelEnum,
  operatorCadre: OperatorCadreEnum,
  /** e.g. "Anaemia Mukt Bharat" — the programme the deployment sits inside. */
  programmeLine: z.string().optional(),
  geography: z.string(),
  /**
   * A LIST, not one value. Phase 1 modelled this as a single mode, but both the
   * NeoScan and CerviAI contexts are "camp AND OPD queue" — screening runs in
   * outreach camps and again in the clinic queue, on the same device, with the
   * same operator. Forcing a choice between them would have made the frozen
   * context on the card a smaller claim than the deployment it describes.
   */
  deploymentModes: z.array(DeploymentModeEnum).min(1),
  population: TargetPopulationSchema,
  autonomyLevel: AutonomyEnum,
});
export type SubmissionContext = z.infer<typeof SubmissionContextSchema>;

/** Human-readable labels — used in generalisability reasons and on cards. */
export const CARE_LEVEL_LABEL: Record<ContextCareLevel, string> = {
  SUB_CENTRE: "sub-centre",
  PHC: "primary health centre",
  CHC: "community health centre",
  DISTRICT_HOSPITAL: "district hospital",
  PRIVATE_SECONDARY: "private secondary hospital",
  PRIVATE_TERTIARY: "private tertiary hospital",
  PRIVATE_CLINIC: "private clinic",
};

export const OPERATOR_CADRE_LABEL: Record<OperatorCadre, string> = {
  NO_OPERATOR: "no operator (fully automated)",
  SELF_PROVIDED: "vendor-provided operator",
  ANM: "ANM",
  MO: "medical officer",
  STAFF_NURSE: "staff nurse",
  LAB_TECHNICIAN: "lab technician",
  CLINICIAN: "clinician",
  SPECIALIST: "specialist",
  PATIENT: "patient",
};

/**
 * Community-facing settings versus facility-based ones. Used to explain a
 * setting mismatch in plain words rather than just naming two enum values.
 */
export const COMMUNITY_CARE_LEVELS: ReadonlyArray<ContextCareLevel> = [
  "SUB_CENTRE",
  "PHC",
];

/** Deployment modes, in the words a card reader uses. */
export const DEPLOYMENT_MODE_LABEL: Record<DeploymentMode, string> = {
  CAMP: "screening camp",
  OPD_QUEUE: "OPD queue",
  WARD: "ward",
  HOME_VISIT: "home visit",
};

/** Autonomy, spelled out so "RECOMMENDS" never reaches a reader raw. */
export const AUTONOMY_LABEL: Record<Autonomy, string> = {
  INFORMS: "informs, does not recommend",
  RECOMMENDS: "recommends, does not decide",
  DECIDES: "decides",
};

/**
 * Which operator cadres a setting typically staffs. Used to work out which
 * settings a card explicitly EXCLUDES: an assessment run with a staff nurse at
 * a CHC says nothing about a sub-centre, which does not staff one.
 *
 * Deliberately about the CADRE rather than a notion of "smaller" facilities —
 * a tool does not become unsafe because a building is smaller, it becomes
 * unsafe because the person holding it was never assessed holding it.
 */
export const CADRE_AVAILABILITY: Record<ContextCareLevel, OperatorCadre[]> = {
  SUB_CENTRE: ["ANM", "PATIENT", "NO_OPERATOR", "SELF_PROVIDED"],
  PHC: ["ANM", "MO", "STAFF_NURSE", "LAB_TECHNICIAN", "PATIENT", "NO_OPERATOR", "SELF_PROVIDED"],
  CHC: ["ANM", "MO", "STAFF_NURSE", "LAB_TECHNICIAN", "CLINICIAN", "PATIENT", "NO_OPERATOR", "SELF_PROVIDED"],
  DISTRICT_HOSPITAL: ["ANM", "MO", "STAFF_NURSE", "LAB_TECHNICIAN", "CLINICIAN", "SPECIALIST", "PATIENT", "NO_OPERATOR", "SELF_PROVIDED"],
  PRIVATE_SECONDARY: ["MO", "STAFF_NURSE", "LAB_TECHNICIAN", "CLINICIAN", "SPECIALIST", "PATIENT", "NO_OPERATOR", "SELF_PROVIDED"],
  PRIVATE_TERTIARY: ["MO", "STAFF_NURSE", "LAB_TECHNICIAN", "CLINICIAN", "SPECIALIST", "PATIENT", "NO_OPERATOR", "SELF_PROVIDED"],
  PRIVATE_CLINIC: ["MO", "STAFF_NURSE", "CLINICIAN", "PATIENT", "NO_OPERATOR", "SELF_PROVIDED"],
};

/** Public-procurement settings, in ladder order. */
export const PUBLIC_CARE_LEVELS: ContextCareLevel[] = [
  "SUB_CENTRE",
  "PHC",
  "CHC",
  "DISTRICT_HOSPITAL",
];

/** Private-investment settings. */
export const PRIVATE_CARE_LEVELS: ContextCareLevel[] = [
  "PRIVATE_CLINIC",
  "PRIVATE_SECONDARY",
  "PRIVATE_TERTIARY",
];

/**
 * Short care-level labels — the form a card reader actually says out loud.
 * "at CHC level", not "at community health centre level".
 */
export const CARE_LEVEL_SHORT: Record<ContextCareLevel, string> = {
  SUB_CENTRE: "sub-centre",
  PHC: "PHC",
  CHC: "CHC",
  DISTRICT_HOSPITAL: "district hospital",
  PRIVATE_SECONDARY: "private secondary",
  PRIVATE_TERTIARY: "private tertiary",
  PRIVATE_CLINIC: "private clinic",
};
