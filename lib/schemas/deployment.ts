import { z } from "zod";

/**
 * Deployment — the Journey C record (BUILD_SPEC §6, §8).
 *
 * Two DISTINCT workflows for a defined period, driven by the request type:
 *   - trial      (Tier B request): ethics/CTRI setup → enrolment → monitoring →
 *                 analysis → closeout. eTMF/ethics/CTRI docs; study endpoints.
 *   - deployment (Tier A request): setup → go-live → monitoring → review →
 *                 handover. Lighter docs; operational scorecard.
 */
export const DeploymentKindEnum = z.enum(["trial", "deployment"]);
export type DeploymentKind = z.infer<typeof DeploymentKindEnum>;

/** Trial phases, in order. */
export const TrialPhaseEnum = z.enum([
  "ethics_setup",
  "enrolment",
  "monitoring",
  "analysis",
  "closeout",
]);
/** Deployment phases, in order. */
export const OpsPhaseEnum = z.enum([
  "setup",
  "go_live",
  "monitoring",
  "review",
  "handover",
]);
/** Any phase key (the two sets share "monitoring"). */
export const PhaseEnum = z.enum([
  "ethics_setup",
  "enrolment",
  "monitoring",
  "analysis",
  "closeout",
  "setup",
  "go_live",
  "review",
  "handover",
]);
export type Phase = z.infer<typeof PhaseEnum>;

/** A trial study endpoint (analysis phase) — vs the operational scorecard. */
export const TrialEndpointSchema = z.object({
  name: z.string(),
  kind: z.enum(["primary", "secondary"]),
  target: z.string(),
  result: z.string(),
  met: z.boolean(),
});
export type TrialEndpoint = z.infer<typeof TrialEndpointSchema>;

/** Live metric card (enrolment, docs %, alerts, follow-up). */
export const MetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  /** Optional secondary line, e.g. target or trend. */
  hint: z.string().optional(),
});
export type Metric = z.infer<typeof MetricSchema>;

/** Monitoring alert with escalation note. */
export const AlertSchema = z.object({
  id: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  title: z.string(),
  detail: z.string(),
  escalation: z.string(),
});
export type Alert = z.infer<typeof AlertSchema>;

/** A workflow role with a live status tag. */
export const WorkflowRoleSchema = z.object({
  role: z.string(),
  person: z.string(),
  status: z.enum(["assigned", "pending", "active", "complete"]),
});
export type WorkflowRole = z.infer<typeof WorkflowRoleSchema>;

/** One line of the auto-generated evaluation scorecard. */
export const ScorecardLineSchema = z.object({
  key: z.enum(["clinical", "workflow", "referral", "cost", "equity"]),
  label: z.string(),
  score: z.number(), // 0–100
  note: z.string(),
});
export type ScorecardLine = z.infer<typeof ScorecardLineSchema>;

/** SCALE / STOP recommendation from the report phase. */
export const RecommendationSchema = z.object({
  decision: z.enum(["SCALE", "STOP", "EXTEND"]),
  rationale: z.string(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

/** Handover ownership plan (BUILD_SPEC §8). */
export const OwnershipPlanSchema = z.object({
  runs: z.string(),
  maintains: z.string(),
  pays: z.string(),
  referralBackstop: z.string(),
  monitoringCadence: z.string(),
});
export type OwnershipPlan = z.infer<typeof OwnershipPlanSchema>;

/** Drift-watch panel (monitoring phase). */
export const DriftWatchSchema = z.object({
  sensitivity: z.string(),
  jsd: z.string(), // Jensen–Shannon divergence, in/out of band
  oodFlag: z.boolean(), // out-of-distribution flag
});
export type DriftWatch = z.infer<typeof DriftWatchSchema>;

export const DeploymentSchema = z.object({
  id: z.string(),
  submissionId: z.string(),
  hospitalId: z.string(),
  toolId: z.string(),
  kind: DeploymentKindEnum,
  phase: PhaseEnum,
  dayOf: z.number(),
  totalDays: z.number(),
  metrics: z.array(MetricSchema),
  alerts: z.array(AlertSchema),
  driftWatch: DriftWatchSchema,
  roles: z.array(WorkflowRoleSchema),
  docIds: z.array(z.string()),
  /** Deployment "review" phase output. */
  scorecard: z.array(ScorecardLineSchema),
  /** Trial "analysis" phase output. */
  endpoints: z.array(TrialEndpointSchema),
  recommendation: RecommendationSchema.nullable(),
  ownership: OwnershipPlanSchema.nullable(),
  /** Trial only — whether the CTRI registration draft has been prepared. */
  ctriPrepared: z.boolean(),
  published: z.boolean(),
  createdAt: z.string(),
});
export type Deployment = z.infer<typeof DeploymentSchema>;

/**
 * Registry entry — the marketplace record for an assessed / deployed tool
 * (BUILD_SPEC §6, §8). Populated/updated when a deployment publishes.
 */
export const RegistryEntrySchema = z.object({
  toolId: z.string(),
  verdict: z.enum(["DEPLOY", "CONDITIONS", "NOTYET"]),
  status: z.enum(["assessed", "piloting", "deployed"]),
  deployedAt: z.string().nullable(),
  publishedResult: z
    .object({
      hospitalId: z.string(),
      recommendation: z.enum(["SCALE", "STOP", "EXTEND"]),
      headline: z.string(),
    })
    .nullable(),
});
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;
