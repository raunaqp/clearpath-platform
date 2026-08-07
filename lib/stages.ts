import type { Submission } from "@/lib/schemas/submission";
import type { ToolVerdict } from "@/lib/schemas/readiness-card";

/** A one-line suggested reason when a hospital skips an application. */
export function suggestedSkipReason(verdict: ToolVerdict | null): string {
  if (verdict === "NOTYET") return "Vendor verdict is 'not yet' — insufficient evidence to pilot now.";
  if (verdict === "CONDITIONS") return "Deferring — revisit once the flagged conditions are firmed up.";
  if (verdict === "DEPLOY") return "Strong card, but not a current priority for our service lines.";
  return "Not a fit for our current priorities.";
}

/**
 * Displayed stage — DERIVED from the three independent submission fields
 * (audit / decision / pilot), the single source of truth. Every surface (inbox,
 * detail, audit card, registry) reads its stage from here, so they can never
 * disagree.
 *
 * Pathway:  New →[run audit]→ Evaluated →[decision]→ Decision →[start pilot]→ Pilot
 */
export const PATHWAY_STEPS = [
  { key: "new", label: "New" },
  { key: "evaluated", label: "Evaluated" },
  { key: "decision", label: "Decision" },
  { key: "pilot", label: "Pilot" },
] as const;

export type DecisionOutcome = "approved" | "declined";
export type PilotOutcome = "ongoing" | "complete";

export type SubmissionStage = {
  /** Index into PATHWAY_STEPS of the current stage. */
  index: number;
  label: string;
  decisionOutcome?: DecisionOutcome;
  pilotOutcome?: PilotOutcome;
  skipped?: boolean;
  /** A single clear status badge (label + tint classes) for the inbox column. */
  badge: { label: string; tint: string };
  /** The stage-appropriate primary action. */
  action: { label: string; href: string };
};

const BADGE = {
  new: "bg-teal-light text-teal-deep",
  evaluated: "bg-amber-light text-amber-brand",
  approved: "bg-green-light text-green-dark",
  declined: "bg-coral-light text-coral-brand",
  skipped: "bg-bg-sink text-muted",
} as const;

export function submissionStage(sub: Submission, slug?: string): SubmissionStage {
  const base = `/hospital/${slug ?? sub.id}`;

  if (sub.skipped) {
    return { index: 0, label: "Skipped", skipped: true, badge: { label: "Skipped", tint: BADGE.skipped }, action: { label: "View", href: base } };
  }
  if (sub.audit === "not_run") {
    return { index: 0, label: "New", badge: { label: "New", tint: BADGE.new }, action: { label: "Run our audit", href: `${base}/audit` } };
  }
  if (sub.decision === "pending") {
    return { index: 1, label: "Evaluated", badge: { label: "Evaluated", tint: BADGE.evaluated }, action: { label: "Decide", href: `${base}/audit` } };
  }
  if (sub.decision === "rejected") {
    return { index: 2, label: "Declined", decisionOutcome: "declined", badge: { label: "Declined", tint: BADGE.declined }, action: { label: "View reasons", href: base } };
  }
  // decision === "approved"
  if (sub.pilot === "not_started") {
    return { index: 2, label: "Approved · start pilot", decisionOutcome: "approved", badge: { label: "Approved", tint: BADGE.approved }, action: { label: "Start pilot", href: base } };
  }
  if (sub.pilot === "ongoing") {
    return { index: 3, label: "Pilot ongoing", decisionOutcome: "approved", pilotOutcome: "ongoing", badge: { label: "Pilot ongoing", tint: BADGE.approved }, action: { label: "Open workspace", href: base } };
  }
  return { index: 3, label: "Pilot complete", decisionOutcome: "approved", pilotOutcome: "complete", badge: { label: "Pilot complete", tint: BADGE.approved }, action: { label: "Open workspace", href: base } };
}
