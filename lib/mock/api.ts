/**
 * Mock API (BUILD_SPEC §2, §11) — the ONLY data surface the UI calls.
 *
 * Every function wraps `store.ts`, returns a Promise, and adds a 200–500ms
 * artificial delay so the UI shows real loading states. No `fetch`, no network,
 * no keys — everything is local. Later, swapping these bodies for `fetch()`
 * turns the mock into a live app with zero UI changes.
 */

import type { Vendor } from "@/lib/schemas/vendor";
import type { Tool } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Submission } from "@/lib/schemas/submission";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { AuditResult } from "@/lib/schemas/audit";
import type { Deployment, Phase, RegistryEntry } from "@/lib/schemas/deployment";
import type { SiteListing, SiteGrade } from "@/lib/schemas/site";
import type { GateStatus } from "@/lib/schemas/gate";
import type { HospitalGateId } from "@/lib/engine/gates";
import type { RegistryToolView } from "@/lib/registry";
import type { CtriDraft } from "./fixtures/ctri-drafts";

import * as store from "./store";
import { getCtriDraft as ctriDraft } from "./fixtures/ctri-drafts";
import { AI_SUGGESTIONS, fallbackSuggestion } from "./fixtures/ai-suggestions";
import { getBodhScore as bodhScore, type BodhScore } from "./fixtures/bodh-scores";

/** Resolve a value after a realistic 200–500ms delay. */
function latency<T>(value: T): Promise<T> {
  // Return a deep CLONE so no caller ever holds a live reference into the store.
  // The store mutates objects in place; without cloning, a read after a write
  // hands back the same object reference, and React's Object.is bail-out skips
  // the re-render (the "status doesn't update after approve" bug). Cloning makes
  // every read a fresh snapshot of the single source of truth.
  const snapshot = value === undefined ? value : structuredClone(value);
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(snapshot), ms));
}

// ── reads ────────────────────────────────────────────────────────────────────

export const getVendors = (): Promise<Vendor[]> => latency(store.listVendors());
export const getVendor = (id: string): Promise<Vendor | undefined> =>
  latency(store.getVendor(id));
export const getTools = (): Promise<Tool[]> => latency(store.listTools());
export const getTool = (id: string): Promise<Tool | undefined> =>
  latency(store.getTool(id));

// Clean-URL slug resolvers (accept a slug or a legacy id).
export const getToolBySlug = (slug: string): Promise<Tool | undefined> =>
  latency(store.getToolBySlug(slug));
export const getCardBySlug = (slug: string): Promise<ToolReadinessCard | undefined> =>
  latency(store.getCardBySlug(slug));
export const getSubmissionBySlug = (slug: string): Promise<Submission | undefined> =>
  latency(store.getSubmissionBySlug(slug));
export const getDeploymentBySlug = (slug: string): Promise<Deployment | undefined> =>
  latency(store.getDeploymentBySlug(slug));
export const getDocuments = (): Promise<Document[]> =>
  latency(store.listDocuments());
export const getDocumentsByIds = (ids: string[]): Promise<Document[]> =>
  latency(store.getDocumentsByIds(ids));
export const getHospitals = (): Promise<Hospital[]> =>
  latency(store.listHospitals());
export const getHospital = (id: string): Promise<Hospital | undefined> =>
  latency(store.getHospital(id));

export const getSubmissions = (hospitalId?: string): Promise<Submission[]> =>
  latency(store.listSubmissions(hospitalId));
export const getSubmission = (id: string): Promise<Submission | undefined> =>
  latency(store.getSubmission(id));
export const getSubmissionsByToolId = (toolId: string): Promise<Submission[]> =>
  latency(store.getSubmissionsByToolId(toolId));

export const getReadinessCard = (
  id: string
): Promise<ToolReadinessCard | undefined> => latency(store.getReadinessCard(id));
export const getReadinessCardByTool = (
  toolId: string
): Promise<ToolReadinessCard | undefined> =>
  latency(store.getReadinessCardByTool(toolId));

export const getAuditBySubmission = (
  submissionId: string
): Promise<AuditResult | undefined> =>
  latency(store.getAuditBySubmission(submissionId));

export const getDeployments = (): Promise<Deployment[]> =>
  latency(store.listDeployments());
export const getDeployment = (id: string): Promise<Deployment | undefined> =>
  latency(store.getDeployment(id));
export const getDeploymentBySubmission = (
  submissionId: string
): Promise<Deployment | undefined> =>
  latency(store.getDeploymentBySubmission(submissionId));

export const getRegistry = (): Promise<RegistryEntry[]> =>
  latency(store.listRegistry());

export const getRegistryView = (): Promise<RegistryToolView[]> =>
  latency(store.getRegistryView());

// ── site listings ──────────────────────────────────────────────────────────
export const getSiteListings = (): Promise<SiteListing[]> =>
  latency(store.listSiteListings());
export const getSiteListingByHospital = (hospitalId: string): Promise<SiteListing | undefined> =>
  latency(store.getSiteListingByHospital(hospitalId));
export const submitSiteToRegistry = (args: {
  hospitalId: string;
  grade: SiteGrade;
  profile: string;
  headline: string;
  openGaps: number;
}): Promise<SiteListing> => latency(store.submitSiteToRegistry(args));

// ── writes ───────────────────────────────────────────────────────────────────

export const createAssessment = (
  input: store.CreateAssessmentInput
): Promise<{ vendor: Vendor; tool: Tool; card: ToolReadinessCard }> =>
  latency(store.createAssessment(input));

export const submitToHospital = (args: {
  toolId: string;
  readinessCardId: string;
  hospitalId?: string;
  requestType?: Submission["requestType"];
}): Promise<Submission> => latency(store.submitToHospital(args));

/**
 * AI TL;DR over the submitted documents (mocked). The swap point: replace the
 * body with a real model call and the UI is unchanged.
 */
export const getAiSuggestion = (toolId: string): Promise<string> => {
  const text =
    AI_SUGGESTIONS[toolId] ??
    fallbackSuggestion(store.getTool(toolId)?.name ?? "this tool");
  return latency(text);
};

export const addSupportingDocument = (args: {
  toolId: string;
  cardId: string;
  name: string;
  kind: Document["kind"];
  path: string;
}): Promise<Document> => latency(store.addSupportingDocument(args));

export const setDecision = (args: {
  submissionId: string;
  decision: "approved" | "rejected";
  reason: string;
}): Promise<Submission | undefined> => latency(store.setDecision(args));

export const startPilot = (deploymentId: string): Promise<Deployment | undefined> =>
  latency(store.startPilot(deploymentId));

export const skipSubmission = (submissionId: string, reason: string): Promise<Submission | undefined> =>
  latency(store.skipSubmission(submissionId, reason));

export const unskipSubmission = (submissionId: string): Promise<Submission | undefined> =>
  latency(store.unskipSubmission(submissionId));

export const listOnRegistry = (args: {
  toolId: string;
  verdict: RegistryEntry["verdict"];
}): Promise<RegistryEntry> => latency(store.listOnRegistry(args));

export const isListedOnRegistry = (toolId: string): Promise<boolean> =>
  latency(store.isListedOnRegistry(toolId));

export const runAudit = (args: {
  submissionId: string;
  auditor: string;
  gateAnswers: Partial<Record<HospitalGateId, GateStatus>>;
  notes?: Partial<Record<HospitalGateId, string>>;
}): Promise<AuditResult> => latency(store.saveAudit(args));

export const createDeployment = (
  submissionId: string
): Promise<Deployment | undefined> =>
  latency(store.createDeployment(submissionId));

export const advanceDeployment = (
  deploymentId: string,
  phase: Phase
): Promise<Deployment | undefined> =>
  latency(store.advanceDeployment(deploymentId, phase));

export const prepareCtri = (deploymentId: string): Promise<Deployment | undefined> =>
  latency(store.prepareCtri(deploymentId));

/** Auto-drafted CTRI dataset (mocked; swappable for a model call). */
export const getCtriDraft = (toolId: string, toolName?: string): Promise<CtriDraft> =>
  latency(ctriDraft(toolId, toolName));

/** BODH validation score (mock hook; swappable for the real BODH platform). */
export const getBodhScore = (toolId: string): Promise<BodhScore> =>
  latency(bodhScore(toolId));

/** Add a committee member / role to a deployment (Live screen). */
export const addRole = (
  deploymentId: string,
  role: string,
  person: string
): Promise<Deployment | undefined> => latency(store.addRole(deploymentId, role, person));

/** Mock monitoring time-series for the governance dashboard. */
export const getMonitoring = (deploymentId: string) =>
  latency(store.getMonitoring(deploymentId));

export const updateDeployment = (
  deploymentId: string,
  patch: Partial<Deployment>
): Promise<Deployment | undefined> =>
  latency(store.updateDeployment(deploymentId, patch));

export const publishToRegistry = (
  deploymentId: string
): Promise<RegistryEntry | undefined> =>
  latency(store.publishToRegistry(deploymentId));

// ── demo controls ────────────────────────────────────────────────────────────

export const resetDemoData = (): Promise<void> => {
  store.resetDemoData();
  return latency(undefined);
};
