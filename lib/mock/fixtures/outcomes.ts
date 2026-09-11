import type { OutcomeDecision, Closeout } from "@/lib/schemas/outcome";

/**
 * Outcome decisions, one per branch.
 *
 * ALL THREE BRANCHES ARE SEEDED. A three-outcome rule that only ever shows one
 * outcome has two decorative options, and a reader cannot tell whether the
 * other two are implemented or merely described. CerviAI extends, ChestXR
 * adopts, SymptomBot retires — and each carries what its branch requires,
 * because `assertOutcomeComplete` will not let it exist otherwise.
 */

// ═════════════════════════════════════════════════════════════════════════
// CerviAI @ Northvale — EXTEND
// ═════════════════════════════════════════════════════════════════════════

const CERVIAI_EXTEND: OutcomeDecision = {
  id: "outcome-cerviai-1",
  slug: "cerviai",
  hospitalId: "hosp-northvale",
  hospitalName: "Northvale Institute of Medical Sciences",
  charterId: "charter-cerviai",
  decision: "EXTEND",
  decidedAt: "2027-01-24T00:00:00.000Z",
  chair: {
    name: "Dr. P. Raghunathan",
    role: "Chair, Clinical AI Governance Committee",
    conflictPosition: "NONE",
    conflictNote: null,
  },
  quorum: { present: 6, total: 7 },
  dissent: [],
  /**
   * COPIED FROM THE CHARTER AT DECISION TIME, not referenced.
   *
   * A reader six months later has to see the sentence that was applied without
   * trusting that the charter still says what it said. The clause and the
   * reasoning are whatever the predicate produced — neither is retyped here by
   * a human who already knew the answer.
   */
  ruleApplied: {
    clause: "EXTEND",
    text: "Primary endpoints met, referral completion short — extend against a stated new question.",
    why: "Every primary endpoint was met, but Colposcopy referral completion reached 68% against a target of ≥ 80%. The extend clause applies — the shortfall is the question an extension has to answer.",
  },
  extension: {
    /**
     * The new question is the SHORTFALL, turned into something answerable.
     * "Run it for longer and see" is not a question; this names the
     * intervention (a named coordinator) and the threshold it has to reach.
     */
    newQuestion:
      "Does colposcopy referral completion reach 80% when a named referral coordinator closes the loop on flagged cases?",
    newStopRule: "Referral completion below 70% at day 45 of the extension — retire.",
    days: 90,
    sites: 4,
    modelVersionUnchanged: true,
    owner: { name: "Dr. Meera Krishnan", role: "Consultant Gynaecologist" },
    reviewOn: "2027-04-24T00:00:00.000Z",
  },
  adoption: null,
  retirement: null,
  supersedes: null,
  revision: 1,
};

// ═════════════════════════════════════════════════════════════════════════
// ChestXR @ Salem — ADOPT
// ═════════════════════════════════════════════════════════════════════════

const CHESTXR_ADOPT: OutcomeDecision = {
  id: "outcome-chestxr-1",
  slug: "chestxr",
  hospitalId: "hosp-northvale",
  hospitalName: "Northvale Institute of Medical Sciences",
  charterId: "charter-chestxr",
  decision: "ADOPT",
  decidedAt: "2027-02-18T00:00:00.000Z",
  chair: {
    name: "Dr. P. Raghunathan",
    role: "Chair, Clinical AI Governance Committee",
    conflictPosition: "NONE",
    conflictNote: null,
  },
  quorum: { present: 7, total: 7 },
  dissent: [
    {
      member: "Dr. S. Bhaskar",
      position: "Asked that the first BAU review be at three months rather than six.",
      resolution: "Accepted; the review date is set to 18 May 2027.",
      accepted: true,
    },
  ],
  ruleApplied: {
    clause: "ADOPT",
    text: "All primary endpoints met and referral completion at or above 80% — adopt.",
    why: "Every primary endpoint was met and referral completion reached 84% against a target of ≥ 80%. The adopt clause applies.",
  },
  extension: null,
  adoption: {
    /**
     * A DIFFERENT PERSON from the trial owner, and the guard enforces it. The
     * trial owner ran a study; business as usual is a different job, and the
     * person who volunteered for the interesting part is not automatically the
     * person who will still be there in two years.
     */
    bauOwner: { name: "Dr. R. Venkatesan", role: "Head of Respiratory Medicine" },
    fundingLine: "NTEP district allocation, recurring from FY 2027-28",
    reviewOn: "2027-05-18T00:00:00.000Z",
  },
  retirement: null,
  supersedes: null,
  revision: 1,
};

// ═════════════════════════════════════════════════════════════════════════
// SymptomBot — RETIRE
// ═════════════════════════════════════════════════════════════════════════

const SYMPTOMBOT_RETIRE: OutcomeDecision = {
  id: "outcome-symptombot-1",
  slug: "symptombot",
  hospitalId: "hosp-northvale",
  hospitalName: "Northvale Institute of Medical Sciences",
  charterId: "charter-symptombot",
  decision: "RETIRE",
  decidedAt: "2027-01-08T00:00:00.000Z",
  chair: {
    name: "Dr. P. Raghunathan",
    role: "Chair, Clinical AI Governance Committee",
    conflictPosition: "NONE",
    conflictNote: null,
  },
  quorum: { present: 6, total: 7 },
  dissent: [],
  ruleApplied: {
    clause: "RETIRE",
    text: "Primary endpoints missed — retire.",
    why: "A primary endpoint was not met — triage concordance with a clinician. The retire clause applies and no other clause is reachable.",
  },
  extension: null,
  adoption: null,
  retirement: {
    /**
     * Stopping is an operation. Each of these names where something GOES —
     * a retirement that says only "we stopped using it" leaves conversation
     * logs on a vendor's server and patients mid-pathway.
     */
    dataPlan:
      "Conversation logs exported to the hospital's DPDP store within 14 days, then deleted from the vendor environment with written confirmation.",
    devicePlan: "No hospital-owned hardware. Vendor API keys revoked on the effective date.",
    patientContinuityPlan:
      "The 340 patients who received a triage recommendation in the last 30 days are contacted by the OPD helpdesk and offered a nurse-led reassessment.",
    effectiveFrom: "2027-01-22T00:00:00.000Z",
  },
  supersedes: null,
  revision: 1,
};

export const OUTCOME_FIXTURES: Record<string, OutcomeDecision[]> = {
  cerviai: [CERVIAI_EXTEND],
  chestxr: [CHESTXR_ADOPT],
  symptombot: [SYMPTOMBOT_RETIRE],
};

// ═════════════════════════════════════════════════════════════════════════
// S25 · Closeout — named people, never functions
// ═════════════════════════════════════════════════════════════════════════

const CERVIAI_CLOSEOUT: Closeout = {
  id: "closeout-cerviai",
  slug: "cerviai",
  hospitalId: "hosp-northvale",
  decisionId: "outcome-cerviai-1",
  runs: {
    name: "S. Anitha",
    role: "Community Outreach Coordinator",
    org: "Northvale Institute of Medical Sciences",
    detail: "Runs the camp rota across the four CHCs.",
  },
  maintainsModel: {
    name: "CerviAI Health",
    role: "Vendor, model and updates",
    org: "CerviAI Health",
    detail: "Model version frozen for the extension.",
  },
  maintainsIntegration: {
    name: "M. Prakash",
    role: "IT Systems Lead",
    org: "Northvale IT",
    detail: "Owns the HMIS integration and the nightly sync.",
  },
  pays: "Extension funded from the NP-NCD district allocation.",
  referralBackstop: {
    name: "S. Anitha",
    role: "Community Outreach Coordinator",
    org: "Northvale Institute of Medical Sciences",
    detail: "Closes the loop on every flagged case — the intervention the extension exists to test.",
  },
  performanceMonitoring: {
    name: "Dr. Meera Krishnan",
    role: "Consultant Gynaecologist",
    org: "Northvale Institute of Medical Sciences",
    detail: null,
  },
  monitoringCadence: "Monthly",
  handoverAt: "2027-01-24T00:00:00.000Z",
  nextReviewAt: "2027-04-24T00:00:00.000Z",
  /**
   * THE VACANCY TRIGGER, on screen rather than in a policy nobody opens.
   * An orphaned tool running unowned in a clinical pathway is the failure this
   * whole record exists to prevent.
   */
  ownerVacancyTrigger:
    "If any named post above falls vacant, CerviAI is flagged for committee review within 7 days and the camp rota pauses until a successor is named.",
};

export const CLOSEOUT_FIXTURES: Record<string, Closeout> = {
  cerviai: CERVIAI_CLOSEOUT,
};
