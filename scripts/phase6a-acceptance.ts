/**
 * Phase 6a acceptance — the hospital's front half.
 * Run: npm run verify:phase6a
 */
import { readFileSync } from "node:fs";
import { runTriage } from "@/lib/engine/triage";
import {
  createDeploymentRequest,
  expressInterest,
  getDeploymentRequest,
  recordTriage,
  resetHandoff,
  triageReturnForInnovator,
} from "@/lib/mock/handoff";
import { getCardV2, remediate, resetRemediations } from "@/lib/mock/cards-v2";
import { buildCerviaiCardV11, buildCerviaiCardV1 } from "@/lib/mock/fixtures/cerviai-v2";
import { getProblemRegister, getSiteProfile, SITE_PROFILES, PROBLEM_REGISTERS } from "@/lib/mock/fixtures/site-profiles";
import { matchToolToSites } from "@/lib/match";
import { HOSPITALS } from "@/lib/mock/fixtures/hospitals";
import { SiteOperatingProfileSchema, ProblemRegisterSchema } from "@/lib/schemas/site-profile";
import type { CreateRequestInput } from "@/lib/mock/handoff";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);
const threw = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e instanceof Error ? e.message : "threw"; } };

const NORTHVALE = "hosp-northvale";
const profile = getSiteProfile(NORTHVALE)!;
const register = getProblemRegister(NORTHVALE)!;

// ═════════════════════════════════════════════════════════════════════════
section("1. S13 — the profile S9 already cites");
// ═════════════════════════════════════════════════════════════════════════

ok("the profile validates against the EXISTING schema", SiteOperatingProfileSchema.safeParse(profile).success);
eq("baselined 12 August 2026", profile.baselinedAt.slice(0, 10), "2026-08-12");
eq("power backup 8h", profile.infrastructure.powerBackupHours, 8);
ok("camp sites are generator-dependent, and it says so", /generator-dependent/i.test(profile.infrastructure.powerNote ?? ""));
eq("connectivity intermittent", profile.infrastructure.connectivity, "intermittent");
ok("offline capture required and supported", profile.infrastructure.offlineCaptureSupported);
eq("digital: EMR, FHIR, ABDM", [profile.digital.emrPresent, profile.digital.fhirSurfaceAvailable, profile.digital.abdmParticipating], [true, true, true]);
eq("people: 12 staff nurses, 6h capacity, supervision", [profile.staffing.releasableOperators, profile.staffing.trainingCapacityHours, profile.staffing.clinicianSupervisionOnSite], [12, 6, true]);
eq("governance: DPO, DPIA, incident route", [profile.governance.dpoAppointed, profile.governance.dpiaProcessInPlace, profile.governance.incidentRouteDefined], [true, true, true]);
ok("facility names the catchment", /4 CHCs/.test(profile.facility.catchment));
ok("archetype line present, and names the region", /western Tamil Nadu/.test(profile.archetype) && /Tier B/.test(profile.archetype));

/** S9 and S13 must cite the SAME record — one shape, not two. */
const matches = matchToolToSites({ card: buildCerviaiCardV11(buildCerviaiCardV1()).card, toolName: "CerviAI", hospitals: HOSPITALS, profiles: SITE_PROFILES, registers: PROBLEM_REGISTERS });
const north = matches.find((m) => m.hospital.id === NORTHVALE)!;
eq("S9 cites the same baseline date S13 displays", north.chronology.siteProfileBaselinedAt, profile.baselinedAt);
eq("S9 cites the same publication date S14 displays", north.chronology.problemRegisterPublishedAt, register.publishedAt);
ok("…and states both in the same words", /12 August 2026/.test(north.chronology.note) && /20 August 2026/.test(north.chronology.note));
const s13 = readFileSync("app/hospital/readiness/page.tsx", "utf8");
ok("S13 reads the shared profile, not a second shape", s13.includes("getSiteProfile") && !s13.includes("SITE_PROFILES ="));
ok("S13 displays the baseline date, not just stores it", s13.includes("formatCardDate(profile.baselinedAt)"));

// ═════════════════════════════════════════════════════════════════════════
section("2. S14 — the register");
// ═════════════════════════════════════════════════════════════════════════

ok("the register validates", ProblemRegisterSchema.safeParse(register).success);
eq("published 20 August 2026", register.publishedAt.slice(0, 10), "2026-08-20");
eq("nine problems ranked", register.entries.length, 9);
const cerv = register.entries.find((e) => e.id === "pr-northvale-cervical-screening")!;
eq("cervical screening is #2", cerv.rank, 2);
eq("3,400 per year", cerv.volumePerYear, 3400);
ok("problem stated", /detected late/.test(cerv.description ?? "") && /referral loss high/.test(cerv.description ?? ""));
ok("service line", /community screening outreach/i.test(cerv.serviceLine ?? ""));
ok("current pathway with turnaround", /VIA by staff nurse/.test(cerv.currentPathway) && /11-day/.test(cerv.currentMetric ?? ""));
ok("constraint names the camp rota", /camp rota/i.test(cerv.constraint ?? "") && /no additional nurse time/i.test(cerv.constraint ?? ""));
ok("success definition names workload and 80% referral completion",
  /without increasing nurse workload/i.test(cerv.successDefinition ?? "") && /80%/.test(cerv.successDefinition ?? ""));
ok("entry ids are independent of rank", !cerv.id.includes(String(cerv.rank)));
const s14 = readFileSync("app/hospital/problems/page.tsx", "utf8");
ok("S14 shows the publication date beside the success definition", /written \{formatCardDate\(register\.publishedAt\)\}/.test(s14));

// ═════════════════════════════════════════════════════════════════════════
section("3. S15 — intake");
// ═════════════════════════════════════════════════════════════════════════

resetHandoff();
resetRemediations();
expressInterest({
  slug: "cerviai",
  contact: { name: "Dr. Ananya Rao", role: "Clinical and regulatory point of contact" },
  objective: "Supervised CHC trial.",
  geography: { state: "Tamil Nadu" },
  preferredMode: "TRIAL_UNDER_CHARTER",
  sharingGranted: true,
});
const BASE: Omit<CreateRequestInput, "conditionPlans"> = {
  slug: "cerviai", mode: "trial", question: "q",
  scope: { sites: 4, siteType: "CHC", days: 90, participants: 1000, operatorCadre: "Staff nurse" },
  supportTaper: [{ fromWeek: 1, toWeek: 2, level: "On-site" }, { fromWeek: 3, toWeek: 6, level: "Weekly" }, { fromWeek: 7, toWeek: null, level: "On-call" }],
  devices: { count: 4, description: "Tablets with offline capture", offlineCapture: true, replacementHours: 72 },
  training: { hoursPerOperator: 6, operatorCount: 12 },
  dataExport: { formats: ["CSV", "FHIR bundle"], onRequest: true, noticePeriodDays: 0 },
  modelPolicy: { frozenForDuration: true, onChange: "STOP_AND_REVIEW" },
};
const PLANS = () => getCardV2("cerviai")!.card.conditions.map((c) => ({
  itemId: c.itemId, gateId: c.itemId === "D1.B.01" ? "G1" : "G15", label: "l", blocks: c.blocks,
  plan: "This trial generates the India-population evidence.", suppliedBy: "Innovator",
  prerequisite: c.itemId === "D1.B.01" ? { description: "CTRI registration", dueBy: "Before day 1" } : null,
}));
/**
 * Remediate BEFORE requesting, which is the real order: the innovator clears
 * G15 with the residency addendum, then asks. Triaging a v1.0 card would fail
 * the fourth check on a trial-blocking condition that no longer exists.
 */
remediate({
  slug: "cerviai",
  itemId: "D4.F.01",
  evidenceId: "ev-cerviai-dpdp-addendum",
  evidenceName: "DPDP data-residency addendum",
  note: "Residency addendum places all processing within India.",
});
const request = createDeploymentRequest({ ...BASE, conditionPlans: PLANS() });

eq("received on the day facilitation completed, not 'today'", request.sentAt?.slice(0, 10), "2026-09-30");
ok("source is derivable from structure", Boolean(request.facilitationId));
const s15 = readFileSync("app/hospital/intake/[id]/page.tsx", "utf8");
ok("header is verbatim", s15.includes("Structured request received from ClearPath"));
const s15Code = s15.replace(/\/\*[\s\S]*?\*\//g, "");
ok("…and never says 'Interest received' in rendered code", !/Interest received/i.test(s15Code));
ok("source derived from facilitationId, not a stored string", s15.includes("Boolean(request.facilitationId)"));
ok("it reads the request rather than re-deriving the taper", s15.includes("request.supportTaper.map"));
ok("…and reads the prerequisite as a field", s15.includes("p.prerequisite.description"));
ok("…and reads blocks through from the card", s15.includes("BLOCKING_SCOPE_LABEL[p.blocks]"));
ok("a null problem fit is STATED, not an empty row",
  /Nothing on our register matches the claim/.test(s15));
ok("vendor-supplied terms stay labelled unassessed", /not assessed by anyone/.test(s15));
ok("the archetype line appears here too", s15.includes("SiteArchetype"));

// ═════════════════════════════════════════════════════════════════════════
section("4. S16 — triage");
// ═════════════════════════════════════════════════════════════════════════

const card11 = getCardV2("cerviai")!.card;
const t = runTriage({ request, card: card11, profile, register });
eq("four checks", t.checks.map((c) => c.key), ["problem_fit", "context_validity", "infrastructure_floor", "conditions_satisfiable"]);
eq("all four pass for CerviAI on v1.1", t.checks.map((c) => c.status), ["pass", "pass", "pass", "pass"]);
ok("problem fit cites rank and denominator", /#2 of 9/.test(t.checks[0].finding));
ok("context validity says we run that", /we run that/.test(t.checks[1].finding));
ok("infrastructure names offline capture and the pathway", /offline capture supported/.test(t.checks[2].finding) && /colposcopy pathway present/.test(t.checks[2].finding));
ok("conditions: G1 does not block a trial, nothing needed from us", /G1 does not block a supervised trial/.test(t.checks[3].finding) && /required from us/.test(t.checks[3].finding));
ok("advancing is available", t.canAdvance);

/** NO PROBLEM REGISTER — the behaviour, not a silent pass. */
const noReg = runTriage({ request, card: card11, profile, register: undefined });
eq("without a register the first question is UNANSWERABLE", noReg.checks[0].status, "unanswerable");
ok("…not a fail — different work follows", noReg.checks[0].status !== "fail");
ok("…and it says publishing a register is the work", /publishing a register is the work/.test(noReg.checks[0].finding));
eq("…and advancing is blocked", noReg.canAdvance, false);
eq("…named as the blocker", noReg.blockedBy, ["problem_fit"]);

/** A trial-blocking condition stops triage. */
const cardV1 = buildCerviaiCardV1();
const blocked = runTriage({ request, card: cardV1, profile, register });
eq("a trial-blocking condition fails the fourth check", blocked.checks[3].status, "fail");
ok("…naming the gate", /G15 blocks a trial/.test(blocked.checks[3].finding));
eq("…and blocks advancing", blocked.canAdvance, false);

// ── decisions and the return path ────────────────────────────────────────
const noReason = threw(() => recordTriage({ slug: "cerviai", outcome: "DECLINE", decidedBy: "x", findings: [] }));
ok("a decline with no reason THROWS", noReason !== null);
ok("…because it returns to the innovator", /returns to the innovator/i.test(noReason ?? ""));
ok("a park with no reason also throws", threw(() => recordTriage({ slug: "cerviai", outcome: "PARK", decidedBy: "x", findings: [] })) !== null);

const advanced = recordTriage({
  slug: "cerviai", outcome: "ADVANCE", decidedBy: "Dr. Meera Raghavan",
  findings: t.checks.map((c) => ({ key: c.key, question: c.question, status: c.status, finding: c.finding })),
  at: "2026-10-01T00:00:00.000Z",
});
eq("CerviAI advances on 1 October 2026", advanced.decidedAt.slice(0, 10), "2026-10-01");
eq("…and the request moves to under assessment", getDeploymentRequest("cerviai")?.status, "UNDER_ASSESSMENT");
eq("an advance returns nothing to the innovator — there is no reason", advanced.returnedToInnovator, false);
eq("the four findings are stored with the decision", advanced.findings.length, 4);

const declined = recordTriage({
  slug: "cerviai", outcome: "DECLINE", decidedBy: "Dr. Meera Raghavan",
  reason: "No colposcopy capacity this quarter.", findings: [],
});
const ret = triageReturnForInnovator("cerviai")!;
ok("a decline reason returns to the innovator", !!ret);
eq("…with the reason intact", ret.reason, "No colposcopy capacity this quarter.");
eq("…and the hospital named", ret.hospitalName, "Northvale Institute of Medical Sciences");
eq("…and the request marked declined", getDeploymentRequest("cerviai")?.status, "DECLINED");
ok("the return path exists though the innovator screen is 6b",
  readFileSync("lib/mock/handoff.ts", "utf8").includes("THE RETURN PATH"));
void declined;

resetHandoff();
resetRemediations();
console.log(`\nPHASE 6a ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
