/**
 * The assessment run — what S5 shows between the declaration and the card.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS AT ALL
 * ─────────────────────────────────────────────────────────────────────────
 * The seventeen-question declaration is gone: a card assembled from a vendor's
 * answers about their own tool reads as a calculator, because that is very
 * nearly what it was. What remains is the act itself — documents mapped,
 * checked against what each gate REQUIRES, then scoring — which is the
 * difference between a form that echoes and a process that examines.
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
 * how many documents were mapped, how many gates have a gap. Counting gaps is
 * not scoring them.
 */

import type { Evidence } from "@/lib/schemas/evidence";
import type { Level } from "@/lib/schemas/score";
import type { CardCondition } from "@/lib/schemas/readiness-card";
import { itemForLegacyGate, getItem, gateItems } from "./item-bank";
import { TRIAL_BLOCKING_CLUSTERS } from "./verdict";
import { softenCertainty } from "./soften-certainty";

/** Qualitative only. There is no numeric equivalent and none is exposed. */
export type CoverageBand = "high" | "moderate" | "limited";

/**
 * A gap between what a GATE REQUIRES and what is on file for it.
 *
 * This used to compare a document against the vendor's own declared level.
 * There is no declaration any more — the 17-question questionnaire is gone,
 * because a card assembled from a vendor's answers about their own tool reads
 * as self-certification however carefully it is labelled. The comparison is
 * now against the gate's requirement, which is the same for every submission
 * and is not something the submitter can set.
 *
 * THREE checkable tests, none of which requires reading a document:
 *
 *   NO_EVIDENCE      nothing on file is bound to the gate's item. In a cluster
 *                    whose questions cannot be answered by assertion — safety,
 *                    legality, consent, data handling — this is decisive and
 *                    routes the submission to an assessor.
 *
 *   NON_TRANSFERRING  documents exist, and EVERY one of them is
 *                     generalisability-limited. The evidence exists; it was
 *                     generated somewhere this deployment is not.
 *
 *   UNCORROBORATED   documents exist and do transfer, but cannot carry the
 *                    gate on their own — every one is vendor-generated and
 *                    states a limitation.
 *
 * ONE DERIVATION, TWO SCREENS. The declaration summary and the assessment step
 * both call `findGateGaps`. They used to compute their own and reported five
 * and two for the same submission — two screens disagreeing about one fact.
 * The acceptance harness asserts the two agree.
 */
export type GateGapKind = "NO_EVIDENCE" | "NON_TRANSFERRING" | "UNCORROBORATED";

export type GateGap = {
  gateId: string;
  itemId: string;
  kind: GateGapKind;
  /** What the bound documents can carry on their own. */
  supported: Level;
  /** True where assertion is not admissible for this cluster. */
  blocking: boolean;
  explanation: string;
};

export type AssessmentRunInput = {
  evidence: Evidence[];
  conditions: CardCondition[];
};

export type AssessmentRun = {
  /** Documents mapped to gates and items. A count of things, not a score. */
  documentsMapped: number;
  itemsTouched: number;
  gateGaps: GateGap[];
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

/**
 * THE single derivation of doc-versus-gate-requirement gaps.
 *
 * Iterates the GATES, not a declaration. A gate whose documents already carry
 * it is not a gap and is not reported.
 */
export function findGateGaps(evidence: Evidence[]): GateGap[] {
  const bound = boundItems(evidence);
  const out: GateGap[] = [];

  for (const item of gateItems("PUBLIC")) {
    const gateId = item.legacyGateId ?? item.id;
    const docs = bound.get(item.id) ?? [];
    const blocking = TRIAL_BLOCKING_CLUSTERS.includes(item.clusterCode);

    if (docs.length === 0) {
      out.push({
        gateId,
        itemId: item.id,
        kind: "NO_EVIDENCE",
        supported: 0,
        blocking,
        explanation: softenCertainty(
          blocking
            ? `Nothing on file is bound to ${item.id}. This gate sits in ${item.clusterCode}, where a claim cannot stand on assertion — an assessor looks before the card issues.`
            : `Nothing on file is bound to ${item.id}, so the assessment is silent on this gate rather than assuming either way.`
        ),
      });
      continue;
    }

    if (docs.every((d) => d.generalisability.limited)) {
      out.push({
        gateId,
        itemId: item.id,
        kind: "NON_TRANSFERRING",
        supported: 0,
        blocking,
        explanation: softenCertainty(
          `Every document bound to ${item.id} was generated somewhere this deployment is not. The evidence exists; whether it carries here is a judgement for an assessor.`
        ),
      });
      continue;
    }

    const supported = supportedLevel(docs);
    if (supported < 2) {
      out.push({
        gateId,
        itemId: item.id,
        kind: "UNCORROBORATED",
        supported,
        blocking,
        explanation: softenCertainty(
          `The documents bound to ${item.id} cannot carry this gate on their own — each is vendor-generated and states a limitation. Admissible, and not yet independent of the claimant.`
        ),
      });
    }
  }

  return out;
}

/** Gates the documents DO establish — the other half of the summary. */
export function gatesEstablished(evidence: Evidence[]): string[] {
  const gaps = new Set(findGateGaps(evidence).map((g) => g.gateId));
  return gateItems("PUBLIC")
    .map((i) => i.legacyGateId ?? i.id)
    .filter((g) => !gaps.has(g));
}

export function runAssessment(input: AssessmentRunInput): AssessmentRun {
  const bound = boundItems(input.evidence);
  const gateGaps = findGateGaps(input.evidence);

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
  // Only the BLOCKING no-evidence gates route to a human. A gate outside those
  // clusters with nothing on file is reported on the summary and leaves the
  // card silent on it; it is not a reason to hold the submission.
  for (const g of gateGaps) {
    if (g.kind === "NO_EVIDENCE" && g.blocking) unsupported.add(g.gateId);
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
    gateGaps,
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

/**
 * The declaration summary's count, named as the screen names it: "N gates your
 * documents don't yet establish". A thin alias over the one derivation, so the
 * summary and the assessment step can never report different numbers.
 */
export function gatesNotYetEstablished(evidence: Evidence[]): GateGap[] {
  return findGateGaps(evidence);
}
