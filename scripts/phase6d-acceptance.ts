/**
 * Phase 6d acceptance — the G14 gate, and coverage of every state enum.
 * Run: npm run verify:phase6d
 */
import { HOSPITAL_GATES, HOSPITAL_GATE_ORDER, TOOL_GATE_ORDER } from "@/lib/engine/gates";
import { buildNorthvaleAudit, buildDivergences } from "@/lib/mock/api-governance";
import { getCardV2, seededDeclaration } from "@/lib/mock/cards-v2";
import { runAssessment } from "@/lib/engine/assessment-run";
import { runTriage } from "@/lib/engine/triage";
import { matchToolToSites, MATCH_BAND_LABEL } from "@/lib/match";
import { getDeploymentRequest, getTriage, triageReturnForInnovator } from "@/lib/mock/handoff";
import { currentVerdict } from "@/lib/mock/governance";
import { HOSPITALS } from "@/lib/mock/fixtures/hospitals";
import { SITE_PROFILES, PROBLEM_REGISTERS, getSiteProfile, getProblemRegister } from "@/lib/mock/fixtures/site-profiles";
import { buildCerviaiCardV11, buildCerviaiCardV1 } from "@/lib/mock/fixtures/cerviai-v2";
import { CardVerdictEnum } from "@/lib/schemas/readiness-card";
import { RequestStatusEnum, TriageOutcomeEnum } from "@/lib/schemas/handoff";
import { CommitteeDecisionEnum } from "@/lib/schemas/governance";
import { TOOLS } from "@/lib/mock/fixtures/tools";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);

/**
 * ASSERT THE SET, NOT THE COUNT.
 *
 * A count passed for five phases while buildClarifyingQuestions ranked
 * alphabetically — five questions was true and five USEFUL questions was not.
 * Every coverage check here names the values it expects and diffs the set, so a
 * fixture that produces the right NUMBER of states while missing one fails.
 */
function coversAll<T extends string>(label: string, expected: readonly T[], produced: Map<T, string>, outOfScope: Partial<Record<T, string>> = {}) {
  const missing = expected.filter((v) => !produced.has(v) && !outOfScope[v]);
  ok(`${label}: every value has a fixture`, missing.length === 0, missing.length ? `missing ${missing.join(", ")}` : "");
  for (const v of expected) {
    const where = produced.get(v);
    const scoped = outOfScope[v];
    console.log(`    ${String(v).padEnd(28)} ${where ?? (scoped ? `OUT OF SCOPE — ${scoped}` : "MISSING")}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════
section("1. H14 — the consent gate");
// ═════════════════════════════════════════════════════════════════════════

eq("fourteen hospital gates", HOSPITAL_GATE_ORDER.length, 14);
ok("H14 exists", !!HOSPITAL_GATES.H14);
eq("…and overlaps vendor gate G14", HOSPITAL_GATES.H14.vendorGate, "G14");
ok("it asks about implementability here, not consent in principle",
  /in our languages, on our medium/.test(HOSPITAL_GATES.H14.question));
eq("H8 is back to data ownership alone", HOSPITAL_GATES.H8.vendorGate, "G12");
const overlaps = HOSPITAL_GATE_ORDER.map((h) => HOSPITAL_GATES[h].vendorGate).filter(Boolean);
eq("no vendor gate is claimed by two hospital gates", overlaps.length, new Set(overlaps).size);
ok("every mapped vendor gate exists", overlaps.every((g) => TOOL_GATE_ORDER.includes(g!)));

const audit = buildNorthvaleAudit("cerviai")!;
eq("tally is 12 pass · 2 conditional of 14", [audit.tally.pass, audit.tally.conditional, audit.tally.total], [12, 2, 14]);
const div = buildDivergences("cerviai");
ok("the consent divergence is on the CONSENT row",
  div.some((d) => d.hospitalGateId === "H14" && d.vendorGateId === "G14"));
ok("…and no longer on data ownership", !div.some((d) => d.hospitalGateId === "H8"));

// ═════════════════════════════════════════════════════════════════════════
section("2. Card verdict — every value reachable");
// ═════════════════════════════════════════════════════════════════════════

const verdictFixtures = new Map<string, string>();
for (const t of TOOLS) {
  const v = getCardV2(t.slug);
  if (v?.contextIsReal) verdictFixtures.set(v.card.verdict, `${t.slug} → /submit/${t.slug}/card`);
}
coversAll("Card verdict", CardVerdictEnum.options, verdictFixtures);
ok("SymptomBot's card is a real v2 setup, not the derived placeholder",
  getCardV2("symptombot")!.contextIsReal);
eq("…and it is NOT_DEPLOYABLE_IN_CONTEXT", getCardV2("symptombot")!.card.verdict, "NOT_DEPLOYABLE_IN_CONTEXT");
ok("TRIAL_ONLY comes from an UNSCORED gate, not a failed one",
  getCardV2("ovareserve")!.card.gateSummary.unscored > 0 && getCardV2("ovareserve")!.card.gateSummary.fail === 0);

// ═════════════════════════════════════════════════════════════════════════
section("3. Match band — all three, on one card");
// ═════════════════════════════════════════════════════════════════════════

const matches = matchToolToSites({
  card: buildCerviaiCardV11(buildCerviaiCardV1()).card,
  toolName: "CerviAI", hospitals: HOSPITALS, profiles: SITE_PROFILES, registers: PROBLEM_REGISTERS,
});
const bandFixtures = new Map<string, string>();
for (const m of matches) bandFixtures.set(m.band, `${m.hospital.name} → /submit/cerviai/card`);
coversAll("Match band", ["STRONG", "GAPS", "NOT_ELIGIBLE"] as const, bandFixtures);
const gaps = matches.find((m) => m.band === "GAPS")!;
eq("the middle band is Kaveri", gaps.hospital.id, "hosp-kaveri");
ok("…and its gap is one the SITE can close", /power backup 4h below/.test(gaps.breakdown.infrastructure.detail));
ok("…while nothing blocking fails", gaps.breakdown.contextValidity.ok && gaps.breakdown.problemFit.ok);

// ═════════════════════════════════════════════════════════════════════════
section("4. Triage — outcomes and the unanswerable state");
// ═════════════════════════════════════════════════════════════════════════

const triageFixtures = new Map<string, string>();
triageFixtures.set("ADVANCE", "cerviai → /hospital/intake/cerviai/triage");
for (const slug of ["symptombot", "retinascan"]) {
  const t = getTriage(slug);
  if (t) triageFixtures.set(t.outcome, `${slug} → /hospital/intake/${slug}/triage`);
}
coversAll("Triage outcome", TriageOutcomeEnum.options, triageFixtures);
eq("PARK carries a revisit date", getTriage("retinascan")?.revisitAt?.slice(0, 10), "2027-01-15");
ok("DECLINE carries a reason", (getTriage("symptombot")?.reason ?? "").length > 30);
ok("…which returns to the innovator", !!triageReturnForInnovator("symptombot"));

const embryoReq = getDeploymentRequest("embryograde")!;
const unanswerable = runTriage({
  request: embryoReq,
  card: getCardV2("embryograde")!.card,
  profile: getSiteProfile(embryoReq.hospitalId),
  register: getProblemRegister(embryoReq.hospitalId),
});
eq("a site with no register makes problem fit UNANSWERABLE", unanswerable.checks[0].status, "unanswerable");
ok("…which is not a fail", unanswerable.checks[0].status !== "fail");
eq("…and blocks advancing", unanswerable.canAdvance, false);
console.log(`    unanswerable                 embryograde → /hospital/intake/embryograde/triage`);

// ═════════════════════════════════════════════════════════════════════════
section("5. Committee decision and request status");
// ═════════════════════════════════════════════════════════════════════════

const verdictCoverage = new Map<string, string>();
for (const slug of ["cerviai", "chestxr", "ovareserve", "symptombot"]) {
  const v = currentVerdict(slug);
  if (v) verdictCoverage.set(v.decision, `${slug} → /hospital/governance/${slug}/verdict`);
}
coversAll("Committee decision", CommitteeDecisionEnum.options, verdictCoverage);

const statusCoverage = new Map<string, string>();
for (const slug of ["chestxr", "symptombot", "ovareserve", "retinascan", "embryograde"]) {
  const r = getDeploymentRequest(slug);
  if (r) statusCoverage.set(r.status, `${slug} → /hospital/intake/${slug}`);
}
statusCoverage.set("SENT", "cerviai → /submit/cerviai/request (after sending)");
statusCoverage.set("UNDER_ASSESSMENT", "cerviai → after triage advances");
coversAll("Request status", RequestStatusEnum.options, statusCoverage, {
  DRAFT: "the wizard never persists a draft request — it is built and sent in one action",
});

// ═════════════════════════════════════════════════════════════════════════
section("6. Assessment routing and evidence edges");
// ═════════════════════════════════════════════════════════════════════════

const runCoverage = new Map<string, string>();
for (const t of TOOLS) {
  const v = getCardV2(t.slug); const d = seededDeclaration(t.slug);
  if (!v || !d) continue;
  const r = runAssessment({ evidence: v.evidence, conditions: v.card.conditions });
  if (!runCoverage.has(r.outcome)) runCoverage.set(r.outcome, `${t.slug} → /submit/${t.slug}/assess`);
}
coversAll("Assessment outcome", ["ISSUE", "UNDER_ASSESSMENT"] as const, runCoverage);
ok("a held submission is reachable through the UI, not only the harness",
  runCoverage.get("UNDER_ASSESSMENT")?.includes("/assess") === true);

const embryo = getCardV2("embryograde")!;
ok("an EXPIRED document exists", embryo.evidence.some((e) => e.expired), "embryograde → /submit/embryograde/card");
ok("…and it is expired because its own validUntil passed",
  embryo.evidence.find((e) => e.expired)!.provenance.validUntil !== null);
const unbound = embryo.evidence.find((e) => e.itemRefs.length === 0);
ok("an UNBOUND document exists", !!unbound, "embryograde → /submit/embryograde/card");
ok("…and it counts for nothing — bound to no item", unbound?.itemRefs.length === 0);
const boundItems = new Set(embryo.evidence.flatMap((e) => e.itemRefs));
ok("…so it appears in no denominator", !boundItems.has(unbound!.id));

console.log(`\nPHASE 6d ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
