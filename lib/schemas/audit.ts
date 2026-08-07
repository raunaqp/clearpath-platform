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
  /** Overall score (0–100) = mean gate value × 100, rounded. */
  score: z.number(),
  gateResults: z.array(GateResultSchema),
  /** Who ran the audit (hospital name / reviewer). */
  auditor: z.string(),
  createdAt: z.string(),
});
export type AuditResult = z.infer<typeof AuditResultSchema>;
