/**
 * Barrel re-export for every ClearPath entity schema + type.
 * Mirrors the ClearPath `lib/schemas/index.ts` convention.
 */
export * from "./gate";
export * from "./readiness-card";
export * from "./site";
export * from "./audit";
export * from "./vendor";
export * from "./tool";
export * from "./document";
export * from "./hospital";
export * from "./submission";
export * from "./deployment";

// v2 data model (Phase 1).
export * from "./evidence";
export * from "./item";
export * from "./score";
export * from "./site-profile";

/**
 * `context.ts` is re-exported by name rather than with `export *`, because it
 * defines its own `CareLevelEnum` — the framework's facility taxonomy — which
 * collides with the vendor-facing one in `tool.ts`. The two are genuinely
 * different enums (see the note in context.ts), so neither is renamed at
 * source; the barrel disambiguates instead.
 */
export {
  PathEnum,
  CareLevelEnum as ContextCareLevelEnum,
  OperatorCadreEnum,
  DeploymentModeEnum,
  AutonomyEnum,
  TargetPopulationSchema,
  SubmissionContextSchema,
  CARE_LEVEL_LABEL,
  OPERATOR_CADRE_LABEL,
  COMMUNITY_CARE_LEVELS,
} from "./context";
export type {
  SubmissionPath,
  ContextCareLevel,
  OperatorCadre,
  DeploymentMode,
  Autonomy,
  TargetPopulation,
  SubmissionContext,
} from "./context";
