/**
 * The item bank — 112 assessment items on the public path.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS AUTHORED AND WHAT IS NOT
 * ─────────────────────────────────────────────────────────────────────────
 * 17 items carry real text: they are the platform's existing 17 gates, moved
 * into the cluster their MEANING puts them in, with their question and fix
 * text carried over verbatim from `gates.ts` and `legacyGateId` set.
 *
 * The other 95 are STUBS: `text: null`, `fix: null`, `status: "draft"`. That
 * is not laziness and it is not a TODO to be resolved by writing something
 * plausible. These are real assessment criteria that will be put in front of
 * hospitals. An invented item that reads well is strictly worse than a blank,
 * because the blank gets authored by someone who knows the domain and the fake
 * gets used. A stub renders as "Item pending definition" and is excluded from
 * every scoring denominator.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IDS
 * ─────────────────────────────────────────────────────────────────────────
 * `D1.C.03`. Within a cluster, gate-carrying items take the low numbers in
 * gate order and stubs fill the rest. Ids are STABLE: authoring a stub later
 * is a text edit on an existing id, never a renumber, so nothing that has
 * already cited `D3.B.07` starts pointing somewhere else.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * GATES ARE A SUBSET, NOT THE CLUSTERS
 * ─────────────────────────────────────────────────────────────────────────
 * /framework is explicit that the gate set is a focused subset related to the
 * clusters but NOT one-to-one with them. This bank keeps that true: 17 of 112
 * items are gates, spread unevenly across the clusters, and three clusters
 * carry no gate at all (see UNGATED_CLUSTERS). That copy is correct and must
 * not be "fixed".
 */

import type { AssessmentItem, ItemPath } from "@/lib/schemas/item";
import type { DimensionId } from "@/lib/schemas/readiness-card";
import type { EvidenceType } from "@/lib/schemas/evidence";
import { TOOL_GATES, type ToolGateId } from "./gates";

// ─────────────────────────────────────────────────────────────────────────
// 1. The cluster table — MIRRORS app/framework/page.tsx EXACTLY
// ─────────────────────────────────────────────────────────────────────────

/**
 * Cluster codes, names and counts, copied from the DIMENSIONS const in
 * app/framework/page.tsx. NOT re-derived — the framework page is the
 * authoritative published standard and this is a mirror of it.
 *
 * `scripts/phase1-acceptance.ts` parses that page and fails loudly if this
 * table drifts from it. Silent divergence between the engine and the published
 * standard is the failure mode worth spending a test on.
 */
export type ClusterDef = {
  code: string;
  dimension: DimensionId;
  name: string;
  count: number;
  path: ItemPath;
};

export const FRAMEWORK_CLUSTERS: ClusterDef[] = [
  { code: "D1.A", dimension: "D1", name: "Patient Outcomes", count: 4, path: "BOTH" },
  { code: "D1.B", dimension: "D1", name: "Evidence Quality", count: 5, path: "BOTH" },
  { code: "D1.C", dimension: "D1", name: "Clinical Performance & Safety", count: 14, path: "BOTH" },
  { code: "D1.D", dimension: "D1", name: "Regulatory Status", count: 8, path: "BOTH" },

  // D2 is buyer-conditional. Its three PUBLIC clusters are the public-
  // procurement variant; a private buyer swaps them for the five investment-
  // case items in PRIVATE_D2_CLUSTER below. /framework says the same thing.
  { code: "D2.A", dimension: "D2", name: "Program Fit", count: 4, path: "PUBLIC" },
  { code: "D2.B", dimension: "D2", name: "Infrastructural Requirements", count: 1, path: "PUBLIC" },
  { code: "D2.C", dimension: "D2", name: "Procurement Fit", count: 9, path: "PUBLIC" },

  { code: "D3.A", dimension: "D3", name: "Learnability & Training Burden", count: 8, path: "BOTH" },
  { code: "D3.B", dimension: "D3", name: "Cognitive & Operational Fit", count: 10, path: "BOTH" },
  { code: "D3.C", dimension: "D3", name: "Clinical Behaviour", count: 7, path: "BOTH" },
  { code: "D3.D", dimension: "D3", name: "Adoption & Sustained Fit", count: 8, path: "BOTH" },

  { code: "D4.A", dimension: "D4", name: "Infrastructure Readiness", count: 7, path: "BOTH" },
  { code: "D4.B", dimension: "D4", name: "Interface Design & Accessibility", count: 7, path: "BOTH" },
  { code: "D4.C", dimension: "D4", name: "Interoperability & Data Portability", count: 6, path: "BOTH" },
  { code: "D4.D", dimension: "D4", name: "Monitoring, Analytics & Oversight", count: 6, path: "BOTH" },
  { code: "D4.E", dimension: "D4", name: "Patient Consent & Data Rights", count: 4, path: "BOTH" },
  { code: "D4.F", dimension: "D4", name: "Data Privacy, Storage & Security", count: 4, path: "BOTH" },
];

/**
 * The private-buyer D2 variant. /framework names five investment-case items
 * but does not give them cluster codes or fold them into the 112 — "the
 * private D2 items are not individually counted in the standard". They get
 * the code D2.P here so they are addressable, and they sit OUTSIDE the 112.
 */
export const PRIVATE_D2_CLUSTER: ClusterDef = {
  code: "D2.P",
  dimension: "D2",
  name: "Private investment case",
  count: 5,
  path: "PRIVATE",
};

/** The published total on the public path. Asserted at module load. */
export const PUBLIC_ITEM_TOTAL = 112;

// ─────────────────────────────────────────────────────────────────────────
// 2. Gate → cluster mapping
// ─────────────────────────────────────────────────────────────────────────

/**
 * Where each of the 17 gates lands in the framework, BY MEANING.
 *
 * Every gate stays inside the dimension `gates.ts` already assigns it. That is
 * a deliberate constraint, not a coincidence: the legacy adapter projects v2
 * dimension means back onto the old per-dimension scores, and a gate that
 * hopped dimensions would silently change what D1 means on ~20 existing
 * screens. Where meaning pulled a gate across a dimension boundary it is
 * noted below and the legacy dimension won.
 *
 * `acceptsEvidence` says what kind of document can actually settle the item —
 * it is what stops a vendor answering a regulatory question with a field log.
 */
type GateSeed = {
  gate: ToolGateId;
  cluster: string;
  acceptsEvidence: EvidenceType[];
  /** Recorded where the mapping involved a judgement call worth reviewing. */
  note?: string;
};

export const GATE_SEEDS: GateSeed[] = [
  // ── D1 ──────────────────────────────────────────────────────────────────
  {
    gate: "G1",
    cluster: "D1.B",
    acceptsEvidence: ["VALIDATION_STUDY", "STUDY"],
    note: "Independence of the evidence is what D1.B measures. Unambiguous.",
  },
  {
    gate: "G2",
    cluster: "D1.C",
    acceptsEvidence: ["VALIDATION_STUDY", "AUDIT", "FIELD_LOG"],
    note: "Failing safe is safe BEHAVIOUR in real use, which is D1.C.",
  },
  {
    gate: "G3",
    cluster: "D1.C",
    acceptsEvidence: ["FIELD_LOG", "AUDIT", "STUDY"],
    note:
      "JUDGEMENT CALL. Human-in-the-loop reads as workflow (D3.C Clinical " +
      "Behaviour) as much as safety. Kept in D1.C because gates.ts scores it " +
      "in D1 and a cross-dimension hop would move weight off D1 on the legacy " +
      "card. Flag if you would rather it sat in D3.C.",
  },
  {
    gate: "G4",
    cluster: "D1.D",
    acceptsEvidence: ["REGULATORY"],
    note: "Regulatory position for the intended use. Unambiguous.",
  },
  {
    gate: "G17",
    cluster: "D1.C",
    acceptsEvidence: ["VALIDATION_STUDY", "STUDY", "AUDIT"],
    note:
      "Subgroup fairness is measured PERFORMANCE, so D1.C rather than D1.B. " +
      "D1.B is about how credible the evidence is, not what it found.",
  },

  // ── D2 (public procurement variant) ─────────────────────────────────────
  {
    gate: "G5",
    cluster: "D2.A",
    acceptsEvidence: ["FIELD_LOG", "AUDIT"],
    note: "Whether the system has prioritised the problem — D2.A verbatim.",
  },
  {
    gate: "G6",
    cluster: "D2.B",
    acceptsEvidence: ["FIELD_LOG", "INTEGRATION_SPEC", "AUDIT"],
    note:
      "D2.B has exactly ONE item and G6 is it — 'whether the baseline " +
      "infrastructure to run it exists' is the gate restated. Only fully " +
      "gate-covered cluster in the bank.",
  },
  {
    gate: "G7",
    cluster: "D2.C",
    acceptsEvidence: ["SLA", "INTEGRATION_SPEC"],
    note:
      "JUDGEMENT CALL. Clean exit is contractual (D2.C Procurement Fit) and " +
      "technical (D4.C). Split deliberately: G7 is the CONTRACT side and G13 " +
      "is the TECHNICAL side, so the two do not collapse into one item.",
  },

  // ── D3 ──────────────────────────────────────────────────────────────────
  {
    gate: "G8",
    cluster: "D3.C",
    acceptsEvidence: ["FIELD_LOG", "STUDY", "AUDIT"],
    note: "Actionable output is about the clinical action taken — D3.C.",
  },
  {
    gate: "G9",
    cluster: "D3.B",
    acceptsEvidence: ["FIELD_LOG", "STUDY"],
    note: "Net burden is workload and attention — D3.B verbatim.",
  },
  {
    gate: "G10",
    cluster: "D3.A",
    acceptsEvidence: ["TRAINING_CURRICULUM", "FIELD_LOG"],
    note: "Learnability — D3.A verbatim.",
  },
  {
    gate: "G11",
    cluster: "D3.D",
    acceptsEvidence: ["FIELD_LOG", "AUDIT"],
    note:
      "Operator value is why people keep using it once support fades, which " +
      "is what D3.D measures, rather than first-use learnability.",
  },

  // ── D4 ──────────────────────────────────────────────────────────────────
  {
    gate: "G12",
    cluster: "D4.C",
    acceptsEvidence: ["SLA", "INTEGRATION_SPEC"],
    note:
      "JUDGEMENT CALL. Data ownership is institution-side, so NOT D4.E — " +
      "D4.E is patient consent and PATIENT data rights. Ownership pairs with " +
      "portability as the anti-lock-in pair, so D4.C.",
  },
  {
    gate: "G13",
    cluster: "D4.C",
    acceptsEvidence: ["INTEGRATION_SPEC", "AUDIT"],
    note: "Export / portability — D4.C verbatim.",
  },
  {
    gate: "G14",
    cluster: "D4.E",
    acceptsEvidence: ["CONSENT_ARTEFACT", "REGULATORY"],
    note: "Informed consent — D4.E verbatim.",
  },
  {
    gate: "G15",
    cluster: "D4.F",
    acceptsEvidence: ["AUDIT", "REGULATORY", "SLA"],
    note: "DPDP residency and security — D4.F verbatim.",
  },
  {
    gate: "G16",
    cluster: "D4.D",
    acceptsEvidence: ["INTEGRATION_SPEC", "AUDIT", "FIELD_LOG"],
    note: "Direct performance visibility — D4.D verbatim.",
  },
];

/** The 5 private-path gates, seeded as D2.P items with path PRIVATE. */
export const PRIVATE_GATE_SEEDS: GateSeed[] = [
  { gate: "GP1", cluster: "D2.P", acceptsEvidence: ["AUDIT", "FIELD_LOG"] },
  { gate: "GP2", cluster: "D2.P", acceptsEvidence: ["SLA", "REGULATORY"] },
  { gate: "GP3", cluster: "D2.P", acceptsEvidence: ["SLA", "AUDIT"] },
  { gate: "GP4", cluster: "D2.P", acceptsEvidence: ["FIELD_LOG", "AUDIT"] },
  { gate: "GP5", cluster: "D2.P", acceptsEvidence: ["SLA", "AUDIT"] },
];

/**
 * Clusters carrying NO gate. Not an oversight to be papered over — it is the
 * most useful thing this mapping surfaces. The platform currently gates on
 * nothing in patient outcomes, nothing in infrastructure readiness, and
 * nothing in interface accessibility (language, literacy, access needs).
 */
export const UNGATED_CLUSTERS: string[] = ["D1.A", "D4.A", "D4.B"];

// ─────────────────────────────────────────────────────────────────────────
// 3. Building the bank
// ─────────────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildCluster(cluster: ClusterDef, seeds: GateSeed[]): AssessmentItem[] {
  const mine = seeds.filter((s) => s.cluster === cluster.code);
  if (mine.length > cluster.count) {
    throw new Error(
      `Item bank: cluster ${cluster.code} has ${mine.length} gates but only ${cluster.count} items.`
    );
  }

  const items: AssessmentItem[] = [];

  // Gate-carrying items take the low ids, in gate order.
  mine.forEach((seed, i) => {
    const def = TOOL_GATES[seed.gate];
    items.push({
      id: `${cluster.code}.${pad2(i + 1)}`,
      dimension: cluster.dimension,
      clusterCode: cluster.code,
      // Question text carried over verbatim from gates.ts.
      text: def.question,
      status: "active",
      isGate: true,
      path: cluster.path,
      acceptsEvidence: seed.acceptsEvidence,
      fix: def.fix,
      legacyGateId: seed.gate,
    });
  });

  // Stubs fill the rest. `acceptsEvidence` is empty because an item with no
  // text has no defined answer to "what would settle this?" either.
  for (let i = mine.length; i < cluster.count; i++) {
    items.push({
      id: `${cluster.code}.${pad2(i + 1)}`,
      dimension: cluster.dimension,
      clusterCode: cluster.code,
      text: null,
      status: "draft",
      isGate: false,
      path: cluster.path,
      acceptsEvidence: [],
      fix: null,
    });
  }

  return items;
}

/** All 117 entries: 112 on the public path + the 5 private D2.P items. */
export const ITEM_BANK: AssessmentItem[] = [
  ...FRAMEWORK_CLUSTERS.flatMap((c) => buildCluster(c, GATE_SEEDS)),
  ...buildCluster(PRIVATE_D2_CLUSTER, PRIVATE_GATE_SEEDS),
];

const BY_ID = new Map(ITEM_BANK.map((i) => [i.id, i]));

// ─────────────────────────────────────────────────────────────────────────
// 4. Helpers
// ─────────────────────────────────────────────────────────────────────────

export function getItem(id: string): AssessmentItem | undefined {
  return BY_ID.get(id);
}

/**
 * Items on a path. "BOTH" items are on every path; D2's public clusters are
 * swapped for D2.P on the private path, exactly as D2_GATES already does for
 * the 17-gate set.
 */
export function itemsForPath(path: "PUBLIC" | "PRIVATE"): AssessmentItem[] {
  return ITEM_BANK.filter((i) => i.path === "BOTH" || i.path === path);
}

export function itemsForCluster(code: string): AssessmentItem[] {
  return ITEM_BANK.filter((i) => i.clusterCode === code);
}

export function itemsForDimension(
  dimension: DimensionId,
  path: "PUBLIC" | "PRIVATE" = "PUBLIC"
): AssessmentItem[] {
  return itemsForPath(path).filter((i) => i.dimension === dimension);
}

/** Every gate-carrying item, public and private. */
export function gateItems(path?: "PUBLIC" | "PRIVATE"): AssessmentItem[] {
  const pool = path ? itemsForPath(path) : ITEM_BANK;
  return pool.filter((i) => i.isGate);
}

/** Items that have actually been authored and can therefore be scored. */
export function activeItems(path: "PUBLIC" | "PRIVATE" = "PUBLIC"): AssessmentItem[] {
  return itemsForPath(path).filter((i) => i.status === "active" && i.text !== null);
}

/** How much of the framework is still unwritten. */
export function stubCount(path: "PUBLIC" | "PRIVATE" = "PUBLIC"): number {
  return itemsForPath(path).filter((i) => i.status === "draft").length;
}

/** Find the item carrying a legacy gate id, for the adapter and for routing. */
export function itemForLegacyGate(gateId: string): AssessmentItem | undefined {
  return ITEM_BANK.find((i) => i.legacyGateId === gateId);
}

const LEGACY_GATE_TO_ITEM = new Map(
  ITEM_BANK.filter((i) => i.legacyGateId).map((i) => [i.legacyGateId as string, i.id])
);
const ITEM_TO_LEGACY_GATE = new Map(
  ITEM_BANK.filter((i) => i.legacyGateId).map((i) => [i.id, i.legacyGateId as string])
);

export function legacyGateToItemId(gateId: string): string | undefined {
  return LEGACY_GATE_TO_ITEM.get(gateId);
}
export function itemIdToLegacyGate(itemId: string): string | undefined {
  return ITEM_TO_LEGACY_GATE.get(itemId);
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Build-time assertions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Runs at module load. If the framework page changes its cluster counts and
 * this table is not updated with it, the app fails on import rather than
 * quietly scoring against a bank that no longer matches the published
 * standard. Loud beats silent — a divergence here is invisible from the UI.
 */
function assertBankIntegrity(): void {
  const publicItems = itemsForPath("PUBLIC");
  if (publicItems.length !== PUBLIC_ITEM_TOTAL) {
    throw new Error(
      `Item bank: public path has ${publicItems.length} items, expected ${PUBLIC_ITEM_TOTAL}. ` +
        `Cluster counts must match DIMENSIONS in app/framework/page.tsx.`
    );
  }

  for (const c of [...FRAMEWORK_CLUSTERS, PRIVATE_D2_CLUSTER]) {
    const n = itemsForCluster(c.code).length;
    if (n !== c.count) {
      throw new Error(
        `Item bank: cluster ${c.code} has ${n} items, expected ${c.count}.`
      );
    }
  }

  const ids = ITEM_BANK.map((i) => i.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Item bank: duplicate item ids.");
  }

  const gates = gateItems();
  const expectedGates = GATE_SEEDS.length + PRIVATE_GATE_SEEDS.length;
  if (gates.length !== expectedGates) {
    throw new Error(
      `Item bank: ${gates.length} gate items, expected ${expectedGates}.`
    );
  }

  // Every gate item must have carried real text over. A gate that is also a
  // stub would be scoreable-looking and unanswerable.
  for (const g of gates) {
    if (g.text === null || g.fix === null || g.status !== "active") {
      throw new Error(`Item bank: gate item ${g.id} (${g.legacyGateId}) is not fully authored.`);
    }
  }

  // Every stub must be genuinely blank — no half-authored items.
  for (const s of ITEM_BANK.filter((i) => i.status === "draft")) {
    if (s.text !== null || s.fix !== null || s.isGate) {
      throw new Error(`Item bank: ${s.id} is marked draft but carries content.`);
    }
  }
}

assertBankIntegrity();
