/**
 * Hospital fit matching (FIX 4). Given a tool and the hospital fixtures, return
 * the APPLICABLE hospitals — those whose care levels cover the tool's intended
 * level AND who are seeking the tool's category — each with a one-line reason.
 *
 * Pure logic; no store/api dependency so it's easy to test and reuse.
 */

import type { Tool, CareLevel, ToolCategory } from "@/lib/schemas/tool";
import type { Hospital } from "@/lib/schemas/hospital";
import type { SiteGrade } from "@/lib/schemas/site";
import type { RequestType } from "@/lib/schemas/submission";

/**
 * The action offered at each hospital keys off its site readiness tier:
 *   Tier B (trial-ready)      → request a clinical trial
 *   Tier A (deployment-ready) → request a deployment
 *   Not ready                 → no action
 */
export function requestTypeForGrade(grade: SiteGrade): RequestType | null {
  if (grade === "TIER_A") return "deployment";
  if (grade === "TIER_B") return "trial";
  return null;
}

const CARE_LEVEL_LABEL: Record<CareLevel, string> = {
  tertiary: "tertiary",
  secondary: "district / secondary",
  primary: "primary (PHC)",
  community: "community (CHC)",
  home: "home / patient-facing",
};

const CATEGORY_LABEL: Record<ToolCategory, string> = {
  screening: "screening",
  samd: "SaMD",
  "point-of-care": "point-of-care",
  cds: "clinical decision support",
  "patient-facing": "patient-facing",
  platform: "platform",
};

export type HospitalMatch = {
  hospital: Hospital;
  reason: string;
};

export function applicableHospitals(
  tool: Tool,
  hospitals: Hospital[]
): HospitalMatch[] {
  return hospitals
    .filter(
      (h) =>
        h.acceptsCareLevels.includes(tool.careLevel) &&
        h.seeking.includes(tool.category)
    )
    .map((h) => ({
      hospital: h,
      reason: `${h.focus} Seeking ${CATEGORY_LABEL[tool.category]} tools at ${CARE_LEVEL_LABEL[tool.careLevel]} level.`,
    }));
}
