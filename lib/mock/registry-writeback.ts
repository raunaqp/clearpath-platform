/**
 * S26 — the registry write-back.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE SAME RECORD, NOT A SECOND ROW
 * ─────────────────────────────────────────────────────────────────────────
 * The canonical registry entry is the one Phase 4 created, keyed by toolId.
 * An outcome UPDATES it. Appending a second row for the same tool is how a
 * marketplace comes to show a tool twice with two different statuses, and a
 * reader cannot tell which is current.
 *
 * THREE FIELDS, deliberately separate:
 *   assessment verdict   what the card said before anything ran.
 *   field status         whether it is assessed, piloting or deployed.
 *   latest outcome       what the committee decided after it ran.
 * Collapsing them loses the thing a hospital most wants: a tool can carry a
 * good assessment and a poor field result, and that combination is the most
 * useful row on the page.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FAILURES AND LIMITATIONS ARE PUBLISHED, NOT ONLY SUCCESSES
 * ─────────────────────────────────────────────────────────────────────────
 * The missed endpoint goes in the public record beside the met ones. A
 * marketplace that publishes only what worked is an advertisement, and the
 * limitation lines are what stop a second hospital reading a single-district
 * result as a general claim.
 */

import type { RegistryEntry } from "@/lib/schemas/deployment";
import type { OutcomeDecision } from "@/lib/schemas/outcome";
import { REGISTRY } from "./fixtures/registry";
import { getCardV2 } from "./cards-v2";
import { currentOutcome } from "./outcome";
import { buildTrialView } from "./api-trial";
import { buildCharter } from "./governance";
import { HOSPITALS } from "./fixtures/hospitals";
import { CARE_LEVEL_SHORT, OPERATOR_CADRE_LABEL, DEPLOYMENT_MODE_LABEL } from "@/lib/schemas/context";
import { softenCertainty } from "@/lib/engine/soften-certainty";

/**
 * THE EVENT LOG, which did not exist.
 *
 * `listedAt` came from a fixture — a date with nothing behind it. A write-back
 * has to record that it happened, when, and what it changed, or "published to
 * the registry" is an assertion the registry cannot corroborate.
 */
export type WriteBackEvent = {
  id: string;
  toolId: string;
  at: string;
  /** What changed, field by field. */
  changes: { field: string; from: string; to: string }[];
  /** Who caused it. A write with no author is a write nobody owns. */
  source: string;
};

const events: WriteBackEvent[] = [];

export function writeBackEvents(toolId: string): WriteBackEvent[] {
  return events.filter((e) => e.toolId === toolId);
}

export function resetWriteBack(): void {
  events.length = 0;
}

const OUTCOME_TO_RECOMMENDATION: Record<OutcomeDecision["decision"], "SCALE" | "EXTEND" | "STOP"> = {
  ADOPT: "SCALE",
  EXTEND: "EXTEND",
  RETIRE: "STOP",
};

export type WriteBack = {
  /** The canonical entry, updated in place. */
  entry: RegistryEntry;
  toolName: string;
  toolVersion: string;
  modelVersion: string;
  hospitalName: string;
  hospitalLocation: string;
  /** The context the card was issued for, as a single line. */
  contextLine: string;
  scopeLine: string;
  /** Every endpoint, met and missed. */
  endpoints: { name: string; target: string; result: string; met: boolean }[];
  /** Measured against estimated, where the trial tracked one. */
  actuals: { label: string; estimate: string; actual: string; withinPlan: boolean }[];
  decisionLine: string;
  cardLine: string;
  limitations: string[];
  events: WriteBackEvent[];
};

/**
 * Build the write-back view.
 *
 * UNDEFINED WITHOUT A TRIAL AND A DECISION. Publishing a field result for a
 * tool that never ran would put a claim in the public record with nothing
 * behind it — the marketplace is the last place that can afford one.
 */
export function buildWriteBack(slug: string): WriteBack | undefined {
  const view = getCardV2(slug);
  if (!view) return undefined;

  const decision = currentOutcome(slug);
  if (!decision) return undefined;

  const trial = buildTrialView(slug);
  if (!trial || trial.endpoints.length === 0) return undefined;

  const entry = REGISTRY.find((r) => r.toolId === view.tool.id);
  if (!entry) return undefined;

  const charter = buildCharter(slug);
  const hospital = HOSPITALS.find((h) => h.id === decision.hospitalId);
  const ctx = view.card.context;

  // ── the update, applied to the SAME record ──────────────────────────────
  const nextStatus: RegistryEntry["status"] =
    decision.decision === "ADOPT" ? "deployed" : decision.decision === "RETIRE" ? "assessed" : "piloting";
  const headline = softenCertainty(
    `${trial.endpoints.filter((e) => e.met).length} of ${trial.endpoints.length} endpoints met over a ${charter?.scope.days ?? view.card.context.deploymentModes.length}-day supervised trial at ${hospital?.name ?? decision.hospitalName}. ${trial.endpoints.filter((e) => !e.met).map((e) => `${e.name} reached ${e.result} against ${e.target}`).join("; ")}.`
  );

  const changes: { field: string; from: string; to: string }[] = [];
  if (entry.status !== nextStatus) changes.push({ field: "field status", from: entry.status, to: nextStatus });
  const nextRec = OUTCOME_TO_RECOMMENDATION[decision.decision];
  if (entry.publishedResult?.recommendation !== nextRec)
    changes.push({ field: "latest outcome", from: entry.publishedResult?.recommendation ?? "none", to: nextRec });

  entry.status = nextStatus;
  entry.publishedResult = { hospitalId: decision.hospitalId, recommendation: nextRec, headline };

  if (changes.length > 0 && !events.some((e) => e.id === `wb-${slug}-${decision.revision}`)) {
    events.push({
      id: `wb-${slug}-${decision.revision}`,
      toolId: view.tool.id,
      at: decision.decidedAt,
      changes,
      source: `${decision.chair.name}, ${decision.chair.role} — outcome record ${decision.id}`,
    });
  }

  return {
    entry,
    toolName: view.tool.name,
    toolVersion: view.card.toolVersion,
    modelVersion: view.card.modelVersion,
    hospitalName: hospital?.name ?? decision.hospitalName,
    hospitalLocation: hospital?.location ?? "",
    contextLine: [
      CARE_LEVEL_SHORT[ctx.careLevel],
      OPERATOR_CADRE_LABEL[ctx.operatorCadre],
      ctx.deploymentModes.map((m) => DEPLOYMENT_MODE_LABEL[m]).join(" and "),
      `women ${ctx.population.ageRange}`,
    ]
      .filter(Boolean)
      .join(" · "),
    scopeLine: charter
      ? `${charter.scope.days}-day supervised trial, ${charter.scope.participants.toLocaleString("en-IN")} women, ${charter.scope.sites} CHCs`
      : "",
    endpoints: trial.endpoints.map((e) => ({ name: e.name, target: e.target, result: e.result, met: e.met })),
    actuals: trial.actuals.map((a) => ({
      label: a.label,
      estimate: a.estimate,
      actual: a.actual,
      withinPlan: a.withinPlan,
    })),
    decisionLine:
      decision.decision === "EXTEND" && decision.extension
        ? `Extended — ${decision.extension.days} days against a stated referral-completion question`
        : decision.decision === "ADOPT"
          ? "Adopted into business as usual"
          : "Retired",
    cardLine: `v${view.card.version}.0 · issued ${view.card.issuedAt.slice(0, 10)} · expires ${view.card.expiresAt.slice(0, 10)}`,
    /**
     * The limitations a second hospital needs before reading this as a general
     * claim. Derived from the card's own scope and its open conditions, not
     * written here — a limitation list typed by hand gets shorter over time.
     */
    limitations: [
      `Single hospital, one district. Card context does not extend beyond ${CARE_LEVEL_SHORT[ctx.careLevel]}.`,
      ...view.card.conditions.map((c) => softenCertainty(`${c.fix} Condition remains open.`)),
    ],
    events: writeBackEvents(view.tool.id),
  };
}
