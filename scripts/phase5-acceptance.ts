/**
 * Phase 5 acceptance — the handoff, and the shape S15 will receive.
 * Run: npm run verify:phase5
 */
import { readFileSync } from "node:fs";
import {
  createDeploymentRequest,
  expressInterest,
  getFacilitation,
  getInterest,
  handoffState,
  isRequestFormOpen,
  resetHandoff,
} from "@/lib/mock/handoff";
import { DeploymentRequestSchema, InterestRecordSchema, FACILITATION_ORDER } from "@/lib/schemas/handoff";
import { AuditStateEnum } from "@/lib/schemas/submission";
import { submissionStage } from "@/lib/stages";
import type { Submission } from "@/lib/schemas/submission";
import type { CreateRequestInput } from "@/lib/mock/handoff";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);
const throws = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e instanceof Error ? e.message : "threw"; } };

const REQUEST: Omit<CreateRequestInput, "conditionPlans"> = {
  slug: "cerviai",
  mode: "trial",
  question: "Does CerviAI-assisted VIA screening increase detection of referable abnormalities at CHC level without increasing nurse workload?",
  scope: { sites: 4, siteType: "CHC", days: 90, participants: 1000, operatorCadre: "Staff nurse" },
  supportTaper: [
    { fromWeek: 1, toWeek: 2, level: "On-site" },
    { fromWeek: 3, toWeek: 6, level: "Weekly" },
    { fromWeek: 7, toWeek: null, level: "On-call" },
  ],
  devices: { count: 4, description: "Tablets with offline capture", offlineCapture: true, replacementHours: 72 },
  training: { hoursPerOperator: 6, operatorCount: 12 },
  dataExport: { formats: ["CSV", "FHIR bundle"], onRequest: true, noticePeriodDays: 0 },
  modelPolicy: { frozenForDuration: true, onChange: "STOP_AND_REVIEW" },
};

const PLANS = [
  { itemId: "D1.B.01", gateId: "G1", label: "India-population validation", blocks: "ROUTINE_DEPLOYMENT" as const,
    plan: "This trial generates the India-population evidence.", suppliedBy: "Innovator",
    prerequisite: { description: "CTRI registration", dueBy: "Before day 1" } },
  { itemId: "D4.F.01", gateId: "G15", label: "DPDP residency", blocks: "TRIAL" as const,
    plan: "Residency addendum in force for the duration.", suppliedBy: "Innovator", prerequisite: null },
];

// ═════════════════════════════════════════════════════════════════════════
section("1. THE GATE — S12 is unreachable before facilitation completes");
// ═════════════════════════════════════════════════════════════════════════

resetHandoff();
eq("state starts at Assessed", handoffState("cerviai"), "ASSESSED");
eq("no facilitation exists yet", getFacilitation("cerviai"), undefined);
eq("the request form is shut", isRequestFormOpen("cerviai"), false);

const earlyErr = throws(() => createDeploymentRequest({ ...REQUEST, conditionPlans: PLANS }));
ok("creating a request with no interest THROWS", earlyErr !== null);
ok("…and the message says interest goes to ClearPath first", /interest goes to clearpath first/i.test(earlyErr ?? ""), earlyErr ?? "");
ok("the gate lives in the store, not only in a route",
  readFileSync("lib/mock/handoff.ts", "utf8").includes("THE GATE IS ENFORCED HERE"));
ok("the route ALSO redirects",
  readFileSync("app/submit/[id]/request/page.tsx", "utf8").includes("router.replace(`/submit/${id}/facilitation`)"));

// ═════════════════════════════════════════════════════════════════════════
section("2. S10 — interest goes to ClearPath");
// ═════════════════════════════════════════════════════════════════════════

const interest = expressInterest({
  slug: "cerviai",
  contact: { name: "Dr. Ananya Rao", role: "Clinical and regulatory point of contact" },
  objective: "Supervised CHC trial generating India-population evidence toward G1.",
  geography: { state: "Tamil Nadu", districtPreferred: "Coimbatore district" },
  preferredMode: "TRIAL_UNDER_CHARTER",
  sharingGranted: true,
  at: "2026-09-24T00:00:00.000Z",
});
ok("the record validates", InterestRecordSchema.safeParse(interest).success);
eq("submitted to ClearPath", interest.submittedTo, "CLEARPATH");
eq("state", interest.state, "INTEREST_RECEIVED_BY_CLEARPATH");
ok("the recipient cannot be a hospital — it is a one-value literal",
  readFileSync("lib/schemas/handoff.ts", "utf8").includes('z.literal("CLEARPATH")'));
eq("sharing scope is the whole card", interest.sharingPermission.scope, "CARD_IN_FULL_CONDITIONS_INTACT");
ok("what is excluded is named", interest.sharingPermission.excludes.includes("Commercial terms"));
eq("target conditions come from the card, not free text", interest.targetConditionItemIds, ["D1.B.01", "D4.F.01"]);
eq("journey state advances", handoffState("cerviai"), "HOSPITAL_APPROACHED");

// Sharing refused → facilitation cannot proceed on the innovator's behalf.
const refused = expressInterest({
  slug: "cerviai",
  contact: { name: "x", role: "y" },
  objective: "o",
  geography: { state: "Tamil Nadu" },
  preferredMode: "TRIAL_UNDER_CHARTER",
  sharingGranted: false,
});
eq("permission refused is recorded as not granted", refused.sharingPermission.granted, false);
eq("…with no granted timestamp", refused.sharingPermission.grantedAt, null);

// ═════════════════════════════════════════════════════════════════════════
section("3. S11 — facilitation");
// ═════════════════════════════════════════════════════════════════════════

expressInterest({
  slug: "cerviai",
  contact: { name: "Dr. Ananya Rao", role: "Clinical and regulatory point of contact" },
  objective: "Supervised CHC trial generating India-population evidence toward G1.",
  geography: { state: "Tamil Nadu", districtPreferred: "Coimbatore district" },
  preferredMode: "TRIAL_UNDER_CHARTER",
  sharingGranted: true,
});
const f = getFacilitation("cerviai")!;
eq("four steps, in order", f.entries.map((e) => e.step), FACILITATION_ORDER);
eq("all four complete", f.entries.filter((e) => e.completed).length, 4);
eq("current step", f.currentStep, "BOTH_SIDES_WILLING");
eq("hospital", f.hospitalName, "Northvale Institute of Medical Sciences");
eq("dates 25 / 25 / 26 / 30 Sep",
  f.entries.map((e) => e.at?.slice(0, 10)),
  ["2026-09-25", "2026-09-25", "2026-09-26", "2026-09-30"]);
ok("fit validation cites the chronology the matching screen cites",
  /12 August 2026/.test(f.entries[0].points.join(" ")) &&
  /20 August 2026/.test(f.entries[0].points.join(" ")) &&
  /15 September 2026/.test(f.entries[0].points.join(" ")));
ok("no commercial terms at the sharing step", /no commercial terms/i.test(f.entries[1].points.join(" ")));
ok("willingness is not acceptance", /not acceptance/i.test(f.entries[3].points.join(" ")));
ok("the disclaimer is on the screen",
  readFileSync("app/submit/[id]/facilitation/page.tsx", "utf8")
    .includes("ClearPath does not certify and does not recommend procurement"));
eq("the form is now open", isRequestFormOpen("cerviai"), true);

// ═════════════════════════════════════════════════════════════════════════
section("4. S12 — the object S15 receives");
// ═════════════════════════════════════════════════════════════════════════

const unplanned = throws(() => createDeploymentRequest({ ...REQUEST, conditionPlans: [PLANS[0]] }));
ok("a request leaving an open condition unplanned THROWS", unplanned !== null);
ok("…and names the gate", /G15/.test(unplanned ?? ""), unplanned ?? "");

const req = createDeploymentRequest({ ...REQUEST, conditionPlans: PLANS, at: "2026-10-01T00:00:00.000Z" });
ok("the request validates against its schema", DeploymentRequestSchema.safeParse(req).success);
eq("mode", req.mode, "trial");
eq("scope", [req.scope.sites, req.scope.days, req.scope.participants, req.scope.operatorCadre], [4, 90, 1000, "Staff nurse"]);
eq("support taper is three phases, not a sentence", req.supportTaper.length, 3);
eq("…ending open-ended", req.supportTaper[2].toWeek, null);
eq("devices", [req.devices.count, req.devices.offlineCapture, req.devices.replacementHours], [4, true, 72]);
eq("training", [req.training.hoursPerOperator, req.training.operatorCount], [6, 12]);
eq("data export formats", req.dataExport.formats, ["CSV", "FHIR bundle"]);
eq("…with no notice period", req.dataExport.noticePeriodDays, 0);
eq("model frozen, change is stop-and-review", [req.modelPolicy.frozenForDuration, req.modelPolicy.onChange], [true, "STOP_AND_REVIEW"]);
eq("it carries the exact card version the hospital must act on", req.cardVersion, "v1.0");
eq("status on send", req.status, "SENT");
eq("no hospital response yet", req.hospitalResponse, null);

/** The condition plan — structured, with a named supplier. */
eq("one plan per open condition", req.conditionPlans.length, 2);
ok("every plan names a supplier", req.conditionPlans.every((p) => p.suppliedBy.length > 0));
const g1 = req.conditionPlans.find((p) => p.gateId === "G1")!;
eq("G1 plan", g1.plan, "This trial generates the India-population evidence.");
eq("G1 supplier", g1.suppliedBy, "Innovator");
eq("G1 prerequisite is a field, not prose", g1.prerequisite, { description: "CTRI registration", dueBy: "Before day 1" });
ok("plans carry the blocking scope through from the card",
  req.conditionPlans.some((p) => p.blocks === "TRIAL") && req.conditionPlans.some((p) => p.blocks === "ROUTINE_DEPLOYMENT"));

ok("accept / decline / counter are available states for the hospital",
  ["ACCEPTED", "DECLINED", "COUNTERED", "UNDER_ASSESSMENT", "RECEIVED"].every((s) =>
    DeploymentRequestSchema.shape.status.options.includes(s as never)));
eq("journey state reaches Hospital received", handoffState("cerviai"), "HOSPITAL_RECEIVED");

// ═════════════════════════════════════════════════════════════════════════
section("5. UNDER_ASSESSMENT on the submission model");
// ═════════════════════════════════════════════════════════════════════════

ok("audit state gained in_progress", AuditStateEnum.options.includes("in_progress"));
const stage = submissionStage({ audit: "in_progress", decision: "pending", pilot: "not_started" } as Submission, "cerviai");
eq("…deriving to a distinct 'Under assessment' stage", stage.badge.label, "Under assessment");
ok("…which carries no outcome — a delay, not a denial", !stage.decisionOutcome && !stage.skipped);
eq("an untouched submission still derives 'New'",
  submissionStage({ audit: "not_run", decision: "pending", pilot: "not_started" } as Submission, "x").badge.label, "New");

// ═════════════════════════════════════════════════════════════════════════
section("6. The innovator no longer writes into a hospital inbox");
// ═════════════════════════════════════════════════════════════════════════

const applicable = readFileSync("components/card/ApplicableHospitals.tsx", "utf8");
ok("submitToHospital is not called from the innovator surface", !applicable.includes("submitToHospital("));
ok("the action goes to interest", applicable.includes("/interest"));
ok("the 'landed in the inbox' claim is gone", !applicable.includes("inbox as"));
ok("the matching screen routes to ClearPath",
  readFileSync("components/registry/SiteMatches.tsx", "utf8").includes("Express interest to ClearPath"));

resetHandoff();
console.log(`\nPHASE 5 ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
