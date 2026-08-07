import type { Submission } from "@/lib/schemas/submission";

/**
 * Vendor-facing pipeline stages (BUILD_SPEC — vendor status). One shared source
 * for the read-only vendor dashboard AND the "My applications" list so both show
 * the same stage for a given submission.
 */
export const VSTAGES = ["New", "Evaluated", "Approved", "Ongoing", "Complete"] as const;

/**
 * Where a submission sits on the 5-stage pipeline, derived from the three-field
 * state (audit / decision / pilot). `declined` marks a rejected application
 * (shown at the Approved step as a red stop, not a green tick).
 */
export function stageIndex(s: Submission): { index: number; declined: boolean } {
  if (s.decision === "rejected") return { index: 2, declined: true };
  if (s.audit === "not_run") return { index: 0, declined: false };
  if (s.decision === "pending") return { index: 1, declined: false };
  if (s.pilot === "not_started") return { index: 2, declined: false };
  if (s.pilot === "ongoing") return { index: 3, declined: false };
  return { index: 4, declined: false };
}
