/**
 * Verdict engine — the rule that decides what a card says.
 *
 * ORDER MATTERS. The rules are checked most-severe first and the first one
 * that fires wins:
 *
 *   1. any gate item final === 0        → NOT_DEPLOYABLE_IN_CONTEXT
 *   2. any gate item UNSCORED           → cap at TRIAL_ONLY
 *   3. D1 mean < 1.0, or D1.D mean < 1.0 → TRIAL_ONLY
 *   4. any gate item final === 1        → CONDITIONALLY_DEPLOYABLE   (see note)
 *   5. any non-gate item final <= 1     → CONDITIONALLY_DEPLOYABLE
 *   6. otherwise                        → DEPLOYABLE
 *
 * A GATE AT 0 FORCES NOT_DEPLOYABLE, whatever surrounds it. There is no
 * averaging out of a gate. A tool can be excellent on 111 items and still be
 * not-deployable here because it cannot give the hospital its own records
 * back. That is the entire reason gates exist as a separate mechanism from
 * scoring, and it is why the card carries no composite number for a strong
 * average to hide inside.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TWO INTERPRETATIONS WRITTEN DOWN, BECAUSE THEY ARE NOT OBVIOUS
 * ─────────────────────────────────────────────────────────────────────────
 * (a) WHAT COUNTS AS A GATE PASSING. A gate clears at level 2 ("system-
 *     owned"), not at level 1. A gate that only functions through specific
 *     support has not cleared — that is what a gate is for. So a gate at 1 is
 *     counted in `gateSummary.fail`, but only a gate at 0 triggers rule 1.
 *
 * (b) RULE 4 IS AN ADDITION. The specified rules cover a gate at 0 and a gate
 *     UNSCORED, then jump to non-gate items. They say nothing about a gate at
 *     1, which would leave a card reading DEPLOYABLE while its own gate
 *     summary reported a failure. A gate at 1 cannot be better than a non-gate
 *     at 1, so it lands at CONDITIONALLY_DEPLOYABLE. Flagged for review.
 */

import type { AssessmentItem } from "@/lib/schemas/item";
import type { Evidence } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type {
  BlockingScope,
  CardCondition,
  CardVerdict,
  DimensionId,
  DimensionScore,
  GateSummary,
  Placement,
  ReadinessCard,
} from "@/lib/schemas/readiness-card";
import {
  CADRE_AVAILABILITY,
  CARE_LEVEL_LABEL,
  CARE_LEVEL_SHORT,
  PRIVATE_CARE_LEVELS,
  PUBLIC_CARE_LEVELS,
  type ContextCareLevel,
  type OperatorCadre,
  type SubmissionPath,
} from "@/lib/schemas/context";
import {
  clusterAggregate,
  couldNotEstablish,
  dimensionAggregate,
  resolveAll,
  round1,
  UNSCORED,
  type FinalLevel,
  type ScoredSet,
} from "./score";
import {
  FRAMEWORK_CLUSTERS,
  PRIVATE_D2_CLUSTER,
  getItem,
  gateItems,
  itemsForPath,
} from "./item-bank";
import { earliestRegulatoryExpiry } from "./evidence";
import { softenCertainty } from "./soften-certainty";

/** The level a gate has to reach to clear. See interpretation (a) above. */
export const GATE_CLEARS_AT = 2;

const DIMENSION_IDS: DimensionId[] = ["D1", "D2", "D3", "D4"];

export function buildGateSummary(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE"
): GateSummary {
  let pass = 0;
  const failedIds: string[] = [];
  const unscoredIds: string[] = [];

  for (const g of gateItems(path)) {
    const level = resolved.get(g.id) ?? UNSCORED;
    if (level === UNSCORED) unscoredIds.push(g.id);
    else if (level >= GATE_CLEARS_AT) pass += 1;
    else failedIds.push(g.id);
  }

  return {
    pass,
    fail: failedIds.length,
    unscored: unscoredIds.length,
    failedIds,
    unscoredIds,
  };
}

export function deriveVerdict(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE"
): CardVerdict {
  const items = itemsForPath(path);
  const levelOf = (i: AssessmentItem) => resolved.get(i.id) ?? UNSCORED;

  const gates = items.filter((i) => i.isGate);

  // 1. A gate at zero. No averaging out.
  if (gates.some((g) => levelOf(g) === 0)) return "NOT_DEPLOYABLE_IN_CONTEXT";

  // 2. A gate nobody could establish. Not a failure — but not a pass either.
  if (gates.some((g) => levelOf(g) === UNSCORED)) return "TRIAL_ONLY";

  // 3. D1 as a whole, and the regulatory cluster specifically, below "requires
  //    support". A null mean (nothing scored) does not fire this rule — that is
  //    an absence, and rule 2 already covers an unestablished gate.
  const d1 = dimensionAggregate("D1", resolved, path).mean;
  const d1d = clusterAggregate("D1.D", resolved, path).mean;
  if ((d1 !== null && d1 < 1.0) || (d1d !== null && d1d < 1.0)) return "TRIAL_ONLY";

  // 4. A gate that only functions with specific support. See note (b).
  if (gates.some((g) => levelOf(g) === 1)) return "CONDITIONALLY_DEPLOYABLE";

  // 5. Any authored non-gate item at or below "requires support".
  const nonGates = items.filter((i) => !i.isGate);
  if (nonGates.some((i) => { const l = levelOf(i); return l !== UNSCORED && l <= 1; })) {
    return "CONDITIONALLY_DEPLOYABLE";
  }

  return "DEPLOYABLE";
}

// ─────────────────────────────────────────────────────────────────────────
// What a condition blocks
// ─────────────────────────────────────────────────────────────────────────

/**
 * Clusters whose conditions block a TRIAL, not merely routine deployment.
 *
 * The test is simple: can running a supervised trial ESTABLISH this? If not,
 * the condition gates the trial itself.
 *
 *   D1.C  Clinical Performance & Safety — you do not find out whether a device
 *         fails safe by pointing it at patients and seeing what happens.
 *   D1.D  Regulatory Status — the legal basis to use it at all. A trial is a
 *         use.
 *   D4.E  Patient Consent & Data Rights — you cannot consent people by
 *         enrolling them first.
 *   D4.F  Privacy, Storage & Security — you cannot establish a lawful basis for
 *         handling patient data by handling patient data.
 *
 * Everything else — does it help patients, does it fit the clinic, does the
 * data move, can anyone see how it is doing — is precisely what a supervised
 * trial exists to find out, so those conditions block ROUTINE_DEPLOYMENT and a
 * trial is the route through them.
 */
export const TRIAL_BLOCKING_CLUSTERS: readonly string[] = ["D1.C", "D1.D", "D4.E", "D4.F"];

export function blockingScopeFor(item: AssessmentItem): BlockingScope {
  return TRIAL_BLOCKING_CLUSTERS.includes(item.clusterCode) ? "TRIAL" : "ROUTINE_DEPLOYMENT";
}

/**
 * Conditions, most severe first: gate failures, then firm-ups. `clearedBy`
 * names who can close it and with what, so a condition is an instruction
 * rather than a complaint.
 */
export function buildConditions(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE"
): CardCondition[] {
  const items = itemsForPath(path);
  const gateFails: CardCondition[] = [];
  const firmUps: CardCondition[] = [];

  for (const item of items) {
    const level = resolved.get(item.id) ?? UNSCORED;
    if (level === UNSCORED) continue;

    if (item.isGate && level < GATE_CLEARS_AT) {
      gateFails.push({
        itemId: item.id,
        kind: "gate_fail",
        blocks: blockingScopeFor(item),
        fix: softenCertainty(item.fix ?? ""),
        clearedBy: clearedBy(item),
      });
    } else if (!item.isGate && level <= 1) {
      firmUps.push({
        itemId: item.id,
        kind: "firm_up",
        blocks: blockingScopeFor(item),
        fix: softenCertainty(item.fix ?? ""),
        clearedBy: clearedBy(item),
      });
    }
  }

  return [...gateFails, ...firmUps];
}

function clearedBy(item: AssessmentItem): string {
  if (item.acceptsEvidence.length === 0) {
    return softenCertainty("An assessor, on review of evidence bound to this item.");
  }
  const kinds = item.acceptsEvidence.map((e) => e.toLowerCase().replace(/_/g, " ")).join(", ");
  return softenCertainty(
    `An assessor, on receipt of evidence of type: ${kinds}, bound to ${item.id}.`
  );
}

// ─────────────────────────────────────────────────────────────────────────
// What the assessment could not establish
// ─────────────────────────────────────────────────────────────────────────

/**
 * The honest counterweight to the verdict, in sentences rather than item ids.
 *
 * Two kinds of absence, and both belong on the card:
 *
 *   1. AUTHORED ITEMS NOBODY ESTABLISHED. Someone wrote the question and no
 *      evidence answered it either way.
 *
 *   2. CLUSTERS WITH NOTHING AUTHORED AT ALL. Today that is patient outcomes,
 *      infrastructure readiness and interface accessibility — three clusters
 *      where the framework asks nothing yet, so the assessment found nothing,
 *      so a reader could easily conclude there was nothing to find. This is the
 *      most misleading silence on the card and it is the one most worth
 *      breaking.
 *
 * Partially-authored clusters are NOT listed. The scope line already says how
 * much of the framework the demo runs, and repeating it per cluster would bury
 * the two or three absences a reader can actually act on.
 */
export function buildCouldNotEstablish(
  resolved: Map<string, FinalLevel>,
  path: "PUBLIC" | "PRIVATE"
): string[] {
  const out: string[] = [];

  for (const id of couldNotEstablish(resolved, path)) {
    const item = getItem(id);
    if (!item) continue;
    const label = item.legacyGateId ? `${item.legacyGateId} · ${id}` : id;
    out.push(softenCertainty(`${label} — ${item.text}`));
  }

  const items = itemsForPath(path);
  const clusters = [...new Set(items.map((i) => i.clusterCode))];
  for (const code of clusters) {
    const inCluster = items.filter((i) => i.clusterCode === code);
    if (inCluster.some((i) => i.status === "active")) continue;
    const name = clusterName(code);
    out.push(
      softenCertainty(
        `${name} (${code}) — ${inCluster.length} ${inCluster.length === 1 ? "item" : "items"}`
      )
    );
  }

  return out;
}

function clusterName(code: string): string {
  return (
    [...FRAMEWORK_CLUSTERS, PRIVATE_D2_CLUSTER].find((c) => c.code === code)?.name ?? code
  );
}

/**
 * The one-line summary that sits beside the verdict.
 *
 * "2 conditions. One blocks a trial. One blocks routine deployment." — which is
 * a sentence a reader can act on. The phrasing it replaces, "0 required fixes
 * and 2 to firm up", counts paperwork rather than saying whether anyone can
 * start next month.
 */
export function describeConditions(conditions: CardCondition[]): string {
  if (conditions.length === 0) {
    return softenCertainty("No open conditions.");
  }

  const trial = conditions.filter((c) => c.blocks === "TRIAL").length;
  const routine = conditions.length - trial;
  const n = (count: number) => COUNT_WORD[count] ?? String(count);

  const parts: string[] = [];
  if (trial > 0) parts.push(`${n(trial)} ${trial === 1 ? "blocks" : "block"} a trial.`);
  if (routine > 0) {
    parts.push(`${n(routine)} ${routine === 1 ? "blocks" : "block"} routine deployment.`);
  }

  const head = `${conditions.length} ${conditions.length === 1 ? "condition" : "conditions"}.`;
  return softenCertainty(`${head} ${parts.join(" ")}`);
}

const COUNT_WORD: Record<number, string> = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
};

// ─────────────────────────────────────────────────────────────────────────
// Scope
// ─────────────────────────────────────────────────────────────────────────

/**
 * The scope caveat, set ONCE, here.
 *
 * It is not a per-card field a fixture can soften, because the card that would
 * most benefit from softening it is exactly the card that must not. Every card
 * carries the same sentence about how much of the framework the demo actually
 * runs.
 */
export const SCOPE_NOTE =
  "Demo screening uses 17 gates. The full funded assessment contains 112 items " +
  "across 17 clusters, scored by at least two blind independent assessors in " +
  "parallel with an AI pass.";

// ─────────────────────────────────────────────────────────────────────────
// Placement
// ─────────────────────────────────────────────────────────────────────────

/**
 * Short caveat labels per cluster — what an open condition in that cluster
 * means for placement, in a reader's words. Only clusters that can currently
 * carry a condition need one; a stub cluster cannot produce a condition.
 */
const PLACEMENT_CAVEAT: Record<string, string> = {
  "D1.A": "outcome evidence",
  "D1.B": "local validation",
  "D1.C": "documented safe-fail behaviour",
  "D1.D": "regulatory clearance for this use",
  "D2.A": "programme fit",
  "D2.B": "site infrastructure",
  "D2.C": "procurement route",
  "D2.P": "the investment case",
  "D3.A": "operator training",
  "D3.B": "workload fit",
  "D3.C": "clinical follow-through",
  "D3.D": "sustained adoption",
  "D4.A": "site infrastructure",
  "D4.B": "interface accessibility",
  "D4.C": "data portability",
  "D4.D": "performance monitoring",
  "D4.E": "a consent basis",
  "D4.F": "DPDP controls",
};

function joinPlain(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * Settings this assessment explicitly does NOT cover.
 *
 * A card that only says where a tool fits gets read as silence-means-permission
 * everywhere else, so the exclusions are stated rather than implied. The rule
 * is about the OPERATOR: a setting is excluded when it does not typically staff
 * the cadre the tool was assessed with. A tool does not become unsafe because a
 * building is smaller — it becomes unsafe because the person holding it was
 * never assessed holding it.
 *
 * Settings on the other procurement path are not listed here; the header's
 * "a change of context requires a new assessment" already covers them, and
 * repeating it per setting would bury the one exclusion that matters.
 */
export function excludedSettings(
  careLevel: ContextCareLevel,
  cadre: OperatorCadre,
  path: SubmissionPath
): string[] {
  const ladder = path === "PRIVATE_INVESTMENT" ? PRIVATE_CARE_LEVELS : PUBLIC_CARE_LEVELS;
  return ladder
    .filter((level) => level !== careLevel)
    .filter((level) => !CADRE_AVAILABILITY[level].includes(cadre))
    .map((level) => {
      const label = CARE_LEVEL_LABEL[level];
      return `${label.charAt(0).toUpperCase()}${label.slice(1)} placement is outside this assessment.`;
    });
}

/**
 * Placement, derived rather than asserted. Any open condition at all puts the
 * tool in supervised-trial territory — a condition is by definition something
 * not yet established, and routine deployment is what you do with things that
 * are.
 */
export function derivePlacement(
  context: SubmissionContext,
  verdict: CardVerdict,
  conditions: CardCondition[]
): Placement {
  const level = CARE_LEVEL_SHORT[context.careLevel];
  const excluded = excludedSettings(context.careLevel, context.operatorCadre, context.path);

  if (verdict === "NOT_DEPLOYABLE_IN_CONTEXT") {
    return {
      statement: softenCertainty(
        `Not suitable for placement at ${level} level in this context until the blocking conditions are cleared.`
      ),
      excluded,
    };
  }

  if (conditions.length === 0) {
    return {
      statement: softenCertainty(
        `Potentially suitable for routine deployment at ${level} level, within the context stated above.`
      ),
      excluded,
    };
  }

  // De-duplicated, in cluster order, so two conditions in one cluster read as
  // one caveat rather than the same words twice.
  const caveats = [
    ...new Set(
      conditions
        .map((c) => getItem(c.itemId)?.clusterCode)
        .filter((code): code is string => !!code)
        .map((code) => PLACEMENT_CAVEAT[code] ?? "the open conditions")
    ),
  ];

  return {
    statement: softenCertainty(
      `Potentially suitable for a supervised trial at ${level} level, subject to ${joinPlain(caveats)}.`
    ),
    excluded,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Expiry
// ─────────────────────────────────────────────────────────────────────────

export type ExpiryDecision = {
  expiresAt: string;
  source: "twelve_month_default" | "regulatory_licence";
  note: string;
};

/**
 * A card expires 12 months from issue, OR when the earliest regulatory licence
 * it rests on expires, whichever is SOONER. A card cannot outlive its own
 * legal basis — otherwise a hospital reads "deployable" off a card whose CDSCO
 * licence lapsed three months ago. Which input set the date is recorded, so
 * the reason is visible rather than inferred from a date.
 */
export function computeExpiresAt(
  issuedAt: string,
  evidence: Evidence[]
): ExpiryDecision {
  const issued = new Date(issuedAt);
  const twelve = new Date(issued);
  twelve.setMonth(twelve.getMonth() + 12);

  const licence = earliestRegulatoryExpiry(evidence, (id) => getItem(id)?.clusterCode);

  if (licence && new Date(licence).getTime() < twelve.getTime()) {
    return {
      expiresAt: new Date(licence).toISOString(),
      source: "regulatory_licence",
      note: softenCertainty(
        `regulatory licence, ${licence.slice(0, 10)} — earlier than the 12-month default.`
      ),
    };
  }

  return {
    expiresAt: twelve.toISOString(),
    source: "twelve_month_default",
    note: softenCertainty("the 12-month default."),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Card assembly
// ─────────────────────────────────────────────────────────────────────────

export type CardInput = {
  id: string;
  issuedAt: string;
  context: SubmissionContext;
  toolVersion: string;
  modelVersion: string;
  scored: ScoredSet;
  evidence: Evidence[];
  /** Carried forward on a reissue; a new card starts empty. */
  priorChangeLog?: ReadinessCard["changeLog"];
  version?: number;
  /** Set on a reissue so expiry stays anchored to the original assessment. */
  firstIssuedAt?: string;
};

export function buildReadinessCard(input: CardInput): ReadinessCard {
  const path = input.scored.path;
  const resolved = resolveAll(input.scored);

  const dimensionScores = {} as Record<DimensionId, DimensionScore>;
  for (const d of DIMENSION_IDS) {
    const agg = dimensionAggregate(d, resolved, path);
    dimensionScores[d] = {
      mean: agg.mean === null ? 0 : round1(agg.mean),
      itemsScored: agg.itemsScored,
      itemsTotal: agg.itemsTotal,
    };
  }

  // Expiry is anchored to the FIRST issue, not this one. A card that renewed
  // its own 12 months every time a vendor cleared a condition would never
  // expire, which is the opposite of what an expiry is for.
  const firstIssuedAt = input.firstIssuedAt ?? input.issuedAt;
  const expiry = computeExpiresAt(firstIssuedAt, input.evidence);

  const verdict = deriveVerdict(resolved, path);
  const conditions = buildConditions(resolved, path);

  return {
    id: input.id,
    version: input.version ?? 1,
    issuedAt: input.issuedAt,
    firstIssuedAt,
    expiresAt: expiry.expiresAt,
    expiryBasis: expiry.note,
    // Frozen copy — a later edit to the submission cannot re-scope an issued card.
    context: {
      ...input.context,
      population: { ...input.context.population },
      deploymentModes: [...input.context.deploymentModes],
    },
    toolVersion: input.toolVersion,
    modelVersion: input.modelVersion,
    dimensionScores,
    verdict,
    conditions,
    placement: derivePlacement(input.context, verdict, conditions),
    scopeNote: SCOPE_NOTE,
    gateSummary: buildGateSummary(resolved, path),
    couldNotEstablish: buildCouldNotEstablish(resolved, path),
    // Transitions only. A v1.0 card has changed nothing yet, so its changelog
    // is empty and `changeLog.length === version - 1` holds at every version.
    changeLog: input.priorChangeLog ?? [],
  };
}
