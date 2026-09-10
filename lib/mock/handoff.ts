/**
 * The ClearPath handoff store — interest, facilitation, the structured request.
 *
 * THE GATE IS ENFORCED HERE, not in a page. `createDeploymentRequest` throws
 * unless facilitation has reached BOTH_SIDES_WILLING. A route guard alone would
 * be a suggestion — anyone who typed the URL, or any future screen that linked
 * to it, would walk straight past the coordination layer this phase exists to
 * put back. The page redirects too, but the data layer is what makes it true.
 */

import type {
  DeploymentRequest,
  TriageDecision,
  TriageOutcomeState,
  FacilitationEntry,
  FacilitationRecord,
  FacilitationStep,
  HandoffState,
  InterestRecord,
} from "@/lib/schemas/handoff";
import { FACILITATION_ORDER } from "@/lib/schemas/handoff";
import { getCardV2 } from "./cards-v2";
import { getSiteProfile, getProblemRegister } from "./fixtures/site-profiles";
import { findProblem } from "@/lib/match";
import { HOSPITALS } from "./fixtures/hospitals";
import { getItem } from "@/lib/engine/item-bank";
import { SEEDED_REQUESTS, SEEDED_TRIAGE } from "./fixtures/workflow-states";

const INTEREST_KEY = "clearpath-interest-v1";
const REQUEST_KEY = "clearpath-requests-v1";
const TRIAGE_KEY = "clearpath-triage-v1";

// ── persistence (metadata only, same convention as the rest of the mock) ────

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
    // A demo nicety. Never break the flow over storage.
  }
}

let interests: InterestRecord[] | null = null;
let requests: DeploymentRequest[] | null = null;
let triageDecisions: TriageDecision[] | null = null;

function allInterests(): InterestRecord[] {
  if (!interests) interests = load<InterestRecord>(INTEREST_KEY);
  return interests;
}
function allRequests(): DeploymentRequest[] {
  if (!requests) requests = load<DeploymentRequest>(REQUEST_KEY);
  return requests;
}

export function resetHandoff() {
  interests = [];
  requests = [];
  triageDecisions = [];
  save(INTEREST_KEY, interests);
  save(REQUEST_KEY, requests);
  save(TRIAGE_KEY, triageDecisions);
}

// ═════════════════════════════════════════════════════════════════════════
// S10 · Interest
// ═════════════════════════════════════════════════════════════════════════

/** The facilitating hospital for a tool — the strongest match, in the demo. */
const FACILITATED_HOSPITAL: Record<string, string> = {
  cerviai: "hosp-northvale",
  retinascan: "hosp-kaveri",
  chestxr: "hosp-northvale",
  symptombot: "hosp-northvale",
  ovareserve: "hosp-lakeview",
  embryograde: "hosp-perambur",
};

export type ExpressInterestInput = {
  slug: string;
  contact: { name: string; role: string };
  objective: string;
  geography: { state: string; districtPreferred?: string };
  preferredMode: InterestRecord["preferredMode"];
  /** Must be true. Nothing reaches a hospital without it. */
  sharingGranted: boolean;
  at?: string;
};

export function expressInterest(input: ExpressInterestInput): InterestRecord {
  const view = getCardV2(input.slug);
  if (!view) throw new Error(`Interest: no assessed card for "${input.slug}".`);

  const at = input.at ?? new Date().toISOString();
  const record: InterestRecord = {
    id: `interest-${input.slug}`,
    toolId: view.tool.id,
    slug: input.slug,
    cardId: view.card.id,
    cardVersion: `v1.${view.card.version - 1}`,
    // Not a parameter. Interest cannot be addressed to a hospital.
    submittedTo: "CLEARPATH",
    contact: input.contact,
    objective: input.objective,
    // Derived from the card, so the objective and the open conditions cannot
    // drift apart in a demo.
    targetConditionItemIds: view.card.conditions.map((c) => c.itemId),
    geography: input.geography,
    preferredMode: input.preferredMode,
    sharingPermission: {
      granted: input.sharingGranted,
      scope: "CARD_IN_FULL_CONDITIONS_INTACT",
      grantedAt: input.sharingGranted ? at : null,
      excludes: [
        "Commercial terms",
        "Pricing and consumables",
        "Anything not on the card",
      ],
    },
    state: "INTEREST_RECEIVED_BY_CLEARPATH",
    createdAt: at,
  };

  const rows = allInterests();
  const i = rows.findIndex((r) => r.slug === input.slug);
  if (i >= 0) rows[i] = record;
  else rows.push(record);
  save(INTEREST_KEY, rows);
  return record;
}

export function getInterest(slug: string): InterestRecord | undefined {
  return allInterests().find((r) => r.slug === slug);
}

// ═════════════════════════════════════════════════════════════════════════
// S11 · Facilitation
// ═════════════════════════════════════════════════════════════════════════

/**
 * The demo's facilitation timeline for CerviAI, with its real recorded dates.
 * Facilitation is ClearPath's own work and is not something the innovator can
 * advance, so it is seeded rather than driven from the innovator's screens.
 */
const SEEDED_FACILITATION_DATES: Record<string, Record<FacilitationStep, string>> = {
  chestxr: {
    FIT_VALIDATED: "2026-09-25T00:00:00.000Z",
    SHARING_CONFIRMED: "2026-09-25T00:00:00.000Z",
    HOSPITAL_APPROACHED: "2026-09-26T00:00:00.000Z",
    BOTH_SIDES_WILLING: "2026-09-30T00:00:00.000Z",
  },
  symptombot: {
    FIT_VALIDATED: "2026-09-25T00:00:00.000Z",
    SHARING_CONFIRMED: "2026-09-25T00:00:00.000Z",
    HOSPITAL_APPROACHED: "2026-09-26T00:00:00.000Z",
    BOTH_SIDES_WILLING: "2026-09-30T00:00:00.000Z",
  },
  embryograde: {
    FIT_VALIDATED: "2026-09-25T00:00:00.000Z",
    SHARING_CONFIRMED: "2026-09-25T00:00:00.000Z",
    HOSPITAL_APPROACHED: "2026-09-26T00:00:00.000Z",
    BOTH_SIDES_WILLING: "2026-09-30T00:00:00.000Z",
  },
  ovareserve: {
    FIT_VALIDATED: "2026-09-25T00:00:00.000Z",
    SHARING_CONFIRMED: "2026-09-25T00:00:00.000Z",
    HOSPITAL_APPROACHED: "2026-09-26T00:00:00.000Z",
    BOTH_SIDES_WILLING: "2026-09-30T00:00:00.000Z",
  },
  retinascan: {
    FIT_VALIDATED: "2026-09-25T00:00:00.000Z",
    SHARING_CONFIRMED: "2026-09-25T00:00:00.000Z",
    HOSPITAL_APPROACHED: "2026-09-26T00:00:00.000Z",
    BOTH_SIDES_WILLING: "2026-09-30T00:00:00.000Z",
  },
  cerviai: {
    FIT_VALIDATED: "2026-09-25T00:00:00.000Z",
    SHARING_CONFIRMED: "2026-09-25T00:00:00.000Z",
    HOSPITAL_APPROACHED: "2026-09-26T00:00:00.000Z",
    BOTH_SIDES_WILLING: "2026-09-30T00:00:00.000Z",
  },
};

function buildEntries(slug: string, hospitalId: string): FacilitationEntry[] {
  const dates = SEEDED_FACILITATION_DATES[slug];
  const view = getCardV2(slug);
  const profile = getSiteProfile(hospitalId);
  const register = getProblemRegister(hospitalId);
  const interest = getInterest(slug);

  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : "";

  const problem = register?.entries.find((e) => /cervical/i.test(e.name));

  const entries: FacilitationEntry[] = [
    {
      step: "FIT_VALIDATED",
      completed: !!dates,
      at: dates?.FIT_VALIDATED ?? null,
      detail: `ClearPath reviewed Card ${interest?.cardVersion ?? "v1.0"} against the site's own operating profile and problem register.`,
      points: [
        "Context contained — the card's CHC / staff nurse / camp context is a setting this site runs.",
        "Infrastructure clears — power backup, offline capture and the referral pathway are all present.",
        "No unmet conditions stand in the way of a supervised trial.",
        // The same chronology the matching screen cites. A site profile written
        // after a tool arrives is a justification, not a baseline.
        `Site profile baselined ${fmt(profile?.baselinedAt)} and problem register published ${fmt(register?.publishedAt)} — both before this tool was submitted on ${fmt(view?.card.firstIssuedAt)}.`,
      ],
    },
    {
      step: "SHARING_CONFIRMED",
      completed: !!dates,
      at: dates?.SHARING_CONFIRMED ?? null,
      detail: `Card ${interest?.cardVersion ?? "v1.0"} in full — conditions and limitations intact.`,
      points: [
        "The innovator granted permission to share the whole card.",
        "No commercial terms are shared at this stage.",
      ],
    },
    {
      step: "HOSPITAL_APPROACHED",
      completed: !!dates,
      at: dates?.HOSPITAL_APPROACHED ?? null,
      detail: "A curated introduction pack went to the hospital.",
      points: [
        `The readiness card, ${interest?.cardVersion ?? "v1.0"}`,
        "The capability profile",
        problem
          ? `The problem-register entry it addresses — ${problem.name}, ranked #${problem.rank}`
          : "The problem-register entry it addresses",
        "The innovator's stated objective",
      ],
    },
    {
      step: "BOTH_SIDES_WILLING",
      completed: !!dates,
      at: dates?.BOTH_SIDES_WILLING ?? null,
      detail: "The hospital indicated willingness to receive a structured request.",
      points: [
        "Willingness to receive a request is not acceptance of it.",
        "The request form is now open to the innovator.",
      ],
    },
  ];

  return entries;
}

export function getFacilitation(slug: string): FacilitationRecord | undefined {
  const interest = getInterest(slug);
  if (!interest) return undefined;
  const hospitalId = FACILITATED_HOSPITAL[slug];
  if (!hospitalId) return undefined;
  const hospital = HOSPITALS.find((h) => h.id === hospitalId);
  const entries = buildEntries(slug, hospitalId);
  const completed = entries.filter((e) => e.completed);

  return {
    id: `facilitation-${slug}`,
    interestId: interest.id,
    toolId: interest.toolId,
    slug,
    hospitalId,
    hospitalName: hospital?.name ?? hospitalId,
    entries,
    currentStep: completed.length > 0 ? completed[completed.length - 1].step : null,
  };
}

/** Has facilitation reached the point where a request may be made? */
export function isRequestFormOpen(slug: string): boolean {
  const f = getFacilitation(slug);
  if (!f) return false;
  const entry = f.entries.find((e) => e.step === "BOTH_SIDES_WILLING");
  return !!entry?.completed;
}

// ═════════════════════════════════════════════════════════════════════════
// S12 · The structured request
// ═════════════════════════════════════════════════════════════════════════

export type CreateRequestInput = Omit<
  DeploymentRequest,
  | "id" | "facilitationId" | "toolId" | "slug" | "toolName" | "hospitalId"
  | "hospitalName" | "cardId" | "cardVersion" | "status" | "createdAt"
  | "sentAt" | "hospitalResponse" | "conditionPlans" | "problemRegisterEntryId"
> & {
  slug: string;
  /** Plans keyed by item id — every open condition must have one. */
  conditionPlans: DeploymentRequest["conditionPlans"];
  at?: string;
};

/**
 * THE GATE.
 *
 * Refuses unless facilitation has completed. This is the enforcement, not the
 * route guard — a redirect is a suggestion that any future link could sidestep,
 * and the whole point of the phase is that the innovator cannot reach a
 * hospital on their own.
 *
 * It also refuses a request that leaves an open condition unplanned. A hospital
 * reading a request needs a named owner against every condition; silence on one
 * reads as "handled" and it is not.
 */
export function createDeploymentRequest(input: CreateRequestInput): DeploymentRequest {
  const facilitation = getFacilitation(input.slug);
  if (!facilitation) {
    throw new Error(
      `Request: no facilitation for "${input.slug}". Interest goes to ClearPath first — the innovator does not approach a hospital directly.`
    );
  }
  if (!isRequestFormOpen(input.slug)) {
    throw new Error(
      `Request: facilitation for "${input.slug}" has not reached "both sides willing". The request form is not open.`
    );
  }

  const view = getCardV2(input.slug);
  if (!view) throw new Error(`Request: no card for "${input.slug}".`);

  const planned = new Set(input.conditionPlans.map((p) => p.itemId));
  const unplanned = view.card.conditions.filter((c) => !planned.has(c.itemId));
  if (unplanned.length > 0) {
    throw new Error(
      `Request: ${unplanned.map((c) => getItem(c.itemId)?.legacyGateId ?? c.itemId).join(", ")} ${unplanned.length === 1 ? "has" : "have"} no condition plan. Every open condition needs a named supplier.`
    );
  }

  /**
   * Default to the day facilitation completed, not "now".
   *
   * A request can only be made once both sides indicated willingness, so that
   * date is the honest default — and it keeps the demo's dates stable instead
   * of stamping whatever day the browser happens to be run on into the middle
   * of a September 2026 story.
   */
  const willing = facilitation.entries.find((e) => e.step === "BOTH_SIDES_WILLING");
  const at = input.at ?? willing?.at ?? new Date().toISOString();
  const request: DeploymentRequest = {
    id: `request-${input.slug}`,
    facilitationId: facilitation.id,
    toolId: facilitation.toolId,
    slug: input.slug,
    toolName: view.tool.name,
    hospitalId: facilitation.hospitalId,
    hospitalName: facilitation.hospitalName,
    cardId: view.card.id,
    cardVersion: `v1.${view.card.version - 1}`,
    mode: input.mode,
    // DERIVED, not passed in — from the same function the matching screen and
    // the facilitation pack use, so all three name the same entry.
    problemRegisterEntryId:
      findProblem(getProblemRegister(facilitation.hospitalId), view.card.context.exactClaim, view.tool.name)?.id ?? null,
    question: input.question,
    scope: input.scope,
    supportTaper: input.supportTaper,
    devices: input.devices,
    training: input.training,
    dataExport: input.dataExport,
    modelPolicy: input.modelPolicy,
    conditionPlans: input.conditionPlans,
    status: "SENT",
    createdAt: at,
    sentAt: at,
    hospitalResponse: null,
  };

  const rows = allRequests();
  const i = rows.findIndex((r) => r.slug === input.slug);
  if (i >= 0) rows[i] = request;
  else rows.push(request);
  save(REQUEST_KEY, rows);
  return request;
}

/**
 * A request THIS SESSION built, ignoring seeded fixtures.
 *
 * The innovator's own screens need this: a seeded request exists so the charter
 * and the trial screens are reachable without clicking the whole handoff, but
 * treating it as "you have already sent one" would take the send button away
 * from a vendor who has sent nothing. Seeded data makes downstream screens
 * reachable; it must not stand in for the user's own actions.
 */
export function getOwnRequest(slug: string): DeploymentRequest | undefined {
  return allRequests().find((r) => r.slug === slug);
}

export function getDeploymentRequest(slug: string): DeploymentRequest | undefined {
  // A request the innovator built in this session wins over a seeded one, so
  // clicking through the wizard always shows your own work rather than a
  // fixture that happens to share the slug.
  return allRequests().find((r) => r.slug === slug) ?? SEEDED_REQUESTS[slug];
}

/**
 * The innovator-facing journey state across Act A.
 *
 * Reads the SESSION's own request, not a seeded one — this is "where has my
 * submission got to", and a fixture that exists to make downstream screens
 * reachable must not report progress the vendor has not made. Seeded requests
 * still drive the hospital-side screens, where they are the demonstration.
 */
export function handoffState(slug: string): HandoffState {
  const request = getOwnRequest(slug);
  if (request && ["RECEIVED", "UNDER_ASSESSMENT", "ACCEPTED", "DECLINED", "COUNTERED"].includes(request.status)) {
    return "HOSPITAL_RECEIVED";
  }
  if (request) return "HOSPITAL_RECEIVED";
  const f = getFacilitation(slug);
  if (f && FACILITATION_ORDER.indexOf(f.currentStep ?? "FIT_VALIDATED") >= 2 && f.currentStep) {
    return "HOSPITAL_APPROACHED";
  }
  if (getInterest(slug)) return "INTEREST_WITH_CLEARPATH";
  return "ASSESSED";
}

// ═════════════════════════════════════════════════════════════════════════
// S16 · Triage decisions, and the return path
// ═════════════════════════════════════════════════════════════════════════

function allTriage(): TriageDecision[] {
  if (!triageDecisions) triageDecisions = load<TriageDecision>(TRIAGE_KEY);
  return triageDecisions;
}

export type RecordTriageInput = {
  slug: string;
  outcome: TriageOutcomeState;
  decidedBy: string;
  reason?: string;
  revisitAt?: string;
  findings: TriageDecision["findings"];
  at?: string;
};

/**
 * Record a triage decision.
 *
 * PARK and DECLINE REQUIRE A REASON, and it throws without one. A decline with
 * no reason cannot be returned to the innovator, and a decline that cannot be
 * returned is indistinguishable from a submission that was ignored — which is
 * exactly the experience this whole layer exists to stop.
 *
 * The decision also moves the request's own status, so the innovator's side and
 * the hospital's side cannot come to disagree about what happened.
 */
export function recordTriage(input: RecordTriageInput): TriageDecision {
  const request = getDeploymentRequest(input.slug);
  if (!request) throw new Error(`Triage: no request for "${input.slug}".`);

  if (input.outcome !== "ADVANCE" && !input.reason?.trim()) {
    throw new Error(
      `Triage: a ${input.outcome.toLowerCase()} needs a reason. It returns to the innovator, and one with nothing in it is indistinguishable from being ignored.`
    );
  }

  const at = input.at ?? new Date().toISOString();
  const decision: TriageDecision = {
    id: `triage-${input.slug}`,
    requestId: request.id,
    slug: input.slug,
    hospitalId: request.hospitalId,
    hospitalName: request.hospitalName,
    outcome: input.outcome,
    decidedAt: at,
    decidedBy: input.decidedBy,
    reason: input.reason?.trim() || null,
    revisitAt: input.revisitAt ?? null,
    findings: input.findings,
    // A reason exists, so it goes back. ADVANCE has nothing to return.
    returnedToInnovator: input.outcome !== "ADVANCE",
  };

  const rows = allTriage();
  const i = rows.findIndex((r) => r.slug === input.slug);
  if (i >= 0) rows[i] = decision;
  else rows.push(decision);
  save(TRIAGE_KEY, rows);

  // Keep the request in step with the decision.
  const reqs = allRequests();
  const ri = reqs.findIndex((r) => r.slug === input.slug);
  if (ri >= 0) {
    reqs[ri] = {
      ...reqs[ri],
      status: input.outcome === "DECLINE" ? "DECLINED" : input.outcome === "ADVANCE" ? "UNDER_ASSESSMENT" : "RECEIVED",
      hospitalResponse: {
        status: input.outcome === "DECLINE" ? "DECLINED" : input.outcome === "ADVANCE" ? "UNDER_ASSESSMENT" : "RECEIVED",
        at,
        note: decision.reason ?? "Advanced to audit.",
      },
    };
    save(REQUEST_KEY, reqs);
  }

  return decision;
}

export function getTriage(slug: string): TriageDecision | undefined {
  return allTriage().find((r) => r.slug === slug) ?? SEEDED_TRIAGE[slug];
}

/**
 * THE RETURN PATH. What the innovator sees about a hospital's triage decision.
 *
 * Built now even though the innovator-side screen is not in this phase — a
 * decline reason that has nowhere to go is a decline reason that quietly does
 * not exist, and building the reader later tends to mean discovering the writer
 * never kept enough.
 */
export function triageReturnForInnovator(slug: string): {
  outcome: TriageOutcomeState;
  hospitalName: string;
  reason: string | null;
  revisitAt: string | null;
  at: string;
} | undefined {
  const d = getTriage(slug);
  if (!d || !d.returnedToInnovator) return undefined;
  return {
    outcome: d.outcome,
    hospitalName: d.hospitalName,
    reason: d.reason,
    revisitAt: d.revisitAt,
    at: d.decidedAt,
  };
}
