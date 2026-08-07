import type { Submission } from "@/lib/schemas/submission";

/**
 * Seed submissions (BUILD_SPEC §6). Per hospital persona: Northvale IMS runs the
 * full multi-workflow inbox; Site B has none (aspiring site); Lakeview sees only
 * its specialty (fertility) trial requests.
 * States are internally consistent (fixes E1): every "approved" / pilot state
 * is backed by a completed audit (seeded in the store). The stage shown on each
 * surface is DERIVED from the three fields (audit / decision / pilot).
 */
export const SUBMISSIONS: Submission[] = [
  {
    // Evaluated → approved → pilot ongoing (the live Phase C showcase).
    id: "sub-cerviai",
    toolId: "tool-cerviai",
    readinessCardId: "card-tool-cerviai",
    hospitalId: "hosp-northvale",
    audit: "complete",
    decision: "approved",
    pilot: "ongoing",
    requestType: "trial",
    decisionReason: "Strong fit for a supervised clinical trial; firm-ups tracked during the pilot.",
    createdAt: "2026-05-28T09:15:00.000Z",
  },
  {
    // Evaluated → approved → pilot complete + published (registry showcase).
    id: "sub-chestxr",
    toolId: "tool-chestxr",
    readinessCardId: "card-tool-chestxr",
    hospitalId: "hosp-northvale",
    audit: "complete",
    decision: "approved",
    pilot: "complete",
    requestType: "deployment",
    decisionReason: "Complete evidence set; approved for deployment.",
    createdAt: "2026-03-12T11:40:00.000Z",
  },
  {
    // Evaluated → rejected (declined showcase).
    id: "sub-symptombot",
    toolId: "tool-symptombot",
    readinessCardId: "card-tool-symptombot",
    hospitalId: "hosp-northvale",
    audit: "complete",
    decision: "rejected",
    pilot: "not_started",
    requestType: "trial",
    decisionReason: "Insufficient evidence and no CDSCO licence — not deployable yet.",
    createdAt: "2026-06-30T14:05:00.000Z",
  },
  {
    // Fresh — audit not run yet (the "New" item to drive through the pathway).
    id: "sub-retinascan",
    toolId: "tool-retinascan",
    readinessCardId: "card-tool-retinascan",
    hospitalId: "hosp-northvale",
    audit: "not_run",
    decision: "pending",
    pilot: "not_started",
    requestType: "trial",
    createdAt: "2026-07-08T08:20:00.000Z",
  },
  // NOTE: Site B has NO tool applications — it is the aspiring site whose
  // primary surface is the site-readiness self-assessment (empty inbox by design).

  // ── Lakeview (fertility centre) — specialty-scoped trial requests ──────────────
  {
    // EmbryoGrade AI — fresh specialty trial request (New).
    id: "sub-embryograde",
    toolId: "tool-embryograde",
    readinessCardId: "card-tool-embryograde",
    hospitalId: "hosp-lakeview",
    audit: "not_run",
    decision: "pending",
    pilot: "not_started",
    requestType: "trial",
    createdAt: "2026-07-05T09:00:00.000Z",
  },
  {
    // OvaReserve — approved specialty trial, pilot ongoing (registry trial).
    id: "sub-ovareserve",
    toolId: "tool-ovareserve",
    readinessCardId: "card-tool-ovareserve",
    hospitalId: "hosp-lakeview",
    audit: "complete",
    decision: "approved",
    pilot: "ongoing",
    requestType: "trial",
    decisionReason: "Approved for a prospective reserve-prediction trial.",
    createdAt: "2026-05-15T09:00:00.000Z",
  },
];
