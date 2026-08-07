import type { DeploymentKind, Phase } from "@/lib/schemas/deployment";

/**
 * The two distinct workflows (BUILD_SPEC — trial vs deployment). Each is a
 * different ordered set of phases with its own panels, documents, and endpoints.
 */
export type PhaseDef = { key: Phase; label: string; group: string };

export const TRIAL_PHASES: PhaseDef[] = [
  { key: "ethics_setup", label: "Ethics & CTRI setup", group: "Pre" },
  { key: "enrolment", label: "Enrolment", group: "During" },
  { key: "monitoring", label: "Monitoring", group: "During" },
  { key: "analysis", label: "Analysis", group: "Post" },
  { key: "closeout", label: "Closeout", group: "Post" },
];

export const DEPLOYMENT_PHASES: PhaseDef[] = [
  { key: "setup", label: "Setup", group: "Pre" },
  { key: "go_live", label: "Go-live", group: "During" },
  { key: "monitoring", label: "Monitoring", group: "During" },
  { key: "review", label: "Review", group: "Post" },
  { key: "handover", label: "Handover", group: "Post" },
];

export function phasesFor(kind: DeploymentKind): PhaseDef[] {
  return kind === "trial" ? TRIAL_PHASES : DEPLOYMENT_PHASES;
}

export function phaseIndex(kind: DeploymentKind, phase: Phase): number {
  return phasesFor(kind).findIndex((p) => p.key === phase);
}

/** The first phase of each workflow (where a fresh deployment starts). */
export function firstPhase(kind: DeploymentKind): Phase {
  return kind === "trial" ? "ethics_setup" : "setup";
}

/** The active phase after the pilot is started. */
export function startedPhase(kind: DeploymentKind): Phase {
  return kind === "trial" ? "enrolment" : "go_live";
}
