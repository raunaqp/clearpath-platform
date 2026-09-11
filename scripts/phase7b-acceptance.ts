/**
 * Phase 7b acceptance — the outcome.
 *
 * S24 hospital decision · S25 closeout · S26 registry write-back ·
 * S27 review triggers, plus the builder audit extended to all of them.
 */
import { readFileSync } from "node:fs";
import { buildCharter, currentVerdict } from "@/lib/mock/governance";
import { buildTrialView } from "@/lib/mock/api-trial";
import { evaluateDecisionRule } from "@/lib/engine/decision-rule";
import { evaluateInterim, parseFutilityRule } from "@/lib/engine/interim-review";
import {
  buildOutcomeView,
  currentOutcome,
  recordOutcome,
  resetOutcomes,
  assertOutcomeComplete,
} from "@/lib/mock/outcome";
import { buildWriteBack, writeBackEvents, resetWriteBack } from "@/lib/mock/registry-writeback";
import { buildReviewTriggers, applyTrigger, STEADY_STATE } from "@/lib/engine/review-triggers";
import { buildScorecard } from "@/lib/engine/deployment-report";
import { OutcomeDecisionSchema, CloseoutSchema, ReviewTriggerSchema, OutcomeDecisionEnum } from "@/lib/schemas/outcome";
import { CommitteeDecisionEnum as IntakeEnum } from "@/lib/schemas/governance";
import { CLOSEOUT_FIXTURES } from "@/lib/mock/fixtures/outcomes";
import { REGISTRY } from "@/lib/mock/fixtures/registry";
import type { Deployment } from "@/lib/schemas/deployment";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);
const threw = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e instanceof Error ? e.message : "threw"; } };

const charter = buildCharter("cerviai")!;
const trial = buildTrialView("cerviai")!;

// ═════════════════════════════════════════════════════════════════════════
section("1. S24 — an outcome is not a committee verdict");
// ═════════════════════════════════════════════════════════════════════════

/**
 * `CommitteeDecision` is the INTAKE taxonomy — should we let this in?
 * An outcome answers "it ran, now what?". Forcing one into the other's enum
 * would leave a record whose values do not describe the decision it holds.
 */
const outcomeValues = ["ADOPT", "EXTEND", "RETIRE"];
eq("the outcome taxonomy is its own", OutcomeDecisionEnum.options, outcomeValues);
ok("…and shares no value with the intake taxonomy",
  IntakeEnum.options.every((v) => !outcomeValues.includes(v)), IntakeEnum.options.join(", "));
ok("…while reusing the append-only guard rather than a second copy of it",
  readFileSync("lib/mock/outcome.ts", "utf8").includes('from "./append-only"'));
ok("…and the shared Attribution shape", readFileSync("lib/schemas/outcome.ts", "utf8").includes("AttributionSchema"));

const view = buildOutcomeView("cerviai")!;
ok("CerviAI's outcome validates", OutcomeDecisionSchema.safeParse(view.decision).success);
eq("…and it is EXTEND", view.decision.decision, "EXTEND");
eq("…signed, with quorum", [view.decision.chair.name, view.decision.quorum.present, view.decision.quorum.total],
  ["Dr. P. Raghunathan", 6, 7]);

/** THE RULE IS RUN, NOT READ. */
eq("the rule re-runs to the same clause the committee recorded", view.evaluation!.clause, view.decision.decision);
eq("…which is what agreesWithRule reports", view.agreesWithRule, true);
ok("…and the record carries its own copy of the clause applied",
  view.decision.ruleApplied.text === charter.decisionRule.extend);
ok("…so it stands without the charter still saying what it said",
  view.decision.ruleApplied.why.length > 40);

// ═════════════════════════════════════════════════════════════════════════
section("2. Each branch carries what that branch requires");
// ═════════════════════════════════════════════════════════════════════════

/** ALL THREE BRANCHES RENDER. A three-outcome rule showing one outcome has two
 *  decorative options. */
eq("EXTEND is seeded on CerviAI", currentOutcome("cerviai")?.decision, "EXTEND");
eq("ADOPT is seeded on ChestXR", currentOutcome("chestxr")?.decision, "ADOPT");
eq("RETIRE is seeded on SymptomBot", currentOutcome("symptombot")?.decision, "RETIRE");
ok("…and every one of them builds a view", ["cerviai", "chestxr", "symptombot"].every((s) => !!buildOutcomeView(s)));
/**
 * Only CerviAI can be re-checked against a live charter. The other two show
 * the clause their record carries and SAY it was not re-run, rather than
 * implying a check that did not happen.
 */
eq("CerviAI's rule is re-runnable", !!buildOutcomeView("cerviai")!.evaluation, true);
eq("…ChestXR's is not, and says so rather than implying it", buildOutcomeView("chestxr")!.agreesWithRule, null);

const ext = currentOutcome("cerviai")!;
ok("an EXTEND states a new question", (ext.extension?.newQuestion.length ?? 0) > 20);
ok("…and a new stop rule", (ext.extension?.newStopRule.length ?? 0) > 20);
ok("an EXTEND without a new question is refused",
  /states the new question/.test(threw(() => assertOutcomeComplete({ ...ext, extension: { ...ext.extension!, newQuestion: " " } }, charter.owner.name)) ?? ""));
ok("an EXTEND without a stop rule is refused",
  /states a new stop rule/.test(threw(() => assertOutcomeComplete({ ...ext, extension: { ...ext.extension!, newStopRule: "" } }, charter.owner.name)) ?? ""));

const ad = currentOutcome("chestxr")!;
ok("an ADOPT names a BAU owner", (ad.adoption?.bauOwner.name.length ?? 0) > 3);
ok("…DISTINCT from the trial owner, enforced",
  /distinct from the trial owner/.test(threw(() => assertOutcomeComplete({ ...ad, adoption: { ...ad.adoption!, bauOwner: { name: charter.owner.name, role: "x" } } }, charter.owner.name)) ?? ""));

const re = currentOutcome("symptombot")!;
ok("a RETIRE plans the data, the devices and the patients",
  !!re.retirement?.dataPlan && !!re.retirement?.devicePlan && !!re.retirement?.patientContinuityPlan);
ok("…and is refused without the patient plan",
  /where the data, the devices and the already-flagged patients go/.test(
    threw(() => assertOutcomeComplete({ ...re, retirement: { ...re.retirement!, patientContinuityPlan: "" } }, "x")) ?? ""));
ok("a branch carrying another branch's terms is refused",
  !!threw(() => assertOutcomeComplete({ ...ext, adoption: ad.adoption }, charter.owner.name)));

/** APPEND ONLY, on the same guard as the committee verdict. */
resetOutcomes();
ok("a second decision without `supersedes` is refused",
  /append-only/.test(threw(() => recordOutcome({ ...ext, supersedes: undefined } as never)) ?? ""));
resetOutcomes();

// ═════════════════════════════════════════════════════════════════════════
section("3. S25 — named people, never functions");
// ═════════════════════════════════════════════════════════════════════════

const closeout = CLOSEOUT_FIXTURES.cerviai;
ok("the closeout validates", CloseoutSchema.safeParse(closeout).success);
const owners = [closeout.runs, closeout.maintainsIntegration, closeout.referralBackstop, closeout.performanceMonitoring];
ok("every owner is a person with an employer",
  owners.every((o) => o.name.length > 2 && o.org.length > 2));
/**
 * The old buildOwnership named FUNCTIONS — "site referral coordinator closes
 * the loop" names nobody, so nobody does it. These are the people the brief
 * named.
 */
eq("S. Anitha runs it and is the referral backstop",
  [closeout.runs.name, closeout.referralBackstop.name], ["S. Anitha", "S. Anitha"]);
eq("M. Prakash owns the integration", closeout.maintainsIntegration.name, "M. Prakash");
eq("Dr. Meera Krishnan monitors performance, monthly",
  [closeout.performanceMonitoring.name, closeout.monitoringCadence], ["Dr. Meera Krishnan", "Monthly"]);
ok("the vacancy trigger is stated, not left to a policy document",
  /falls vacant/.test(closeout.ownerVacancyTrigger) && /7 days/.test(closeout.ownerVacancyTrigger));
ok("…and it is on the closeout screen",
  readFileSync("app/hospital/outcome/[id]/closeout/page.tsx", "utf8").includes("ownerVacancyTrigger"));

// ═════════════════════════════════════════════════════════════════════════
section("4. S26 — one record, updated; failures published");
// ═════════════════════════════════════════════════════════════════════════

resetWriteBack();
const before = REGISTRY.filter((r) => r.toolId === "tool-cerviai").length;
const wb = buildWriteBack("cerviai")!;
const after = REGISTRY.filter((r) => r.toolId === "tool-cerviai").length;
eq("the SAME canonical record is updated, never a second row", [before, after], [1, 1]);
eq("…and it is the Phase 4 entry, keyed by toolId", wb.entry.toolId, "tool-cerviai");

/** THREE FIELDS, separate — a tool can carry a good assessment and a poor
 *  field result, and that pairing is the most useful row on the page. */
eq("assessment verdict, field status and latest outcome are all present",
  [wb.entry.verdict, wb.entry.status, wb.entry.publishedResult?.recommendation],
  ["CONDITIONS", "piloting", "EXTEND"]);

ok("the missed endpoint is published, not only the met ones",
  wb.endpoints.some((e) => !e.met && /referral completion/i.test(e.name)));
eq("…with its real number", wb.endpoints.find((e) => !e.met)?.result, "68%");
ok("every endpoint appears, met and missed", wb.endpoints.length === trial.endpoints.length);
ok("limitations are published", wb.limitations.length >= 2);
ok("…naming the single district", /one district/i.test(wb.limitations[0]));
ok("…and the open India-population condition",
  wb.limitations.some((l) => /independent validation|India-population|CTRI/i.test(l)));

/** THE EVENT LOG, which did not exist — listedAt was a fixture date. */
const events = writeBackEvents("tool-cerviai");
ok("the write-back is logged", events.length === 1, String(events.length));
ok("…with what changed", events[0].changes.some((c) => c.field === "latest outcome" && c.to === "EXTEND"));
ok("…and who caused it", /Raghunathan/.test(events[0].source) && /outcome-cerviai-1/.test(events[0].source));
buildWriteBack("cerviai");
eq("…and re-publishing the same state logs nothing new", writeBackEvents("tool-cerviai").length, 1);

// ═════════════════════════════════════════════════════════════════════════
section("5. S27 — a trigger changes state, it does not post a notice");
// ═════════════════════════════════════════════════════════════════════════

const triggers = buildReviewTriggers("cerviai")!;
eq("six triggers", triggers.length, 6);
ok("every trigger validates", triggers.every((t) => ReviewTriggerSchema.safeParse(t).success));
eq("…covering all six kinds", triggers.map((t) => t.kind).sort(), [
  "CARD_EXPIRY", "MATERIAL_SAFETY_EVENT", "MODEL_VERSION_CHANGE",
  "OWNER_VACANT", "SCHEDULED_REVIEW", "USAGE_BELOW_FLOOR",
]);
ok("every trigger declares at least one effect", triggers.every((t) => t.effects.length > 0));

const fire = (kind: string) => applyTrigger(triggers.find((t) => t.kind === kind)!);
eq("a model version change suspends the card AND pauses the run",
  [fire("MODEL_VERSION_CHANGE").cardStatus, fire("MODEL_VERSION_CHANGE").runStatus], ["suspended", "paused"]);
eq("card expiry expires the listing", fire("CARD_EXPIRY").listingStatus, "expired");
eq("a material safety event stops immediately, committee within a window",
  [fire("MATERIAL_SAFETY_EVENT").runStatus, fire("MATERIAL_SAFETY_EVENT").reviewStatus], ["stopped", "within 7 days"]);
eq("owner vacant flags the tool and pauses the run",
  [fire("OWNER_VACANT").reviewStatus, fire("OWNER_VACANT").runStatus], ["brought forward", "paused"]);
eq("usage below the floor brings the review forward", fire("USAGE_BELOW_FLOOR").reviewStatus, "brought forward");
/** Not every trigger bites. A scheduled review that suspended something on
 *  arming would be a stop rule wearing a calendar. */
eq("a scheduled review changes nothing before its date", fire("SCHEDULED_REVIEW"), STEADY_STATE);
ok("…and five of the six do change something",
  triggers.filter((t) => JSON.stringify(applyTrigger(t)) !== JSON.stringify(STEADY_STATE)).length === 5);
ok("the owner-vacant trigger quotes the closeout, not a second copy of it",
  triggers.find((t) => t.kind === "OWNER_VACANT")!.consequence === closeout.ownerVacancyTrigger);
ok("the model trigger reads the charter's freeze commitment",
  /frozen/i.test(triggers.find((t) => t.kind === "MODEL_VERSION_CHANGE")!.watching) === charter.commitments.modelVersionFrozen);

// ═════════════════════════════════════════════════════════════════════════
section("6. THE BUILDER AUDIT, extended to everything new");
// ═════════════════════════════════════════════════════════════════════════

/**
 * Four times a screen has stated something it had no basis for: a request that
 * landed in an inbox it never reached, a fourteen-gate audit for a submission
 * that did not exist, a clinical score of 71 from a null, and three factual
 * claims about a hospital derived from having no record of it.
 *
 * Every builder added in this phase is called with a slug that does not exist,
 * and with inputs one step short of complete.
 */
for (const [name, run] of [
  ["buildOutcomeView", () => buildOutcomeView("does-not-exist")],
  ["currentOutcome", () => currentOutcome("does-not-exist")],
  ["buildWriteBack", () => buildWriteBack("does-not-exist")],
  ["buildReviewTriggers", () => buildReviewTriggers("does-not-exist")],
  ["buildTrialView", () => buildTrialView("does-not-exist")],
  ["buildCharter", () => buildCharter("does-not-exist")],
  ["buildScorecard(no card)", () => buildScorecard({ alerts: [] } as unknown as Deployment, null)],
] as const) {
  const got = run();
  ok(`${name} returns nothing for a slug that does not exist`, got === null || got === undefined,
    got === null || got === undefined ? "" : `got ${JSON.stringify(got).slice(0, 80)}`);
}

/** PARTIAL inputs, one step short of complete. */
ok("a decision without a trial behind it yields no write-back", buildWriteBack("retinascan") === undefined);
ok("a trial with no decision yields no outcome view", buildOutcomeView("retinascan") === undefined);
ok("…and no closeout either", buildOutcomeView("retinascan")?.closeout === undefined);
eq("a rule with no endpoint results evaluates to nothing", evaluateDecisionRule(charter, []), null);
eq("…and one naming an endpoint the results lack, likewise",
  evaluateDecisionRule({ ...charter, decisionRule: { ...charter.decisionRule, gatingEndpoint: "Never measured" } }, trial.endpoints), null);
eq("an unparseable futility sentence yields no interim", parseFutilityRule("We will watch it."), null);
eq("…and evaluateInterim refuses to report one",
  evaluateInterim({
    charter: { ...charter, stops: { ...charter.stops, futility: "We will watch it." } },
    verdict: currentVerdict("cerviai")!,
    measured: 0.9, measuredDisplay: "0.9", reviewedAt: "", reviewer: "x",
  }), null);
ok("…as does a charter with no review point authorised to stop",
  evaluateInterim({
    charter: { ...charter, reviewPoints: [{ day: 45, name: "Interim", authorityToStop: false }] },
    verdict: currentVerdict("cerviai")!,
    measured: 0.9, measuredDisplay: "0.9", reviewedAt: "", reviewer: "x",
  }) === null);

console.log(`\nPHASE 7b ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
