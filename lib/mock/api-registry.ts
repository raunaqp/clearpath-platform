/**
 * Registry-side data surface — listings, site operating profiles and problem
 * registers.
 *
 * DELIBERATELY SEPARATE FROM `api.ts`. Every page in the app imports `api.ts`,
 * so anything added there is compiled into every route. Folding the listing
 * engine and the site fixtures in made the shared graph big enough that the
 * hospital inbox stopped painting inside the browser suite's fixed wait, and
 * the suite went intermittently red on assertions that had nothing to do with
 * this work. Pages that need registry data import it here instead.
 */

import { getCardV2 } from "./cards-v2";
import { buildListing, type Listing } from "@/lib/engine/listing";
import { getListingTerms } from "./fixtures/listings";
import { PROBLEM_REGISTERS, SITE_PROFILES } from "./fixtures/site-profiles";
import type { ProblemRegister, SiteOperatingProfile } from "@/lib/schemas/site-profile";

/** Same simulated delay as api.ts; these values are rebuilt per read. */
function latency<T>(value: T): Promise<T> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * The listing for a tool, DERIVED from its current card — so a listing can
 * never drift from the verdict it publishes, and a remediation that clears a
 * condition shows up here without a second write.
 */
export function buildListingFor(slug: string): Listing | undefined {
  const view = getCardV2(slug);
  const terms = getListingTerms(slug);
  if (!view || !terms) return undefined;
  return buildListing({
    card: view.card,
    tool: view.tool,
    listedAt: terms.listedAt,
    requirements: terms.requirements,
    commercials: terms.commercials,
    supportModel: terms.supportModel,
  });
}

export const getListing = (slug: string): Promise<Listing | undefined> =>
  latency(buildListingFor(slug));

export const getSiteProfiles = (): Promise<SiteOperatingProfile[]> => latency(SITE_PROFILES);
export const getProblemRegisters = (): Promise<ProblemRegister[]> => latency(PROBLEM_REGISTERS);

export const getSiteProfile = (hospitalId: string): Promise<SiteOperatingProfile | undefined> =>
  latency(SITE_PROFILES.find((p) => p.hospitalId === hospitalId));
export const getProblemRegister = (hospitalId: string): Promise<ProblemRegister | undefined> =>
  latency(PROBLEM_REGISTERS.find((r) => r.hospitalId === hospitalId));
