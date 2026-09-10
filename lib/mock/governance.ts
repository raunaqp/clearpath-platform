/**
 * The hospital's governance records — audit assignments, committee verdicts,
 * placement, charter.
 *
 * VERDICTS ARE APPEND-ONLY, enforced here rather than by convention. A record
 * that can be edited proves nothing about what was decided at the time, and the
 * whole reason this exists is to be the institution's protection six months
 * later. A reversal is a NEW verdict carrying `supersedes`.
 */

import type {
  AuditAssignment,
  CommitteeVerdict,
  PlacementRecord,
  TrialCharter,
} from "@/lib/schemas/governance";
import { deriveEndpoints } from "@/lib/engine/charter";
import { getProblemRegister } from "./fixtures/site-profiles";
import { getDeploymentRequest } from "./handoff";
import { getCardV2 } from "./cards-v2";

const VERDICT_KEY = "clearpath-verdicts-v1";

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function save<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // Demo nicety only.
  }
}

let verdicts: CommitteeVerdict[] | null = null;
function allVerdicts(): CommitteeVerdict[] {
  if (!verdicts) verdicts = load<CommitteeVerdict>(VERDICT_KEY);
  return verdicts;
}
export function resetGovernance() {
  verdicts = [];
  save(VERDICT_KEY, verdicts);
}

// ═════════════════════════════════════════════════════════════════════════
// S17 · Who owned each gate
// ═════════════════════════════════════════════════════════════════════════

/**
 * Named owners against Northvale's 13 intake gates.
 *
 * Four carry the findings the committee discussed; the other nine were cleared
 * by the members whose remit they fall in. Every one has a person against it —
 * "the committee assessed consent" is not something anyone can be asked about
 * six months later.
 */
export const NORTHVALE_ASSIGNMENTS: AuditAssignment[] = [
  { gateId: "H8", ownerName: "R. Venkatesan", ownerRole: "Data Protection Officer", evidence: "DPDP privacy policy; camp consent procedure reviewed against our own." },
  { gateId: "H7", ownerName: "K. Sundaram", ownerRole: "Information security lead", evidence: "Integration specification; security posture checked against institutional policy." },
  { gateId: "H5", ownerName: "Dr. Meera Krishnan", ownerRole: "Consultant Gynaecologist", evidence: "Colposcopy on site, 11-day mean turnaround from the problem register." },
  { gateId: "H6", ownerName: "Dr. P. Raghunathan", ownerRole: "Medical Superintendent", evidence: "Camp rota and nurse release capacity from the site profile." },
  { gateId: "H1", ownerName: "Dr. Meera Krishnan", ownerRole: "Consultant Gynaecologist", evidence: "Independent validation study on the card." },
  { gateId: "H2", ownerName: "Dr. Meera Krishnan", ownerRole: "Consultant Gynaecologist", evidence: "Clinical evaluation report; documented failure modes." },
  { gateId: "H3", ownerName: "Dr. P. Raghunathan", ownerRole: "Medical Superintendent", evidence: "CDSCO MD-15 licence, valid to January 2028." },
  { gateId: "H4", ownerName: "Dr. Meera Krishnan", ownerRole: "Consultant Gynaecologist", evidence: "Clinician retains the referral decision; nurse may not refer on the flag alone." },
  { gateId: "H9", ownerName: "S. Anand", ownerRole: "Legal and contracts", evidence: "Liability and indemnity terms in the service agreement." },
  { gateId: "H10", ownerName: "Dr. P. Raghunathan", ownerRole: "Medical Superintendent", evidence: "Named clinical and operational owners assigned for the trial." },
  { gateId: "H11", ownerName: "K. Sundaram", ownerRole: "Information security lead", evidence: "Read-only performance dashboard available to the site." },
  { gateId: "H12", ownerName: "S. Anand", ownerRole: "Legal and contracts", evidence: "No billing change during the trial; costs held in the trial budget." },
  { gateId: "H13", ownerName: "S. Anand", ownerRole: "Legal and contracts", evidence: "Clean-exit terms with full data export in the service agreement." },
];

/**
 * Northvale's own answers. Two conditional, eleven pass.
 *
 * H8 is conditional because the vendor's consent flow assumes a digital capture
 * this hospital does not use in camps — the finding the divergence panel is
 * built on. H6 is conditional because the release is real but the rota has to
 * move to accommodate it.
 */
export const NORTHVALE_AUDIT_ANSWERS = {
  H1: "pass", H2: "pass", H3: "pass", H4: "pass", H5: "pass",
  H6: "partial", H7: "pass", H8: "partial", H9: "pass",
  H10: "pass", H11: "pass", H12: "pass", H13: "pass",
} as const;

export const NORTHVALE_AUDIT_NOTES: Record<string, string> = {
  H8: "Camp consent must be taken in Tamil, on paper, before image capture. The vendor's flow assumes digital capture at the point of consent, which we do not use in camps.",
  H6: "12 nurses released for 6h; the camp rota is adjusted to absorb it.",
  H5: "Colposcopy available on site, 11-day mean turnaround.",
  H7: "Security posture meets institutional policy.",
};

export function assignmentFor(gateId: string): AuditAssignment | undefined {
  return NORTHVALE_ASSIGNMENTS.find((a) => a.gateId === gateId);
}

// ═════════════════════════════════════════════════════════════════════════
// S18 · Committee verdicts — APPEND ONLY
// ═════════════════════════════════════════════════════════════════════════

export const SEEDED_VERDICT: CommitteeVerdict = {
  id: "verdict-cerviai-1",
  slug: "cerviai",
  requestId: "request-cerviai",
  hospitalId: "hosp-northvale",
  hospitalName: "Northvale Institute of Medical Sciences",
  decision: "TRIAL_UNDER_CHARTER",
  decidedAt: "2026-10-08T00:00:00.000Z",
  chair: { name: "Dr. P. Raghunathan", role: "Chair, clinical governance committee" },
  quorum: { present: 5, total: 7 },
  conflicts: [
    { member: "Dr. A. Iyer", nature: "Co-investigator on an unrelated study with the vendor", recused: true },
  ],
  localConditions: [
    "Tamil paper consent before image capture",
    "12 nurses released for training",
    "Interim review at day 45",
  ],
  dissent: [
    {
      member: "Dr. S. Bhaskar",
      position: "Requested a day-45 interim rather than day-60.",
      resolution: "Accepted into the charter as a review point with authority to stop.",
      accepted: true,
    },
  ],
  supersedes: null,
  revision: 1,
};

export function getVerdicts(slug: string): CommitteeVerdict[] {
  const stored = allVerdicts().filter((v) => v.slug === slug);
  const seeded = slug === "cerviai" ? [SEEDED_VERDICT] : [];
  return [...seeded, ...stored].sort((a, b) => a.revision - b.revision);
}

/** The verdict in force — the highest revision not itself superseded. */
export function currentVerdict(slug: string): CommitteeVerdict | undefined {
  const all = getVerdicts(slug);
  const superseded = new Set(all.map((v) => v.supersedes).filter(Boolean));
  return [...all].reverse().find((v) => !superseded.has(v.id));
}

export type RecordVerdictInput = Omit<CommitteeVerdict, "id" | "revision" | "supersedes"> & {
  /** The verdict this replaces. Required once one exists. */
  supersedes?: string;
};

/**
 * APPEND ONLY.
 *
 * Throws if a verdict already exists and this one does not say which it
 * replaces. Editing a verdict would destroy the only thing it is for: evidence
 * of what was decided, by whom, on a date — and a reversal that leaves no trace
 * of the original is indistinguishable from the committee never having changed
 * its mind.
 */
export function recordVerdict(input: RecordVerdictInput): CommitteeVerdict {
  const existing = getVerdicts(input.slug);
  const inForce = currentVerdict(input.slug);

  if (inForce && !input.supersedes) {
    throw new Error(
      `Verdict: ${input.slug} already has a verdict in force (${inForce.id}). Verdicts are append-only — a reversal is a new verdict that says which it supersedes, never an edit.`
    );
  }
  if (input.supersedes && !existing.some((v) => v.id === input.supersedes)) {
    throw new Error(`Verdict: cannot supersede "${input.supersedes}" — no such verdict.`);
  }

  const revision = existing.length + 1;
  const verdict: CommitteeVerdict = {
    ...input,
    id: `verdict-${input.slug}-${revision}`,
    supersedes: input.supersedes ?? null,
    revision,
  };
  const rows = allVerdicts();
  rows.push(verdict);
  save(VERDICT_KEY, rows);
  return verdict;
}

// ═════════════════════════════════════════════════════════════════════════
// S19 · Placement
// ═════════════════════════════════════════════════════════════════════════

export const NORTHVALE_PLACEMENT: PlacementRecord = {
  id: "placement-cerviai",
  slug: "cerviai",
  hospitalId: "hosp-northvale",
  pathwayPosition: "Immediately after VIA image capture, before the nurse's referral call.",
  // null is the WARNING case. See the schema note.
  replaces: null,
  touchpoints: [
    { actor: "Staff nurse", action: "Captures the image and reads the flag." },
    { actor: "Clinician", action: "Decides the referral." },
    { actor: "Outreach coordinator", action: "Books the colposcopy appointment." },
  ],
  decisionAuthority: {
    role: "Clinician",
    note: "The nurse may not refer on the tool's output alone.",
  },
  integration: {
    emrWriteBack: false,
    note: "No EMR write-back during the trial; records held in the trial capture log.",
    exportCadence: "Exported weekly",
  },
  consentPoint: {
    when: "At registration",
    language: "Tamil",
    medium: "Paper",
    beforeCapture: true,
  },
  loadDeltaMinutesPerPatient: 2,
  fallback:
    "Standard VIA reading continues in parallel; the colposcopy referral pathway is unchanged.",
};

// ═════════════════════════════════════════════════════════════════════════
// S20 · The charter
// ═════════════════════════════════════════════════════════════════════════

const REGISTER_ENTRY_ID = "pr-northvale-cervical-screening";

/**
 * Built from the site's register entry and the vendor's own request, not typed
 * out. The endpoints derive from the success definition published on 20 August;
 * the support taper is READ from the DeploymentRequest rather than restated,
 * so the charter cannot promise a taper the vendor did not offer.
 */
export function buildCharter(slug: string): TrialCharter | undefined {
  const request = getDeploymentRequest(slug);
  const verdict = currentVerdict(slug);
  const view = getCardV2(slug);
  if (!request || !verdict || !view) return undefined;

  const register = getProblemRegister(request.hospitalId);
  const entry = register?.entries.find((e) => e.id === (request.problemRegisterEntryId ?? REGISTER_ENTRY_ID));
  if (!register || !entry) return undefined;

  return {
    id: `charter-${slug}`,
    slug,
    hospitalId: request.hospitalId,
    requestId: request.id,
    verdictId: verdict.id,
    owner: { name: "Dr. Meera Krishnan", role: "Consultant Gynaecologist" },
    question: request.question,
    endpoints: deriveEndpoints(entry),
    scope: {
      participants: request.scope.participants,
      days: request.scope.days,
      sites: request.scope.sites,
    },
    stops: {
      safety: "Any missed high-grade lesion attributable to a tool-negative result.",
      futility: "Sensitivity below 0.75 at the day-45 interim.",
      operational: "Fewer than 40 screens per week for 2 consecutive weeks.",
    },
    decisionRule: {
      adopt: "All primary endpoints met and referral completion at or above 80% — adopt.",
      extend: "Primary endpoints met, referral completion short — extend against a stated new question.",
      retire: "Primary endpoints missed — retire.",
    },
    budget: { amount: 420000, currency: "INR", display: "₹4.2 lakh" },
    commitments: {
      // READ from the request. Retyping it is how a charter comes to promise
      // support the vendor never offered.
      supportTaper: request.supportTaper,
      modelVersionFrozen: request.modelPolicy.frozenForDuration,
    },
    reviewPoints: [
      { day: 45, name: "Interim review", authorityToStop: true },
      { day: 90, name: "Final review", authorityToStop: false },
    ],
    exit: {
      deviceReturnDays: 14,
      dataExport: "Full data export on termination.",
      followUp:
        "Women flagged positive are followed to colposcopy completion regardless of early termination.",
    },
    derivation: {
      registerEntryId: entry.id,
      registerEntryName: entry.name,
      successDefinition: entry.successDefinition ?? "",
      publishedAt: register.publishedAt,
      toolSubmittedAt: view.card.firstIssuedAt,
    },
    createdAt: verdict.decidedAt,
  };
}
