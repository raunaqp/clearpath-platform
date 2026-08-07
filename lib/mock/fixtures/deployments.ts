import type { Deployment } from "@/lib/schemas/deployment";

/**
 * Seed deployments (BUILD_SPEC §6, §8).
 *   - CerviAI: an active clinical TRIAL mid-flight (day 34 of 90), in the
 *     monitoring phase — the live trial-workflow showcase.
 *   - ChestXR-TB: a completed + published DEPLOYMENT so /registry shows a
 *     finished deployment with an outcome.
 */
export const DEPLOYMENTS: Deployment[] = [
  {
    id: "deploy-cerviai",
    submissionId: "sub-cerviai",
    hospitalId: "hosp-northvale",
    toolId: "tool-cerviai",
    kind: "trial",
    phase: "monitoring",
    dayOf: 34,
    totalDays: 90,
    metrics: [
      { key: "enrolment", label: "Enrolment", value: "412 / 1,000", hint: "women screened" },
      { key: "docs", label: "Documents", value: "78%", hint: "eTMF-lite complete" },
      { key: "alerts", label: "Open alerts", value: "2", hint: "1 high severity" },
      { key: "followup", label: "Colposcopy follow-up", value: "63%", hint: "target ≥ 80%" },
    ],
    alerts: [
      {
        id: "alert-referral-gap",
        severity: "high",
        title: "Referral gap",
        detail: "Colposcopy follow-up at 63%, below the 80% target for flagged cases.",
        escalation: "Escalated to site PI; a referral coordinator has been added to close the loop.",
      },
      {
        id: "alert-review-backlog",
        severity: "medium",
        title: "Review backlog",
        detail: "22 flagged smears awaiting cytologist review beyond the 48-hour window.",
        escalation: "Backlog flagged to the lab lead; an extra review slot was added this week.",
      },
    ],
    driftWatch: {
      sensitivity: "Stable at 0.91 (baseline 0.90)",
      jsd: "0.03 — within band (< 0.10)",
      oodFlag: false,
    },
    roles: [
      { role: "Site principal investigator", person: "Dr. S. Thomas", status: "active" },
      { role: "Screening nurse", person: "R. Lakshmi", status: "active" },
      { role: "Cytologist", person: "Dr. P. Nair", status: "active" },
      { role: "Referral coordinator", person: "To be confirmed", status: "pending" },
      { role: "Data manager", person: "A. Fernandes", status: "assigned" },
    ],
    docIds: ["cerviai-validation", "cerviai-cdsco", "cerviai-dpdp", "cerviai-eval", "cerviai-ethics"],
    scorecard: [],
    // Analysis phase populated (study endpoints) so the payoff is visible.
    endpoints: [
      { name: "Sensitivity for referable lesions", kind: "primary", target: "≥ 0.85", result: "0.90", met: true },
      { name: "Specificity", kind: "primary", target: "≥ 0.80", result: "0.86", met: true },
      { name: "Colposcopy referral completion", kind: "secondary", target: "≥ 80%", result: "63%", met: false },
      { name: "Time to referral", kind: "secondary", target: "≤ 14 days", result: "11 days", met: true },
    ],
    recommendation: {
      decision: "EXTEND",
      rationale:
        "Primary endpoints met with stable performance; the referral-completion endpoint is below target. Likely worth extending the trial to close the referral gap before scaling.",
    },
    ownership: {
      runs: "Northvale screening nurses, per camp rota",
      maintains: "CerviAI Health (model) + hospital IT (integration)",
      pays: "Trial budget, transitioning to the cervical-screening program",
      referralBackstop: "Referral coordinator closes the loop on flagged smears",
      monitoringCadence: "Monthly performance + drift review for the first two quarters",
    },
    ctriPrepared: false,
    published: false,
    createdAt: "2026-06-06T09:00:00.000Z",
  },
  {
    id: "deploy-chestxr",
    submissionId: "sub-chestxr",
    hospitalId: "hosp-northvale",
    toolId: "tool-chestxr",
    kind: "deployment",
    phase: "handover",
    dayOf: 90,
    totalDays: 90,
    metrics: [
      { key: "enrolment", label: "Enrolment", value: "1,000 / 1,000", hint: "X-rays triaged" },
      { key: "docs", label: "Documents", value: "100%", hint: "eTMF-lite complete" },
      { key: "alerts", label: "Open alerts", value: "0", hint: "all resolved" },
      { key: "followup", label: "Confirmatory testing", value: "88%", hint: "target ≥ 80%" },
    ],
    alerts: [],
    driftWatch: {
      sensitivity: "Stable at 0.94 (baseline 0.93)",
      jsd: "0.02 — within band (< 0.10)",
      oodFlag: false,
    },
    roles: [
      { role: "Site principal investigator", person: "Dr. J. Kurien", status: "complete" },
      { role: "Radiographer", person: "M. Suresh", status: "complete" },
      { role: "TB program officer", person: "Dr. H. Banu", status: "complete" },
      { role: "Data manager", person: "A. Fernandes", status: "complete" },
    ],
    docIds: ["chestxr-validation", "chestxr-cdsco", "chestxr-dpdp", "chestxr-eval"],
    scorecard: [
      { key: "clinical", label: "Clinical", score: 92, note: "Sensitivity 0.94; specificity 0.88 on 1,000 screened." },
      { key: "workflow", label: "Workflow", score: 86, note: "Triage cut radiologist read time by ~40%." },
      { key: "referral", label: "Referral", score: 88, note: "88% of flagged cases reached confirmatory testing." },
      { key: "cost", label: "Cost", score: 80, note: "Cost per confirmed case within budget envelope." },
      { key: "equity", label: "Equity", score: 84, note: "Consistent performance across camp and PHC sites." },
    ],
    recommendation: {
      decision: "SCALE",
      rationale:
        "Clinical and referral outcomes met targets with stable performance; likely suitable to scale to additional PHCs with the same monitoring cadence.",
    },
    ownership: {
      runs: "PHC screening nurses, per site rota",
      maintains: "ChestXR Labs (model) + hospital IT (integration)",
      pays: "District TB program budget",
      referralBackstop: "District TB officer coordinates confirmatory testing",
      monitoringCadence: "Monthly performance + drift review for the first two quarters",
    },
    endpoints: [],
    ctriPrepared: false,
    published: true,
    createdAt: "2026-03-20T09:00:00.000Z",
  },
  {
    // OvaReserve clinical TRIAL ONGOING at Lakeview (fertility centre) — the
    // specialty trial that shows up on the registry.
    id: "deploy-ovareserve",
    submissionId: "sub-ovareserve",
    hospitalId: "hosp-lakeview",
    toolId: "tool-ovareserve",
    kind: "trial",
    phase: "monitoring",
    dayOf: 40,
    totalDays: 120,
    metrics: [
      { key: "enrolment", label: "Enrolment", value: "88 / 240", hint: "IVF cycles" },
      { key: "docs", label: "eTMF", value: "70%", hint: "complete" },
      { key: "alerts", label: "Open alerts", value: "1", hint: "1 low severity" },
      { key: "followup", label: "Protocol adherence", value: "92%", hint: "target ≥ 90%" },
    ],
    alerts: [
      {
        id: "alert-ova-calibration",
        severity: "low",
        title: "Calibration drift watch",
        detail: "Predicted-vs-observed reserve within band; monitoring the local calibration curve.",
        escalation: "Flagged to the trial statistician for the monthly review.",
      },
    ],
    driftWatch: { sensitivity: "Calibration stable (slope 0.98)", jsd: "0.02 — within band", oodFlag: false },
    roles: [
      { role: "Principal investigator", person: "Dr. A. Menon", status: "active" },
      { role: "Embryologist", person: "S. Raghavan", status: "active" },
      { role: "Data manager", person: "To be confirmed", status: "pending" },
    ],
    docIds: ["ovareserve-validation", "ovareserve-manual"],
    scorecard: [],
    endpoints: [],
    recommendation: null,
    ownership: null,
    ctriPrepared: true,
    published: false,
    createdAt: "2026-05-25T09:00:00.000Z",
  },
];
