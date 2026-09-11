/**
 * Phase 7a acceptance — the trial as an operation.
 * Run: npm run verify:phase7a
 */
import { readFileSync } from "node:fs";
import { buildTrialView } from "@/lib/mock/api-trial";
import { buildCharter, NORTHVALE_PLACEMENT } from "@/lib/mock/governance";
import { getDeploymentRequest } from "@/lib/mock/handoff";
import { overrideRatePct, TrialTelemetrySchema, AlertRecordSchema } from "@/lib/schemas/telemetry";
import { supportAtWeek, weekOfDay } from "@/lib/engine/trial-report";
import { CERVIAI_TELEMETRY } from "@/lib/mock/fixtures/telemetry";
import { DEPLOYMENTS } from "@/lib/mock/fixtures/deployments";
import { HOSPITAL_PERSONAS, PERSONA_GROUPS } from "@/lib/hospital/personas";
import { parseFutilityRule } from "@/lib/engine/interim-review";
import { evaluateDecisionRule } from "@/lib/engine/decision-rule";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);

const trial = buildTrialView("cerviai")!;
const charter = buildCharter("cerviai")!;
const request = getDeploymentRequest("cerviai")!;

// ═════════════════════════════════════════════════════════════════════════
section("1. The tool does not change halfway");
// ═════════════════════════════════════════════════════════════════════════

const cerv = DEPLOYMENTS.find((d) => d.id === "deploy-cerviai")!;
eq("CerviAI runs at Northvale", cerv.hospitalId, "hosp-northvale");
/**
 * DAY 90, WAS DAY 34. The workspace read day 34 while S23 showed final
 * endpoint results — completed analysis a third of the way through a trial,
 * which is not possible. Seeded data reporting a state nobody arrived at is
 * the same defect as a request that "landed in an inbox" it never reached.
 */
eq("…as a trial, run to completion at day 90 of 90", [cerv.kind, cerv.dayOf, cerv.totalDays], ["trial", 90, 90]);
const main = PERSONA_GROUPS.find((g) => /Main demonstration/.test(g.label))!;
ok("the main demonstration group holds Northvale", main.personas.some((p) => p.id === "hosp-northvale"));
ok("…and OvaReserve's site is NOT in it", !main.personas.some((p) => p.id === "hosp-lakeview"));
ok("Lakeview is labelled as a separate example",
  /Separate example/.test(HOSPITAL_PERSONAS.find((p) => p.id === "hosp-lakeview")!.role));
ok("every persona declares a scenario", HOSPITAL_PERSONAS.every((p) => p.scenario === "main" || p.scenario === "other"));

// ═════════════════════════════════════════════════════════════════════════
section("2. S21 — telemetry, and what is derived rather than typed");
// ═════════════════════════════════════════════════════════════════════════

ok("telemetry validates", TrialTelemetrySchema.safeParse(trial.telemetry).success);
eq("1,000 of 1,000 on day 90", [trial.telemetry.enrolment.screened, trial.telemetry.enrolment.target, trial.telemetry.enrolment.dayOf], [1000, 1000, 90]);
ok("…and the deployment record agrees with the telemetry",
  cerv.metrics.find((m) => m.key === "enrolment")!.value === "1,000 / 1,000");
// 68% on both. These were 63% on the deployment and 68% on the endpoint —
// two numbers for one measurement, on two screens of the same trial.
eq("follow-up reads the same on both", [
  cerv.metrics.find((m) => m.key === "followup")!.value,
  trial.endpoints.find((e) => /referral completion/i.test(e.name))!.result,
], ["68%", "68%"]);
eq("4/4 devices online, one replaced day 19", [trial.telemetry.devices.online, trial.telemetry.devices.replacements[0].day], [4, 19]);
eq("consumables down to 22% at the end of a completed run", trial.telemetry.devices.consumablesPct, 22);
eq("28 refused reads across the full run, no downtime", [trial.telemetry.failures.refusedReads, trial.telemetry.failures.downtimeDays], [28, 0]);
eq("protocol adherence 92% against a 90% target", [trial.telemetry.protocolAdherence.pct, trial.telemetry.protocolAdherence.targetPct], [92, 90]);

/** OVERRIDE RATE IS DERIVED, not stored. */
eq("override rate is 7.2%", overrideRatePct(trial.telemetry.overrides), 7.2);
ok("…computed from the two counts, which are the record",
  Math.round((trial.telemetry.overrides.flagsOverridden / trial.telemetry.overrides.flagsRaised) * 1000) / 10 === 7.2);
ok("…and no rate is stored on the fixture", !("ratePct" in (CERVIAI_TELEMETRY.overrides as object)));
ok("the fixture never types the string 7.2", !readFileSync("lib/mock/fixtures/telemetry.ts", "utf8").includes("ratePct: 7.2"));

/** SUPPORT TAPER READ BY IDENTITY, charter ← request. */
eq("the charter's taper IS the request's", charter.commitments.supportTaper, request.supportTaper);
eq("day 90 is week 13", weekOfDay(90), 13);
eq("…where support has tapered to on-call", trial.support.level, "On-call");
eq("…and there is no further step down", trial.support.nextTaperWeek, null);
ok("the level is computed from the taper, not typed",
  supportAtWeek(charter.commitments.supportTaper, 13).level === trial.support.level);

/** EXPORT FORMATS READ FROM THE REQUEST. */
eq("export formats come from the request", trial.exportFormats, request.dataExport.formats);
eq("…which are CSV and FHIR", trial.exportFormats, ["CSV", "FHIR bundle"]);
eq("…tested on day 30", trial.telemetry.exportTest.testedOnDay, 30);
eq("…with a zero-day notice period promised", request.dataExport.noticePeriodDays, 0);
ok("the fixture leaves formats empty so they cannot drift from the request",
  CERVIAI_TELEMETRY.exportTest.formats.length === 0);

// ═════════════════════════════════════════════════════════════════════════
section("3. S22 — provenance and alert history");
// ═════════════════════════════════════════════════════════════════════════

eq("reviewer named", trial.telemetry.provenance.reviewer, "Dr. Meera Krishnan");
eq("source named", trial.telemetry.provenance.source, "Site capture log, 4 CHCs");
eq("cadence named", trial.telemetry.provenance.cadence, "Weekly");
ok("every alert validates", trial.alerts.every((a) => AlertRecordSchema.safeParse(a).success));
ok("BOTH states are present — an open alert alone shows only that something is wrong",
  trial.alerts.some((a) => a.status === "open") && trial.alerts.some((a) => a.status === "resolved"));
const resolved = trial.alerts.find((a) => a.status === "resolved")!;
ok("the resolved one carries what was done", resolved.action.length > 10);
ok("…and when", !!resolved.resolvedAt);
ok("the open one carries an action too", trial.alerts.find((a) => a.status === "open")!.action.length > 10);

/** ADOPTION AGAINST THE TAPER — a measurement, not an assertion. */
eq("thirteen weeks of adoption — the whole run", trial.adoption.length, 13);
eq("…summing to the enrolment the telemetry reports",
  trial.adoption.reduce((n, a) => n + a.screens, 0), trial.telemetry.enrolment.screened);
ok("every week carries the support level in force",
  trial.adoption.every((a) => a.supportLevel.length > 0));
eq("week 1 was on-site", trial.adoption[0].supportLevel, "On-site");
eq("week 13 was on-call", trial.adoption[12].supportLevel, "On-call");
ok("…and the levels come from the charter's taper",
  new Set(trial.adoption.map((a) => a.supportLevel)).size === charter.commitments.supportTaper.length);

// ═════════════════════════════════════════════════════════════════════════
section("4. S23 — one endpoint misses, and nothing is dropped");
// ═════════════════════════════════════════════════════════════════════════

eq("four endpoints", trial.endpoints.length, 4);
ok("targets come from the charter, never retyped",
  trial.endpoints.every((e) => charter.endpoints.some((c) => c.name === e.name && c.threshold === e.target)));
eq("sensitivity 0.89 against ≥ 0.85 — met", [trial.endpoints[0].result, trial.endpoints[0].met], ["0.89", true]);
eq("specificity 0.83 against ≥ 0.80 — met", [trial.endpoints[1].result, trial.endpoints[1].met], ["0.83", true]);
const referral = trial.endpoints.find((e) => /referral completion/i.test(e.name))!;
eq("referral completion 68% against ≥ 80% — MISSED", [referral.result, referral.met], ["68%", false]);
eq("time to referral 12 days against ≤ 14 — met", [trial.endpoints[3].result, trial.endpoints[3].met], ["12 days", true]);
ok("the missed endpoint is still in the list", trial.endpoints.some((e) => !e.met));
ok("…and it is the one the site itself wrote a number for",
  /stated in the success definition/.test(referral.derivedFrom));

/** ACTUALS READ THE ESTIMATES THEY ARE MEASURED AGAINST. */
const load = trial.actuals.find((a) => /Nurse load/.test(a.label))!;
ok("the load estimate comes from the placement record",
  load.estimate.includes(`+${NORTHVALE_PLACEMENT.loadDeltaMinutesPerPatient} min`));
eq("…and the measured value exceeds it", load.withinPlan, false);
ok("…which is flagged as the number that ends deployments quietly",
  /silently ends a deployment/.test(load.note ?? ""));
const cost = trial.actuals.find((a) => a.label === "Cost")!;
ok("the budget comes from the charter", cost.estimate.includes(charter.budget.display));
ok("…and the spend is within it", cost.withinPlan);
/**
 * FIRST, PEAK, LAST — three facts, and no invented boundary between them.
 * A bare min–max over a completed run reads "24–104 screens per week", which
 * describes neither the plateau nor the decline. The window still starts at
 * the charter's first taper step, so the ramp is still excluded; what is new
 * is that the tail is named rather than averaged away.
 */
const adoptionActual = trial.actuals.find((a) => /Adoption/.test(a.label))!.actual;
ok("adoption reports the shape of the whole run, ramp excluded",
  /96 in week 3/.test(adoptionActual) && /peaking at 104/.test(adoptionActual) && /24 by week 13/.test(adoptionActual),
  adoptionActual);
ok("…and says why it fell, so a decline is not read as abandonment",
  /screened out/.test(adoptionActual));

/** CONDITIONS SUPPLIED vs PROMISED. */
eq("three conditions tracked", trial.conditionsSupplied.length, 3);
ok("one was not fully supplied — 10 of 12 nurses",
  trial.conditionsSupplied.some((c) => !c.met && /10 of 12/.test(c.supplied)));
ok("each names who owed it", trial.conditionsSupplied.every((c) => c.owner.length > 0));

/** THE DECISION IS NOT TAKEN HERE. */
ok("the recommendation is analytical", /Evidence supports scale on clinical performance/.test(trial.recommendation));
ok("…and names the pathway, not the tool", /the gap is in the pathway, not the tool/.test(trial.recommendation));
const proveSrc = readFileSync("components/workspace/TrialPanels.tsx", "utf8");
ok("the hospital decision renders as Pending", /Pending/.test(proveSrc));
ok("…offering adopt, extend, retire without applying any", /Adopt · Extend · Retire/.test(proveSrc));
ok("…and says the rule is applied by the committee, not here",
  /applied to this data by the committee/.test(proveSrc));

// ═════════════════════════════════════════════════════════════════════════
section("6. The day-45 interim — that it ran, and did not fire");
// ═════════════════════════════════════════════════════════════════════════

/**
 * An unfired stop rule is evidence the rule existed. A trial that reports only
 * its endpoints says what happened; it does not say whether anyone was
 * watching while it happened.
 */
const interim = trial.interim!;
ok("the interim is present", !!interim);
eq("…on the day the charter names", interim.day, 45);
eq("…with authority to stop", interim.authorityToStop, true);

/** The threshold is READ from the charter, never retyped beside it. */
eq("the rule text is the charter's, verbatim", interim.ruleText, charter.stops.futility);
eq("…parsed to a comparator and a bound", [interim.rule.measure, interim.rule.direction, interim.rule.threshold], ["Sensitivity", "below", 0.75]);
// Comments explain WHY the threshold is not duplicated, so strip them first.
const telemetrySrc = readFileSync("lib/mock/fixtures/telemetry.ts", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
ok("…and the fixture carries only the measurement, never the bound",
  !telemetrySrc.includes("0.75"));

eq("sensitivity was above the bound", interim.measured > interim.rule.threshold, true);
eq("…so the stop rule did NOT fire", interim.fired, false);
ok("…and the outcome says so in words", /did not fire/.test(interim.outcome));

/**
 * WHY DAY 45. A review point that appeared from nowhere is one nobody owns.
 * The link is DERIVED from the verdict's accepted dissent, not written into
 * the interim — change the dissent and the trace changes with it.
 */
eq("the interim traces to the S18 dissent", interim.tracesTo?.member, "Dr. S. Bhaskar");
ok("…quoting the position that created it", /day-45 interim rather than day-60/.test(interim.tracesTo!.position));
ok("…and that it was accepted into the charter", /Accepted into the charter/.test(interim.tracesTo!.resolution));
ok("the trace is derived from the verdict, not typed into the fixture",
  !readFileSync("lib/mock/fixtures/telemetry.ts", "utf8").includes("Bhaskar"));

/** A rule this cannot read is a rule nobody should claim to have evaluated. */
eq("an unparseable futility sentence yields no interim", parseFutilityRule("We will keep an eye on it."), null);

// ═════════════════════════════════════════════════════════════════════════
section("7. The decision rule RUNS, it is not narrated");
// ═════════════════════════════════════════════════════════════════════════

const evaluation = evaluateDecisionRule(charter, trial.endpoints)!;
eq("EXTEND is the clause that matched", evaluation.clause, "EXTEND");
eq("…and the text shown is the charter's own", evaluation.text, charter.decisionRule.extend);
/** Every comparison that ran, so the committee checks arithmetic not readings. */
eq("three comparisons ran — two primaries and the gating endpoint", evaluation.checks.length, 3);
ok("…both primaries passed", evaluation.checks.filter((c) => /primary/.test(c.label)).every((c) => c.passed));
ok("…and the gating endpoint did not", !evaluation.checks.find((c) => /gating/.test(c.label))!.passed);
ok("the why names the endpoint and both numbers",
  /Colposcopy referral completion/.test(evaluation.why) && /68%/.test(evaluation.why) && /80%/.test(evaluation.why));

/** The rule is a predicate: change the data and the clause changes. */
const allMet = trial.endpoints.map((e) => ({ ...e, met: true }));
eq("all met → ADOPT", evaluateDecisionRule(charter, allMet)!.clause, "ADOPT");
const primaryMissed = trial.endpoints.map((e) => (e.kind === "primary" ? { ...e, met: false } : e));
eq("a primary missed → RETIRE", evaluateDecisionRule(charter, primaryMissed)!.clause, "RETIRE");
ok("…and RETIRE is reached whatever the gating endpoint did",
  evaluateDecisionRule(charter, primaryMissed.map((e) => (e.kind === "secondary" ? { ...e, met: true } : e)))!.clause === "RETIRE");
eq("no results → no evaluation, rather than a default clause", evaluateDecisionRule(charter, []), null);
ok("…and a charter naming an endpoint the results lack evaluates to nothing",
  evaluateDecisionRule({ ...charter, decisionRule: { ...charter.decisionRule, gatingEndpoint: "Nothing measured this" } }, trial.endpoints) === null);

console.log(`\nPHASE 7a ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);