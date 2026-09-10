import type { AdoptionPoint, AlertRecord, TrialTelemetry } from "@/lib/schemas/telemetry";

/**
 * CerviAI's trial telemetry at Northvale, day 34 of 90.
 *
 * Representative demonstration data. Every derived figure — the override rate,
 * the support level in force, the export formats — is computed from something
 * else rather than typed here, so the panel cannot show a number the underlying
 * records disagree with.
 */
export const CERVIAI_TELEMETRY: TrialTelemetry = {
  slug: "cerviai",
  enrolment: { screened: 412, target: 1000, dayOf: 34, totalDays: 90 },
  devices: {
    online: 4,
    total: 4,
    replacements: [{ day: 19, note: "Tablet at CHC-2 replaced within the 72h SLA." }],
    // Where a deployment quietly stops: nobody notices until the box is empty.
    consumablesPct: 68,
  },
  failures: {
    // A refused read is the quality gate WORKING — the device declining to
    // guess on an image below threshold. Counting it as a failure would
    // discourage exactly the behaviour the safety gate depends on.
    refusedReads: 11,
    downtimeDays: 0,
  },
  // 19 / 264 → 7.2%. The rate is derived; these two counts are the record.
  overrides: { flagsRaised: 264, flagsOverridden: 19 },
  exportTest: {
    // Overwritten at read time from the request's own dataExport formats.
    formats: [],
    testedOnDay: 30,
    result: "Both formats produced and opened. 412 records, no schema errors.",
  },
  protocolAdherence: { pct: 92, targetPct: 90 },
  provenance: {
    lastUpdated: "2026-11-28T18:00:00+05:30",
    source: "Site capture log, 4 CHCs",
    reviewer: "Dr. Meera Krishnan",
    cadence: "Weekly",
  },
};

/**
 * Alert history. BOTH states are present on purpose — the resolved one is what
 * shows governance working, and a screen that only ever shows open alerts
 * teaches a reader that the platform finds faults rather than that the site
 * closes them.
 */
export const CERVIAI_ALERTS: AlertRecord[] = [
  {
    id: "alert-cerviai-referral",
    raisedAt: "2026-11-12T00:00:00.000Z",
    title: "Referral completion below target, 64% at week 4",
    severity: "medium",
    action: "Referral coordinator role created; S. Anitha assigned to close the loop.",
    status: "open",
    resolvedAt: null,
  },
  {
    id: "alert-cerviai-sync",
    raisedAt: "2026-10-29T00:00:00.000Z",
    title: "Offline sync backlog at CHC-3, 40 studies queued",
    severity: "low",
    action: "Local storage cleared; nightly sync scheduled.",
    status: "resolved",
    resolvedAt: "2026-10-31T00:00:00.000Z",
  },
];

/**
 * Weekly screens. The support level per week is filled in at read time from the
 * charter's taper, so this answers the D3 adoption question with a MEASUREMENT
 * against the support actually in force — not an assertion that people kept
 * using it.
 */
export const CERVIAI_ADOPTION: Omit<AdoptionPoint, "supportLevel">[] = [
  { week: 1, screens: 74 },
  { week: 2, screens: 88 },
  { week: 3, screens: 96 },
  { week: 4, screens: 101 },
  { week: 5, screens: 104 },
  { week: 6, screens: 99 },
  { week: 7, screens: 97 },
  { week: 8, screens: 96 },
];

/** Measured actuals, against what the charter and placement estimated. */
export const CERVIAI_ACTUALS = {
  /** Placement estimated +2 min. Read from S19; only the MEASURED value lives here. */
  nurseLoadMeasuredMin: 2.6,
  /** Charter budgeted ₹4.2 lakh. Read from S20; only the SPENT value lives here. */
  costSpent: 405000,
  costSpentDisplay: "₹4.05 lakh",
  costNote: "including consumables and staff time",
  /**
   * Conditions actually SUPPLIED, against what was promised. "10 of 12" is the
   * interesting number — a trial where every condition was met exactly as
   * written is a trial nobody was watching closely.
   */
  conditionsSupplied: [
    {
      condition: "Tamil paper consent before image capture",
      owner: "Northvale",
      supplied: "Supplied from day 1.",
      met: true,
    },
    {
      condition: "12 nurses released for training",
      owner: "Northvale",
      supplied: "10 of 12 released; 2 substituted mid-trial.",
      met: false,
    },
    {
      condition: "CTRI registration before day 1",
      owner: "CerviAI Health",
      supplied: "Registered before day 1.",
      met: true,
    },
  ],
};

/**
 * Endpoint results. Targets are NOT here — they are read from the charter,
 * which derived them from the success definition the site published before it
 * saw this tool. Only what was measured lives in the fixture.
 *
 * REFERRAL COMPLETION MISSES, and it is the right one to miss: a referral that
 * does not complete is a health-system failure, not a model failure, and
 * telling those two apart is what D3 and D4 exist for. Four of four met would
 * read as a sales demo.
 */
export const CERVIAI_ENDPOINT_RESULTS: Record<string, { value: string; numeric: number }> = {
  "Sensitivity for referable findings": { value: "0.89", numeric: 0.89 },
  Specificity: { value: "0.83", numeric: 0.83 },
  "Colposcopy referral completion": { value: "68%", numeric: 68 },
  "Time to referral": { value: "12 days", numeric: 12 },
};
