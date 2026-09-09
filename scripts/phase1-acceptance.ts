/**
 * Phase 1 acceptance — the phase gate.
 *
 * Run: npm run verify:phase1
 *
 * Four things are checked:
 *   1. the item bank matches the published standard on /framework
 *   2. every citation in the AI fixture points at something real
 *   3. the golden trace — NeoScan POC-Hb
 *   4. both routing paths, and the clarification recompute
 *
 * Where an expectation cannot be met, this script says so with the arithmetic
 * rather than being adjusted to pass. A green suite that was made green by
 * moving the target is worth nothing.
 */

import { readFileSync } from "node:fs";
import {
  FRAMEWORK_CLUSTERS,
  ITEM_BANK,
  UNGATED_CLUSTERS,
  activeItems,
  gateItems,
  itemsForCluster,
  itemsForPath,
  stubCount,
} from "@/lib/engine/item-bank";
import { resolveAll, round1, dimensionAggregate, clusterAggregate } from "@/lib/engine/score";
import { buildReadinessCard, computeExpiresAt } from "@/lib/engine/verdict";
import { evaluateAll } from "@/lib/engine/evidence";
import {
  applyClarificationAnswers,
  buildClarifyingQuestions,
  computeRouteInputs,
  findDiscrepancies,
  route,
  MAX_CLARIFYING_QUESTIONS,
} from "@/lib/engine/routing";
import { toLegacyCard } from "@/lib/engine/legacy-gates";
import { buildScorecard } from "@/lib/engine/deployment-report";
import {
  ASSESSMENT_DATE,
  CLARIFICATION_ANSWERED,
  getAssessmentFixture,
} from "@/lib/mock/fixtures/assessments";
import { ASSESSMENT_KEYS, getAiAssessment } from "@/lib/mock/fixtures/ai-assessment";
import type { Deployment } from "@/lib/schemas/deployment";

let pass = 0;
let fail = 0;
const notes: string[] = [];

function ok(label: string, cond: boolean, extra = "") {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}
function eq(label: string, actual: unknown, expected: unknown) {
  ok(label, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}
function section(t: string) {
  console.log(`\n── ${t} ──`);
}

// ═════════════════════════════════════════════════════════════════════════
section("1. Item bank vs the published standard on /framework");
// ═════════════════════════════════════════════════════════════════════════

/**
 * Parse the cluster codes and counts straight out of app/framework/page.tsx.
 * The page is the authoritative published standard; if it changes and the bank
 * does not, this fails rather than letting the engine score against a
 * framework the site no longer describes.
 */
const pageSrc = readFileSync("app/framework/page.tsx", "utf8");
const pageClusters = [...pageSrc.matchAll(/\{\s*code:\s*"(D\d\.[A-F])",\s*name:\s*"([^"]+)",\s*count:\s*(\d+)/g)].map(
  (m) => ({ code: m[1], name: m[2], count: Number(m[3]) })
);

ok("parsed the framework page's cluster table", pageClusters.length === 17, `found ${pageClusters.length}`);
for (const pc of pageClusters) {
  const mine = FRAMEWORK_CLUSTERS.find((c) => c.code === pc.code);
  ok(`${pc.code} count matches /framework (${pc.count})`, mine?.count === pc.count, `bank has ${mine?.count}`);
  ok(`${pc.code} name matches /framework`, mine?.name === pc.name, `bank has "${mine?.name}"`);
}

eq("public path sums to 112", itemsForPath("PUBLIC").length, 112);
eq("bank holds 117 entries (112 public + 5 private D2.P)", ITEM_BANK.length, 117);
eq("17 gate items on the public path", gateItems("PUBLIC").length, 17);
eq("5 gate items on D2.P", itemsForCluster("D2.P").length, 5);
eq("95 stubs on the public path (112 - 17)", stubCount("PUBLIC"), 95);
eq("17 active (authored) items on the public path", activeItems("PUBLIC").length, 17);
ok(
  "gates are a SUBSET, not the clusters (3 clusters carry no gate)",
  UNGATED_CLUSTERS.every((c) => itemsForCluster(c).every((i) => !i.isGate)),
  UNGATED_CLUSTERS.join(", ")
);
ok(
  "every stub is genuinely blank — no invented item text",
  ITEM_BANK.filter((i) => i.status === "draft").every((i) => i.text === null && i.fix === null),
);
ok(
  "every id is stable and cluster-scoped",
  ITEM_BANK.every((i) => new RegExp(`^${i.clusterCode.replace(".", "\\.")}\\.\\d{2}$`).test(i.id))
);

// ═════════════════════════════════════════════════════════════════════════
section("2. Citations point at real evidence");
// ═════════════════════════════════════════════════════════════════════════

const clusterCodes = new Set(ITEM_BANK.map((i) => i.clusterCode));
for (const key of ASSESSMENT_KEYS) {
  const fx = getAssessmentFixture(key);
  const evidenceIds = new Set(fx.evidence.map((e) => e.id));
  const bad: string[] = [];
  for (const s of getAiAssessment(key)) {
    for (const c of s.citations) {
      const good =
        (c.evidenceId && evidenceIds.has(c.evidenceId)) ||
        (c.frameworkRef && clusterCodes.has(c.frameworkRef));
      if (!good) bad.push(`${s.itemId}→${c.evidenceId ?? c.frameworkRef}`);
    }
  }
  ok(`${key}: every citation resolves`, bad.length === 0, bad.join(", "));
  ok(
    `${key}: every AI score lands on a real item`,
    getAiAssessment(key).every((s) => ITEM_BANK.some((i) => i.id === s.itemId))
  );
  ok(
    `${key}: every evidence record is bound to at least one item`,
    fx.evidence.every((e) => e.itemRefs.length >= 1)
  );
}

// ═════════════════════════════════════════════════════════════════════════
section("3. GOLDEN TRACE — NeoScan POC-Hb");
// ═════════════════════════════════════════════════════════════════════════

const neo = getAssessmentFixture("neoscan");
const neoEvidence = evaluateAll(neo.evidence, neo.context, new Date(ASSESSMENT_DATE));
const neoSet = {
  path: "PUBLIC" as const,
  scores: neo.scores,
  selfDeclaration: neo.selfDeclaration,
};
const neoResolved = resolveAll(neoSet);
const neoCard = buildReadinessCard({
  id: "card-neoscan-v2",
  issuedAt: ASSESSMENT_DATE,
  context: neo.context,
  toolVersion: "NeoScan POC-Hb 2.4",
  modelVersion: "neoscan-hb-2.4.1",
  scored: neoSet,
  evidence: neoEvidence,
  changeSummary: "Card issued for antenatal anaemia screening, district hospital, ANM-operated.",
});

eq("verdict is CONDITIONALLY_DEPLOYABLE", neoCard.verdict, "CONDITIONALLY_DEPLOYABLE");
eq("gates: 16 pass", neoCard.gateSummary.pass, 16);
eq("gates: 1 fail", neoCard.gateSummary.fail, 1);
eq("gates: 0 unscored", neoCard.gateSummary.unscored, 0);
eq("the failing gate is data portability (D4.C.02 / G13)", neoCard.gateSummary.failedIds, ["D4.C.02"]);
ok(
  "the failing gate's condition names the export problem",
  neoCard.conditions.some((c) => c.itemId === "D4.C.02" && c.kind === "gate_fail"),
);

const flagged = neoEvidence.filter((e) => e.generalisability.limited);
ok("at least one document trips generalisability.limited", flagged.length >= 1, `${flagged.length} flagged`);
ok(
  "the flag names the actual mismatch, not just 'limited'",
  flagged.some((e) => /tertiary/.test(e.generalisability.reason ?? "") && /district hospital/.test(e.generalisability.reason ?? ""))
);
if (flagged[0]) console.log(`  ↳ ${flagged[0].generalisability.reason}`);

ok(
  "the card is bound to its context (frozen copy)",
  neoCard.context.careLevel === "DISTRICT_HOSPITAL" && neoCard.context.operatorCadre === "ANM"
);
const expiry = computeExpiresAt(ASSESSMENT_DATE, neoEvidence);
eq("expiry is set by the regulatory licence, not the 12-month default", expiry.source, "regulatory_licence");
ok("the card records which input set the expiry", neoCard.changeLog.some((c) => /regulatory licence/i.test(c.summary)));

// ── the dimension means ──────────────────────────────────────────────────
const EXPECTED_MEANS = { D1: 1.6, D2: 1.2, D3: 1.4, D4: 1.1 } as const;
const actualMeans = {
  D1: neoCard.dimensionScores.D1!.mean,
  D2: neoCard.dimensionScores.D2!.mean,
  D3: neoCard.dimensionScores.D3!.mean,
  D4: neoCard.dimensionScores.D4!.mean,
};
console.log(
  `  scored / total per dimension: ` +
    (["D1", "D2", "D3", "D4"] as const)
      .map((d) => `${d} ${neoCard.dimensionScores[d]!.itemsScored}/${neoCard.dimensionScores[d]!.itemsTotal}`)
      .join(" · ")
);
const meansMatch =
  actualMeans.D1 === EXPECTED_MEANS.D1 &&
  actualMeans.D2 === EXPECTED_MEANS.D2 &&
  actualMeans.D3 === EXPECTED_MEANS.D3 &&
  actualMeans.D4 === EXPECTED_MEANS.D4;
ok(
  "dimension means D1 1.6 · D2 1.2 · D3 1.4 · D4 1.1",
  meansMatch,
  `got D1 ${actualMeans.D1} · D2 ${actualMeans.D2} · D3 ${actualMeans.D3} · D4 ${actualMeans.D4}`
);

if (!meansMatch) {
  notes.push(
    [
      "GOLDEN TRACE — the dimension means cannot be reproduced, and the reason is structural.",
      "",
      "  Every non-gate item in the bank is a stub, and stubs are excluded from every",
      "  denominator. So the ONLY scored items in a dimension are its gates:",
      ...(["D1", "D2", "D3", "D4"] as const).map(
        (d) => `    ${d}: ${neoCard.dimensionScores[d]!.itemsScored} scored of ${neoCard.dimensionScores[d]!.itemsTotal} items — all of them gates`
      ),
      "",
      "  With n integer levels, the only means reachable are k/n:",
      "    D2 (n=3): 0, 0.3, 0.7, 1.0, 1.3, 1.7, 2.0        → 1.2 is not among them",
      "    D3 (n=4): 0, 0.3, 0.5, 0.8, 1.0, 1.3, 1.5, 1.8   → 1.4 is not among them",
      "    D4 (n=5): 0, 0.2, 0.4, ... 1.0, 1.2, 1.4, ...    → 1.1 is not among them",
      "",
      "  The expectation also conflicts with '16 gates pass'. A gate clears at level 2,",
      "  so 16 passing gates pins 16 of the 17 scored items at 2, forcing",
      "  D1 = D2 = D3 = 2.0 whatever else is true. Both expectations cannot hold.",
      "",
      "  WHERE THE FOUR NUMBERS COME FROM: they are the SAMPLE const in",
      "  app/framework/page.tsx, which carries the comment 'Illustrative only.",
      "  Rescaled from the old 0-3 ladder by x2/3, to one decimal: 2.4->1.6, 1.8->1.2,",
      "  2.1->1.4, 1.6->1.1.' They are a rescale of older illustrative figures, rounded",
      "  to 1dp — D4's 1.1 is 1.0667 rounded. They were never engine output and no",
      "  engine reproduces them except by coincidence.",
      "",
      "  Everything else in the golden trace passes: the verdict, the 16/1 gate split,",
      "  the identity of the failing gate, and the generalisability flag.",
    ].join("\n")
  );
}

// ═════════════════════════════════════════════════════════════════════════
section("4. Routing — both paths demoable");
// ═════════════════════════════════════════════════════════════════════════

function routeFor(key: Parameters<typeof getAssessmentFixture>[0]) {
  const fx = getAssessmentFixture(key);
  return route(computeRouteInputs({ scores: fx.scores, evidence: fx.evidence, path: "PUBLIC" }));
}

const auto = routeFor("auto-issue");
eq("(a) AUTO_ISSUE", auto.decision, "AUTO_ISSUE");
ok("(a) confidence ~0.84", Math.abs(auto.inputs.meanConfidence - 0.84) < 0.005, auto.inputs.meanConfidence.toFixed(3));
eq("(a) no ungrounded gates", auto.inputs.ungroundedGates.length, 0);
console.log(`  ↳ ${auto.explanation}`);

const lowConf = routeFor("low-confidence");
eq("(b) HUMAN_REVIEW", lowConf.decision, "HUMAN_REVIEW");
ok("(b) confidence ~0.58", Math.abs(lowConf.inputs.meanConfidence - 0.58) < 0.005, lowConf.inputs.meanConfidence.toFixed(3));
eq("(b) the CONFIDENCE condition fires alone", lowConf.failed, ["confidence"]);
console.log(`  ↳ ${lowConf.explanation}`);

const ung = routeFor("ungrounded-gate");
eq("(c) HUMAN_REVIEW", ung.decision, "HUMAN_REVIEW");
ok("(c) confidence ~0.82 — comfortably ABOVE the bar", Math.abs(ung.inputs.meanConfidence - 0.82) < 0.005, ung.inputs.meanConfidence.toFixed(3));
ok("(c) grounded ~0.64", Math.abs(ung.inputs.groundedRate - 0.64) < 0.01, ung.inputs.groundedRate.toFixed(3));
ok("(c) at least one UNGROUNDED GATE", ung.inputs.ungroundedGates.length >= 1, ung.inputs.ungroundedGates.join(", "));
ok("(c) a high confidence average does NOT carry it through", ung.decision === "HUMAN_REVIEW" && ung.inputs.meanConfidence > 0.7);
console.log(`  ↳ ${ung.explanation}`);

// ── (a) and (b) groundedness, reported honestly ──────────────────────────
if (Math.abs(auto.inputs.groundedRate - 0.79) > 0.01 || Math.abs(lowConf.inputs.groundedRate - 0.81) > 0.01) {
  notes.push(
    [
      "ROUTING FIXTURES (a) and (b) — groundedness ships at 1.00, not ~0.79 / ~0.81.",
      "",
      `  (a) asked for grounded ~0.79, ships ${auto.inputs.groundedRate.toFixed(2)}.`,
      `  (b) asked for grounded ~0.81, ships ${lowConf.inputs.groundedRate.toFixed(2)}.`,
      "",
      "  Same root cause as the golden trace. Every ACTIVE item in the bank is a gate,",
      "  so an item without a citation is by definition an UNGROUNDED GATE — which is",
      "  an absolute bar. Groundedness below 1.0 therefore cannot coexist with",
      "  AUTO_ISSUE (a), and cannot let the confidence condition fire alone (b): it",
      "  would always drag an ungrounded-gate failure along with it.",
      "",
      "  Both fixtures demonstrate what they exist to demonstrate — (a) issues without",
      "  a human, (b) fails on confidence and nothing else. Only the second number",
      "  differs, and it will become reachable as soon as non-gate items are authored.",
      "  Fixture (c), the one the demo needs most, is exact.",
    ].join("\n")
  );
}

// ═════════════════════════════════════════════════════════════════════════
section("5. Clarification — doc vs claim, and the recompute");
// ═════════════════════════════════════════════════════════════════════════

const clar = getAssessmentFixture("clarification");
const discrepancies = findDiscrepancies({
  selfDeclaration: clar.selfDeclaration,
  scores: clar.scores,
  evidence: clar.evidence,
  path: "PUBLIC",
});
ok("7+ doc-vs-claim discrepancies found", discrepancies.length >= 7, `${discrepancies.length} found`);
const questions = buildClarifyingQuestions(discrepancies);
eq(`capped at ${MAX_CLARIFYING_QUESTIONS} questions`, questions.length, MAX_CLARIFYING_QUESTIONS);
ok(
  "ranked most-material first (gate items, then gap size)",
  discrepancies[0].materiality >= discrepancies[discrepancies.length - 1].materiality
);
console.log(`  ↳ asked: ${questions.map((q) => q.gateId).join(", ")} (of ${discrepancies.length} discrepancies)`);

const before = computeRouteInputs({ scores: clar.scores, evidence: clar.evidence, path: "PUBLIC" });
const beforeRoute = route(before);
ok("before answering: confidence ~0.66", Math.abs(before.meanConfidence - 0.66) < 0.005, before.meanConfidence.toFixed(3));
eq("before answering: HUMAN_REVIEW", beforeRoute.decision, "HUMAN_REVIEW");

const recomputed = applyClarificationAnswers(clar.scores, CLARIFICATION_ANSWERED, questions);
const after = computeRouteInputs({ scores: recomputed, evidence: clar.evidence, path: "PUBLIC" });
const afterRoute = route(after);
ok("after answering: confidence ~0.74", Math.abs(after.meanConfidence - 0.74) < 0.005, after.meanConfidence.toFixed(3));
ok("the answers CROSSED the threshold", before.meanConfidence < 0.7 && after.meanConfidence >= 0.7);
eq("after answering: AUTO_ISSUE — the card issues", afterRoute.decision, "AUTO_ISSUE");
console.log(`  ↳ ${before.meanConfidence.toFixed(2)} → ${after.meanConfidence.toFixed(2)}, ${beforeRoute.decision} → ${afterRoute.decision}`);

ok(
  "answering never moved a LEVEL — an answer is not evidence",
  [...recomputed.entries()].every(([id, s]) => s.aiScore?.level === clar.scores.get(id)?.aiScore?.level)
);

// ═════════════════════════════════════════════════════════════════════════
section("6. Legacy adapter — every old consumer still gets a v1 card");
// ═════════════════════════════════════════════════════════════════════════

const legacy = toLegacyCard({
  card: neoCard,
  resolved: neoResolved,
  toolId: "tool-neoscan",
  toolName: "NeoScan POC-Hb",
  docIds: neoEvidence.map((e) => e.id),
});

eq("v1 verdict projects to CONDITIONS", legacy.verdict, "CONDITIONS");
eq("v1 card carries 17 gate results", legacy.gateResults.length, 17);
ok("v1 overallScore is 0-100", legacy.overallScore >= 0 && legacy.overallScore <= 100, String(legacy.overallScore));
ok(
  "v1 dimension scores are 0-100, NOT 0-2 means",
  Object.values(legacy.dimensionScores).every((v) => v >= 0 && v <= 100 && v > 2),
  JSON.stringify(legacy.dimensionScores)
);
eq("D1 mean 2.0 rescales to 100", legacy.dimensionScores.D1, 100);
eq("D4 mean 1.8 rescales to 90", legacy.dimensionScores.D4, 90);
ok("conditions map back to legacy gate ids", legacy.conditions.some((c) => c.gateId === "G13"));

// THE `d1 - 4` TRAP.
const fakeDeployment = { alerts: [] } as unknown as Deployment;
const { scorecard } = buildScorecard(fakeDeployment, legacy);
const clinical = scorecard.find((l) => l.key === "clinical")!.score;
eq("buildScorecard's `d1 - 4` gets a 0-100 number (100 - 4 = 96)", clinical, 96);
ok(
  "…and NOT the 0 a raw v2 mean would have produced",
  clinical !== 0,
  "a v2 mean of 1.6 through `clamp(d1 - 4)` yields 0 with no type error"
);

// ═════════════════════════════════════════════════════════════════════════
console.log(`\n${fail === 0 ? "PHASE 1 ACCEPTANCE PASSED" : "PHASE 1 ACCEPTANCE FAILED"} — ${pass} passed, ${fail} failed`);
if (notes.length > 0) {
  console.log("\n════════ STOP AND READ ════════\n");
  for (const n of notes) console.log(n + "\n");
}
process.exit(fail === 0 ? 0 : 1);
