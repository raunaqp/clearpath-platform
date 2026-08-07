import { z } from "zod";
import { SiteReadinessCardSchema } from "./site";
import { CareLevelEnum, ToolCategoryEnum } from "./tool";

/** Hospital — the Journey B/C actor (BUILD_SPEC §6). Carries its own site
 *  readiness grade so the deployment workspace can gate on it, plus the fit
 *  signals used to match applicable tools to it (FIX 4). */
export const HospitalTierEnum = z.enum(["tertiary", "tier2", "tier3"]);
export type HospitalTier = z.infer<typeof HospitalTierEnum>;

export const HospitalSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: HospitalTierEnum,
  location: z.string(),
  /** One-line description of what the site does / is looking for. */
  focus: z.string(),
  /** Care levels the site operates — a tool fits only if its level is here. */
  acceptsCareLevels: z.array(CareLevelEnum),
  /** Tool categories the site is actively seeking. */
  seeking: z.array(ToolCategoryEnum),
  /** For a specialty centre (e.g. fertility) — scopes the inbox + readiness. */
  specialty: z.string().optional(),
  /**
   * Buyer type — selects the D2 (System Fit) variant when assessing a tool for
   * this hospital. Public = state/government procurement; private = a private
   * hospital's own investment case. Defaults to public where omitted.
   */
  buyerType: z.enum(["public", "private"]).optional(),
  siteReadiness: SiteReadinessCardSchema,
});
export type Hospital = z.infer<typeof HospitalSchema>;
