/**
 * Phase 6c acceptance — the human-in-the-loop return path.
 * Run: npm run verify:phase6c
 */
import { readFileSync } from "node:fs";
import { buildClarifyingQuestions, findDiscrepancies, MAX_CLARIFYING_QUESTIONS } from "@/lib/engine/routing";
import { runAssessment, supportedLevel } from "@/lib/engine/assessment-run";
import { legacyGateToItemId } from "@/lib/engine/item-bank";
import { buildClarifyState } from "@/lib/mock/api-clarify";
import { applyBindings, getAnswers, recordAnswer, resetClarifications } from "@/lib/mock/clarifications";
import { assessorQueue, carriedForwardCount, currentReview, itemsForReview, recordReview, resetAssessorReviews } from "@/lib/mock/assessor";
import { appendOnlyGuard, inForce } from "@/lib/mock/append-only";
import { getCardV2, seededDeclaration } from "@/lib/mock/cards-v2";
import { CERVIAI_DECLARATION, CERVIAI_EVIDENCE } from "@/lib/mock/fixtures/cerviai-v2";
import { RETINASCAN_DECLARATION, RETINASCAN_EVIDENCE } from "@/lib/mock/fixtures/retinascan-v2";
import { ALL_ROLES } from "@/lib/role/RoleContext";
import { PRODUCT_HOME } from "@/lib/links";
import type { Evidence } from "@/lib/schemas/evidence";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);
const threw = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e instanceof Error ? e.message : "threw"; } };

const res = (ev: Evidence[]) => (id: string) => supportedLevel(ev.filter((e) => e.itemRefs.includes(id)));
function questionsFor(slug: string, declaration: typeof CERVIAI_DECLARATION, evidence: Evidence[]) {
  const view = getCardV2(slug)!;
  const run = runAssessment({ evidence, conditions: view.card.conditions });
  const blockingItemIds = run.unsupportedGates.map((g) => legacyGateToItemId(g)!).filter(Boolean);
  const d = findDiscrepancies({
    scores: new Map(), evidence, path: "PUBLIC",
    supportsFromEvidence: res(evidence), blockingItemIds,
  });
  return { run, discrepancies: d, questions: buildClarifyingQuestions(d) };
}

// ═════════════════════════════════════════════════════════════════════════
section("1. Ranking — blocking first, then answerability");
// ═════════════════════════════════════════════════════════════════════════

const cerv = questionsFor("cerviai", CERVIAI_DECLARATION, CERVIAI_EVIDENCE);
eq("CerviAI already clears, so nothing is blocking", cerv.run.outcome, "ISSUE");
/**
 * TWO QUESTIONS, NOT FIVE — and that is the change worth having.
 *
 * WAS ["G1","G17","G15","G2","G3"]: CerviAI had fifteen gaps because thirteen
 * of its seventeen gates had no document behind them and only looked settled
 * because the engine resolved them from the vendor's own declared answers.
 * The five questions were the top of a list that should not have been that
 * long.
 *
 * NOW the submission carries the operational file a district would actually
 * hold, so fifteen of seventeen gates are established by document and exactly
 * two are open. It gets asked about exactly those two. The cap is a ceiling,
 * never a quota — a submission with two real gaps is not padded to five.
 */
eq("its questions are its two open gates, and nothing else",
  cerv.questions.map((q) => q.gateId), ["G1", "G15"]);
ok("the cap is a ceiling, not a quota", cerv.questions.length === cerv.discrepancies.length,
  `${cerv.questions.length} of ${cerv.discrepancies.length}`);

/** The cap has to bind SOMEWHERE, or it is not a cap. SymptomBot is where. */
const symptom = questionsFor("symptombot", CERVIAI_DECLARATION, getCardV2("symptombot")!.evidence);
ok("capped at five even though far more gaps exist",
  symptom.questions.length === MAX_CLARIFYING_QUESTIONS && symptom.discrepancies.length > 5,
  `${symptom.questions.length} of ${symptom.discrepancies.length}`);

const retina = questionsFor("retinascan", RETINASCAN_DECLARATION, RETINASCAN_EVIDENCE);
eq("RetinaScan is held", retina.run.outcome, "UNDER_ASSESSMENT");
eq("…on the three gates with nothing on file", retina.run.unsupportedGates.sort(), ["G13", "G17", "G6"]);
ok("its questions lead with the gates that are BLOCKING it",
  retina.run.unsupportedGates.every((g) => retina.questions.slice(0, 3).some((q) => q.gateId === g)),
  retina.questions.map((q) => q.gateId).join(", "));
ok("a gate with nothing on file ranks ABOVE a merely imperfect one when it is blocking",
  retina.discrepancies.find((d) => d.gateId === "G13")!.materiality >
  retina.discrepancies.find((d) => d.gateId === "G1")!.materiality);

/**
 * ANSWERABILITY — the -20 for "nothing on file", asserted where it is still
 * OBSERVABLE.
 *
 * The rule is unchanged and the reason for it is unchanged: "you sent us
 * nothing" produces "we will send something", which resolves nothing and burns
 * one of five slots, while a gap against a document that exists can be closed
 * by pointing at section 4.
 *
 * What changed is that it is now DOMINATED whenever the caller passes the
 * run's full unsupported set, because every gate with nothing on file is in
 * that set and +50 for blocking outweighs -20. So it is asserted here on the
 * ranking with no blocking set supplied, which is the shape an assessor
 * console asking about one dimension would use — and the only shape where the
 * two terms are separable.
 */
const unranked = findDiscrepancies({
  scores: new Map(), evidence: getCardV2("symptombot")!.evidence, path: "PUBLIC",
  supportsFromEvidence: res(getCardV2("symptombot")!.evidence),
});
ok("…and BELOW it when nothing is blocking, so answerability decides",
  unranked.find((d) => d.gateId === "G3")!.materiality <
  unranked.find((d) => d.gateId === "G2")!.materiality,
  `G3(nothing on file)=${unranked.find((d) => d.gateId === "G3")!.materiality} vs G2(doc falls short)=${unranked.find((d) => d.gateId === "G2")!.materiality}`);

// ═════════════════════════════════════════════════════════════════════════
section("2. An answer binds, it does not invent");
// ═════════════════════════════════════════════════════════════════════════

resetClarifications();
const bound = applyBindings(RETINASCAN_EVIDENCE, [{
  slug: "retinascan", questionId: "q-G13", gateId: "G13", itemId: "D4.C.02",
  answer: "Manual appendix B.", answeredAt: "", bindsEvidenceId: "ev-retinascan-manual",
}]);
ok("a binding points an existing document at a new item",
  bound.find((e) => e.id === "ev-retinascan-manual")!.itemRefs.includes("D4.C.02"));
const invented = applyBindings(RETINASCAN_EVIDENCE, [{
  slug: "retinascan", questionId: "q-x", gateId: "G13", itemId: "D4.C.02",
  answer: "a", answeredAt: "", bindsEvidenceId: "ev-does-not-exist",
}]);
eq("a binding naming a document not on file changes nothing", invented.length, RETINASCAN_EVIDENCE.length);
ok("…and adds no itemRefs anywhere",
  invented.every((e, i) => e.itemRefs.length === RETINASCAN_EVIDENCE[i].itemRefs.length));

ok("answers do NOT touch the declaration",
  !readFileSync("lib/mock/clarifications.ts", "utf8").includes("SelfDeclaration") ||
  readFileSync("lib/mock/clarifications.ts", "utf8").includes("deliberately left unused"));
eq("the declaration is unchanged after an answer", RETINASCAN_DECLARATION.clarificationAnswers, []);

// ═════════════════════════════════════════════════════════════════════════
section("3. RetinaScan completes end to end");
// ═════════════════════════════════════════════════════════════════════════

resetClarifications();
const before = buildClarifyState("retinascan")!;
eq("held before answering", before.run.outcome, "UNDER_ASSESSMENT");
/**
 * HIGH, not moderate. Coverage counts the DECISIVE gates that have something
 * to read — the open conditions plus everything trial-blocking. RetinaScan now
 * carries the operational file a district would hold, so its only decisive
 * hole is G17; the other two (G6, G13) hold the submission but are not
 * trial-blocking. A submission can be well covered and still be held, and that
 * is the distinction this number exists to keep.
 */
eq("coverage high — the holes are specific, not broad", before.run.evidenceCoverage, "high");
eq("three unsupported gates", before.run.unsupportedGates, ["G17", "G6", "G13"]);
ok("five questions raised", before.questions.length === 5);
ok("every question carries the document a truthful answer points at",
  before.questions.every((q) => q.binds !== null));

for (const q of before.questions) {
  recordAnswer({
    slug: "retinascan", questionId: q.id, gateId: q.gateId, itemId: q.itemId,
    answer: "Section 4 of the document already filed covers this.",
    bindsEvidenceId: q.binds, at: "2026-10-02T00:00:00.000Z",
  });
}
const after = buildClarifyState("retinascan")!;
eq("after answering, it issues", after.run.outcome, "ISSUE");
eq("coverage moved to high", after.run.evidenceCoverage, "high");
eq("no unsupported gates remain", after.run.unsupportedGates, []);
ok("the screen can say routing moved", after.routingMoved);
eq("all five recorded", getAnswers("retinascan").length, 5);
ok("questions are ranked against the BASELINE, so the five do not change mid-flow",
  JSON.stringify(after.questions.map((q) => q.gateId)) === JSON.stringify(before.questions.map((q) => q.gateId)));

/** CerviAI: answering must not imply it earned something. */
resetClarifications();
const cState = buildClarifyState("cerviai")!;
ok("CerviAI already clears", cState.alreadyClear);
recordAnswer({
  slug: "cerviai", questionId: cState.questions[0].id, gateId: cState.questions[0].gateId,
  itemId: cState.questions[0].itemId, answer: "a", bindsEvidenceId: cState.questions[0].binds,
});
const cAfter = buildClarifyState("cerviai")!;
eq("…and answering leaves its routing unchanged", cAfter.routingMoved, false);
eq("…still issuing", cAfter.run.outcome, "ISSUE");
resetClarifications();

// ═════════════════════════════════════════════════════════════════════════
section("4. S5b releases nothing it should not");
// ═════════════════════════════════════════════════════════════════════════

const held = readFileSync("app/submit/[id]/held/page.tsx", "utf8");
ok("no dimension means are rendered", !/dimensionScores/.test(held));
ok("no verdict is rendered", !/card\.verdict|CARD_VERDICT_STYLE/.test(held));
ok("no percentage is rendered", !/%/.test(held.replace(/className[^\n]*/g, "")));
ok("it says delay, not denial", held.includes("This is a delay, not a denial"));
ok("…and that no rejected state exists at this step", held.includes("no rejected state at this step"));

// ═════════════════════════════════════════════════════════════════════════
section("5. S5c reuses the S18 mechanism");
// ═════════════════════════════════════════════════════════════════════════

resetAssessorReviews();
const queue = assessorQueue();
ok("only held submissions are queued", queue.every((q) => q.unsupported.length > 0));
ok("RetinaScan is in the queue", queue.some((q) => q.slug === "retinascan"));
ok("sorted by unsupported trial-blocking gates first",
  queue.every((q, i) => i === 0 || queue[i - 1].trialBlockingUnsupported.length >= q.trialBlockingUnsupported.length));
eq("the assessor sees only the unsupported items", itemsForReview("retinascan").map((i) => i.gateId), ["G17", "G6", "G13"]);
eq("everything else carries forward untouched", carriedForwardCount("retinascan"), 14);

ok("the guard is SHARED, not forked",
  readFileSync("lib/mock/governance.ts", "utf8").includes("appendOnlyGuard") &&
  readFileSync("lib/mock/assessor.ts", "utf8").includes("appendOnlyGuard"));
ok("…and so is 'in force'",
  readFileSync("lib/mock/governance.ts", "utf8").includes("inForce") &&
  readFileSync("lib/mock/assessor.ts", "utf8").includes("inForce"));

ok("an anonymous review throws",
  threw(() => recordReview({ slug: "retinascan", toolName: "RetinaScan", assessor: { name: "", role: "x", conflictPosition: "NONE", conflictNote: null }, reviewed: [] })) !== null);
ok("a declared conflict with no note throws",
  threw(() => recordReview({ slug: "retinascan", toolName: "RetinaScan", assessor: { name: "A", role: "B", conflictPosition: "DECLARED", conflictNote: "" }, reviewed: [] })) !== null);

const review = recordReview({
  slug: "retinascan", toolName: "RetinaScan",
  assessor: { name: "Dr. N. Iyer", role: "Independent assessor", conflictPosition: "NONE", conflictNote: null },
  reviewed: itemsForReview("retinascan"), at: "2026-10-03T00:00:00.000Z",
});
eq("the card records that it issued by human review", review.issuedBy, "HUMAN_REVIEW");
eq("revision 1", review.revision, 1);
ok("a second review without superseding throws",
  threw(() => recordReview({ slug: "retinascan", toolName: "RetinaScan", assessor: review.assessor, reviewed: [] })) !== null);
const revised = recordReview({
  slug: "retinascan", toolName: "RetinaScan", assessor: review.assessor,
  reviewed: [], supersedes: review.id, at: "2026-10-04T00:00:00.000Z",
});
eq("a reversal appends as revision 2", revised.revision, 2);
eq("…and is the one in force", currentReview("retinascan")?.id, revised.id);

/** The shared guard behaves the same for both callers. */
const guarded = appendOnlyGuard({ existing: [{ id: "a", revision: 1, supersedes: null }], supersedes: "a", label: "X", subject: "y" });
eq("the shared guard computes the next revision", guarded.revision, 2);
eq("inForce picks the newest unsuperseded", inForce([{ id: "a", revision: 1, supersedes: null }, { id: "b", revision: 2, supersedes: "a" }])?.id, "b");
resetAssessorReviews();

// ═════════════════════════════════════════════════════════════════════════
section("6. Four roles");
// ═════════════════════════════════════════════════════════════════════════

eq("four actors", ALL_ROLES, ["vendor", "clearpath", "hospital", "assessor"]);
ok("every role has a landing surface", ALL_ROLES.every((r) => PRODUCT_HOME[r].length > 0));
eq("ClearPath lands on facilitation", PRODUCT_HOME.clearpath, "/submit/cerviai/facilitation");
eq("Assessor lands on the console", PRODUCT_HOME.assessor, "/assessor");

const selector = readFileSync("components/LoginAsSelector.tsx", "utf8");
ok("the hospital hint the suite selects by is unchanged", selector.includes("Evaluate, place & run clinical AI"));
ok("the innovator hint the suite selects by is unchanged", selector.includes("Get your tool evaluated"));
ok("the trigger still reads 'Login as'", selector.includes("Login as"));
ok("the menu still carries the Regulatory filing exit", selector.includes("Regulatory filing"));
ok("role=menu is intact", selector.includes('role="menu"'));
ok("THE HYDRATION GATE SURVIVED THE REBUILD", selector.includes("useHydrated") && /disabled=\{!hydrated\}/.test(selector));

const shell = readFileSync("components/AppShell.tsx", "utf8");
ok("hospital nav still carries no regulatory item",
  !/hospital: \[[\s\S]*?Explore regulatory[\s\S]*?\]/.test(shell));
ok("vendor nav still orders My applications before Submit a tool",
  shell.indexOf("My applications") < shell.indexOf("Submit a tool"));
ok("the hospital persona switcher is still mounted in the shell", shell.includes("HospitalPersonaSwitcher"));

resetClarifications();
console.log(`\nPHASE 6c ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
