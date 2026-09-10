/**
 * Phase 3 acceptance — the innovator front half.
 *
 * Run: npm run verify:phase3
 *
 * The engine half. The outcome that actually matters — a fresh non-fixture
 * submission running S1 → S6 with a real uploaded file — is a browser journey
 * and is checked by scripts/phase3-browser.mjs, which drives the real UI.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildIntakeChecklist, computeCoverage } from "@/lib/engine/intake-checklist";
import {
  ASSESSMENT_SCOPE_FOOTER,
  declarationsExceedingEvidence,
  runAssessment,
  supportedLevel,
} from "@/lib/engine/assessment-run";
import { computeGeneralisability } from "@/lib/engine/evidence";
import { canBeAssessed } from "@/lib/schemas/context";
import { getCardV2 } from "@/lib/mock/cards-v2";
import {
  CERVIAI_CONTEXT,
  CERVIAI_DECLARATION,
  CERVIAI_EVIDENCE,
  buildCerviaiCardV1,
} from "@/lib/mock/fixtures/cerviai-v2";
import {
  RETINASCAN_CONTEXT,
  RETINASCAN_DECLARATION,
  RETINASCAN_EVIDENCE,
} from "@/lib/mock/fixtures/retinascan-v2";

let pass = 0, fail = 0, diverged = 0;
const notes: string[] = [];
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const divergence = (l: string, x: string) => { diverged++; console.log(`⚠ ${l} — ${x}`); };
const section = (t: string) => console.log(`\n── ${t} ──`);

// ═════════════════════════════════════════════════════════════════════════
section("1. Context schema — entity, build status, claim, scope");
// ═════════════════════════════════════════════════════════════════════════

eq("CerviAI entity is verified with no declared conflicts",
  [CERVIAI_CONTEXT.entity.name, CERVIAI_CONTEXT.entity.verified, CERVIAI_CONTEXT.entity.conflictsDeclared],
  ["CerviAI Health", true, []]);
eq("build status is a deployable build", CERVIAI_CONTEXT.buildStatus, "DEPLOYABLE_BUILD");
ok("only a deployable build may be assessed",
  canBeAssessed("DEPLOYABLE_BUILD") && !canBeAssessed("PROTOTYPE") && !canBeAssessed("CONCEPT"));
ok("the exact claim is one scoped sentence", CERVIAI_CONTEXT.exactClaim.includes("colposcopy referral") && CERVIAI_CONTEXT.exactClaim.includes("CHC"));
eq("out of scope is declared up front", CERVIAI_CONTEXT.outOfScope,
  ["Pregnancy", "Post-treatment surveillance", "Sub-centre placement"]);
eq("deployment modes are camp AND OPD queue", CERVIAI_CONTEXT.deploymentModes, ["CAMP", "OPD_QUEUE"]);
eq("programme line", CERVIAI_CONTEXT.programmeLine, "NP-NCD cervical cancer screening");

// ═════════════════════════════════════════════════════════════════════════
section("2. Intake checklist — six groups, counted against lines");
// ═════════════════════════════════════════════════════════════════════════

const groups = buildIntakeChecklist({ category: "screening", context: CERVIAI_CONTEXT });
eq("six groups", groups.map((g) => g.id),
  ["regulatory", "clinical", "dpdp", "interoperability", "logistics", "training"]);
ok("every line states what it accepts", groups.every((g) => g.lines.every((l) => l.accepts.length > 0)));
ok("regulatory covers CDSCO, classification, ISO, US FDA, NABL",
  ["reg-cdsco", "reg-classification", "reg-iso", "reg-usfda", "reg-nabl"].every((id) =>
    groups[0].lines.some((l) => l.id === id)));
ok("CDSCO line accepts a reasoned out-of-scope statement",
  groups[0].lines[0].detail.toLowerCase().includes("out-of-scope"));
ok("clinical asks for design, comparator, site, n and independence",
  /design, comparator, site, n/.test(groups[1].lines[0].detail));
ok("DPDP has all seven lines", groups[2].lines.length === 7);
ok("training asks hours per the DECLARED cadre", groups[5].lines[0].detail.includes("staff nurse"));
ok("US FDA is not required unless claimed", groups[0].lines.find((l) => l.id === "reg-usfda")!.required === false);
ok("NABL is required for a point-of-care tool",
  buildIntakeChecklist({ category: "point-of-care", context: CERVIAI_CONTEXT })[0]
    .lines.find((l) => l.id === "reg-nabl")!.required === true);

const cov = computeCoverage(groups, CERVIAI_EVIDENCE);
ok("coverage counts lines, and exposes no score", typeof cov.requiredCovered === "number" && !("score" in cov));
console.log(`  ↳ CerviAI covers ${cov.requiredCovered} of ${cov.requiredTotal} required lines`);

// ═════════════════════════════════════════════════════════════════════════
section("3. Evidence provenance and generalisability at attach time");
// ═════════════════════════════════════════════════════════════════════════

eq("five seeded CerviAI documents", CERVIAI_EVIDENCE.length, 5);
ok("every document carries full provenance", CERVIAI_EVIDENCE.every((e) =>
  e.provenance.generatedBy && e.provenance.fundedBy && e.provenance.documentDate &&
  e.provenance.population.setting && e.provenance.population.cadre));
ok("every document is bound to at least one item", CERVIAI_EVIDENCE.every((e) => e.itemRefs.length >= 1));
ok("every document states a limitation, or is a bare fact",
  CERVIAI_EVIDENCE.every((e) => e.limitation !== undefined));

const validation = CERVIAI_EVIDENCE.find((e) => e.id === "ev-cerviai-validation")!;
eq("validation study is 4,200, independent, March 2026",
  [validation.provenance.population.sampleN, validation.independence, validation.provenance.documentDate.slice(0, 7)],
  [4200, "INDEPENDENT", "2026-03"]);
ok("validation study supports G1 and G17", validation.itemRefs.length === 2);
ok("validation study TRIPS generalisability against CHC / staff nurse", validation.generalisability.limited);
ok("…and the reason names both mismatches",
  /tertiary/.test(validation.generalisability.reason ?? "") && /staff nurse/.test(validation.generalisability.reason ?? ""));
console.log(`  ↳ ${validation.generalisability.reason}`);

const cdsco = CERVIAI_EVIDENCE.find((e) => e.id === "ev-cerviai-cdsco")!;
eq("CDSCO licence runs Jan 2026 to Jan 2028",
  [cdsco.provenance.documentDate.slice(0, 7), cdsco.provenance.validUntil?.slice(0, 7)], ["2026-01", "2028-01"]);
ok("DPDP policy binds G14 and G15",
  CERVIAI_EVIDENCE.find((e) => e.id === "ev-cerviai-dpdp")!.itemRefs.length === 2);
ok("clinical evaluation binds G2, G3, G8 and is 1,150 across 2 sites",
  CERVIAI_EVIDENCE.find((e) => e.id === "ev-cerviai-eval")!.itemRefs.length === 3 &&
  CERVIAI_EVIDENCE.find((e) => e.id === "ev-cerviai-eval")!.provenance.population.sampleN === 1150);
ok("ethics approval covers the validation study only",
  /validation study only/i.test(CERVIAI_EVIDENCE.find((e) => e.id === "ev-cerviai-ethics")!.limitation ?? ""));

// The engine, not the fixture, decides the flag.
ok("computeGeneralisability is what sets the flag — not an authored field",
  computeGeneralisability(validation, CERVIAI_CONTEXT).limited === true);
ok("…and a matching document is not flagged",
  computeGeneralisability(CERVIAI_EVIDENCE.find((e) => e.id === "ev-cerviai-dpdp")!, CERVIAI_CONTEXT).limited === false);

// ═════════════════════════════════════════════════════════════════════════
section("4. S5 assessment run — CerviAI issues, RetinaScan is held");
// ═════════════════════════════════════════════════════════════════════════

const cervCard = buildCerviaiCardV1();
const cerv = runAssessment({ declaration: CERVIAI_DECLARATION, evidence: CERVIAI_EVIDENCE, conditions: cervCard.conditions });
eq("CerviAI maps 5 documents", cerv.documentsMapped, 5);
eq("CerviAI evidence coverage is high", cerv.evidenceCoverage, "high");
eq("CerviAI has no unsupported gates", cerv.unsupportedGates, []);
eq("CerviAI issues", cerv.outcome, "ISSUE");
eq("…with the demonstration wording", cerv.outcomeLine, "demonstration assessment issued");

const retinaCard = getCardV2("retinascan")!;
const retina = runAssessment({ declaration: RETINASCAN_DECLARATION, evidence: RETINASCAN_EVIDENCE, conditions: retinaCard.card.conditions });
eq("RetinaScan routes to human review", retina.outcome, "UNDER_ASSESSMENT");
ok("…named as a delay, not a denial", /delay, not a denial/.test(retina.outcomeLine));
ok("…and there is no rejected state anywhere in the run",
  !JSON.stringify(retina).toLowerCase().includes("reject"));
ok("RetinaScan names the gates with nothing to read", retina.unsupportedGates.length >= 3, retina.unsupportedGates.join(", "));

// The loophole the end-to-end run exposed.
const allYes = {
  submissionId: "sub-x",
  gateAnswers: Object.fromEntries(
    ["G1","G2","G3","G4","G17","G5","G6","G7","G8","G9","G10","G11","G12","G13","G14","G15","G16"].map((g) => [g, 2 as const])
  ),
  clarificationAnswers: [],
};
const bare = runAssessment({ declaration: allYes, evidence: [CERVIAI_EVIDENCE[0]], conditions: [] });
eq("all-yes plus one document does NOT issue a clean card", bare.outcome, "UNDER_ASSESSMENT");
ok("…because trial-blocking gates were declared with nothing bound", bare.unsupportedGates.length >= 5);

// ═════════════════════════════════════════════════════════════════════════
section("5. No numeric indicator can reach S5");
// ═════════════════════════════════════════════════════════════════════════

const runKeys = Object.keys(cerv);
ok("the run exposes no confidence value", !runKeys.some((k) => /confidence/i.test(k)));
ok("the run exposes no grounding value", !runKeys.some((k) => /ground/i.test(k)));
ok("the run exposes no ratio or percentage", !runKeys.some((k) => /ratio|percent|rate|score/i.test(k)));
ok("evidenceCoverage is a word, not a number", typeof cerv.evidenceCoverage === "string");
eq("the scope footer is verbatim", ASSESSMENT_SCOPE_FOOTER,
  "Illustrative demo assessment using 17 gates. The full funded assessment covers 112 items and at least two blind independent assessors scoring in parallel with an AI pass.");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(full) ? [full] : [];
  });
}
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const assessSrc = strip(readFileSync("app/submit/[id]/assess/page.tsx", "utf8"));
ok("the assess page renders no percentage", !/%/.test(assessSrc.replace(/className[^\n]*/g, "")));
ok("the assess page never says 'of 112 items evidenced'", !/of 112 items/.test(assessSrc));
ok("no invented confidence/grounding figure in the S5 page",
  !/confidence|groundedRate|meanConfidence/i.test(assessSrc));

// ═════════════════════════════════════════════════════════════════════════
section("6. S4 declaration screen");
// ═════════════════════════════════════════════════════════════════════════

const submitSrc = strip(readFileSync("app/submit/page.tsx", "utf8"));
ok("titled 'Innovator declaration'", submitSrc.includes("Innovator declaration"));
ok("sub-line present", submitSrc.includes("ClearPath assesses these independently against your evidence in the next step"));
/**
 * Scoped to the DECLARATION step's own JSX. The start screen legitimately
 * describes the card as carrying a verdict — that is a different screen, and a
 * whole-file scan would force the wizard's opening copy to stop naming the
 * thing the card actually produces.
 */
const declStart = submitSrc.indexOf("{step === 3 && (");
const declEnd = submitSrc.indexOf("{/* ── Step 2", declStart);
const declarationScreen = submitSrc.slice(declStart, declEnd > 0 ? declEnd : undefined);
ok("the declaration screen was located", declStart > 0 && declarationScreen.length > 500);
ok("the word 'verdict' does not appear on the declaration screen", !/verdict/i.test(declarationScreen));
ok("no per-dimension percentages remain", !/dimensionScores\.D[1-4]/.test(submitSrc));
ok("'declaration completeness' band present", /Declaration completeness/i.test(submitSrc));
ok("the band stays live (derived, not gated behind Generate)", submitSrc.includes("declarationsExceedingEvidence"));

/**
 * THE LOAD-BEARING STRING. verify:browser matches the literal "3/17 answered"
 * as a substring of the page's innerText. Rendering the count as "17 of 17
 * answered" would break it. Asserted here so a later edit to this band cannot
 * take the browser suite down without this failing first.
 */
ok("the answered count renders as N/17, preserving the asserted literal",
  submitSrc.includes("{answeredCount}/17 answered"));
/**
 * The BODH panel and its "Pre-fill clinical + fairness gates" button were
 * REMOVED from this screen. The 17 questions stay, and they are answered by
 * hand — a pre-fill from a third-party model score was answering the
 * innovator's declaration on the innovator's behalf.
 */
ok("the BODH panel and its pre-fill button are gone from the declaration",
  !submitSrc.includes("BODH validation score") && !submitSrc.includes("Pre-fill clinical + fairness gates"));

const gaps = declarationsExceedingEvidence(CERVIAI_DECLARATION, CERVIAI_EVIDENCE);
ok("the exceeds count is derived, not hardcoded", gaps.every((g) => g.declared > g.supported));
eq("supportedLevel(no documents) is 0", supportedLevel([]), 0);
eq("supportedLevel(only non-transferring evidence) is 0", supportedLevel([validation]), 0);

/**
 * FIVE, not the 2 an earlier draft stated. The spec was corrected to the
 * derived set once it was clear the two halves of the original could not both
 * hold: S3 binds the validation study to G1 AND G17, and that study's
 * non-transferability against a CHC / staff-nurse context is exactly what puts
 * G1 in the list — so any rule catching G1 through that document catches G17
 * through the same document.
 *
 *   G1, G17   NON_TRANSFERRING — every bound document was generated somewhere
 *             this deployment is not.
 *   G2, G3, G8  UNCORROBORATED — the clinical evaluation transfers, but it is
 *             vendor-generated and states no independent replication, against
 *             three gates declared system-owned.
 *
 * Asserted as a SET rather than a count, so a rule change that happened to keep
 * the total at five while catching different gates does not slip through.
 */
const gapGates = gaps.map((g) => g.gateId).sort();
eq("declarations exceeding the evidence", gapGates, ["G1", "G17", "G2", "G3", "G8"].sort());
eq("…which is five", gaps.length, 5);
ok(
  "G1 and G17 are caught by the same non-transferring study",
  gaps.filter((g) => ["G1", "G17"].includes(g.gateId)).every((g) => g.kind === "NON_TRANSFERRING")
);
ok(
  "G2, G3 and G8 are caught as uncorroborated, not non-transferring",
  gaps.filter((g) => ["G2", "G3", "G8"].includes(g.gateId)).every((g) => g.kind === "UNCORROBORATED")
);

// ═════════════════════════════════════════════════════════════════════════
section("7. Wizard structure");
// ═════════════════════════════════════════════════════════════════════════

ok("stepper shows all six stages",
  submitSrc.includes('"Context", "Checklist", "Evidence", "Declaration", "Assessment", "Card"'));
ok("the dead-end copy is gone", !readFileSync("app/submit/page.tsx", "utf8").includes("No sample documents for a custom tool"));
ok("a fresh submission registers a real v2 context", submitSrc.includes("registerSubmissionV2"));
ok("generate routes to the assessment step, not straight to the card", submitSrc.includes("/assess"));
ok("uploaded File objects are dropped before the submission is stored",
  /file: _file, objectUrl: _url/.test(submitSrc));

const evSrc = strip(readFileSync("components/submit/EvidenceManager.tsx", "utf8"));
ok("upload label states files are session-only",
  evSrc.includes("Uploaded files are held for this session only"));
ok("generalisability is computed at attach time", evSrc.includes("computeGeneralisability"));
ok("unbound evidence is surfaced as counting for nothing", evSrc.includes("counts for nothing"));
ok("object URLs are revoked on removal", evSrc.includes("revokeObjectURL"));

// ═════════════════════════════════════════════════════════════════════════
const verdict = fail > 0 ? "FAILED" : diverged > 0 ? "DIVERGED" : "PASSED";
console.log(`\nPHASE 3 ACCEPTANCE ${verdict} — ${pass} passed, ${fail} regressions, ${diverged} documented divergences`);
if (notes.length) { console.log("\n════════ STOP AND READ ════════\n"); for (const n of notes) console.log(n + "\n"); }
process.exit(fail === 0 && diverged === 0 ? 0 : 1);
