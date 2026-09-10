import { z } from "zod";

/**
 * Trial telemetry — what makes a trial legible as an OPERATION rather than a
 * chart.
 *
 * Four charts tell you whether the model is holding up. None of them tells you
 * whether the devices are working, whether anyone is overriding the output,
 * whether the export the vendor promised has ever been exercised, or whether
 * the site is following the protocol. Those are the things that decide whether
 * a trial result means anything, and they were absent.
 */

/** A device replacement, with the day it happened. */
export const DeviceEventSchema = z.object({ day: z.number(), note: z.string() });

export const DeviceHealthSchema = z.object({
  online: z.number(),
  total: z.number(),
  replacements: z.array(DeviceEventSchema),
  /** Consumables remaining, as a percentage. Where a deployment quietly stops. */
  consumablesPct: z.number(),
});

/**
 * Override rate is a MEASUREMENT, not an error count.
 *
 * A clinician overriding some proportion of flags is a fact about how the tool
 * is actually used, and it is one of the most informative numbers in a trial. A
 * high rate is not a bug report — it is the framework working: it says the
 * output is not trusted, or not actionable, or not calibrated to this
 * population. Counting it as "errors" would frame a finding as a fault and
 * discourage the site from recording it honestly.
 *
 * The RATE is derived from the two counts, never stored, so it cannot drift
 * from them.
 */
export const OverrideSchema = z.object({
  flagsRaised: z.number(),
  flagsOverridden: z.number(),
});
export type Overrides = z.infer<typeof OverrideSchema>;

export function overrideRatePct(o: Overrides): number {
  if (o.flagsRaised === 0) return 0;
  return Math.round((o.flagsOverridden / o.flagsRaised) * 1000) / 10;
}

export const FailureSchema = z.object({
  /** Reads the device refused to produce — a quality gate doing its job. */
  refusedReads: z.number(),
  downtimeDays: z.number(),
});

/**
 * An export actually exercised.
 *
 * The request guaranteed CSV and FHIR on demand with a zero-day notice period.
 * An export that has never been run is a promise, not a capability — the whole
 * value of testing it mid-run is that a site discovers the gap while it still
 * has leverage, rather than at closeout when the data is already stranded.
 */
export const ExportTestSchema = z.object({
  /** Read from the request's dataExport. Never retyped. */
  formats: z.array(z.string()),
  testedOnDay: z.number().nullable(),
  result: z.string(),
});

export const ProtocolAdherenceSchema = z.object({
  pct: z.number(),
  targetPct: z.number(),
});

export const TrialTelemetrySchema = z.object({
  slug: z.string(),
  enrolment: z.object({
    screened: z.number(),
    target: z.number(),
    dayOf: z.number(),
    totalDays: z.number(),
  }),
  devices: DeviceHealthSchema,
  failures: FailureSchema,
  overrides: OverrideSchema,
  exportTest: ExportTestSchema,
  protocolAdherence: ProtocolAdherenceSchema,
  /** Provenance — where the numbers came from and who last looked. */
  provenance: z.object({
    lastUpdated: z.string(),
    source: z.string(),
    reviewer: z.string(),
    cadence: z.string(),
  }),
});
export type TrialTelemetry = z.infer<typeof TrialTelemetrySchema>;

/**
 * An alert with its HISTORY, not just its open state.
 *
 * An open alert alone shows only that something is wrong. A resolved one, with
 * what was done and when, is the thing that shows governance actually working —
 * and a monitoring screen that can only display problems teaches a reader that
 * the platform finds faults rather than that the site fixes them.
 */
export const AlertStatusEnum = z.enum(["open", "resolved"]);

export const AlertRecordSchema = z.object({
  id: z.string(),
  raisedAt: z.string(),
  title: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  /** What was actually done about it. */
  action: z.string(),
  status: AlertStatusEnum,
  resolvedAt: z.string().nullable(),
});
export type AlertRecord = z.infer<typeof AlertRecordSchema>;

/** Weekly adoption, plotted against the support level in force that week. */
export const AdoptionPointSchema = z.object({
  week: z.number(),
  screens: z.number(),
  supportLevel: z.string(),
});
export type AdoptionPoint = z.infer<typeof AdoptionPointSchema>;
