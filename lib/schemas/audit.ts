import { z } from "zod";
import { GateResultSchema } from "./gate";

/**
 * Audit Result — the hospital's OWN intake verdict (BUILD_SPEC §4, §7).
 *
 * Produced by `runHospitalAudit()` from the 13-gate private-hospital intake
 * checklist. Deliberately independent of the vendor's Readiness Card — this is
 * the neutrality point: the hospital's audit is theirs, not the vendor's
 * marketing. Same verdict rule as the tool engine, so the enum is reused in
 * spirit but named distinctly.
 */

export const AuditVerdictEnum = z.enum(["DEPLOY", "CONDITIONS", "NOTYET"]);
export type AuditVerdict = z.infer<typeof AuditVerdictEnum>;

/** The 3 intake groups (BUILD_SPEC §7). */
export const AuditGroupIdEnum = z.enum([
  "should_pilot", // Should we pilot?
  "can_run", // Can we run it?
  "who_owns", // Who owns it?
]);
export type AuditGroupId = z.infer<typeof AuditGroupIdEnum>;

export const AuditResultSchema = z.object({
  id: z.string(),
  submissionId: z.string(),
  verdict: AuditVerdictEnum,
  /**
   * A COUNT OF DISCRETE FINDINGS, not a composite.
   *
   * This replaced `score`, a 0-100 mean of thirteen heterogeneous gates. That
   * number sat beside a vendor card which refuses to average anything, on the
   * one screen where a hospital decides whether to trust either — two panels,
   * one declining to reduce a verdict to a figure and the other doing exactly
   * that.
   *
   * A mean of "is liability allocated?" and "can we monitor performance?"
   * measures nothing: the two are not on a common scale and averaging them
   * invents one. "11 pass · 2 conditional" is a tally a reader can go and check
   * gate by gate, which is the same reason the gates-clear chip survived the
   * removal of the 94/100 on the vendor side.
   */
  tally: z.object({
    pass: z.number(),
    conditional: z.number(),
    notMet: z.number(),
    unanswered: z.number(),
    total: z.number(),
  }),
  gateResults: z.array(GateResultSchema),
  /** Who ran the audit (hospital name / reviewer). */
  auditor: z.string(),
  createdAt: z.string(),
});
export type AuditResult = z.infer<typeof AuditResultSchema>;
