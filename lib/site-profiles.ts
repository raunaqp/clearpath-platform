import type { SiteDomainId } from "@/lib/schemas/site";

/**
 * Host profiles for the site-readiness flow. This is a PRESENTATION-level
 * parameterization only — it decides which of the six domains are emphasised
 * ("priority for this") and how gaps are framed for what the hospital wants to
 * host. The scoring engine (`runSiteAssessment`) is unchanged: same six domains,
 * same grade rule. One engine, two callers (Mode A general, Mode B per-trial).
 */
export type HostProfile = "trial" | "deployment" | "samd";

export const HOST_PROFILES: {
  value: HostProfile;
  label: string;
  blurb: string;
  /** Domains that matter most for this hosting type (emphasised in the UI). */
  focus: SiteDomainId[];
}[] = [
  {
    value: "trial",
    label: "Clinical trial",
    blurb: "Hosting a prospective clinical trial — ethics, CTRI, and data integrity carry the most weight.",
    focus: ["governance", "data", "regulatory"],
  },
  {
    value: "deployment",
    label: "Deployment",
    blurb: "Running an approved tool in routine care — IT, trained staff, and patient access carry the most weight.",
    focus: ["infrastructure", "people", "access"],
  },
  {
    value: "samd",
    label: "SaMD screening",
    blurb: "Operating a software-as-medical-device screening pathway — IT, documentation, and quality carry the most weight.",
    focus: ["infrastructure", "data", "regulatory"],
  },
];

export function hostProfile(value: HostProfile) {
  return HOST_PROFILES.find((p) => p.value === value)!;
}
