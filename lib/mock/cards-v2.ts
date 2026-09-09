/**
 * v2 Readiness Card store — the mock data surface for S6 and S7.
 *
 * Separate from `store.ts` on purpose. That file is the v1 world the hospital
 * screens still read through the legacy adapter; nothing here touches it, and
 * a v2 reissue cannot disturb a hospital-side card mid-demo.
 *
 * State is DERIVED, not stored. The only thing persisted is which conditions
 * have been remediated, so a card rebuilds deterministically from the fixture
 * plus that short list — a refresh keeps the demo where it was, and there is no
 * second copy of a card that can drift from the engine that produced it.
 */

import type { Evidence } from "@/lib/schemas/evidence";
import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import type { SubmissionContext } from "@/lib/schemas/context";
import type { Level, SelfDeclaration } from "@/lib/schemas/score";
import type { Tool, CareLevel } from "@/lib/schemas/tool";
import type { GateStatus } from "@/lib/schemas/gate";
import type { ContextCareLevel, OperatorCadre } from "@/lib/schemas/context";
import { buildReadinessCard } from "@/lib/engine/verdict";
import { applyRemediation, type RemediationDelta } from "@/lib/engine/remediation";
import { makeCardId } from "@/lib/engine/card-id";
import { evaluateAll } from "@/lib/engine/evidence";
import { getItem, itemForLegacyGate } from "@/lib/engine/item-bank";
import type { ScoredSet } from "@/lib/engine/score";
import * as store from "./store";
import { TOOL_GATE_ANSWERS } from "./fixtures";
import {
  RETINASCAN_CONTEXT,
  RETINASCAN_DECLARATION,
  RETINASCAN_EVIDENCE,
  RETINASCAN_ISSUED_AT,
  RETINASCAN_MODEL_VERSION,
  RETINASCAN_TOOL_SLUG,
  RETINASCAN_TOOL_VERSION,
} from "./fixtures/retinascan-v2";
import {
  CERVIAI_CONTEXT,
  CERVIAI_DECLARATION,
  CERVIAI_EVIDENCE,
  CERVIAI_ISSUED_AT,
  CERVIAI_MODEL_VERSION,
  CERVIAI_REMEDIATION_EVIDENCE,
  CERVIAI_TOOL_SLUG,
  CERVIAI_TOOL_VERSION,
} from "./fixtures/cerviai-v2";

const STORAGE_KEY = "clearpath-remediations-v1";
const SUBMISSIONS_KEY = "clearpath-submissions-v2";
const DEFAULT_ISSUED_AT = "2026-09-15T00:00:00.000Z";

/** A remediation the vendor has applied, in the order applied. */
type AppliedRemediation = {
  slug: string;
  itemId: string;
  evidenceId: string;
  evidenceName: string;
  issuedAt: string;
  note: string;
};

let applied: AppliedRemediation[] | null = null;

function load(): AppliedRemediation[] {
  if (applied) return applied;
  applied = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) applied = JSON.parse(raw) as AppliedRemediation[];
    } catch {
      applied = [];
    }
  }
  return applied;
}

function persist() {
  if (typeof window === "undefined" || !applied) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applied));
  } catch {
    // A demo nicety, not a requirement. Never break the page over storage.
  }
}

export function resetRemediations() {
  applied = [];
  persist();
}

// ═════════════════════════════════════════════════════════════════════════
// Submissions created by the wizard
// ═════════════════════════════════════════════════════════════════════════

/**
 * A submission the vendor actually built, as opposed to one that shipped as a
 * fixture. This is what makes a fresh tool produce a REAL card rather than
 * falling back to a derived placeholder.
 *
 * WHAT IS AND IS NOT KEPT. The declared context, the 17-gate declaration and
 * each document's PROVENANCE are submission data and are kept, so a refresh
 * does not throw away work the vendor typed. The uploaded FILE CONTENT is never
 * kept — it lives in browser memory for the session and nothing writes it
 * anywhere. A document therefore survives a refresh as what the vendor said
 * about it, which is the part the assessment uses, while the bytes do not.
 */
export type RegisteredSubmission = {
  slug: string;
  context: SubmissionContext;
  declaration: SelfDeclaration;
  evidence: Evidence[];
  toolVersion: string;
  modelVersion: string;
  issuedAt: string;
};

let registered: RegisteredSubmission[] | null = null;

function loadSubmissions(): RegisteredSubmission[] {
  if (registered) return registered;
  registered = [];
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(SUBMISSIONS_KEY);
      if (raw) registered = JSON.parse(raw) as RegisteredSubmission[];
    } catch {
      registered = [];
    }
  }
  return registered;
}

function persistSubmissions() {
  if (typeof window === "undefined" || !registered) return;
  try {
    window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(registered));
  } catch {
    // A demo nicety. Never break the flow over storage.
  }
}

export function registerSubmission(sub: RegisteredSubmission) {
  const list = loadSubmissions();
  const i = list.findIndex((s) => s.slug === sub.slug);
  if (i >= 0) list[i] = sub;
  else list.push(sub);
  persistSubmissions();
}

export function getRegisteredSubmission(slug: string): RegisteredSubmission | undefined {
  return loadSubmissions().find((s) => s.slug === slug);
}

export function resetSubmissions() {
  registered = [];
  persistSubmissions();
}

// ═════════════════════════════════════════════════════════════════════════
// Context and evidence per tool
// ═════════════════════════════════════════════════════════════════════════

/**
 * A placeholder context for tools other than CerviAI, derived from the tool's
 * declared level of care.
 *
 * A REAL context comes from the context wizard, which is a later phase. This
 * exists so every /submit/<tool>/card route keeps resolving; it is marked in
 * the UI as a derived default rather than presented as an assessed context,
 * because a frozen context copied from a placeholder is exactly the kind of
 * false precision the card is supposed to eliminate.
 */
const CARE_LEVEL_MAP: Record<CareLevel, ContextCareLevel> = {
  tertiary: "DISTRICT_HOSPITAL",
  secondary: "DISTRICT_HOSPITAL",
  primary: "PHC",
  community: "CHC",
  home: "PHC",
};

const CADRE_MAP: Record<CareLevel, OperatorCadre> = {
  tertiary: "CLINICIAN",
  secondary: "MO",
  primary: "STAFF_NURSE",
  community: "ANM",
  home: "PATIENT",
};

function derivedContext(tool: Tool): SubmissionContext {
  return {
    entity: { name: "Not yet declared", verified: false, conflictsDeclared: [] },
    buildStatus: "DEPLOYABLE_BUILD",
    exactClaim: tool.intendedUse,
    outOfScope: [],
    path: "PUBLIC_PROCUREMENT",
    careLevel: CARE_LEVEL_MAP[tool.careLevel],
    operatorCadre: CADRE_MAP[tool.careLevel],
    geography: "Not yet specified",
    deploymentModes: ["OPD_QUEUE"],
    population: { ageRange: "Not yet specified", sex: "ALL", geography: "Not yet specified" },
    autonomyLevel: "RECOMMENDS",
  };
}

/** GateStatus (v1 fixtures) → the 0-2 ladder. */
const STATUS_TO_LEVEL: Record<GateStatus, Level> = { pass: 2, partial: 1, fail: 0 };

function derivedDeclaration(tool: Tool): SelfDeclaration {
  const answers = TOOL_GATE_ANSWERS[tool.id] ?? {};
  const gateAnswers: SelfDeclaration["gateAnswers"] = {};
  for (const [gateId, status] of Object.entries(answers)) {
    if (!status) continue;
    gateAnswers[gateId as keyof SelfDeclaration["gateAnswers"]] = STATUS_TO_LEVEL[status];
  }
  return { submissionId: `sub-${tool.id}`, gateAnswers, clarificationAnswers: [] };
}

/** Existing v1 documents, projected into bound v2 evidence for other tools. */
function derivedEvidence(tool: Tool, context: SubmissionContext): Evidence[] {
  const docs = store.getDocumentsByIds(tool.docIds).filter((d) => d.status !== "missing");
  const bindings: Record<string, string | undefined> = {
    validation: "G1",
    cdsco: "G4",
    dpdp: "G15",
    eval: "G2",
    manual: "G10",
    ethics: "G14",
  };
  const seeds: Evidence[] = [];
  for (const d of docs) {
    const gate = bindings[d.kind];
    const item = gate ? itemForLegacyGate(gate) : undefined;
    if (!item) continue;
    seeds.push({
      id: `ev-${d.id}`,
      submissionId: `sub-${tool.id}`,
      itemRefs: [item.id],
      type: d.kind === "cdsco" ? "REGULATORY" : d.kind === "validation" ? "VALIDATION_STUDY" : "AUDIT",
      independence: "VENDOR_GENERATED",
      name: d.name,
      ...(d.path ? { path: d.path } : {}),
      provenance: {
        generatedBy: "Vendor",
        fundedBy: "Vendor",
        population: { setting: "not stated", cadre: "not stated", sampleN: null, dateFrom: "", dateTo: "" },
        documentDate: "2026-01-01",
        validUntil: null,
      },
      limitation: d.statusNote ?? null,
      generalisability: { limited: false, reason: null },
      expired: false,
    });
  }
  return evaluateAll(seeds, context, new Date(DEFAULT_ISSUED_AT));
}

type ToolSetup = {
  tool: Tool;
  context: SubmissionContext;
  declaration: SelfDeclaration;
  evidence: Evidence[];
  issuedAt: string;
  toolVersion: string;
  modelVersion: string;
  /** True where the context came from the wizard rather than a derived default. */
  contextIsReal: boolean;
};

type SeededSetup = Omit<ToolSetup, "tool" | "contextIsReal">;

const SEEDED: Record<string, SeededSetup> = {
  [CERVIAI_TOOL_SLUG]: {
    context: CERVIAI_CONTEXT,
    declaration: CERVIAI_DECLARATION,
    evidence: CERVIAI_EVIDENCE,
    issuedAt: CERVIAI_ISSUED_AT,
    toolVersion: CERVIAI_TOOL_VERSION,
    modelVersion: CERVIAI_MODEL_VERSION,
  },
  [RETINASCAN_TOOL_SLUG]: {
    context: RETINASCAN_CONTEXT,
    declaration: RETINASCAN_DECLARATION,
    evidence: RETINASCAN_EVIDENCE,
    issuedAt: RETINASCAN_ISSUED_AT,
    toolVersion: RETINASCAN_TOOL_VERSION,
    modelVersion: RETINASCAN_MODEL_VERSION,
  },
};

function setupFor(slug: string): ToolSetup | undefined {
  const tool = store.getToolBySlug(slug);
  if (!tool) return undefined;

  /**
   * Tools with a fully seeded v2 submission — a real declared context, real
   * provenance on every document. Everything else falls back to a derived
   * default below, which is marked as such in the UI.
   */
  const seeded = SEEDED[tool.slug];
  if (seeded) return { tool, ...seeded, contextIsReal: true };

  // A submission the vendor built in the wizard. Its context was declared, not
  // derived, so the card reads it as a real frozen context.
  const own = getRegisteredSubmission(tool.slug);
  if (own) {
    return {
      tool,
      context: own.context,
      declaration: own.declaration,
      evidence: own.evidence,
      issuedAt: own.issuedAt,
      toolVersion: own.toolVersion,
      modelVersion: own.modelVersion,
      contextIsReal: true,
    };
  }

  const context = derivedContext(tool);
  return {
    tool,
    context,
    declaration: derivedDeclaration(tool),
    evidence: derivedEvidence(tool, context),
    issuedAt: DEFAULT_ISSUED_AT,
    toolVersion: tool.name,
    modelVersion: "not stated",
    contextIsReal: false,
  };
}

function scoredSetFor(setup: ToolSetup): ScoredSet {
  return { path: "PUBLIC", scores: new Map(), selfDeclaration: setup.declaration };
}

// ═════════════════════════════════════════════════════════════════════════
// Reads
// ═════════════════════════════════════════════════════════════════════════

export type CardV2View = {
  card: ReadinessCard;
  tool: Tool;
  evidence: Evidence[];
  contextIsReal: boolean;
  /** Deltas from each applied remediation, oldest first. */
  deltas: RemediationDelta[];
};

/**
 * Build the current card: v1.0 from the fixture, then every persisted
 * remediation replayed through the engine in order. Replaying rather than
 * storing means the rendered card can never disagree with the engine.
 */
export function getCardV2(slug: string): CardV2View | undefined {
  const setup = setupFor(slug);
  if (!setup) return undefined;

  let card = buildReadinessCard({
    id: makeCardId(setup.tool.slug, setup.issuedAt),
    issuedAt: setup.issuedAt,
    context: setup.context,
    toolVersion: setup.toolVersion,
    modelVersion: setup.modelVersion,
    scored: scoredSetFor(setup),
    evidence: setup.evidence,
  });

  let scored = scoredSetFor(setup);
  let evidence = setup.evidence;
  const deltas: RemediationDelta[] = [];

  for (const r of load().filter((a) => a.slug === slug)) {
    const doc = remediationEvidence(slug, r);
    if (!doc) continue;
    const result = applyRemediation({
      card,
      scored,
      itemId: r.itemId,
      evidence: doc,
      allEvidence: [...evidence, doc],
      assessorId: "assessor-01",
      clearedToLevel: 2,
      note: r.note,
      issuedAt: r.issuedAt,
    });
    card = result.card;
    scored = result.scored;
    evidence = [...evidence, doc];
    deltas.push(result.delta);
  }

  return { card, tool: setup.tool, evidence, contextIsReal: setup.contextIsReal, deltas };
}

/**
 * The document attached for a remediation. CerviAI's residency addendum is a
 * named fixture; anything else is synthesised from what the vendor picked, and
 * bound to the condition's own item — never to the submission at large.
 */
function remediationEvidence(slug: string, r: AppliedRemediation): Evidence | undefined {
  if (r.evidenceId === CERVIAI_REMEDIATION_EVIDENCE.id) return CERVIAI_REMEDIATION_EVIDENCE;
  const item = getItem(r.itemId);
  if (!item || item.acceptsEvidence.length === 0) return undefined;
  return {
    id: r.evidenceId,
    submissionId: `sub-${slug}`,
    itemRefs: [r.itemId],
    type: item.acceptsEvidence[0],
    independence: "VENDOR_GENERATED",
    name: r.evidenceName,
    provenance: {
      generatedBy: "Vendor",
      fundedBy: "Vendor",
      population: { setting: "not stated", cadre: "not stated", sampleN: null, dateFrom: "", dateTo: "" },
      documentDate: r.issuedAt.slice(0, 10),
      validUntil: null,
    },
    limitation: null,
    generalisability: { limited: false, reason: null },
    expired: false,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// Writes
// ═════════════════════════════════════════════════════════════════════════

export type RemediateInput = {
  slug: string;
  itemId: string;
  evidenceId: string;
  evidenceName: string;
  note: string;
  /** Defaults to the fixture's reissue date so the demo is reproducible. */
  issuedAt?: string;
};

export function remediate(input: RemediateInput): CardV2View | undefined {
  const list = load();
  if (list.some((a) => a.slug === input.slug && a.itemId === input.itemId)) {
    return getCardV2(input.slug);
  }
  list.push({
    slug: input.slug,
    itemId: input.itemId,
    evidenceId: input.evidenceId,
    evidenceName: input.evidenceName,
    note: input.note,
    issuedAt: input.issuedAt ?? nextIssueDate(input.slug),
  });
  persist();
  return getCardV2(input.slug);
}

/** One week after the last issue, so the changelog reads as a real sequence. */
function nextIssueDate(slug: string): string {
  const view = getCardV2(slug);
  const from = view ? new Date(view.card.issuedAt) : new Date(DEFAULT_ISSUED_AT);
  from.setUTCDate(from.getUTCDate() + 7);
  return from.toISOString();
}

/**
 * The declaration behind a SEEDED submission.
 *
 * A registered submission carries its own; a fixture's lives in its v2 setup.
 * Exposed so screens that need to re-derive discrepancies — the card, the
 * assessment step — can reach the same declaration the card was built from,
 * rather than each inventing one.
 */
export function seededDeclaration(slug: string): SelfDeclaration | undefined {
  return SEEDED[slug]?.declaration ?? getRegisteredSubmission(slug)?.declaration;
}
