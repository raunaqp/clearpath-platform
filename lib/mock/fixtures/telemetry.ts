import type { AdoptionPoint, AlertRecord, TrialTelemetry } from "@/lib/schemas/telemetry";

/**
 * CerviAI's trial telemetry at Northvale, DAY 90 OF 90 — the trial is complete.
 *
 * It used to read day 34 while S23 showed final endpoint results. Completed
 * endpoint analysis a third of the way through a trial is not possible, and it
 * is the same class of defect as a request that "landed in an inbox" it never
 * reached: seeded data reporting a state nobody arrived at. A reviewer spots
 * it immediately, and having spotted one they stop trusting the rest.
 *
 * Representative demonstration data. Every derived figure — the override rate,
 * the support level in force, the export formats — is computed from something
 * else rather than typed here, so the panel cannot show a number the underlying
 * records disagree with.
 */
export const CERVIAI_TELEMETRY: TrialTelemetry = {
  slug: "cerviai",
  enrolment: { screened: 1000, target: 1000, dayOf: 90, totalDays: 90 },
  devices: {
    online: 4,
    total: 4,
    replacements: [{ day: 19, note: "Tablet at CHC-2 replaced within the 72h SLA." }],
    // Where a deployment quietly stops: nobody notices until the box is empty.
    // Low at the end of a completed run is the expected shape.
    consumablesPct: 22,
  },
  failures: {
    // A refused read is the quality gate WORKING — the device declining to
    // guess on an image below threshold. Counting it as a failure would
    // discourage exactly the behaviour the safety gate depends on.
    refusedReads: 28,
    downtimeDays: 0,
  },
  // 47 / 653 → 7.2%. The rate is derived; these two counts are the record.
  overrides: { flagsRaised: 653, flagsOverridden: 47 },
  exportTest: {
    // Overwritten at read time from the request's own dataExport formats.
    formats: [],
    testedOnDay: 30,
    result: "Both formats produced and opened. 1,000 records, no schema errors.",
  },
  protocolAdherence: { pct: 92, targetPct: 90 },
  provenance: {
    lastUpdated: "2027-01-24T18:00:00+05:30",
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
  /**
   * The tail is catchment saturation, not abandonment, and the distinction
   * matters: use held steady through the week-7 taper to on-call support, and
   * only fell once the eligible women in four CHC catchments had been screened.
   * A flat 96 a week to day 90 would have overshot the 1,000 target by week 11
   * and shown a trial that ran past its own enrolment.
   */
  { week: 9, screens: 78 },
  { week: 10, screens: 62 },
  { week: 11, screens: 47 },
  { week: 12, screens: 34 },
  { week: 13, screens: 24 },
];

/**
 * WHAT THE DAY-45 INTERIM MEASURED.
 *
 * Only the measurement lives here. The rule, its threshold, the day and
 * whether it fired are all read from the charter by `evaluateInterim` — a
 * fixture that carried its own copy of "0.75" could drift from the charter
 * that authorised the stop.
 */
export const CERVIAI_INTERIM = {
  measured: 0.87,
  measuredDisplay: "0.87",
  reviewedAt: "2026-12-10T00:00:00.000Z",
  reviewer: "Dr. Meera Krishnan",
};

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
