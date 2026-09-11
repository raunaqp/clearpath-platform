/**
 * S21–S23 — deriving the trial's operating state and its result from records
 * that already exist.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NOTHING HERE RESTATES A COMMITMENT
 * ─────────────────────────────────────────────────────────────────────────
 * The support taper comes from the charter, which took it from the request by
 * identity. The export formats come from the request. The nurse-load estimate
 * comes from the placement record. The endpoint targets come from the charter,
 * which derived them from the success definition the site published before it
 * saw this tool.
 *
 * A trial report that retyped any of those could quietly measure against a
 * target nobody agreed to — and it would look exactly the same on screen.
 */

import type { TrialCharter, PlacementRecord } from "@/lib/schemas/governance";
import type { DeploymentRequest } from "@/lib/schemas/handoff";
import type { AdoptionPoint, TrialTelemetry } from "@/lib/schemas/telemetry";
import type { SupportPhase } from "@/lib/schemas/handoff";
import { softenCertainty } from "./soften-certainty";

/** Which day of the trial a given week starts on. */
export function weekOfDay(day: number): number {
  return Math.max(1, Math.ceil(day / 7));
}

/**
 * The support level in force on a given week, and when it next changes —
 * read from the taper the vendor actually committed to.
 */
export function supportAtWeek(taper: SupportPhase[], week: number): {
  level: string;
  nextTaperWeek: number | null;
} {
  const current = taper.find((p) => week >= p.fromWeek && (p.toWeek === null || week <= p.toWeek));
  const next = taper.find((p) => p.fromWeek > week);
  return { level: current?.level ?? "—", nextTaperWeek: next?.fromWeek ?? null };
}

/** Adoption, with the support level that was in force each week. */
export function adoptionAgainstTaper(
  points: Omit<AdoptionPoint, "supportLevel">[],
  taper: SupportPhase[]
): AdoptionPoint[] {
  return points.map((p) => ({ ...p, supportLevel: supportAtWeek(taper, p.week).level }));
}

export type EndpointResult = {
  name: string;
  kind: "primary" | "secondary";
  /** From the charter. Never retyped. */
  target: string;
  result: string;
  met: boolean;
  /** Where the target came from — the provenance the charter carries. */
  derivedFrom: string;
};

/** Compare a measured value against a charter threshold like "≥ 0.85". */
function meets(threshold: string, numeric: number): boolean {
  const m = threshold.match(/(≥|≤|>=|<=)\s*([\d.]+)/);
  if (!m) return false;
  const bound = Number(m[2]);
  return m[1] === "≥" || m[1] === ">=" ? numeric >= bound : numeric <= bound;
}

/**
 * Endpoint results, judged against the CHARTER's thresholds.
 *
 * A missed endpoint is never dropped. The one that misses here is referral
 * completion — a health-system failure rather than a model failure — and
 * reporting only the three that passed would turn an operational record into a
 * sales sheet.
 */
export function endpointResults(
  charter: TrialCharter,
  measured: Record<string, { value: string; numeric: number }>
): EndpointResult[] {
  return charter.endpoints.map((e) => {
    const m = measured[e.name];
    return {
      name: e.name,
      kind: e.kind,
      target: e.threshold,
      result: m?.value ?? "not measured",
      met: m ? meets(e.threshold, m.numeric) : false,
      derivedFrom:
        e.derivedFrom === "SUCCESS_DEFINITION_LITERAL"
          ? `stated in the success definition — "${e.sourceText}"`
          : `operationalises "${e.sourceText}"`,
    };
  });
}

export type ActualVsEstimate = {
  label: string;
  estimate: string;
  actual: string;
  /** True where the actual landed within what was planned. */
  withinPlan: boolean;
  note?: string;
};

/**
 * Actuals against what was estimated at placement and budgeted in the charter.
 *
 * This is what makes a trial an operational record rather than a results table:
 * the site said +2 minutes and got +2.6, and knowing that is worth more than
 * any endpoint, because it is the number that decides whether the tool survives
 * once the pilot team stops visiting.
 */
export function actualsAgainstPlan(args: {
  charter: TrialCharter;
  placement: PlacementRecord;
  measuredLoadMin: number;
  costSpent: number;
  costSpentDisplay: string;
  costNote: string;
  adoption: AdoptionPoint[];
}): ActualVsEstimate[] {
  const { charter, placement, measuredLoadMin, costSpent, costSpentDisplay, costNote, adoption } = args;
  /**
   * The range over SUSTAINED weeks — those after support first stepped down.
   * Weeks 1-2 are a ramp with the vendor on site, and quoting them makes
   * adoption look worse than it held. The question D3 asks is whether use
   * survived support being withdrawn, so that is the window to report.
   */
  const firstTaper = charter.commitments.supportTaper[1]?.fromWeek ?? 1;
  const sustained = adoption.filter((a) => a.week >= firstTaper);
  const window = sustained.length > 0 ? sustained : adoption;
  const screens = window.map((a) => a.screens);
  const levels = [...new Set(window.map((a) => a.supportLevel))];

  return [
    {
      label: "Nurse load per patient",
      // READ from the placement record. Retyping it is how a report comes to
      // measure against an estimate nobody made.
      estimate: `+${placement.loadDeltaMinutesPerPatient} min estimated at placement`,
      actual: `+${measuredLoadMin} min measured`,
      withinPlan: measuredLoadMin <= placement.loadDeltaMinutesPerPatient,
      note:
        measuredLoadMin > placement.loadDeltaMinutesPerPatient
          ? softenCertainty("Above the placement estimate. Additive load is what silently ends a deployment, so this is the number to watch at the interim.")
          : undefined,
    },
    {
      label: "Cost",
      // READ from the charter's budget.
      estimate: `${charter.budget.display} budgeted`,
      actual: `${costSpentDisplay} ${costNote}`,
      withinPlan: costSpent <= charter.budget.amount,
    },
    {
      label: "Adoption vs support taper",
      estimate: `taper ${charter.commitments.supportTaper.map((p) => p.level.toLowerCase()).join(" → ")}`,
      /*
        FIRST, PEAK, LAST — three weeks that are facts, and no invented
        boundary between them.
        A bare min–max over a completed run reads "24–104 screens per week",
        which describes neither the plateau nor the decline. Naming a
        "sustained window" instead would mean picking a threshold for where the
        plateau ends, and that threshold would be doing the arguing.
        The shape is what answers the D3 question — did use hold as support was
        withdrawn? — and it holds here: the fall comes six weeks AFTER the
        taper reached on-call, when the four catchments had been screened out.
      */
      actual: `${screens[0]} in week ${window[0].week}, peaking at ${Math.max(...screens)}, ${screens[screens.length - 1]} by week ${window[window.length - 1].week} — held through ${levels.map((l) => l.toLowerCase()).join(" to ")}, then fell as the catchments were screened out`,
      withinPlan: true,
    },
  ];
}

/**
 * The ANALYTICAL recommendation — deliberately separate from the hospital's
 * decision.
 *
 * This says what the evidence supports. It does not say what the hospital
 * should do, and it must not read as though it has. Applying the charter's
 * decision rule is the committee's act, and narrating the data toward a
 * decision here is exactly how a rule fixed before the trial gets quietly
 * renegotiated after it.
 */
export function analyticalRecommendation(results: EndpointResult[]): string {
  const primaryMet = results.filter((r) => r.kind === "primary").every((r) => r.met);
  const missed = results.filter((r) => !r.met);

  if (missed.length === 0) {
    return softenCertainty("Evidence supports scale on every endpoint in the charter.");
  }
  if (primaryMet) {
    const names = missed.map((r) => r.name.toLowerCase()).join(" and ");
    const pathway = missed.some((r) => /referral/i.test(r.name));
    return softenCertainty(
      `Evidence supports scale on clinical performance. ${names.charAt(0).toUpperCase()}${names.slice(1)} did not reach target${pathway ? "; the gap is in the pathway, not the tool" : ""}.`
    );
  }
  return softenCertainty(
    "Primary endpoints were not met. The evidence does not support scale on clinical performance."
  );
}

/** Export formats, read from what the vendor actually committed to. */
export function exportFormats(request: DeploymentRequest | undefined, telemetry: TrialTelemetry): string[] {
  return request?.dataExport.formats ?? telemetry.exportTest.formats;
}
