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
eq("…as a trial, day 34 of 90", [cerv.kind, cerv.dayOf, cerv.totalDays], ["trial", 34, 90]);
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
eq("412 of 1,000 on day 34", [trial.telemetry.enrolment.screened, trial.telemetry.enrolment.target, trial.telemetry.enrolment.dayOf], [412, 1000, 34]);
eq("4/4 devices online, one replaced day 19", [trial.telemetry.devices.online, trial.telemetry.devices.replacements[0].day], [4, 19]);
eq("consumables 68%", trial.telemetry.devices.consumablesPct, 68);
eq("11 refused reads, no downtime", [trial.telemetry.failures.refusedReads, trial.telemetry.failures.downtimeDays], [11, 0]);
eq("protocol adherence 92% against a 90% target", [trial.telemetry.protocolAdherence.pct, trial.telemetry.protocolAdherence.targetPct], [92, 90]);

/** OVERRIDE RATE IS DERIVED, not stored. */
eq("override rate is 7.2%", overrideRatePct(trial.telemetry.overrides), 7.2);
ok("…computed from the two counts, which are the record",
  Math.round((trial.telemetry.overrides.flagsOverridden / trial.telemetry.overrides.flagsRaised) * 1000) / 10 === 7.2);
ok("…and no rate is stored on the fixture", !("ratePct" in (CERVIAI_TELEMETRY.overrides as object)));
ok("the fixture never types the string 7.2", !readFileSync("lib/mock/fixtures/telemetry.ts", "utf8").includes("ratePct: 7.2"));

/** SUPPORT TAPER READ BY IDENTITY, charter ← request. */
eq("the charter's taper IS the request's", charter.commitments.supportTaper, request.supportTaper);
eq("day 34 is week 5", weekOfDay(34), 5);
eq("…where support is weekly", trial.support.level, "Weekly");
eq("…and the next taper is week 7", trial.support.nextTaperWeek, 7);
ok("the level is computed from the taper, not typed",
  supportAtWeek(charter.commitments.supportTaper, 5).level === trial.support.level);

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
eq("eight weeks of adoption", trial.adoption.length, 8);
ok("every week carries the support level in force",
  trial.adoption.every((a) => a.supportLevel.length > 0));
eq("week 1 was on-site", trial.adoption[0].supportLevel, "On-site");
eq("week 8 was on-call", trial.adoption[7].supportLevel, "On-call");
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
ok("adoption is reported over SUSTAINED weeks, not the ramp",
  /96–104/.test(trial.actuals.find((a) => /Adoption/.test(a.label))!.actual));

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

console.log(`\nPHASE 7a ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
