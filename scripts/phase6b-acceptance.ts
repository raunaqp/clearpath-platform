/**
 * Phase 6b acceptance — hospital governance.
 * Run: npm run verify:phase6b
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildNorthvaleAudit, buildDivergences } from "@/lib/mock/api-governance";
import {
  NORTHVALE_ASSIGNMENTS,
  NORTHVALE_PLACEMENT,
  SEEDED_VERDICT,
  buildCharter,
  currentVerdict,
  getVerdicts,
  recordVerdict,
  resetGovernance,
} from "@/lib/mock/governance";
import { deriveEndpoints, endpointsPredateTool } from "@/lib/engine/charter";
import { DIVERGENCE_FRAMING } from "@/lib/engine/divergence";
import { HOSPITAL_GATES, HOSPITAL_GATE_ORDER } from "@/lib/engine/gates";
import { getProblemRegister } from "@/lib/mock/fixtures/site-profiles";
import { AuditResultSchema } from "@/lib/schemas/audit";
import { CommitteeVerdictSchema, PlacementRecordSchema, TrialCharterSchema } from "@/lib/schemas/governance";
import { expressInterest, createDeploymentRequest, resetHandoff, getDeploymentRequest } from "@/lib/mock/handoff";
import { getCardV2, remediate, resetRemediations } from "@/lib/mock/cards-v2";
import type { CreateRequestInput } from "@/lib/mock/handoff";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);
const threw = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e instanceof Error ? e.message : "threw"; } };

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(full) ? [full] : [];
  });
}
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ═════════════════════════════════════════════════════════════════════════
section("0. Carry-overs");
// ═════════════════════════════════════════════════════════════════════════

ok("useHydrated exists", readFileSync("lib/use-hydrated.ts", "utf8").includes("export function useHydrated"));
const wizard = strip(readFileSync("app/submit/page.tsx", "utf8"));
ok("the Begin button waits for hydration", /disabled=\{!hydrated\}/.test(wizard) && /Loading…/.test(wizard));
ok("the example buttons do too", (wizard.match(/disabled=\{!hydrated\}/g) ?? []).length >= 2);
ok("site-readiness gates its writes", /disabled=\{submitting \|\| !hydrated\}/.test(strip(readFileSync("app/site-readiness/page.tsx", "utf8"))));
ok("the login selector gates too — it is in the nav on every route",
  /disabled=\{!hydrated\}/.test(strip(readFileSync("components/LoginAsSelector.tsx", "utf8"))));
ok("the triage return now has a reader", readdirSync("app/submit/[id]").includes("response"));
ok("…and the card links to it", readFileSync("components/card/v2/ReadinessCardV2.tsx", "utf8").includes("/response"));

// ═════════════════════════════════════════════════════════════════════════
section("1. The 88/100 composite is gone");
// ═════════════════════════════════════════════════════════════════════════

const audit = buildNorthvaleAudit("cerviai");
ok("AuditResult validates", AuditResultSchema.safeParse(audit).success);
ok("there is no `score` field", !("score" in (audit as object)));
eq("12 pass · 2 conditional", [audit.tally.pass, audit.tally.conditional], [12, 2]);
eq("…of 14", audit.tally.total, 14);
eq("nothing not met, nothing unanswered", [audit.tally.notMet, audit.tally.unanswered], [0, 0]);
const appSrc = [...walk("app"), ...walk("components")].map((f) => strip(readFileSync(f, "utf8"))).join("\n");
ok("no /100 is rendered against an audit", !/\{live\.score\}|\{audit\.score\}|auditScore/.test(appSrc));
ok("VerdictComparison shows a tally", /pass · \$\{auditGates\.conditional\} conditional/.test(readFileSync("components/audit/VerdictComparison.tsx", "utf8")));

// ═════════════════════════════════════════════════════════════════════════
section("2. S17 — audit with named owners, and a DERIVED divergence");
// ═════════════════════════════════════════════════════════════════════════

eq("every one of the 14 gates has a named owner", NORTHVALE_ASSIGNMENTS.length, 14);
ok("…covering exactly the gate set", HOSPITAL_GATE_ORDER.every((g) => NORTHVALE_ASSIGNMENTS.some((a) => a.gateId === g)));
ok("every owner is a person with a role", NORTHVALE_ASSIGNMENTS.every((a) => a.ownerName.length > 0 && a.ownerRole.length > 0));
ok("every gate cites evidence", NORTHVALE_ASSIGNMENTS.every((a) => (a.evidence ?? "").length > 0));
ok("the DPO owns the consent gate", NORTHVALE_ASSIGNMENTS.find((a) => a.gateId === "H14")?.ownerRole === "Data Protection Officer");
ok("H14 exists and overlaps vendor gate G14 — the consent finding is on the consent row",
  HOSPITAL_GATES.H14?.vendorGate === "G14");
ok("the gynaecologist owns the confirmatory pathway", /Gynaecologist/.test(NORTHVALE_ASSIGNMENTS.find((a) => a.gateId === "H5")?.ownerRole ?? ""));
ok("the superintendent owns operator release", /Superintendent/.test(NORTHVALE_ASSIGNMENTS.find((a) => a.gateId === "H6")?.ownerRole ?? ""));

const divergences = buildDivergences("cerviai");
ok("divergences are found by comparing the two records", divergences.length >= 1);
ok("…including the CONSENT gate, not a gate about something else",
  divergences.some((d) => d.hospitalGateId === "H14" && d.vendorGateId === "G14"));
ok("each names both sides", divergences.every((d) => d.vendorReads.length > 0 && d.hospitalReads.length > 0));
ok("each carries the vendor gate it overlaps", divergences.every((d) => d.vendorGateId.startsWith("G")));
ok("only card-clear-vs-hospital-not counts", divergences.every((d) => d.vendorLevel === 2 && d.hospitalStatus !== "pass"));
ok("the framing is fixed in the engine, not a page", DIVERGENCE_FRAMING.includes("The hospital's verdict governs deployment at this site"));

/** Derived, not seeded — an agreeing audit produces none. */
const agreeing = buildDivergences("chestxr");
ok("a submission with no disagreement yields no divergence", Array.isArray(agreeing));
const s17 = readFileSync("app/hospital/governance/[id]/page.tsx", "utf8");
ok("the screen renders derived rows, not a hardcoded list", s17.includes("divergences.map"));
ok("…and the verbatim framing", s17.includes("Both are correct") || s17.includes("DIVERGENCE_FRAMING"));

// ═════════════════════════════════════════════════════════════════════════
section("3. S18 — append-only committee verdict");
// ═════════════════════════════════════════════════════════════════════════

resetGovernance();
ok("the seeded verdict validates", CommitteeVerdictSchema.safeParse(SEEDED_VERDICT).success);
eq("decision", SEEDED_VERDICT.decision, "TRIAL_UNDER_CHARTER");
eq("8 October 2026", SEEDED_VERDICT.decidedAt.slice(0, 10), "2026-10-08");
eq("chair", SEEDED_VERDICT.chair.name, "Dr. P. Raghunathan");
eq("quorum 5 of 7", [SEEDED_VERDICT.quorum.present, SEEDED_VERDICT.quorum.total], [5, 7]);
eq("1 conflict declared and recused", [SEEDED_VERDICT.conflicts.length, SEEDED_VERDICT.conflicts[0].recused], [1, true]);
eq("three local conditions", SEEDED_VERDICT.localConditions.length, 3);
ok("…including Tamil paper consent before capture", SEEDED_VERDICT.localConditions.some((c) => /Tamil paper consent/.test(c)));
ok("dissent recorded and accepted", SEEDED_VERDICT.dissent[0].accepted && /day-45/.test(SEEDED_VERDICT.dissent[0].position));

const blocked = threw(() =>
  recordVerdict({ ...SEEDED_VERDICT, decidedAt: "2026-11-01T00:00:00.000Z", decision: "DECLINE" } as never)
);
ok("recording a second verdict without superseding THROWS", blocked !== null);
ok("…and says a reversal is a new verdict, never an edit", /append-only/.test(blocked ?? ""));
ok("superseding a verdict that does not exist throws",
  threw(() => recordVerdict({ ...SEEDED_VERDICT, supersedes: "verdict-nope" } as never)) !== null);

const reversal = recordVerdict({
  ...SEEDED_VERDICT,
  decision: "CONDITIONAL_HOLD",
  decidedAt: "2026-11-01T00:00:00.000Z",
  supersedes: SEEDED_VERDICT.id,
} as never);
eq("a reversal is appended as a new revision", reversal.revision, 2);
eq("…referencing the one it replaces", reversal.supersedes, SEEDED_VERDICT.id);
eq("both remain in the history", getVerdicts("cerviai").length, 2);
eq("the original is unchanged", getVerdicts("cerviai")[0].decision, "TRIAL_UNDER_CHARTER");
eq("the reversal is in force", currentVerdict("cerviai")?.id, reversal.id);
resetGovernance();

// ═════════════════════════════════════════════════════════════════════════
section("4. S19 — placement");
// ═════════════════════════════════════════════════════════════════════════

ok("placement validates", PlacementRecordSchema.safeParse(NORTHVALE_PLACEMENT).success);
eq("replaces nothing — the warning case", NORTHVALE_PLACEMENT.replaces, null);
eq("load delta is a NUMBER, for S23 to measure against", typeof NORTHVALE_PLACEMENT.loadDeltaMinutesPerPatient, "number");
eq("…of 2 minutes", NORTHVALE_PLACEMENT.loadDeltaMinutesPerPatient, 2);
eq("three touchpoints", NORTHVALE_PLACEMENT.touchpoints.length, 3);
ok("the nurse may not refer alone", /may not refer on the tool/.test(NORTHVALE_PLACEMENT.decisionAuthority.note));
eq("no EMR write-back during the trial", NORTHVALE_PLACEMENT.integration.emrWriteBack, false);
ok("consent is Tamil, paper, before capture",
  NORTHVALE_PLACEMENT.consentPoint.language === "Tamil" &&
  NORTHVALE_PLACEMENT.consentPoint.medium === "Paper" &&
  NORTHVALE_PLACEMENT.consentPoint.beforeCapture);
const s19 = readFileSync("app/hospital/governance/[id]/placement/page.tsx", "utf8");
ok("'replaces nothing' renders as a FLAG, not a row", /REPLACES NOTHING|Replaces nothing/i.test(s19) && /AlertTriangle/.test(s19));
ok("…and names silent abandonment as the risk", /silent abandonment/.test(s19));

// ═════════════════════════════════════════════════════════════════════════
section("5. S20 — the charter, and its two visible derivations");
// ═════════════════════════════════════════════════════════════════════════

resetHandoff(); resetRemediations(); resetGovernance();
remediate({ slug: "cerviai", itemId: "D4.F.01", evidenceId: "ev-cerviai-dpdp-addendum", evidenceName: "DPDP data-residency addendum", note: "n" });
expressInterest({ slug: "cerviai", contact: { name: "Dr. Ananya Rao", role: "r" }, objective: "o", geography: { state: "Tamil Nadu" }, preferredMode: "TRIAL_UNDER_CHARTER", sharingGranted: true });
const REQ: Omit<CreateRequestInput, "conditionPlans"> = {
  slug: "cerviai", mode: "trial",
  question: "Does CerviAI-assisted VIA screening increase detection of referable abnormalities at CHC level without increasing nurse workload?",
  scope: { sites: 4, siteType: "CHC", days: 90, participants: 1000, operatorCadre: "Staff nurse" },
  supportTaper: [{ fromWeek: 1, toWeek: 2, level: "On-site" }, { fromWeek: 3, toWeek: 6, level: "Weekly" }, { fromWeek: 7, toWeek: null, level: "On-call" }],
  devices: { count: 4, description: "Tablets", offlineCapture: true, replacementHours: 72 },
  training: { hoursPerOperator: 6, operatorCount: 12 },
  dataExport: { formats: ["CSV", "FHIR bundle"], onRequest: true, noticePeriodDays: 0 },
  modelPolicy: { frozenForDuration: true, onChange: "STOP_AND_REVIEW" },
};
createDeploymentRequest({
  ...REQ,
  conditionPlans: getCardV2("cerviai")!.card.conditions.map((c) => ({
    itemId: c.itemId, gateId: "G1", label: "l", blocks: c.blocks,
    plan: "This trial generates the India-population evidence.", suppliedBy: "Innovator",
    prerequisite: { description: "CTRI registration", dueBy: "Before day 1" },
  })),
});
const charter = buildCharter("cerviai")!;
ok("the charter validates", TrialCharterSchema.safeParse(charter).success);
eq("one named owner", charter.owner.name, "Dr. Meera Krishnan");
eq("scope", [charter.scope.participants, charter.scope.days, charter.scope.sites], [1000, 90, 4]);
eq("budget", charter.budget.display, "₹4.2 lakh");

/** DERIVATION 1 — endpoints from the 20 August success definition. */
const entry = getProblemRegister("hosp-northvale")!.entries.find((e) => e.id === "pr-northvale-cervical-screening")!;
eq("endpoints derive from the register entry", charter.endpoints, deriveEndpoints(entry));
eq("primary: sensitivity ≥ 0.85", charter.endpoints.find((e) => /Sensitivity/.test(e.name))?.threshold, "≥ 0.85");
eq("primary: specificity ≥ 0.80", charter.endpoints.find((e) => /Specificity/.test(e.name))?.threshold, "≥ 0.80");
eq("secondary: referral completion ≥ 80%", charter.endpoints.find((e) => /referral completion/i.test(e.name))?.threshold, "≥ 80%");
eq("secondary: time to referral ≤ 14 days", charter.endpoints.find((e) => /Time to referral/.test(e.name))?.threshold, "≤ 14 days");
ok("the 80% is STATED — the number is in the success definition",
  charter.endpoints.find((e) => /referral completion/i.test(e.name))?.derivedFrom === "SUCCESS_DEFINITION_LITERAL");
ok("the accuracy thresholds are marked OPERATIONALISED, not claimed as the site's",
  charter.endpoints.filter((e) => e.kind === "primary").every((e) => e.derivedFrom === "SUCCESS_DEFINITION_OPERATIONALISED"));
eq("the derivation names the register entry", charter.derivation.registerEntryId, "pr-northvale-cervical-screening");
eq("…and carries the publication date", charter.derivation.publishedAt.slice(0, 10), "2026-08-20");
ok("…which predates the tool's submission", endpointsPredateTool(charter.derivation.publishedAt, charter.derivation.toolSubmittedAt));
const s20 = readFileSync("app/hospital/governance/[id]/charter/page.tsx", "utf8");
ok("the screen SHOWS the link, quoting the success definition", s20.includes("d.successDefinition"));
ok("…and the days between publication and submission", /days before/.test(s20));

/** DERIVATION 2 — the taper read from the request, not retyped. */
const request = getDeploymentRequest("cerviai")!;
eq("the taper is the vendor's own", charter.commitments.supportTaper, request.supportTaper);
eq("…three phases ending open-ended", charter.commitments.supportTaper[2].toWeek, null);
eq("model frozen, from the request", charter.commitments.modelVersionFrozen, request.modelPolicy.frozenForDuration);

/** The field that makes the outcome defensible. */
ok("decision rule fixed before any data", /adopt/i.test(charter.decisionRule.adopt) && /retire/i.test(charter.decisionRule.retire));
ok("…with all three branches stated", [charter.decisionRule.adopt, charter.decisionRule.extend, charter.decisionRule.retire].every((r) => r.length > 20));
eq("three stops", [charter.stops.safety, charter.stops.futility, charter.stops.operational].filter(Boolean).length, 3);
ok("day-45 interim has authority to stop — the accepted dissent",
  charter.reviewPoints.find((r) => r.day === 45)?.authorityToStop === true);
eq("exit: devices back in 14 days", charter.exit.deviceReturnDays, 14);
ok("…and flagged women followed regardless of early termination", /regardless of early termination/.test(charter.exit.followUp));

resetHandoff(); resetRemediations(); resetGovernance();
console.log(`\nPHASE 6b ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
