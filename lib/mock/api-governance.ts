/**
 * Governance data surface. Separate from `api.ts` for the same reason
 * `api-registry.ts` and `api-handoff.ts` are: every route compiles `api.ts`.
 */
import * as gov from "./governance";
import { runHospitalAudit } from "@/lib/engine/hospital-audit";
import { findDivergences } from "@/lib/engine/divergence";
import { getCardV2 } from "./cards-v2";
import { resolveAll } from "@/lib/engine/score";
import { seededDeclaration } from "./cards-v2";
import type { GateStatus } from "@/lib/schemas/gate";
import type { HospitalGateId } from "@/lib/engine/gates";

function latency<T>(value: T): Promise<T> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Northvale's own audit, run through the same engine every audit uses. */
export function buildNorthvaleAudit(slug: string) {
  // A slug with no card has no submission to audit. Without this the screen
  // rendered a complete fourteen-gate audit for a tool that does not exist —
  // an empty state that looked like a finished one.
  if (!getCardV2(slug)) return null;
  return runHospitalAudit({
    id: `audit-${slug}-northvale`,
    submissionId: `sub-${slug}`,
    auditor: "Northvale Institute of Medical Sciences",
    gateAnswers: gov.NORTHVALE_AUDIT_ANSWERS as unknown as Partial<Record<HospitalGateId, GateStatus>>,
    notes: gov.NORTHVALE_AUDIT_NOTES as Partial<Record<HospitalGateId, string>>,
    createdAt: "2026-10-06T00:00:00.000Z",
  });
}

/** Divergences, DERIVED by comparing the two records. */
export function buildDivergences(slug: string) {
  const view = getCardV2(slug);
  if (!view) return [];
  const declaration = seededDeclaration(slug);
  const resolved = resolveAll({
    path: "PUBLIC",
    scores: new Map(),
    selfDeclaration: declaration,
  });
  const audit = buildNorthvaleAudit(slug);
  if (!audit) return [];
  return findDivergences({
    card: view.card,
    audit,
    resolvedLevels: resolved,
  });
}

export const getAudit = (slug: string) => latency(buildNorthvaleAudit(slug));
export const getDivergences = (slug: string) => latency(buildDivergences(slug));
export const getAssignments = () => latency(gov.NORTHVALE_ASSIGNMENTS);
export const getVerdicts = (slug: string) => latency(gov.getVerdicts(slug));
export const getCurrentVerdict = (slug: string) => latency(gov.currentVerdict(slug));
export const recordVerdict = (i: gov.RecordVerdictInput) => latency(gov.recordVerdict(i));
export const getPlacement = (slug: string) =>
  latency(slug === "cerviai" ? gov.NORTHVALE_PLACEMENT : undefined);
export const getCharter = (slug: string) => latency(gov.buildCharter(slug));
