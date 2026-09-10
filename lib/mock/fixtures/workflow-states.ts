import type { DeploymentRequest, TriageDecision } from "@/lib/schemas/handoff";
import type { CommitteeVerdict } from "@/lib/schemas/governance";

/**
 * Seeded workflow states.
 *
 * Every enum value the engines can produce needs a path a viewer can CLICK to.
 * These are the ones no journey reached: a request that was declined, one that
 * was countered, a triage that parked, and the three committee outcomes that
 * were not "trial under charter".
 *
 * A four-outcome taxonomy that only ever renders one outcome reads as a
 * one-outcome system with three decorative options — which is the opposite of
 * what a governance record is for.
 */

const REQ_BASE = {
  mode: "trial" as const,
  supportTaper: [
    { fromWeek: 1, toWeek: 2, level: "On-site" },
    { fromWeek: 3, toWeek: 6, level: "Weekly" },
    { fromWeek: 7, toWeek: null, level: "On-call" },
  ],
  devices: { count: 4, description: "Tablets with offline capture", offlineCapture: true, replacementHours: 72 },
  training: { hoursPerOperator: 6, operatorCount: 12 },
  dataExport: { formats: ["CSV", "FHIR bundle"], onRequest: true, noticePeriodDays: 0 },
  modelPolicy: { frozenForDuration: true, onChange: "STOP_AND_REVIEW" as const },
  createdAt: "2026-09-30T00:00:00.000Z",
  sentAt: "2026-09-30T00:00:00.000Z",
};

/**
 * Requests that exist without the innovator having clicked through the wizard,
 * so the hospital-side states downstream of them are reachable.
 */
export const SEEDED_REQUESTS: Record<string, DeploymentRequest> = {
  /**
   * CerviAI's request, seeded so the charter and the trial screens are
   * reachable without first clicking the whole handoff. Anything the innovator
   * builds in-session still wins over this — see getDeploymentRequest.
   */
  cerviai: {
    ...REQ_BASE,
    id: "request-cerviai",
    facilitationId: "facilitation-cerviai",
    toolId: "tool-cerviai",
    slug: "cerviai",
    toolName: "CerviAI",
    hospitalId: "hosp-northvale",
    hospitalName: "Northvale Institute of Medical Sciences",
    cardId: "CP-2026-0915-CERVIAI-001",
    cardVersion: "v1.1",
    problemRegisterEntryId: "pr-northvale-cervical-screening",
    question:
      "Does CerviAI-assisted VIA screening increase detection of referable abnormalities at CHC level without increasing nurse workload?",
    scope: { sites: 4, siteType: "CHC", days: 90, participants: 1000, operatorCadre: "Staff nurse" },
    conditionPlans: [
      {
        itemId: "D1.B.01",
        gateId: "G1",
        label: "India-population validation",
        blocks: "ROUTINE_DEPLOYMENT",
        plan: "This trial generates the India-population evidence.",
        suppliedBy: "Innovator",
        prerequisite: { description: "CTRI registration", dueBy: "Before day 1" },
      },
    ],
    status: "UNDER_ASSESSMENT",
    hospitalResponse: {
      status: "UNDER_ASSESSMENT",
      at: "2026-10-01T00:00:00.000Z",
      note: "Advanced to audit.",
    },
  },
  /** DECLINED — the path 6a built and nothing ever travelled. */
  symptombot: {
    ...REQ_BASE,
    id: "request-symptombot",
    facilitationId: "facilitation-symptombot",
    toolId: "tool-symptombot",
    slug: "symptombot",
    toolName: "SymptomBot",
    hospitalId: "hosp-northvale",
    hospitalName: "Northvale Institute of Medical Sciences",
    cardId: "CP-2026-0915-SYMPTOMBOT-001",
    cardVersion: "v1.0",
    problemRegisterEntryId: null,
    question: "Does patient self-triage reduce inappropriate OPD presentations?",
    scope: { sites: 2, siteType: "CHC", days: 60, participants: 500, operatorCadre: "Patient" },
    conditionPlans: [],
    status: "DECLINED",
    hospitalResponse: {
      status: "DECLINED",
      at: "2026-10-01T00:00:00.000Z",
      note: "No informed-consent basis on file for patient-initiated use, and no confirmatory pathway for a self-triage output. We cannot run this here.",
    },
  },
  /** COUNTERED — different terms proposed, which is not a refusal. */
  ovareserve: {
    ...REQ_BASE,
    id: "request-ovareserve",
    facilitationId: "facilitation-ovareserve",
    toolId: "tool-ovareserve",
    slug: "ovareserve",
    toolName: "OvaReserve",
    hospitalId: "hosp-lakeview",
    hospitalName: "Lakeview Fertility Centre",
    cardId: "CP-2026-0915-OVARESERVE-001",
    cardVersion: "v1.0",
    problemRegisterEntryId: "pr-lakeview-ovarian-reserve",
    question: "Does reserve prediction improve stimulation protocol selection?",
    scope: { sites: 1, siteType: "private secondary", days: 120, participants: 300, operatorCadre: "Clinician" },
    conditionPlans: [],
    status: "COUNTERED",
    hospitalResponse: {
      status: "COUNTERED",
      at: "2026-10-02T00:00:00.000Z",
      note: "We will host this at 120 days rather than 90, with performance visibility set up before day 1 rather than during. Same scope otherwise.",
    },
  },
  /** ACCEPTED — the clean case, so the enum is not only ever bad news. */
  chestxr: {
    ...REQ_BASE,
    id: "request-chestxr",
    facilitationId: "facilitation-chestxr",
    toolId: "tool-chestxr",
    slug: "chestxr",
    toolName: "ChestXR-TB",
    hospitalId: "hosp-northvale",
    hospitalName: "Northvale Institute of Medical Sciences",
    cardId: "CP-2026-0915-CHESTXR-001",
    cardVersion: "v1.0",
    problemRegisterEntryId: "pr-northvale-tb-case-finding",
    question: "Does chest X-ray triage increase TB case finding without adding radiologist load?",
    scope: { sites: 4, siteType: "CHC", days: 90, participants: 1200, operatorCadre: "Staff nurse" },
    conditionPlans: [],
    status: "ACCEPTED",
    hospitalResponse: { status: "ACCEPTED", at: "2026-10-01T00:00:00.000Z", note: "Accepted as submitted." },
  },
  /**
   * Routed to a site with NO PROBLEM REGISTER, so triage's first question comes
   * back `unanswerable` — distinct from a fail, because it sends the hospital
   * to publish a register rather than to decline this request.
   */
  embryograde: {
    ...REQ_BASE,
    id: "request-embryograde",
    facilitationId: "facilitation-embryograde",
    toolId: "tool-embryograde",
    slug: "embryograde",
    toolName: "EmbryoGrade AI",
    hospitalId: "hosp-perambur",
    hospitalName: "Perambur Municipal Hospital",
    cardId: "CP-2026-0915-EMBRYOGRADE-001",
    cardVersion: "v1.0",
    problemRegisterEntryId: null,
    question: "Does AI blastocyst ranking improve transfer selection consistency?",
    scope: { sites: 1, siteType: "private tertiary", days: 120, participants: 400, operatorCadre: "Specialist" },
    conditionPlans: [],
    status: "RECEIVED",
    hospitalResponse: null,
  },
  /** RECEIVED — sitting with the hospital, untouched. */
  retinascan: {
    ...REQ_BASE,
    id: "request-retinascan",
    facilitationId: "facilitation-retinascan",
    toolId: "tool-retinascan",
    slug: "retinascan",
    toolName: "RetinaScan",
    hospitalId: "hosp-kaveri",
    hospitalName: "Kaveri District Hospital",
    cardId: "CP-2026-0915-RETINASCAN-001",
    cardVersion: "v1.0",
    problemRegisterEntryId: null,
    question: "Does fundus triage increase referable retinopathy detection at PHC level?",
    scope: { sites: 3, siteType: "PHC", days: 90, participants: 800, operatorCadre: "Staff nurse" },
    conditionPlans: [],
    status: "RECEIVED",
    hospitalResponse: null,
  },
};

/**
 * Triage decisions. DECLINE and PARK were both unreachable — and a decline that
 * never travels is a return path nobody has tested.
 */
export const SEEDED_TRIAGE: Record<string, TriageDecision> = {
  symptombot: {
    id: "triage-symptombot",
    requestId: "request-symptombot",
    slug: "symptombot",
    hospitalId: "hosp-northvale",
    hospitalName: "Northvale Institute of Medical Sciences",
    outcome: "DECLINE",
    decidedAt: "2026-10-01T00:00:00.000Z",
    decidedBy: "Dr. Meera Raghavan, clinical governance lead",
    reason:
      "No informed-consent basis on file for patient-initiated use, and nothing on our register matches a self-triage claim. A positive output would have nowhere to go.",
    revisitAt: null,
    findings: [],
    returnedToInnovator: true,
  },
  /** PARK — not now, and a date when it will be looked at again. */
  retinascan: {
    id: "triage-retinascan",
    requestId: "request-retinascan",
    slug: "retinascan",
    hospitalId: "hosp-kaveri",
    hospitalName: "Kaveri District Hospital",
    outcome: "PARK",
    decidedAt: "2026-10-01T00:00:00.000Z",
    decidedBy: "Dr. S. Anand, medical superintendent",
    reason:
      "Cervical screening is ahead of retinopathy on our register this year. Worth revisiting once the camp generator upgrade is in.",
    revisitAt: "2027-01-15T00:00:00.000Z",
    findings: [],
    returnedToInnovator: true,
  },
};

/**
 * Committee verdicts. Three of the four outcomes had never rendered.
 */
export const SEEDED_VERDICTS: CommitteeVerdict[] = [
  {
    id: "verdict-chestxr-1",
    slug: "chestxr",
    requestId: "request-chestxr",
    hospitalId: "hosp-northvale",
    hospitalName: "Northvale Institute of Medical Sciences",
    decision: "DEPLOY",
    decidedAt: "2026-10-08T00:00:00.000Z",
    chair: { name: "Dr. P. Raghunathan", role: "Chair, clinical governance committee" },
    quorum: { present: 6, total: 7 },
    conflicts: [],
    localConditions: ["Monthly performance review for the first two quarters"],
    dissent: [],
    supersedes: null,
    revision: 1,
  },
  {
    id: "verdict-ovareserve-1",
    slug: "ovareserve",
    requestId: "request-ovareserve",
    hospitalId: "hosp-lakeview",
    hospitalName: "Lakeview Fertility Centre",
    decision: "CONDITIONAL_HOLD",
    decidedAt: "2026-10-09T00:00:00.000Z",
    chair: { name: "Dr. K. Ramanathan", role: "Chair, clinical governance committee" },
    quorum: { present: 5, total: 7 },
    conflicts: [{ member: "Dr. V. Menon", nature: "Advisory role with a competing vendor", recused: true }],
    localConditions: [
      "Performance visibility configured before day 1, not during",
      "Local calibration data reviewed at day 30",
    ],
    dissent: [
      {
        member: "Dr. L. Fernandes",
        position: "Argued the reserve predictor should not inform stimulation protocols at all until locally calibrated.",
        resolution: "Not accepted; the hold covers it via the day-30 calibration review.",
        accepted: false,
      },
    ],
    supersedes: null,
    revision: 1,
  },
  {
    id: "verdict-symptombot-1",
    slug: "symptombot",
    requestId: "request-symptombot",
    hospitalId: "hosp-northvale",
    hospitalName: "Northvale Institute of Medical Sciences",
    decision: "DECLINE",
    decidedAt: "2026-10-10T00:00:00.000Z",
    chair: { name: "Dr. P. Raghunathan", role: "Chair, clinical governance committee" },
    quorum: { present: 6, total: 7 },
    conflicts: [],
    localConditions: [],
    dissent: [],
    supersedes: null,
    revision: 1,
  },
];
