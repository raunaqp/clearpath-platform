import { z } from "zod";

/**
 * Tool — the thing being assessed (BUILD_SPEC §3, §6).
 *
 * `category` mirrors the ClearPath decomposer idea: a "platform" isn't
 * assessed directly — Journey A asks "which feature are we assessing?" and
 * scopes down to one of the concrete categories.
 */
export const ToolCategoryEnum = z.enum([
  "screening",
  "samd",
  "point-of-care",
  "cds",
  "patient-facing",
  "platform",
]);
export type ToolCategory = z.infer<typeof ToolCategoryEnum>;

/**
 * Intended level of care. Placement (BUILD_SPEC §7) is derived from this plus
 * whether the tool is operable in real conditions (gate G6).
 */
export const CareLevelEnum = z.enum([
  "tertiary", // tertiary hospital / referral centre
  "secondary", // district / secondary hospital
  "primary", // primary health centre (PHC)
  "community", // community health centre / sub-centre (CHC)
  "home", // patient-facing / home
]);
export type CareLevel = z.infer<typeof CareLevelEnum>;

export const ToolSchema = z.object({
  id: z.string(),
  /** URL slug for clean paths (e.g. "cerviai" → /registry/cerviai). */
  slug: z.string(),
  vendorId: z.string(),
  name: z.string(),
  category: ToolCategoryEnum,
  /** If category is "platform", the scoped feature actually being assessed. */
  scopedFeature: z.string().optional(),
  description: z.string(),
  intendedUse: z.string(),
  careLevel: CareLevelEnum,
  /** Calibrated device-class label for the registry (soft language, e.g.
   *  "B/C (AI-CDS)"). Never asserts a specific CDSCO form. */
  deviceClass: z.string().optional(),
  /**
   * BODH validation score (0–100 per axis), sourced from the BODH platform (a
   * mock hook here — see `getBodhScore`). Feeds the clinical + fairness gates.
   */
  bodhScore: z
    .object({ accuracy: z.number(), fairness: z.number(), safety: z.number() })
    .optional(),
  docIds: z.array(z.string()),
});
export type Tool = z.infer<typeof ToolSchema>;
