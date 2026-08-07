/**
 * Gate & domain definitions — the SINGLE SOURCE OF TRUTH for every ClearPath
 * assessment (BUILD_SPEC §7). Every engine module reads from here; nothing
 * hard-codes a gate list of its own. This mirrors the ClearPath rule: "one
 * source of truth in `lib/engine/gates.ts`".
 *
 * Three gate sets live here:
 *   1. TOOL_GATES     — 17 gates (G1–G16) across 4 dimensions
 *   2. SITE_DOMAINS   — 6 domains (site readiness is domain-scored, not gated)
 *   3. HOSPITAL_GATES — 13 gates (H1–H13) across 3 intake groups
 *
 * Fix text is written calibrated up-front (soft language), and still passes
 * through `softenCertainty()` when rendered — belt and braces.
 */

import type { DimensionId } from "@/lib/schemas/readiness-card";
import type { SiteDomainId } from "@/lib/schemas/site";
import type { AuditGroupId } from "@/lib/schemas/audit";

// ─────────────────────────────────────────────────────────────────────────
// 1. Tool gates — 17 gates, 4 dimensions (BUILD_SPEC §7)
// ─────────────────────────────────────────────────────────────────────────

export type ToolGateId =
  | "G1" | "G2" | "G3" | "G4" | "G17"
  | "G5" | "G6" | "G7" // D2 · public-procurement variant
  | "GP1" | "GP2" | "GP3" | "GP4" | "GP5" // D2 · private-buyer variant
  | "G8" | "G9" | "G10" | "G11"
  | "G12" | "G13" | "G14" | "G15" | "G16";

/**
 * Buyer type — selects which D2 (System Fit) variant applies. Public = state /
 * government procurement; private = a private hospital's own investment case.
 * D1/D3/D4 are the shared spine and do NOT vary by buyer.
 */
export type BuyerType = "public" | "private";

export type ToolGateDef = {
  id: ToolGateId;
  dimension: DimensionId;
  /** Short gate name. */
  title: string;
  /** The yes/partial/no question shown in the Journey A questionnaire. */
  question: string;
  /** What to do if this gate is failed or partial — the condition text. */
  fix: string;
};

export const DIMENSIONS: Record<
  DimensionId,
  { id: DimensionId; title: string; gates: ToolGateId[] }
> = {
  D1: { id: "D1", title: "Clinical & regulatory", gates: ["G1", "G2", "G3", "G4", "G17"] },
  D2: { id: "D2", title: "System fit", gates: ["G5", "G6", "G7"] },
  D3: { id: "D3", title: "UX & workflow", gates: ["G8", "G9", "G10", "G11"] },
  D4: {
    id: "D4",
    title: "Tech & data governance",
    gates: ["G12", "G13", "G14", "G15", "G16"],
  },
};

export const TOOL_GATES: Record<ToolGateId, ToolGateDef> = {
  // D1 · Clinical & regulatory
  G1: {
    id: "G1",
    dimension: "D1",
    title: "Independent validation",
    question:
      "Has performance been validated in an independent study — ideally on an Indian population or via CTRI/RCT?",
    fix: "Commission or cite an independent validation study; an India-population or CTRI-registered evaluation carries the most weight.",
  },
  G2: {
    id: "G2",
    dimension: "D1",
    title: "Fails safe",
    question:
      "Does the tool fail safe, with a documented clinician-override pathway?",
    fix: "Document known failure modes and add an explicit clinician override pathway so the tool fails safe.",
  },
  G3: {
    id: "G3",
    dimension: "D1",
    title: "Realistic human-in-the-loop",
    question:
      "Does the intended workflow keep a clinician meaningfully in the loop?",
    fix: "Define a human-in-the-loop step that a clinician can realistically perform under real caseload, not a rubber-stamp.",
  },
  G17: {
    id: "G17",
    dimension: "D1",
    title: "Fairness / bias assessed",
    question:
      "Has performance been checked for bias across subgroups (sex, age, site, skin tone / device), with no material fairness gap?",
    fix: "Run a subgroup fairness/bias evaluation (e.g. via BODH) and address any material performance gap before scaling.",
  },
  G4: {
    id: "G4",
    dimension: "D1",
    title: "Regulatory clear for this use",
    question:
      "Is the regulatory position clear for this intended use (CDSCO status appropriate to the claim)?",
    fix: "Clarify the regulatory position for this specific intended use; align the claim with the applicable pathway.",
  },
  // D2 · System fit
  G5: {
    id: "G5",
    dimension: "D2",
    title: "Prioritised problem",
    question:
      "Does the tool address a problem the site actively prioritises?",
    fix: "Anchor the tool to a problem the site already prioritises; show where it sits on their real problem list.",
  },
  G6: {
    id: "G6",
    dimension: "D2",
    title: "Operable in real conditions",
    question:
      "Can it run in real conditions at the intended site — connectivity, power, staffing, device access?",
    fix: "Demonstrate operability under real site conditions (intermittent connectivity, power, staffing, devices) before scaling the level of care.",
  },
  G7: {
    id: "G7",
    dimension: "D2",
    title: "No lock-in / clean exit",
    question:
      "Is there a clean exit — no data or workflow lock-in if the site stops using it?",
    fix: "Provide a clean-exit path: exportable data and no workflow lock-in if the site discontinues.",
  },
  // D2 · System fit — PRIVATE-buyer variant (a private hospital's investment
  // case). Reuses the liability (GP2 ↔ H9) and billing (GP3 ↔ H12) gates the
  // hospital intake audit already carries, formalized into D2-private.
  GP1: {
    id: "GP1",
    dimension: "D2",
    title: "ROI / payback",
    question:
      "Is there a credible return-on-investment / payback case for a private buyer?",
    fix: "Build a credible ROI / payback case (throughput, revenue, or cost avoided) for a private buyer's budget cycle.",
  },
  GP2: {
    id: "GP2",
    dimension: "D2",
    title: "Liability & indemnity",
    question:
      "Is liability and indemnity clearly allocated between the hospital and the vendor?",
    fix: "Agree liability and indemnity terms in writing before deployment (mirrors the hospital intake liability gate).",
  },
  GP3: {
    id: "GP3",
    dimension: "D2",
    title: "Reimbursement & billing fit",
    question:
      "Does it fit reimbursement / billing for the service — is there a payable pathway?",
    fix: "Resolve reimbursement / billing so the pathway is payable (mirrors the hospital intake billing gate).",
  },
  GP4: {
    id: "GP4",
    dimension: "D2",
    title: "Service-line fit",
    question:
      "Does it fit an existing service line the hospital runs and can grow?",
    fix: "Anchor the tool to a service line the hospital already runs, with room to grow volume.",
  },
  GP5: {
    id: "GP5",
    dimension: "D2",
    title: "Capital vs operating cost",
    question:
      "Is the capital-versus-operating cost structure workable for the hospital's budget?",
    fix: "Structure capital vs operating costs to fit the hospital's budget (financing, phasing, or opex model).",
  },
  // D3 · UX & workflow
  G8: {
    id: "G8",
    dimension: "D3",
    title: "Actionable output",
    question:
      "Is the output an action a clinician can act on directly?",
    fix: "Turn the output into an actionable recommendation, not a bare score the clinician must still interpret.",
  },
  G9: {
    id: "G9",
    dimension: "D3",
    title: "No net burden increase",
    question:
      "Does the tool keep the clinician's net workload flat or lighter?",
    fix: "Redesign the flow so the tool removes at least as much work as it adds; show the net-burden calculation.",
  },
  G10: {
    id: "G10",
    dimension: "D3",
    title: "Learnable",
    question: "Can a typical operator learn it quickly with light training?",
    fix: "Simplify onboarding so a typical operator is competent after light training; add in-context guidance.",
  },
  G11: {
    id: "G11",
    dimension: "D3",
    title: "Clear operator value",
    question:
      "Is the value to the person using it clear and immediate?",
    fix: "Make the operator's own benefit explicit and immediate, not just a downstream/system benefit.",
  },
  // D4 · Tech & data governance
  G12: {
    id: "G12",
    dimension: "D4",
    title: "Data ownership",
    question: "Does the hospital retain ownership of its data?",
    fix: "Confirm in writing that the hospital retains ownership of its data.",
  },
  G13: {
    id: "G13",
    dimension: "D4",
    title: "Export / portability",
    question: "Can data be exported in a portable, usable format?",
    fix: "Provide export in a portable, standard format so data stays usable off-platform.",
  },
  G14: {
    id: "G14",
    dimension: "D4",
    title: "Informed consent",
    question:
      "Is there an informed-consent basis appropriate to the data use?",
    fix: "Establish an informed-consent basis appropriate to how patient data is used.",
  },
  G15: {
    id: "G15",
    dimension: "D4",
    title: "Secure + DPDP residency",
    question:
      "Is data handled securely with residency consistent with DPDP expectations?",
    fix: "Tighten security controls and confirm data residency consistent with DPDP expectations.",
  },
  G16: {
    id: "G16",
    dimension: "D4",
    title: "Direct performance visibility",
    question:
      "Can the site see the tool's live performance directly, independent of vendor reports?",
    fix: "Give the site direct visibility into live performance metrics, independent of vendor-supplied reports.",
  },
};

/** Ordered list (PUBLIC D2 variant) — the default, back-compatible order. */
export const TOOL_GATE_ORDER: ToolGateId[] = [
  "G1", "G2", "G3", "G4", "G17",
  "G5", "G6", "G7",
  "G8", "G9", "G10", "G11",
  "G12", "G13", "G14", "G15", "G16",
];

/**
 * D2 (System Fit) is buyer-conditional. D1/D3/D4 are the shared spine.
 *   public  → public-procurement framing (prioritised problem, operability, clean exit)
 *   private → a private buyer's investment case (ROI, liability, billing, service-line, cost)
 */
export const D2_GATES: Record<BuyerType, ToolGateId[]> = {
  public: ["G5", "G6", "G7"],
  private: ["GP1", "GP2", "GP3", "GP4", "GP5"],
};

/** The gates for a dimension under a given buyer type (only D2 varies). */
export function dimensionGates(dimension: DimensionId, buyer: BuyerType = "public"): ToolGateId[] {
  return dimension === "D2" ? D2_GATES[buyer] : DIMENSIONS[dimension].gates;
}

/** Canonical gate order (D1 · D2-variant · D3 · D4) for a given buyer type. */
export function toolGateOrder(buyer: BuyerType = "public"): ToolGateId[] {
  return [
    ...DIMENSIONS.D1.gates,
    ...D2_GATES[buyer],
    ...DIMENSIONS.D3.gates,
    ...DIMENSIONS.D4.gates,
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Site domains — 6 domains, domain-scored (BUILD_SPEC §7)
// ─────────────────────────────────────────────────────────────────────────

export type SiteDomainDef = {
  id: SiteDomainId;
  label: string;
  question: string;
  /** Onboarding fix when the domain is below target. */
  fix: string;
};

export const SITE_DOMAINS: Record<SiteDomainId, SiteDomainDef> = {
  governance: {
    id: "governance",
    label: "Governance & ethics",
    question: "Is there a governance and ethics structure to oversee an AI pilot?",
    fix: "Stand up a governance/ethics review path for AI pilots (named committee, escalation route).",
  },
  people: {
    id: "people",
    label: "People & training",
    question: "Are staff identified and trained to run the tool?",
    fix: "Identify and train the staff who will run the tool; assign a site champion.",
  },
  infrastructure: {
    id: "infrastructure",
    label: "Infrastructure & IT",
    question: "Is the IT infrastructure (connectivity, devices, integration) ready?",
    fix: "Close IT gaps — connectivity, devices, and integration points the tool needs.",
  },
  data: {
    id: "data",
    label: "Data & documentation",
    question: "Are data capture and documentation practices adequate?",
    fix: "Strengthen data-capture and documentation practices to support evaluation and audit.",
  },
  regulatory: {
    id: "regulatory",
    label: "Regulatory & quality",
    question: "Are regulatory and quality processes in place for a pilot?",
    fix: "Align regulatory and quality processes (SOPs, quality sign-off) for the pilot.",
  },
  access: {
    id: "access",
    label: "Patient access",
    question: "Can the target patients actually reach and use the pathway?",
    fix: "Address patient-access barriers so the intended population can reach the pathway.",
  },
};

export const SITE_DOMAIN_ORDER: SiteDomainId[] = [
  "governance",
  "people",
  "infrastructure",
  "data",
  "regulatory",
  "access",
];

// ─────────────────────────────────────────────────────────────────────────
// 3. Hospital intake gates — 13 gates, 3 groups (BUILD_SPEC §7)
// ─────────────────────────────────────────────────────────────────────────

export type HospitalGateId =
  | "H1" | "H2" | "H3" | "H4"
  | "H5" | "H6" | "H7" | "H8" | "H9"
  | "H10" | "H11" | "H12" | "H13";

export type HospitalGateDef = {
  id: HospitalGateId;
  group: AuditGroupId;
  title: string;
  question: string;
  fix: string;
  /**
   * Tool gate this overlaps with, if any. Used to PRE-FILL the hospital audit
   * from the vendor card (BUILD_SPEC §4.3). Hospital-only gates — the ones a
   * vendor card doesn't cover (integration, liability, named owners, billing) —
   * have no overlap and start blank for the hospital to answer.
   */
  vendorGate?: ToolGateId;
};

export const HOSPITAL_GROUPS: Record<
  AuditGroupId,
  { id: AuditGroupId; title: string; gates: HospitalGateId[] }
> = {
  should_pilot: {
    id: "should_pilot",
    title: "Should we pilot?",
    gates: ["H1", "H2", "H3", "H4"],
  },
  can_run: {
    id: "can_run",
    title: "Can we run it?",
    gates: ["H5", "H6", "H7", "H8", "H9"],
  },
  who_owns: {
    id: "who_owns",
    title: "Who owns it?",
    gates: ["H10", "H11", "H12", "H13"],
  },
};

export const HOSPITAL_GATES: Record<HospitalGateId, HospitalGateDef> = {
  // Should we pilot?
  H1: {
    id: "H1",
    group: "should_pilot",
    title: "Evidence",
    question: "Is the clinical evidence strong enough for us to pilot?",
    fix: "Seek independent evidence adequate for our patient mix before piloting.",
    vendorGate: "G1",
  },
  H2: {
    id: "H2",
    group: "should_pilot",
    title: "Safety",
    question: "Does it fail safe, with an override our clinicians control?",
    fix: "Confirm a clinician-controlled override and documented failure modes.",
    vendorGate: "G2",
  },
  H3: {
    id: "H3",
    group: "should_pilot",
    title: "Regulatory",
    question: "Is the regulatory position acceptable for our use?",
    fix: "Confirm the regulatory position is acceptable for our intended use.",
    vendorGate: "G4",
  },
  H4: {
    id: "H4",
    group: "should_pilot",
    title: "Human-in-the-loop",
    question: "Does our workflow keep a clinician meaningfully in the loop?",
    fix: "Design the pilot so a clinician stays meaningfully in the loop.",
    vendorGate: "G3",
  },
  // Can we run it?
  H5: {
    id: "H5",
    group: "can_run",
    title: "Actionable output",
    question: "Is the output something our clinicians can act on directly?",
    fix: "Confirm the output maps to an action in our clinical workflow.",
    vendorGate: "G8",
  },
  H6: {
    id: "H6",
    group: "can_run",
    title: "Burden",
    question: "Does the tool keep our staff's net workload flat or lighter?",
    fix: "Validate that the tool does not add net burden to our staff.",
    vendorGate: "G9",
  },
  H7: {
    id: "H7",
    group: "can_run",
    title: "Integration with our systems",
    question: "Does it integrate with our HIS/EMR and existing systems?",
    fix: "Scope integration with our HIS/EMR; confirm data flows and effort.",
    // hospital-specific — no vendor overlap
  },
  H8: {
    id: "H8",
    group: "can_run",
    title: "Data ownership",
    question: "Do we retain ownership and control of our data?",
    fix: "Confirm in the pilot agreement that we retain data ownership.",
    vendorGate: "G12",
  },
  H9: {
    id: "H9",
    group: "can_run",
    title: "Liability / indemnity",
    question: "Is liability and indemnity clearly allocated for the pilot?",
    fix: "Agree liability and indemnity terms with the vendor before pilot start.",
    // hospital-specific — no vendor overlap
  },
  // Who owns it?
  H10: {
    id: "H10",
    group: "who_owns",
    title: "Named owners",
    question: "Are named owners assigned on our side for the pilot?",
    fix: "Assign named clinical and operational owners on our side.",
    // hospital-specific — no vendor overlap
  },
  H11: {
    id: "H11",
    group: "who_owns",
    title: "Direct monitoring",
    question: "Can we monitor performance directly during the pilot?",
    fix: "Set up direct performance monitoring independent of vendor reports.",
    vendorGate: "G16",
  },
  H12: {
    id: "H12",
    group: "who_owns",
    title: "Billing / reimbursement",
    question: "Is billing / reimbursement resolved for the pathway?",
    fix: "Resolve billing / reimbursement for the pathway before scaling.",
    // hospital-specific — no vendor overlap
  },
  H13: {
    id: "H13",
    group: "who_owns",
    title: "Clean exit",
    question: "Do we have a clean exit if we stop the pilot?",
    fix: "Confirm a clean-exit path with data export and no lock-in.",
    vendorGate: "G7",
  },
};

export const HOSPITAL_GATE_ORDER: HospitalGateId[] = [
  "H1", "H2", "H3", "H4",
  "H5", "H6", "H7", "H8", "H9",
  "H10", "H11", "H12", "H13",
];
