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

export const SubmissionContextSchema = z.object({
  path: PathEnum,
  careLevel: CareLevelEnum,
  operatorCadre: OperatorCadreEnum,
  /** e.g. "Anaemia Mukt Bharat" — the programme the deployment sits inside. */
  programmeLine: z.string().optional(),
  geography: z.string(),
  deploymentMode: DeploymentModeEnum,
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
