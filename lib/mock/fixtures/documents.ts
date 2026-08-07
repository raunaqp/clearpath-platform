import type { Document } from "@/lib/schemas/document";

/**
 * Per-tool sample documents (BUILD_SPEC §5). Status is consistent with each
 * tool's verdict:
 *
 *   CerviAI (CONDITIONS) — full set of 5, all PRESENT; notes carry the context
 *     behind the two firm-ups (G1 validation, G15 residency).
 *   ChestXR-TB (DEPLOY) — a clean set of 4, all PRESENT.
 *   SymptomBot (NOT YET) — 3 docs on file but FLAGGED, plus the three
 *     expected-but-MISSING docs (independent validation, CDSCO licence, ethics
 *     approval) shown as gaps behind its failed gates.
 */
export const DOCUMENTS: Document[] = [
  // ── CerviAI — 5, all present ────────────────────────────────────────────────
  {
    id: "cerviai-validation",
    toolId: "tool-cerviai",
    name: "Independent validation study",
    type: "pdf",
    kind: "validation",
    status: "present",
    path: "/sample-docs/cerviai-validation-study.pdf",
    statusNote:
      "Single-centre, non-Indian cohort; an India-population study is in progress (context for the G1 firm-up).",
  },
  {
    id: "cerviai-cdsco",
    toolId: "tool-cerviai",
    name: "CDSCO MD-15 licence",
    type: "pdf",
    kind: "cdsco",
    status: "present",
    path: "/sample-docs/cerviai-cdsco-md15.pdf",
  },
  {
    id: "cerviai-dpdp",
    toolId: "tool-cerviai",
    name: "DPDP privacy policy",
    type: "pdf",
    kind: "dpdp",
    status: "present",
    path: "/sample-docs/cerviai-dpdp-policy.pdf",
    statusNote:
      "A secondary processing environment is hosted outside India (context for the G15 firm-up).",
  },
  {
    id: "cerviai-eval",
    toolId: "tool-cerviai",
    name: "Clinical evaluation report",
    type: "pdf",
    kind: "eval",
    status: "present",
    path: "/sample-docs/cerviai-clinical-eval-report.pdf",
  },
  {
    id: "cerviai-ethics",
    toolId: "tool-cerviai",
    name: "Ethics approval",
    type: "pdf",
    kind: "ethics",
    status: "present",
    path: "/sample-docs/cerviai-ethics-approval.pdf",
  },

  // ── ChestXR-TB — 4, all present ─────────────────────────────────────────────
  {
    id: "chestxr-validation",
    toolId: "tool-chestxr",
    name: "Independent validation study",
    type: "pdf",
    kind: "validation",
    status: "present",
    path: "/sample-docs/chestxr-validation-study.pdf",
    statusNote: "Multi-centre validation including Indian sites.",
  },
  {
    id: "chestxr-cdsco",
    toolId: "tool-chestxr",
    name: "CDSCO licence",
    type: "pdf",
    kind: "cdsco",
    status: "present",
    path: "/sample-docs/chestxr-cdsco-licence.pdf",
  },
  {
    id: "chestxr-dpdp",
    toolId: "tool-chestxr",
    name: "DPDP privacy policy",
    type: "pdf",
    kind: "dpdp",
    status: "present",
    path: "/sample-docs/chestxr-dpdp-policy.pdf",
    statusNote: "DPDP-aligned; data residency within India.",
  },
  {
    id: "chestxr-eval",
    toolId: "tool-chestxr",
    name: "Clinical evaluation report",
    type: "pdf",
    kind: "eval",
    status: "present",
    path: "/sample-docs/chestxr-clinical-eval-report.pdf",
  },

  // ── SymptomBot — 3 present (flagged) + 3 missing ────────────────────────────
  {
    id: "symptombot-eval",
    toolId: "tool-symptombot",
    name: "Internal evaluation",
    type: "pdf",
    kind: "eval",
    status: "flagged",
    path: "/sample-docs/symptombot-clinical-eval-report.pdf",
    statusNote: "Internal evaluation only — not an independent study (relates to G1).",
  },
  {
    id: "symptombot-dpdp",
    toolId: "tool-symptombot",
    name: "DPDP privacy policy",
    type: "pdf",
    kind: "dpdp",
    status: "flagged",
    path: "/sample-docs/symptombot-dpdp-policy.pdf",
    statusNote: "Policy on file, but the consent basis is unclear (relates to G14).",
  },
  {
    id: "symptombot-manual",
    toolId: "tool-symptombot",
    name: "User manual",
    type: "pdf",
    kind: "manual",
    status: "flagged",
    path: "/sample-docs/symptombot-user-manual.pdf",
    statusNote: "No clinician guidance / override pathway described (relates to G2).",
  },
  {
    id: "symptombot-validation",
    toolId: "tool-symptombot",
    name: "Independent validation study",
    type: "pdf",
    kind: "validation",
    status: "missing",
    statusNote: "Not provided — no independent validation. This is why G1 fails.",
  },
  {
    id: "symptombot-cdsco",
    toolId: "tool-symptombot",
    name: "CDSCO licence",
    type: "pdf",
    kind: "cdsco",
    status: "missing",
    statusNote: "Not provided — no clear CDSCO licence; regulatory status unclear.",
  },
  {
    id: "symptombot-ethics",
    toolId: "tool-symptombot",
    name: "Ethics / consent approval",
    type: "pdf",
    kind: "ethics",
    status: "missing",
    statusNote:
      "Not provided — no informed-consent basis on file. This is why G14 fails.",
  },

  // ── RetinaScan (out of the 3-tool demo scope, kept consistent) ───────────────
  {
    id: "retinascan-validation",
    toolId: "tool-retinascan",
    name: "Independent validation study",
    type: "pdf",
    kind: "validation",
    status: "flagged",
    path: "/sample-docs/retinascan-validation-study.pdf",
    statusNote: "Predicate-based; local validation still firming up (G1).",
  },
  {
    id: "retinascan-dpdp",
    toolId: "tool-retinascan",
    name: "DPDP privacy policy",
    type: "pdf",
    kind: "dpdp",
    status: "present",
    path: "/sample-docs/retinascan-dpdp-policy.pdf",
  },
  {
    id: "retinascan-manual",
    toolId: "tool-retinascan",
    name: "User manual",
    type: "pdf",
    kind: "manual",
    status: "present",
    path: "/sample-docs/retinascan-user-manual.pdf",
  },
  // ── Fertility specialty tools — placeholder evidence (Lakeview persona) ──────
  {
    id: "embryograde-validation",
    toolId: "tool-embryograde",
    name: "Validation study (multi-centre IVF)",
    type: "pdf",
    kind: "validation",
    status: "present",
    path: "/sample-docs/placeholder.pdf",
    statusNote: "Placeholder specialty evidence — this persona demonstrates scoping.",
  },
  {
    id: "embryograde-eval",
    toolId: "tool-embryograde",
    name: "Clinical evaluation report",
    type: "pdf",
    kind: "eval",
    status: "present",
    path: "/sample-docs/placeholder.pdf",
    statusNote: "Placeholder specialty evidence.",
  },
  {
    id: "ovareserve-validation",
    toolId: "tool-ovareserve",
    name: "Validation study (reserve prediction)",
    type: "pdf",
    kind: "validation",
    status: "present",
    path: "/sample-docs/placeholder.pdf",
    statusNote: "Placeholder specialty evidence.",
  },
  {
    id: "ovareserve-manual",
    toolId: "tool-ovareserve",
    name: "User manual",
    type: "pdf",
    kind: "manual",
    status: "present",
    path: "/sample-docs/placeholder.pdf",
    statusNote: "Placeholder specialty evidence.",
  },
];
