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
});
export type SiteInfrastructure = z.infer<typeof SiteInfrastructureSchema>;

export const SiteOperatingProfileSchema = z.object({
  hospitalId: z.string(),
  /** When this profile was baselined. Matching cites it. */
  baselinedAt: z.string(),
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
  rank: z.number(),
  name: z.string(),
  /** Annual volume the site sees. */
  volumePerYear: z.number(),
  /** What happens today — the baseline the tool would have to improve on. */
  currentPathway: z.string(),
  /** e.g. "11-day mean colposcopy turnaround". */
  currentMetric: z.string().optional(),
});
export type ProblemEntry = z.infer<typeof ProblemEntrySchema>;

export const ProblemRegisterSchema = z.object({
  hospitalId: z.string(),
  /** When the register was published. Matching cites it. */
  publishedAt: z.string(),
  entries: z.array(ProblemEntrySchema),
});
export type ProblemRegister = z.infer<typeof ProblemRegisterSchema>;
