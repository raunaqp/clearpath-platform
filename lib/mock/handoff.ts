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
  FacilitationEntry,
  FacilitationRecord,
  FacilitationStep,
  HandoffState,
  InterestRecord,
} from "@/lib/schemas/handoff";
import { FACILITATION_ORDER } from "@/lib/schemas/handoff";
import { getCardV2 } from "./cards-v2";
import { getSiteProfile, getProblemRegister } from "./fixtures/site-profiles";
import { HOSPITALS } from "./fixtures/hospitals";
import { getItem } from "@/lib/engine/item-bank";

const INTEREST_KEY = "clearpath-interest-v1";
const REQUEST_KEY = "clearpath-requests-v1";

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
  save(INTEREST_KEY, interests);
  save(REQUEST_KEY, requests);
}

// ═════════════════════════════════════════════════════════════════════════
// S10 · Interest
// ═════════════════════════════════════════════════════════════════════════

/** The facilitating hospital for a tool — the strongest match, in the demo. */
const FACILITATED_HOSPITAL: Record<string, string> = {
  cerviai: "hosp-northvale",
  retinascan: "hosp-northvale",
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
  | "sentAt" | "hospitalResponse" | "conditionPlans"
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

  const at = input.at ?? new Date().toISOString();
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

export function getDeploymentRequest(slug: string): DeploymentRequest | undefined {
  return allRequests().find((r) => r.slug === slug);
}

/** The innovator-facing journey state across Act A. */
export function handoffState(slug: string): HandoffState {
  const request = getDeploymentRequest(slug);
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
