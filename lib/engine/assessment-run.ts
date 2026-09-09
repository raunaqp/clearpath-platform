/**
 * The assessment run — what S5 shows between the declaration and the card.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS AT ALL
 * ─────────────────────────────────────────────────────────────────────────
 * Without it, a vendor answers seventeen questions and a card appears. That
 * reads as a calculator: the card looks like a restatement of the vendor's own
 * answers, because that is very nearly what it is. Making the assessment a
 * separate, visible act — documents mapped, declaration checked AGAINST them,
 * then scoring — is the difference between a form that echoes and a process
 * that examines.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NO NUMBERS. NOT ONE.
 * ─────────────────────────────────────────────────────────────────────────
 * No confidence figure, no grounding rate, no "63 of 112 items evidenced".
 * Those were invented values dressed as measurements, and a number on a screen
 * gets quoted long after the caveat beside it is forgotten. Indicators here are
 * qualitative bands and nothing else. The ratios behind them stay internal and
 * are deliberately not returned — a caller cannot render what it cannot reach.
 *
 * The one count that IS shown is a count of things, not a measure of quality:
 * how many documents were mapped, how many discrepancies were found. Counting
 * discrepancies is not scoring them.
 */

import type { Evidence } from "@/lib/schemas/evidence";
import type { Level, SelfDeclaration } from "@/lib/schemas/score";
import type { CardCondition } from "@/lib/schemas/readiness-card";
import { itemForLegacyGate, getItem, gateItems } from "./item-bank";
import { TRIAL_BLOCKING_CLUSTERS } from "./verdict";
import { softenCertainty } from "./soften-certainty";

/** Qualitative only. There is no numeric equivalent and none is exposed. */
export type CoverageBand = "high" | "moderate" | "limited";

/**
 * A gap between what the vendor declared and what is on file. Two checkable
 * tests, neither of which requires reading a document:
 *
 *   UNEVIDENCED  declared at all, in a cluster whose questions cannot be
 *                answered by assertion — safety, legality, consent, data
 *                handling — with no document bound to the gate.
 *
 *   NON_TRANSFERRING  declared at all, where EVERY document bound to the gate
 *                     is generalisability-limited. The evidence exists; it was
 *                     generated somewhere this deployment is not.
 */
export type DiscrepancyKind = "UNEVIDENCED" | "NON_TRANSFERRING";

export type DeclarationDiscrepancy = {
  gateId: string;
  itemId: string;
  kind: DiscrepancyKind;
  declared: Level;
  explanation: string;
};

export type AssessmentRunInput = {
  declaration: SelfDeclaration;
  evidence: Evidence[];
  conditions: CardCondition[];
};

export type AssessmentRun = {
  /** Documents mapped to gates and items. A count of things, not a score. */
  documentsMapped: number;
  itemsTouched: number;
  discrepancies: DeclarationDiscrepancy[];
  /** Qualitative band. Never accompanied by the ratio behind it. */
  evidenceCoverage: CoverageBand;
  /**
   * Gates carrying an open condition with nothing on file to look at. An
   * absolute bar on issuing without a human — the vendor has said a gate is
   * only partly in place and offered nothing to read about it.
   */
  unsupportedGates: string[];
  outcome: "ISSUE" | "UNDER_ASSESSMENT";
  /** The sentence the screen shows for the outcome. */
  outcomeLine: string;
};

/**
 * The verbatim scope footer. Lives here rather than in the page so it cannot be
 * trimmed to fit a layout.
 */
export const ASSESSMENT_SCOPE_FOOTER =
  "Illustrative demo assessment using 17 gates. The full funded assessment " +
  "covers 112 items and at least two blind independent assessors scoring in " +
  "parallel with an AI pass.";

/** Item ids that at least one document is bound to. */
function boundItems(evidence: Evidence[]): Map<string, Evidence[]> {
  const map = new Map<string, Evidence[]>();
  for (const e of evidence) {
    for (const ref of e.itemRefs) {
      map.set(ref, [...(map.get(ref) ?? []), e]);
    }
  }
  return map;
}

export function runAssessment(input: AssessmentRunInput): AssessmentRun {
  const bound = boundItems(input.evidence);
  const discrepancies: DeclarationDiscrepancy[] = [];

  for (const [gateId, declared] of Object.entries(input.declaration.gateAnswers)) {
    if (declared === undefined) continue;
    const item = itemForLegacyGate(gateId);
    if (!item) continue;

    const docs = bound.get(item.id) ?? [];
    const trialBlocking = TRIAL_BLOCKING_CLUSTERS.includes(item.clusterCode);

    if (docs.length === 0) {
      // Assertion is not evidence for safety, legality, consent or data
      // handling. Elsewhere a declaration stands on its own until an assessor
      // looks, so an unevidenced D2 or D3 gate is not flagged here.
      if (trialBlocking && declared >= 1) {
        discrepancies.push({
          gateId,
          itemId: item.id,
          kind: "UNEVIDENCED",
          declared,
          explanation: softenCertainty(
            `Declared, with no document on file bound to ${item.id}. This gate sits in ${item.clusterCode}, where a claim cannot stand on assertion.`
          ),
        });
      }
      continue;
    }

    if (declared >= 1 && docs.every((d) => d.generalisability.limited)) {
      discrepancies.push({
        gateId,
        itemId: item.id,
        kind: "NON_TRANSFERRING",
        declared,
        explanation: softenCertainty(
          `Declared, and every document bound to ${item.id} was generated somewhere this deployment is not. The evidence exists; whether it carries here is a judgement for an assessor.`
        ),
      });
    }
  }

  // ── unsupported gates: nothing on file to read ───────────────────────────
  // TWO SOURCES, and the second one closes the loophole that matters.
  //
  //   (a) an open condition with no document bound. The vendor has said a gate
  //       is only partly in place and offered nothing to read about it.
  //
  //   (b) a TRIAL-BLOCKING gate declared at any level with no document bound.
  //       Without this, a submission that answered every question "yes" would
  //       have no conditions at all, therefore no unsupported gates, and would
  //       issue a clean card off a single attachment. Declaring safety,
  //       legality, consent or data handling is not evidence of them, and a
  //       flow that let assertion alone produce a card would be exactly the
  //       self-certification this step exists to interrupt.
  const unsupported = new Set<string>();

  for (const c of input.conditions) {
    const item = getItem(c.itemId);
    if (!item?.isGate) continue;
    if ((bound.get(c.itemId) ?? []).length === 0) {
      unsupported.add(item.legacyGateId ?? c.itemId);
    }
  }
  for (const d of discrepancies) {
    if (d.kind === "UNEVIDENCED") unsupported.add(d.gateId);
  }

  const unsupportedGates = [...unsupported];

  // ── coverage: over the gates that DECIDE the verdict ─────────────────────
  // The open conditions plus everything that could block a trial. Coverage of
  // gates nobody is relying on is not a useful signal; coverage of the gates
  // the verdict turns on is. The ratio stays here and is never returned.
  const decisive = new Set<string>();
  for (const c of input.conditions) decisive.add(c.itemId);
  for (const g of gateItems("PUBLIC")) {
    if (TRIAL_BLOCKING_CLUSTERS.includes(g.clusterCode)) decisive.add(g.id);
  }
  const decisiveIds = [...decisive];
  const withDocs = decisiveIds.filter((id) => (bound.get(id) ?? []).length > 0).length;
  const ratio = decisiveIds.length === 0 ? 1 : withDocs / decisiveIds.length;
  const evidenceCoverage: CoverageBand =
    ratio >= 0.85 ? "high" : ratio >= 0.55 ? "moderate" : "limited";

  const outcome: AssessmentRun["outcome"] =
    unsupportedGates.length > 0 ? "UNDER_ASSESSMENT" : "ISSUE";

  return {
    documentsMapped: input.evidence.length,
    itemsTouched: new Set(input.evidence.flatMap((e) => e.itemRefs)).size,
    discrepancies,
    evidenceCoverage,
    unsupportedGates,
    outcome,
    outcomeLine: softenCertainty(
      outcome === "ISSUE"
        ? "demonstration assessment issued"
        : "routed to an assessor — this is a delay, not a denial"
    ),
  };
}

/**
 * HUMAN REVIEW IS A DELAY, NOT A DENIAL.
 *
 * There is no rejected state at this step and the vendor is never shown one.
 * An assessor reviews the gates with nothing behind them and the card issues
 * afterwards. A submission that fell below a threshold and was told "rejected"
 * would be told something false — nobody has yet decided anything about the
 * tool.
 */
export const UNDER_ASSESSMENT_NOTE =
  "An assessor reviews the gates with no evidence attached, then the card issues. " +
  "Nothing has been rejected — no decision about the tool has been made yet.";

// ─────────────────────────────────────────────────────────────────────────
// Declaration completeness (S4)
// ─────────────────────────────────────────────────────────────────────────

/**
 * The level the documents bound to an item can carry IN THIS CONTEXT.
 *
 * Not a score and not a judgement of content — nobody here reads a PDF. It is a
 * ceiling derived from three checkable facts about the documents themselves:
 * whether they transfer to the declared context, who generated them, and
 * whether the submitter stated a limitation.
 *
 *   0  nothing bound, or everything bound is generalisability-limited. A study
 *      run somewhere this deployment is not shows nothing about here.
 *   1  something bound, but every document is vendor-generated AND carries a
 *      stated limitation. Real, and not yet independent of the claimant.
 *   2  at least one document that transfers, and is either independent or
 *      states no limitation against this item.
 */
export function supportedLevel(docs: Evidence[]): Level {
  if (docs.length === 0) return 0;
  const usable = docs.filter((d) => !d.generalisability.limited && !d.expired);
  if (usable.length === 0) return 0;
  const clean = usable.filter(
    (d) => d.independence !== "VENDOR_GENERATED" || d.limitation === null
  );
  return clean.length > 0 ? 2 : 1;
}

export type DeclarationGap = {
  gateId: string;
  itemId: string;
  declared: Level;
  supported: Level;
};

/**
 * Gates where the declaration sits above what the attached evidence can carry.
 *
 * This is the number behind "N declarations exceed what the attached evidence
 * currently shows". It is derived on every keystroke from the current answers
 * and the currently attached documents, so a vendor watches it move as they
 * attach — which is the point of leaving the panel live.
 *
 * It is NOT a verdict and must never be rendered as one. A gap here is a
 * prompt to attach something, not a finding about the tool.
 */
export function declarationsExceedingEvidence(
  declaration: SelfDeclaration,
  evidence: Evidence[]
): DeclarationGap[] {
  const bound = boundItems(evidence);
  const out: DeclarationGap[] = [];

  for (const [gateId, declared] of Object.entries(declaration.gateAnswers)) {
    if (declared === undefined) continue;
    const item = itemForLegacyGate(gateId);
    if (!item) continue;

    const docs = bound.get(item.id) ?? [];
    // A gate with NOTHING attached is a coverage gap, not a conflict between a
    // declaration and a document. It is already visible as the document count
    // and, where it carries a condition, as an unsupported gate. Counting it
    // here too would put nine of CerviAI's seventeen gates in a band that is
    // supposed to draw the eye to the two or three worth arguing about.
    if (docs.length === 0) continue;

    const supported = supportedLevel(docs);
    if (declared > supported) {
      out.push({ gateId, itemId: item.id, declared, supported });
    }
  }
  return out;
}
