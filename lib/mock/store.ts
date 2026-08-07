/**
 * Shared mock store (BUILD_SPEC §2, §6) — the single in-memory database all
 * three journeys read and write. State flows A → B → C → registry through here.
 *
 * - Hydrates from bundled fixtures on first load.
 * - Readiness cards are COMPUTED from the seed gate answers via the real engine,
 *   so verdicts aren't hard-coded.
 * - Mirrors mutations to localStorage so a refresh keeps state within a session
 *   (a demo nicety — `resetDemoData()` clears it).
 *
 * This file holds the synchronous business logic. `api.ts` wraps every function
 * below with simulated latency — the UI only ever calls `api.ts`, so swapping
 * these bodies for `fetch()` later turns the mock into a live app with no UI
 * changes.
 */

import type { Vendor } from "@/lib/schemas/vendor";
import type { Tool, CareLevel, ToolCategory } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Submission } from "@/lib/schemas/submission";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { AuditResult } from "@/lib/schemas/audit";
import type { Deployment, Phase, RegistryEntry } from "@/lib/schemas/deployment";
import type { SiteListing, SiteGrade } from "@/lib/schemas/site";
import type { GateStatus } from "@/lib/schemas/gate";
import type { ToolGateId, HospitalGateId } from "@/lib/engine/gates";

import { runToolAssessment } from "@/lib/engine/readiness-tool";
import type { BuyerType } from "@/lib/engine/gates";
import { runHospitalAudit, prefillFromToolCard } from "@/lib/engine/hospital-audit";
import { firstPhase, startedPhase } from "@/lib/workspace/phases";
import { buildRegistryView, type RegistryToolView } from "@/lib/registry";
import { buildMonitoring, type MonitoringData } from "./fixtures/monitoring";
import { slugify } from "@/lib/slug";
import {
  VENDORS,
  TOOLS,
  DOCUMENTS,
  HOSPITALS,
  SUBMISSIONS,
  DEPLOYMENTS,
  REGISTRY,
  TOOL_GATE_ANSWERS,
} from "./fixtures";

// Bump this whenever the seed shape changes so a returning browser discards its
// stale db and reseeds from fixtures.
//   v2 — documents gained a `status` field + per-tool sets
//   v3 — trial/deployment split: CerviAI is now an ONGOING TRIAL (was a
//        published deployment); a stale v2 db would show the old published state
//   v4 — rename to ClearPath + tool slugs + registry sample numbers (reset seed)
//   v5 — CerviAI trial Analysis/Closeout pre-populated (endpoints + ownership)
//   v6 — three-hospital personas: Site B reseeded NOT_READY with an empty
//        inbox, new Lakeview fertility centre + specialty tools, site listings.
//        (Task asked for "v5"; we were already on v5, so this bumps to v6 to
//        force returning browsers to reseed the new persona shape.)
const STORAGE_KEY = "clearpath-db-v6";
const SEED_DATE = "2026-01-15T00:00:00.000Z";

export type Db = {
  vendors: Vendor[];
  tools: Tool[];
  documents: Document[];
  hospitals: Hospital[];
  submissions: Submission[];
  readinessCards: ToolReadinessCard[];
  auditResults: AuditResult[];
  deployments: Deployment[];
  registry: RegistryEntry[];
  siteListings: SiteListing[];
};

// ── seeding ────────────────────────────────────────────────────────────────

/**
 * Buyer type for a seeded tool — inferred from the hospital it was submitted to
 * (public procurement vs private investment case). This is the "wire D2 to the
 * right variant from context" step: the vendor card is computed against the D2
 * variant of its buyer. Defaults to public where a tool has no submission.
 */
const HOSPITAL_BUYER = new Map<string, BuyerType>(
  HOSPITALS.map((h) => [h.id, h.buyerType ?? "public"])
);
function buyerForTool(toolId: string): BuyerType {
  const sub = SUBMISSIONS.find((s) => s.toolId === toolId);
  return (sub && HOSPITAL_BUYER.get(sub.hospitalId)) ?? "public";
}

/** Compute a tool's Readiness Card from its seed gate answers via the engine. */
function computeSeedCard(tool: Tool): ToolReadinessCard {
  const answers = TOOL_GATE_ANSWERS[tool.id];
  return runToolAssessment({
    id: `card-${tool.id}`,
    toolId: tool.id,
    toolName: tool.name,
    careLevel: tool.careLevel,
    gateAnswers: answers,
    buyerType: buyerForTool(tool.id),
    docIds: tool.docIds,
    createdAt: SEED_DATE,
  });
}

/**
 * Seed a completed intake audit for a submission, so a submission whose
 * `audit` field is "complete" is backed by a real AuditResult (fixes the E1
 * contradiction where a pilot was "approved" with no audit on record).
 */
function seedAudit(
  submissionId: string,
  card: ToolReadinessCard | undefined,
  auditor: string,
  hospitalOnly: Partial<Record<HospitalGateId, GateStatus>>
): AuditResult | null {
  if (!card) return null;
  const seededAnswers = { ...prefillFromToolCard(card), ...hospitalOnly };
  return runHospitalAudit({
    id: `audit-${submissionId}`,
    submissionId,
    auditor,
    gateAnswers: seededAnswers,
    createdAt: SEED_DATE,
  });
}

function seed(): Db {
  const readinessCards = TOOLS.map(computeSeedCard);
  const cardByTool = new Map(readinessCards.map((c) => [c.toolId, c]));

  const auditResults = [
    // CerviAI — evaluated, approved, pilot ongoing → CONDITIONS
    seedAudit("sub-cerviai", cardByTool.get("tool-cerviai"), "Northvale Institute of Medical Sciences", { H7: "pass", H9: "partial", H10: "pass", H12: "partial" }),
    // ChestXR-TB — evaluated, approved, pilot complete/published → DEPLOY
    seedAudit("sub-chestxr", cardByTool.get("tool-chestxr"), "Northvale Institute of Medical Sciences", { H7: "pass", H9: "pass", H10: "pass", H12: "pass" }),
    // SymptomBot — evaluated, rejected → NOT YET
    seedAudit("sub-symptombot", cardByTool.get("tool-symptombot"), "Northvale Institute of Medical Sciences", { H7: "partial", H9: "fail", H10: "partial", H12: "fail" }),
    // Lakeview (fertility centre) — OvaReserve evaluated, approved, pilot ongoing.
    // H13 (clean exit) is pinned here: its vendor overlap G7 lives in the PUBLIC
    // D2 variant, so a private card no longer prefills it — pin to preserve the
    // pre-change audit result exactly.
    seedAudit("sub-ovareserve", cardByTool.get("tool-ovareserve"), "Lakeview Fertility Centre", { H7: "pass", H9: "pass", H10: "pass", H12: "partial", H13: "pass" }),
  ].filter((a): a is AuditResult => a !== null);

  return {
    vendors: structuredClone(VENDORS),
    tools: structuredClone(TOOLS),
    documents: structuredClone(DOCUMENTS),
    hospitals: structuredClone(HOSPITALS),
    submissions: structuredClone(SUBMISSIONS),
    readinessCards,
    auditResults,
    deployments: structuredClone(DEPLOYMENTS),
    registry: structuredClone(REGISTRY),
    siteListings: [], // sites list themselves via submitSiteToRegistry
  };
}

// ── persistence ──────────────────────────────────────────────────────────────

let db: Db | null = null;

function persist(): void {
  if (typeof window === "undefined" || !db) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage full / disabled — demo continues in-memory */
  }
}

function getDb(): Db {
  if (db) return db;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        db = JSON.parse(raw) as Db;
        return db;
      } catch {
        /* corrupt — reseed below */
      }
    }
  }
  db = seed();
  persist();
  return db;
}

/** Wipe persisted state and reseed from fixtures (the "Reset demo data" control). */
export function resetDemoData(): void {
  db = seed();
  persist();
}

// ── id helpers ───────────────────────────────────────────────────────────────

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
function now(): string {
  return new Date().toISOString();
}

// ── reads ────────────────────────────────────────────────────────────────────

export function listVendors(): Vendor[] {
  return getDb().vendors;
}
export function getVendor(vendorId: string): Vendor | undefined {
  return getDb().vendors.find((v) => v.id === vendorId);
}
export function listTools(): Tool[] {
  return getDb().tools;
}
export function getTool(toolId: string): Tool | undefined {
  return getDb().tools.find((t) => t.id === toolId);
}

// ── clean-URL slug resolvers (accept a slug OR a legacy id) ──────────────────
export function getToolBySlug(slug: string): Tool | undefined {
  const d = getDb();
  return d.tools.find((t) => t.slug === slug) ?? d.tools.find((t) => t.id === slug);
}
export function getCardBySlug(slug: string): ToolReadinessCard | undefined {
  const byCardId = getReadinessCard(slug); // legacy /submit/card-xxx/card
  if (byCardId) return byCardId;
  const tool = getToolBySlug(slug);
  return tool ? getReadinessCardByTool(tool.id) : undefined;
}
export function getSubmissionBySlug(slug: string): Submission | undefined {
  const byId = getSubmission(slug); // legacy submission id
  if (byId) return byId;
  const tool = getToolBySlug(slug);
  if (!tool) return undefined;
  const subs = getDb().submissions.filter((s) => s.toolId === tool.id);
  return subs.find((s) => s.hospitalId === "hosp-northvale") ?? subs[0];
}
export function getDeploymentBySlug(slug: string): Deployment | undefined {
  const byId = getDeployment(slug); // legacy deployment id
  if (byId) return byId;
  const tool = getToolBySlug(slug);
  if (!tool) return undefined;
  const deps = getDb().deployments.filter((dep) => dep.toolId === tool.id);
  return deps.find((dep) => dep.hospitalId === "hosp-northvale") ?? deps[0];
}
export function listDocuments(): Document[] {
  return getDb().documents;
}
export function getDocumentsByIds(ids: string[]): Document[] {
  const docs = getDb().documents;
  // Dedupe ids so a doc referenced twice (e.g. via a re-add) never renders twice.
  const uniqueIds = [...new Set(ids)];
  return uniqueIds
    .map((i) => docs.find((d) => d.id === i))
    .filter((d): d is Document => d !== undefined);
}
export function listHospitals(): Hospital[] {
  return getDb().hospitals;
}
export function getHospital(hospitalId: string): Hospital | undefined {
  return getDb().hospitals.find((h) => h.id === hospitalId);
}
export function listSubmissions(hospitalId?: string): Submission[] {
  const subs = getDb().submissions;
  return hospitalId ? subs.filter((s) => s.hospitalId === hospitalId) : subs;
}
export function getSubmission(submissionId: string): Submission | undefined {
  return getDb().submissions.find((s) => s.id === submissionId);
}
/** All submissions for a tool, across hospitals (vendor status dashboard). */
export function getSubmissionsByToolId(toolId: string): Submission[] {
  return getDb().submissions.filter((s) => s.toolId === toolId);
}
export function getReadinessCard(cardId: string): ToolReadinessCard | undefined {
  return getDb().readinessCards.find((c) => c.id === cardId);
}
export function getReadinessCardByTool(
  toolId: string
): ToolReadinessCard | undefined {
  return getDb().readinessCards.find((c) => c.toolId === toolId);
}
export function getAuditBySubmission(
  submissionId: string
): AuditResult | undefined {
  // Latest audit for a submission.
  return getDb()
    .auditResults.filter((a) => a.submissionId === submissionId)
    .at(-1);
}
export function listDeployments(): Deployment[] {
  return getDb().deployments;
}
export function getDeployment(deploymentId: string): Deployment | undefined {
  return getDb().deployments.find((d) => d.id === deploymentId);
}
export function getDeploymentBySubmission(
  submissionId: string
): Deployment | undefined {
  return getDb().deployments.find((d) => d.submissionId === submissionId);
}
export function listRegistry(): RegistryEntry[] {
  return getDb().registry;
}

// ── site listings (a hospital advertising its readiness on the registry) ──────
export function listSiteListings(): SiteListing[] {
  return getDb().siteListings;
}
export function getSiteListingByHospital(hospitalId: string): SiteListing | undefined {
  return getDb().siteListings.find((s) => s.hospitalId === hospitalId);
}
/**
 * A hospital lists (or updates) its readiness on the registry so vendors and
 * sponsors can find it — including a still-developing site. Idempotent per
 * hospital (updates the existing listing).
 */
export function submitSiteToRegistry(args: {
  hospitalId: string;
  grade: SiteGrade;
  profile: string;
  headline: string;
  openGaps: number;
}): SiteListing {
  const d = getDb();
  const existing = d.siteListings.find((s) => s.hospitalId === args.hospitalId);
  if (existing) {
    existing.grade = args.grade;
    existing.profile = args.profile;
    existing.headline = args.headline;
    existing.openGaps = args.openGaps;
    existing.submittedAt = now();
    persist();
    return existing;
  }
  const listing: SiteListing = { ...args, submittedAt: now() };
  d.siteListings.push(listing);
  persist();
  return listing;
}

/** Derived registry view — trials + deployments per tool (BUILD_SPEC registry). */
export function getRegistryView(): RegistryToolView[] {
  const d = getDb();
  return buildRegistryView({
    tools: d.tools,
    vendors: d.vendors,
    hospitals: d.hospitals,
    deployments: d.deployments,
    cards: d.readinessCards,
    listed: d.registry,
  });
}

// ── writes ───────────────────────────────────────────────────────────────────

export type CreateAssessmentInput = {
  vendor: { name: string; founder: string; description: string; website: string };
  tool: {
    name: string;
    category: ToolCategory;
    scopedFeature?: string;
    description: string;
    intendedUse: string;
    careLevel: CareLevel;
    docIds: string[];
  };
  gateAnswers: Partial<Record<ToolGateId, GateStatus>>;
  notes?: Partial<Record<ToolGateId, string>>;
};

/**
 * Journey A · Generate → creates the vendor, tool, and computed Readiness Card.
 * Does NOT create a submission or a registry entry — those are two distinct,
 * explicit vendor actions from the card (`submitToHospital` / `listOnRegistry`).
 */
export function createAssessment(input: CreateAssessmentInput): {
  vendor: Vendor;
  tool: Tool;
  card: ToolReadinessCard;
} {
  const d = getDb();

  const vendor: Vendor = { id: id("vendor"), ...input.vendor };
  const baseSlug = slugify(input.tool.name);
  let slug = baseSlug;
  let n = 2;
  while (d.tools.some((t) => t.slug === slug)) slug = `${baseSlug}-${n++}`;
  const tool: Tool = { id: id("tool"), slug, vendorId: vendor.id, ...input.tool };
  const card = runToolAssessment({
    id: id("card"),
    toolId: tool.id,
    toolName: tool.name,
    careLevel: tool.careLevel,
    gateAnswers: input.gateAnswers,
    notes: input.notes,
    docIds: tool.docIds,
    createdAt: now(),
  });

  d.vendors.push(vendor);
  d.tools.push(tool);
  d.readinessCards.push(card);
  persist();
  return { vendor, tool, card };
}

/**
 * Journey A · CTA (2) → list the tool on the marketplace registry as
 * "assessed", with no specific hospital. Idempotent; leaves an existing
 * entry's status alone (e.g. an already-piloting/deployed tool).
 */
export function listOnRegistry(args: {
  toolId: string;
  verdict: RegistryEntry["verdict"];
}): RegistryEntry {
  const d = getDb();
  const existing = d.registry.find((r) => r.toolId === args.toolId);
  if (existing) return existing;
  const entry: RegistryEntry = {
    toolId: args.toolId,
    verdict: args.verdict,
    status: "assessed",
    deployedAt: null,
    publishedResult: null,
  };
  d.registry.push(entry);
  persist();
  return entry;
}

/** Is this tool already listed on the registry? */
export function isListedOnRegistry(toolId: string): boolean {
  return getDb().registry.some((r) => r.toolId === toolId);
}

/**
 * Journey A · CTA → creates the marketplace Submission that appears in
 * Journey B's inbox. Idempotent per tool+hospital (returns the existing one).
 */
export function submitToHospital(args: {
  toolId: string;
  readinessCardId: string;
  hospitalId?: string;
  requestType?: Submission["requestType"];
}): Submission {
  const d = getDb();
  const hospitalId = args.hospitalId ?? "hosp-northvale";
  const existing = d.submissions.find(
    (s) => s.toolId === args.toolId && s.hospitalId === hospitalId
  );
  if (existing) return existing;

  const submission: Submission = {
    id: id("sub"),
    toolId: args.toolId,
    readinessCardId: args.readinessCardId,
    hospitalId,
    audit: "not_run",
    decision: "pending",
    pilot: "not_started",
    ...(args.requestType ? { requestType: args.requestType } : {}),
    createdAt: now(),
  };
  d.submissions.push(submission);
  persist();
  return submission;
}

/**
 * Journey B → run (or re-run) the hospital's own intake audit. Marks the
 * submission's `audit` field complete (the single source that flips the stage
 * from New → Evaluated and unlocks the decision).
 */
export function saveAudit(args: {
  submissionId: string;
  auditor: string;
  gateAnswers: Partial<Record<HospitalGateId, GateStatus>>;
  notes?: Partial<Record<HospitalGateId, string>>;
}): AuditResult {
  const result = runHospitalAudit({
    id: id("audit"),
    submissionId: args.submissionId,
    auditor: args.auditor,
    gateAnswers: args.gateAnswers,
    notes: args.notes,
    createdAt: now(),
  });
  getDb().auditResults.push(result);
  const sub = getSubmission(args.submissionId);
  if (sub) sub.audit = "complete";
  persist();
  return result;
}

/**
 * Vendor · add a supporting document (BUILD_SPEC — vendor evidence). Reuses a
 * demo sample doc; appears in the tool's + card's attached evidence.
 */
export function addSupportingDocument(args: {
  toolId: string;
  cardId: string;
  name: string;
  kind: Document["kind"];
  path: string;
}): Document {
  const d = getDb();
  const doc: Document = {
    id: id("supp"),
    toolId: args.toolId,
    name: args.name,
    type: "pdf",
    kind: args.kind,
    status: "present",
    path: args.path,
    statusNote: "Added as a supporting document.",
  };
  d.documents.push(doc);
  const tool = d.tools.find((t) => t.id === args.toolId);
  if (tool && !tool.docIds.includes(doc.id)) tool.docIds.push(doc.id);
  const card = d.readinessCards.find((c) => c.id === args.cardId);
  if (card && !card.docIds.includes(doc.id)) card.docIds.push(doc.id);
  persist();
  return doc;
}

/**
 * Hospital · record a decision from the audit (BUILD_SPEC §4). Guarded: the
 * decision only sticks once the audit is complete. Approve → decision=approved
 * and the pilot deployment is created in pilot=not_started (NOT started yet).
 * Reject → decision=rejected. Both capture a free-text reason.
 */
export function setDecision(args: {
  submissionId: string;
  decision: "approved" | "rejected";
  reason: string;
}): Submission | undefined {
  const sub = getSubmission(args.submissionId);
  if (!sub) return undefined;
  if (sub.audit !== "complete") return sub; // cannot decide before the audit is run
  sub.decisionReason = args.reason;
  sub.decision = args.decision;
  if (args.decision === "approved") {
    createDeployment(sub.id); // creates the deployment; pilot stays not_started
  }
  persist();
  return sub;
}

/** Journey B → start the approved pilot: pilot=ongoing, workflow advances to its
 *  first active phase (trial → enrolment · deployment → go-live). */
export function startPilot(deploymentId: string): Deployment | undefined {
  const dep = getDeployment(deploymentId);
  if (!dep) return undefined;
  if (dep.phase === firstPhase(dep.kind)) dep.phase = startedPhase(dep.kind);
  const sub = getSubmission(dep.submissionId);
  if (sub) sub.pilot = "ongoing";
  // Reflect the active pilot in the registry (create the entry if the tool was
  // never explicitly listed).
  const reg = getDb().registry.find((r) => r.toolId === dep.toolId);
  if (reg) {
    if (reg.status === "assessed") reg.status = "piloting";
  } else {
    getDb().registry.push({
      toolId: dep.toolId,
      verdict: getReadinessCardByTool(dep.toolId)?.verdict ?? "CONDITIONS",
      status: "piloting",
      deployedAt: null,
      publishedResult: null,
    });
  }
  persist();
  return dep;
}

/**
 * Journey B decision → create the Journey C deployment for an approved pilot.
 * The deployment is created in phase "setup"; the pilot is NOT started until
 * `startPilot` runs (which is why the seed's live pilot has pilot=ongoing).
 */
export function createDeployment(submissionId: string): Deployment | undefined {
  const sub = getSubmission(submissionId);
  if (!sub) return undefined;

  const existing = getDeploymentBySubmission(submissionId);
  if (existing) return existing;

  const tool = getTool(sub.toolId);
  const kind: Deployment["kind"] = sub.requestType === "trial" ? "trial" : "deployment";
  const deployment: Deployment = {
    id: id("deploy"),
    submissionId,
    hospitalId: sub.hospitalId,
    toolId: sub.toolId,
    kind,
    phase: firstPhase(kind),
    dayOf: 0,
    totalDays: 90,
    metrics: [],
    alerts: [],
    driftWatch: {
      sensitivity: "Baseline pending first cases",
      jsd: "Not yet measured",
      oodFlag: false,
    },
    roles: [],
    docIds: tool?.docIds ?? [],
    scorecard: [],
    endpoints: [],
    recommendation: null,
    ownership: null,
    ctriPrepared: false,
    published: false,
    createdAt: now(),
  };

  getDb().deployments.push(deployment);
  persist();
  return deployment;
}

/** Hospital · skip an application (choose not to assess), with a reason. */
export function skipSubmission(submissionId: string, reason: string): Submission | undefined {
  const sub = getSubmission(submissionId);
  if (sub) {
    sub.skipped = true;
    sub.skipReason = reason;
    persist();
  }
  return sub;
}

/** Hospital · un-skip an application (return it to the assessable list). */
export function unskipSubmission(submissionId: string): Submission | undefined {
  const sub = getSubmission(submissionId);
  if (sub) {
    sub.skipped = false;
    sub.skipReason = undefined;
    persist();
  }
  return sub;
}

/** Live screen → add a committee member / role to the deployment. */
export function addRole(deploymentId: string, role: string, person: string): Deployment | undefined {
  const dep = getDeployment(deploymentId);
  if (dep) {
    dep.roles.push({ role, person, status: "active" });
    persist();
  }
  return dep;
}

/** Governance monitoring time-series for a deployment (mock). */
export function getMonitoring(deploymentId: string): MonitoringData | undefined {
  const dep = getDeployment(deploymentId);
  return dep ? buildMonitoring(dep) : undefined;
}

/** Trial CTRI step → mark the CTRI registration draft prepared (mock export). */
export function prepareCtri(deploymentId: string): Deployment | undefined {
  const dep = getDeployment(deploymentId);
  if (dep) {
    dep.ctriPrepared = true;
    persist();
  }
  return dep;
}

export function advanceDeployment(
  deploymentId: string,
  phase: Phase
): Deployment | undefined {
  const dep = getDeployment(deploymentId);
  if (dep) {
    dep.phase = phase;
    persist();
  }
  return dep;
}

export function updateDeployment(
  deploymentId: string,
  patch: Partial<Deployment>
): Deployment | undefined {
  const dep = getDeployment(deploymentId);
  if (dep) {
    Object.assign(dep, patch);
    persist();
  }
  return dep;
}

/** Journey C handover → publish the pilot result back to the registry. */
export function publishToRegistry(
  deploymentId: string
): RegistryEntry | undefined {
  const dep = getDeployment(deploymentId);
  if (!dep) return undefined;

  dep.published = true;
  const sub = getSubmission(dep.submissionId);
  if (sub) sub.pilot = "complete";
  const card = getReadinessCardByTool(dep.toolId);
  const entry = getDb().registry.find((r) => r.toolId === dep.toolId);
  const headline =
    dep.recommendation?.rationale ??
    "Pilot completed; result published to the registry.";

  if (entry) {
    entry.status = "deployed";
    entry.deployedAt = now();
    entry.publishedResult = {
      hospitalId: dep.hospitalId,
      recommendation: dep.recommendation?.decision ?? "EXTEND",
      headline,
    };
    persist();
    return entry;
  }

  const created: RegistryEntry = {
    toolId: dep.toolId,
    verdict: card?.verdict ?? "CONDITIONS",
    status: "deployed",
    deployedAt: now(),
    publishedResult: {
      hospitalId: dep.hospitalId,
      recommendation: dep.recommendation?.decision ?? "EXTEND",
      headline,
    },
  };
  getDb().registry.push(created);
  persist();
  return created;
}
