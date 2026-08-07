/**
 * Shared UI token maps — brand colors live here (config, not scattered inline;
 * BUILD_SPEC §10). Verdict mapping: DEPLOY→green · CONDITIONS→amber · NOT YET→
 * coral (coral, never red — "not yet is a feature, not a failure").
 */

import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import type { AuditVerdict } from "@/lib/schemas/audit";
import type { GateStatus } from "@/lib/schemas/gate";
import type { SiteGrade, SiteTier } from "@/lib/schemas/site";
import type { DocKind, DocStatus } from "@/lib/schemas/document";

type Swatch = {
  label: string;
  /** Solid chip / banner surface. */
  surface: string;
  /** Text-on-tint (light surface) style. */
  tint: string;
  /** A small status dot color. */
  dot: string;
};

export const VERDICT_STYLE: Record<ToolVerdict | AuditVerdict, Swatch> = {
  DEPLOY: {
    label: "Deploy",
    surface: "bg-green-dark text-white",
    tint: "bg-green-light text-green-dark border border-green-dark/25",
    dot: "bg-green-dark",
  },
  CONDITIONS: {
    label: "Deploy with conditions",
    surface: "bg-amber-brand text-white",
    tint: "bg-amber-light text-amber-brand border border-amber-brand/25",
    dot: "bg-amber-brand",
  },
  NOTYET: {
    label: "Not yet",
    surface: "bg-coral-brand text-white",
    tint: "bg-coral-light text-coral-brand border border-coral-brand/25",
    dot: "bg-coral-brand",
  },
};

/**
 * Gate status → pill, in the ClearPath badge idiom (solid for pass/fail,
 * outline for partial, muted for not-answered). `notAnswered` is the distinct
 * grey state for skipped questions.
 */
export const GATE_STATUS_STYLE: Record<
  GateStatus | "notAnswered",
  { label: string; pill: string }
> = {
  pass: { label: "Pass", pill: "bg-[#3B6D11] text-white" },
  partial: { label: "Partial", pill: "bg-transparent text-[#BA7517] border border-[#BA7517]" },
  fail: { label: "Fail", pill: "bg-[#993C1D] text-white" },
  notAnswered: { label: "Not answered", pill: "bg-[#E8E4D6] text-[#6B766F]" },
};

/**
 * Verdict → card visual language (FIX 4). Mirrors ClearPath's RiskTintedSurface
 * + accent system. `outer` tints the surface that wraps the white card; `solid`
 * is the verdict band; `accent` is the hex used for the score + bars.
 */
export const VERDICT_CARD: Record<
  ToolVerdict,
  { bandLabel: string; accent: string; outer: string; solid: string; softTint: string }
> = {
  DEPLOY: {
    bandLabel: "DEPLOY",
    accent: "#3B6D11",
    outer: "bg-[#EAF3DE] border-[#3B6D11]/40",
    solid: "bg-[#3B6D11] text-white",
    softTint: "bg-[#EAF3DE] text-[#3B6D11]",
  },
  CONDITIONS: {
    bandLabel: "DEPLOY WITH CONDITIONS",
    accent: "#BA7517",
    outer: "bg-[#FAEEDA] border-[#BA7517]/40",
    solid: "bg-[#BA7517] text-white",
    softTint: "bg-[#FAEEDA] text-[#BA7517]",
  },
  NOTYET: {
    bandLabel: "NOT YET",
    accent: "#993C1D",
    outer: "bg-[#FAECE7] border-[#993C1D]/40",
    solid: "bg-[#993C1D] text-white",
    softTint: "bg-[#FAECE7] text-[#993C1D]",
  },
};

/** Score → accent hex for dimension bars (green ≥80 · amber ≥50 · coral). */
export function scoreAccent(score: number): string {
  if (score >= 80) return "#3B6D11";
  if (score >= 50) return "#BA7517";
  return "#993C1D";
}

/** Resolve a gate result's display key, honouring the `answered` flag. */
export function gateDisplayStatus(r: {
  status: GateStatus;
  answered?: boolean;
}): GateStatus | "notAnswered" {
  return r.answered === false ? "notAnswered" : r.status;
}

export const SITE_GRADE_STYLE: Record<SiteGrade, Swatch> = {
  TIER_A: {
    label: "Deployment-ready · Tier A",
    surface: "bg-green-dark text-white",
    tint: "bg-green-light text-green-dark border border-green-dark/25",
    dot: "bg-green-dark",
  },
  TIER_B: {
    label: "Trial-ready · Tier B",
    surface: "bg-teal-deep text-white",
    tint: "bg-teal-light text-teal-deep border border-teal-deep/25",
    dot: "bg-teal-deep",
  },
  NOT_READY: {
    label: "Not ready",
    surface: "bg-coral-brand text-white",
    tint: "bg-coral-light text-coral-brand border border-coral-brand/25",
    dot: "bg-coral-brand",
  },
};

export const SITE_TIER_STYLE: Record<
  SiteTier,
  { label: string; tint: string; dot: string }
> = {
  TIER_A: { label: "Tier A", tint: "bg-green-light text-green-dark", dot: "bg-green-dark" },
  TIER_B: { label: "Tier B", tint: "bg-teal-light text-teal-deep", dot: "bg-teal-deep" },
  NOT_YET: { label: "Not yet", tint: "bg-coral-light text-coral-brand", dot: "bg-coral-brand" },
};

/** Document status → chip style. Missing/flagged visibly explain the verdict. */
export const DOC_STATUS_STYLE: Record<
  DocStatus,
  { label: string; tint: string; dot: string }
> = {
  present: { label: "Present", tint: "bg-green-light text-green-dark", dot: "bg-green-dark" },
  flagged: { label: "Flagged", tint: "bg-amber-light text-amber-brand", dot: "bg-amber-brand" },
  missing: { label: "Missing", tint: "bg-coral-light text-coral-brand", dot: "bg-coral-brand" },
};

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  validation: "Validation study",
  cdsco: "CDSCO certificate",
  dpdp: "DPDP policy",
  eval: "Clinical evaluation",
  manual: "User manual",
  ethics: "Ethics approval",
};
