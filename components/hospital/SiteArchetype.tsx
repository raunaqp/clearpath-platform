import type { SiteOperatingProfile } from "@/lib/schemas/site-profile";

/**
 * The archetype line, under a hospital's name.
 *
 * The hospitals here are FICTIONAL on purpose — this demo fabricates governance
 * decisions, named signatories and trial outcomes, and none of that may attach
 * to a real institution. But a fictional name costs an Indian audience a beat of
 * recognition: nobody knows what kind of place "Northvale IMS" is. This line
 * buys the recognition back without implicating anyone.
 *
 * Shown wherever the hospital is named to someone deciding something — S13 and
 * S15 — not everywhere the name appears.
 */
export function SiteArchetype({ profile }: { profile: SiteOperatingProfile }) {
  return (
    <p className="max-w-2xl text-sm leading-relaxed text-muted">{profile.archetype}</p>
  );
}
