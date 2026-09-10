import { z } from "zod";
import { CareLevelEnum, DeploymentModeEnum, OperatorCadreEnum } from "./context";

/**
 * A site's OPERATING PROFILE and its PROBLEM REGISTER.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CHRONOLOGY IS THE POINT
 * ─────────────────────────────────────────────────────────────────────────
 * Both records carry the date they were established, and matching cites those
 * dates rather than merely reading the values. A site profile written after a
 * tool arrives is a justification, not a baseline: it is trivially easy to
 * describe your infrastructure in whatever terms make the tool in front of you
 * look like a fit. The dates are what make the difference checkable, so they
 * are part of the record rather than metadata beside it.
 *
 * These are seeded here ahead of the screens that will author them (S13 and
 * S14). Seeding them with their real recorded dates — rather than "now" —
 * keeps the ordering true the moment those screens exist.
 */

/** Connectivity as a site actually experiences it, not as a checkbox. */
export const ConnectivityEnum = z.enum(["reliable", "intermittent", "none"]);
export type Connectivity = z.infer<typeof ConnectivityEnum>;

export const DigitalEstateSchema = z.object({
  emrPresent: z.boolean(),
  /** Whether a FHIR surface exists to integrate against, not merely a roadmap. */
  fhirSurfaceAvailable: z.boolean(),
  abdmParticipating: z.boolean(),
});
export type DigitalEstate = z.infer<typeof DigitalEstateSchema>;

/**
 * People, in the terms that decide whether a trial can actually run: how many
 * operators the site can RELEASE, and for how many hours. A site with two
 * hundred nurses and no release capacity cannot host a six-hour training.
 */
export const SiteStaffingSchema = z.object({
  releasableOperators: z.number(),
  operatorCadre: OperatorCadreEnum,
  trainingCapacityHours: z.number(),
  clinicianSupervisionOnSite: z.boolean(),
});
export type SiteStaffing = z.infer<typeof SiteStaffingSchema>;

/**
 * Governance the site already has, not governance it would stand up for a
 * given tool. A DPIA process that exists is a different fact from one that
 * would be created if someone asked.
 */
export const SiteGovernanceSchema = z.object({
  dpoAppointed: z.boolean(),
  dpiaProcessInPlace: z.boolean(),
  incidentRouteDefined: z.boolean(),
});
export type SiteGovernance = z.infer<typeof SiteGovernanceSchema>;

export const SiteInfrastructureSchema = z.object({
  /** Hours of backup the site can actually hold. 0 = mains only. */
  powerBackupHours: z.number(),
  connectivity: ConnectivityEnum,
  /** Whether a tool can capture offline and sync later. */
  offlineCaptureSupported: z.boolean(),
  /**
   * Referral pathways that EXIST in the catchment. A screening tool that flags
   * a case into a pathway the site does not have has produced an alarm, not a
   * referral.
   */
  referralPathways: z.array(z.string()),
  devices: z.array(z.string()),
  /** Where the backup actually comes from — a camp on a generator is not mains. */
  powerNote: z.string().optional(),
});
export type SiteInfrastructure = z.infer<typeof SiteInfrastructureSchema>;

export const SiteOperatingProfileSchema = z.object({
  hospitalId: z.string(),
  /** When this profile was baselined. Matching cites it. */
  baselinedAt: z.string(),
  /**
   * One line placing the site for a reader.
   *
   * The hospitals in this demo are FICTIONAL on purpose — it fabricates
   * governance decisions, named signatories and trial outcomes, and none of
   * that may attach to a real institution. But a fictional name costs an
   * Indian audience a beat of recognition, and this line buys it back without
   * implicating anyone.
   */
  archetype: z.string(),
  /** Facility descriptor and the catchment the profile covers. */
  facility: z.object({ type: z.string(), catchment: z.string() }),
  digital: DigitalEstateSchema,
  staffing: SiteStaffingSchema,
  governance: SiteGovernanceSchema,
  /** Levels of care the site actually operates. */
  careLevels: z.array(CareLevelEnum),
  /** Cadres the site actually staffs. */
  cadres: z.array(OperatorCadreEnum),
  /** How the site delivers care — camps, OPD queue, wards. */
  deploymentModes: z.array(DeploymentModeEnum),
  infrastructure: SiteInfrastructureSchema,
});
export type SiteOperatingProfile = z.infer<typeof SiteOperatingProfileSchema>;

/**
 * One line of a site's declared problem register — what the site says its own
 * priorities are, in its own order, with the numbers behind them.
 *
 * The RANK is the part that matters. A tool that addresses the site's eleventh
 * problem is not a fit however good it is, and a register without an ordering
 * lets every tool claim to address something.
 */
export const ProblemEntrySchema = z.object({
  /**
   * Stable id, independent of rank.
   *
   * A deployment request names the entry it claims to address, and rank is
   * exactly the field a site re-orders when its priorities move — so a request
   * that pointed at "#2" would silently come to mean something else the first
   * time the register was revised.
   */
  id: z.string(),
  rank: z.number(),
  name: z.string(),
  /** Annual volume the site sees. */
  volumePerYear: z.number(),
  /** What happens today — the baseline the tool would have to improve on. */
  currentPathway: z.string(),
  /** e.g. "11-day mean colposcopy turnaround". */
  currentMetric: z.string().optional(),
  /** The problem in the site's own words. */
  description: z.string().optional(),
  /** The service line it sits in. */
  serviceLine: z.string().optional(),
  /** What any solution must not break — the real shape of the constraint. */
  constraint: z.string().optional(),
  /**
   * THE HIGHEST-LEVERAGE FIELD IN THE SYSTEM.
   *
   * The S20 charter's endpoints derive from this. Writing it BEFORE the site
   * has seen any tool is what stops endpoints being retrofitted to whatever the
   * data happened to show — which is why the register carries a publication
   * date and why every screen that reads this displays it.
   */
  successDefinition: z.string().optional(),
});
export type ProblemEntry = z.infer<typeof ProblemEntrySchema>;

export const ProblemRegisterSchema = z.object({
  hospitalId: z.string(),
  /** When the register was published. Matching cites it. */
  publishedAt: z.string(),
  entries: z.array(ProblemEntrySchema),
});

/** How many problems the site has ranked. "#2 of 9" needs the denominator. */
export function rankedCount(register: ProblemRegister): number {
  return register.entries.length;
}
export type ProblemRegister = z.infer<typeof ProblemRegisterSchema>;
