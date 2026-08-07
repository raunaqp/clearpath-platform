import { z } from "zod";

/**
 * Site Readiness Card — the hospital's own operating-readiness grade
 * (BUILD_SPEC §6, §7). Scored across 6 domains, each rated on a 3-step tier
 * ladder, rolled up into one grade.
 *
 * Tier ladder (low → high): NOT_YET < TIER_B < TIER_A.
 *   - all domains at TIER_A            → grade TIER_A (deployment-ready)
 *   - all domains at least TIER_B      → grade TIER_B (trial-ready)
 *   - any domain NOT_YET               → grade NOT_READY
 */

export const SiteDomainIdEnum = z.enum([
  "governance", // governance & ethics
  "people", // people & training
  "infrastructure", // infrastructure & IT
  "data", // data & documentation
  "regulatory", // regulatory & quality
  "access", // patient access
]);
export type SiteDomainId = z.infer<typeof SiteDomainIdEnum>;

/** Per-domain rating. Same three steps as the grade ladder. */
export const SiteTierEnum = z.enum(["TIER_A", "TIER_B", "NOT_YET"]);
export type SiteTier = z.infer<typeof SiteTierEnum>;

/** Rolled-up site grade. */
export const SiteGradeEnum = z.enum(["TIER_A", "TIER_B", "NOT_READY"]);
export type SiteGrade = z.infer<typeof SiteGradeEnum>;

/** A domain that sits below full deployment-readiness = onboarding work order. */
export const SiteGapSchema = z.object({
  domain: SiteDomainIdEnum,
  fix: z.string(),
});
export type SiteGap = z.infer<typeof SiteGapSchema>;

export const SiteReadinessCardSchema = z.object({
  grade: SiteGradeEnum,
  domainScores: z.record(SiteDomainIdEnum, SiteTierEnum),
  gaps: z.array(SiteGapSchema),
});
export type SiteReadinessCard = z.infer<typeof SiteReadinessCardSchema>;

/**
 * A site's PUBLIC listing on the registry — a hospital advertising its
 * readiness so vendors/sponsors can find it (including sites still maturing).
 * The tier-2/3 site-network thesis made concrete: a "developing" site can list
 * itself before it is trial-ready.
 */
export const SiteListingSchema = z.object({
  hospitalId: z.string(),
  grade: SiteGradeEnum,
  /** What the site is offering to host (host-profile key: trial/deployment/samd). */
  profile: z.string(),
  /** One-line summary shown on the registry. */
  headline: z.string(),
  /** Number of onboarding gaps still open (0 = ready). */
  openGaps: z.number(),
  submittedAt: z.string(),
});
export type SiteListing = z.infer<typeof SiteListingSchema>;
