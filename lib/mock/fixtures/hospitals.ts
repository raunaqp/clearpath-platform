import type { Hospital } from "@/lib/schemas/hospital";
import type { SiteAssessmentInput } from "@/lib/engine/readiness-site";
import { runSiteAssessment } from "@/lib/engine/readiness-site";

/**
 * Seed hospitals (BUILD_SPEC §6). Site readiness cards are COMPUTED from these
 * domain scores through the real `runSiteAssessment` engine, so the grades
 * (TIER_B / TIER_A / NOT_READY) match the rule, not a hard-coded label.
 */

const NORTHVALE_DOMAINS: SiteAssessmentInput = {
  governance: "TIER_A",
  people: "TIER_A",
  infrastructure: "TIER_B", // integration bandwidth still maturing
  data: "TIER_A",
  regulatory: "TIER_A",
  access: "TIER_B",
};

// Site B is the ASPIRING site — not ready yet. Several domains still NOT_YET,
// so the grade is NOT_READY and the self-assessment shows a real gap list.
const SITE_B_DOMAINS: SiteAssessmentInput = {
  governance: "NOT_YET", // ethics committee still being constituted
  people: "TIER_B", // some trained staff; more to onboard
  infrastructure: "NOT_YET", // PACS / integration bandwidth not yet in place
  data: "TIER_B",
  regulatory: "NOT_YET", // SOPs / quality system being written up
  access: "TIER_B",
};

// Lakeview is a specialty fertility centre — trial-ready (Tier B) for IVF trials.
const LAKEVIEW_DOMAINS: SiteAssessmentInput = {
  governance: "TIER_A",
  people: "TIER_A",
  infrastructure: "TIER_B", // research IT for time-lapse data still maturing
  data: "TIER_A",
  regulatory: "TIER_B",
  access: "TIER_A",
};

export const HOSPITALS: Hospital[] = [
  {
    id: "hosp-northvale",
    name: "Northvale Institute of Medical Sciences",
    tier: "tertiary",
    location: "Coimbatore, Tamil Nadu",
    focus: "Multi-specialty tertiary centre running community screening outreach.",
    acceptsCareLevels: ["tertiary", "secondary", "primary", "community", "home"],
    seeking: ["screening", "cds", "samd", "point-of-care", "patient-facing"],
    buyerType: "public", // tertiary running government / community screening programmes
    siteReadiness: runSiteAssessment(NORTHVALE_DOMAINS), // → TIER_B (trial-ready)
  },
  {
    id: "hosp-site-b",
    name: "District Hospital — Site B",
    tier: "tier2",
    location: "Karnataka",
    focus: "District hospital building toward hosting AI screening for its catchment.",
    acceptsCareLevels: ["secondary", "primary", "community"],
    seeking: ["screening", "point-of-care"],
    buyerType: "public", // government district hospital
    siteReadiness: runSiteAssessment(SITE_B_DOMAINS), // → NOT_READY
  },
  {
    id: "hosp-lakeview",
    name: "Lakeview Fertility Centre",
    tier: "tier2",
    location: "Bengaluru, Karnataka",
    focus: "Specialty fertility & IVF centre hosting reproductive-health AI trials.",
    acceptsCareLevels: ["tertiary", "secondary"],
    seeking: ["samd", "cds"],
    specialty: "Fertility & reproductive health",
    buyerType: "private", // private commercial IVF centre — investment-case buyer
    siteReadiness: runSiteAssessment(LAKEVIEW_DOMAINS), // → TIER_B (trial-ready)
  },
];
