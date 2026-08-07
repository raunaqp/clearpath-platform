/**
 * Site readiness engine (BUILD_SPEC §7).
 *
 *   runSiteAssessment(domainScores) → SiteReadinessCard
 *
 * Grade rule (tier ladder NOT_YET < TIER_B < TIER_A):
 *   - all domains TIER_A          → TIER_A   (deployment-ready)
 *   - all domains ≥ TIER_B        → TIER_B   (trial-ready)
 *   - any domain NOT_YET          → NOT_READY
 *
 * Gaps are relative to the grade's target rung — NOT the fixed top tier:
 *   NOT_READY → target TIER_A → gaps = domains below Tier A
 *   TIER_A    → target TIER_B → gaps = domains below Tier B (empty in practice,
 *               since a TIER_A grade means every domain is already Tier A)
 *   TIER_B    → gap-free       (trial-ready — nothing to show)
 * Ordered most-blocking first (NOT_YET before TIER_B).
 */

import type {
  SiteDomainId,
  SiteGap,
  SiteGrade,
  SiteReadinessCard,
  SiteTier,
} from "@/lib/schemas/site";
import { SITE_DOMAINS, SITE_DOMAIN_ORDER } from "./gates";
import { softenSiteCard } from "./soften-certainty";

export type SiteAssessmentInput = Record<SiteDomainId, SiteTier>;

/** Numeric rank so we can compare tiers. Higher = more ready. */
const TIER_RANK: Record<SiteTier, number> = {
  NOT_YET: 0,
  TIER_B: 1,
  TIER_A: 2,
};

/**
 * The tier each grade's gaps are measured against. `null` → gap-free.
 * A trial-ready TIER_B site is deliberately gap-free (see module note).
 */
const GAP_TARGET: Record<SiteGrade, SiteTier | null> = {
  NOT_READY: "TIER_A",
  TIER_A: "TIER_B",
  TIER_B: null,
};

export function deriveSiteGrade(scores: SiteAssessmentInput): SiteGrade {
  const tiers = SITE_DOMAIN_ORDER.map((d) => scores[d]);
  if (tiers.some((t) => t === "NOT_YET")) return "NOT_READY";
  if (tiers.every((t) => t === "TIER_A")) return "TIER_A";
  return "TIER_B";
}

export function runSiteAssessment(scores: SiteAssessmentInput): SiteReadinessCard {
  const grade = deriveSiteGrade(scores);
  const target = GAP_TARGET[grade];

  // Gaps: domains below the grade's target tier, most-blocking first.
  const gaps: SiteGap[] =
    target === null
      ? []
      : SITE_DOMAIN_ORDER.filter((d) => TIER_RANK[scores[d]] < TIER_RANK[target])
          .sort((a, b) => TIER_RANK[scores[a]] - TIER_RANK[scores[b]])
          .map((d) => ({ domain: d, fix: SITE_DOMAINS[d].fix }));

  return softenSiteCard({ grade, domainScores: scores, gaps });
}
