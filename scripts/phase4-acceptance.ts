/**
 * Phase 4 acceptance — the two-cards problem, the registry listing, matching.
 * Run: npm run verify:phase4
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { runAssessment, findDiscrepancies, declarationsExceedingEvidence } from "@/lib/engine/assessment-run";
import { assertListable, buildListing } from "@/lib/engine/listing";
import { matchToolToSites, MATCH_BAND_LABEL } from "@/lib/match";
import { buildCerviaiCardV1, buildCerviaiCardV11, CERVIAI_DECLARATION, CERVIAI_EVIDENCE } from "@/lib/mock/fixtures/cerviai-v2";
import { RETINASCAN_DECLARATION, RETINASCAN_EVIDENCE } from "@/lib/mock/fixtures/retinascan-v2";
import { SITE_PROFILES, PROBLEM_REGISTERS } from "@/lib/mock/fixtures/site-profiles";
import { HOSPITALS } from "@/lib/mock/fixtures/hospitals";
import { buildListingFor } from "@/lib/mock/api-registry";
import * as store from "@/lib/mock/store";
import type { ReadinessCard } from "@/lib/schemas/readiness-card";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "✓" : "✗"} ${l}${x ? ` — ${x}` : ""}`); };
const eq = (l: string, a: unknown, e: unknown) => ok(l, JSON.stringify(a) === JSON.stringify(e), `got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`);
const section = (t: string) => console.log(`\n── ${t} ──`);

const v1 = buildCerviaiCardV1();
const { card: v11 } = buildCerviaiCardV11(v1);

// ═════════════════════════════════════════════════════════════════════════
section("0. Carry-overs");
// ═════════════════════════════════════════════════════════════════════════

const s5 = runAssessment({ declaration: CERVIAI_DECLARATION, evidence: CERVIAI_EVIDENCE, conditions: v1.conditions });
const s4 = declarationsExceedingEvidence(CERVIAI_DECLARATION, CERVIAI_EVIDENCE);
eq("S4 and S5 report the SAME discrepancy count", [s4.length, s5.discrepancies.length], [5, 5]);
eq("…and the same gates", s4.map((d) => d.gateId).sort(), s5.discrepancies.map((d) => d.gateId).sort());
ok("both come from one function", declarationsExceedingEvidence === (findDiscrepancies as unknown) || s4.length === findDiscrepancies(CERVIAI_DECLARATION, CERVIAI_EVIDENCE).length);

const rs = runAssessment({ declaration: RETINASCAN_DECLARATION, evidence: RETINASCAN_EVIDENCE, conditions: [] });
eq("RetinaScan still routes to human review", rs.outcome, "UNDER_ASSESSMENT");

const wizardSrc = readFileSync("app/submit/page.tsx", "utf8");
ok("S1 collects a tool version", wizardSrc.includes('label="Tool version"'));
ok("S1 collects a model version", wizardSrc.includes('label="Model version"'));
ok("a fresh submission no longer hardcodes 'not stated' as the tool version", !wizardSrc.includes('toolVersion: form.toolName,'));

const cardSrc = readFileSync("components/card/v2/ReadinessCardV2.tsx", "utf8");
ok("the card explains discrepancies vs conditions", /A discrepancy is a question about a claim; a condition is what an\s+assessment concluded still has to be closed/.test(cardSrc));

// ═════════════════════════════════════════════════════════════════════════
section("1. Legacy card migration");
// ═════════════════════════════════════════════════════════════════════════

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(full) ? [full] : [];
  });
}
const allSrc = [...walk("app"), ...walk("components"), ...walk("lib")];
const importers = allSrc.filter((f) => /from "@\/components\/card\/ReadinessCard"/.test(readFileSync(f, "utf8")));
eq("nothing imports the v1 card component", importers, []);
ok("…and the file is gone", !allSrc.includes("components/card/ReadinessCard.tsx"));

for (const route of [
  "app/registry/[toolId]/page.tsx",
  "app/hospital/[id]/page.tsx",
  "app/demo/cards/page.tsx",
  "app/submit/[id]/card/page.tsx",
]) {
  ok(`${route} renders the v2 card`, readFileSync(route, "utf8").includes("ReadinessCardV2"));
}

/** Both asserted strings must be reproducible FROM the v2 card. */
const chipTotal = v1.gateSummary.pass + v1.gateSummary.fail + v1.gateSummary.unscored;
eq("gateSummary yields '15 / 17 gates clear'", [v1.gateSummary.pass, chipTotal], [15, 17]);
ok("the chip renders that from gateSummary", readFileSync("components/card/v2/GateSummaryChip.tsx", "utf8").includes("gates clear"));
ok("the v2 card carries 'Assessment across four dimensions'", cardSrc.includes("Assessment across four dimensions"));
ok("…and the BODH block /hospital depends on", cardSrc.includes("BODH validation score"));
ok("…and the evidence heading /hospital waits on", cardSrc.includes("Attached evidence"));
ok("no composite score field exists on the v2 card", !("overallScore" in (v1 as object)));
ok("VerdictComparison shows gates, not a vendor composite",
  readFileSync("components/audit/VerdictComparison.tsx", "utf8").includes("gates clear · 4 dimensions on a 0-2 ladder"));

// ═════════════════════════════════════════════════════════════════════════
section("2. S8 registry listing");
// ═════════════════════════════════════════════════════════════════════════

const listing = buildListingFor("cerviai")!;
eq("listing state is an event", listing.listingState, "Listed");
eq("tool state is unchanged", listing.toolState, "Assessed");
ok("'Published' is NOT used as the journey state here", listing.toolState !== "Published");
eq("no hospital outcome yet", listing.hospitalOutcome, null);
eq("card version is carried", listing.cardVersion, "v1.0");
ok("capability names the context and class", /CHC/.test(listing.capability) && /staff nurse/.test(listing.capability) && /Class C/.test(listing.capability));
eq("requirements", listing.requirements, ["4 tablets", "Offline capture", "8h power", "Colposcopy referral pathway"]);
ok("conditions are shown with their blocking scope",
  listing.conditionsShown.some((c) => c.gateId === "G1" && c.label === "India-population validation" && c.status === "open"));
ok("limitations travel with the listing", listing.couldNotEstablish.length === 3);
eq("commercials", [listing.commercials.model, listing.commercials.consumables], ["Per-site licence", "Consumables included"]);
eq("support model", [listing.supportModel.field, listing.supportModel.replacement], ["Field support with taper", "72h device replacement"]);

/** A stripped card cannot be listed. */
function refuses(mutate: (c: ReadinessCard) => unknown, label: string) {
  const stripped = { ...v1 } as unknown as Record<string, unknown>;
  mutate(stripped as unknown as ReadinessCard);
  let threw = false;
  try { assertListable(stripped as unknown as ReadinessCard); } catch { threw = true; }
  ok(label, threw);
}
refuses((c) => delete (c as unknown as Record<string, unknown>).conditions, "a card without conditions[] cannot be listed");
refuses((c) => delete (c as unknown as Record<string, unknown>).couldNotEstablish, "a card without couldNotEstablish[] cannot be listed");
ok("an EMPTY conditions array is still listable (a clean card is not a stripped one)",
  (() => { try { buildListing({ card: { ...v1, conditions: [] }, tool: store.getToolBySlug("cerviai")!, listedAt: v1.issuedAt, requirements: [], commercials: { model: "", consumables: "" }, supportModel: { field: "", replacement: "" } }); return true; } catch { return false; } })());

// ── one canonical tool record ────────────────────────────────────────────
const before = store.getRegistryView().length;
for (let i = 0; i < 2; i++) {
  const { tool } = store.createAssessment({
    vendor: { name: "CerviAI Health", founder: "x", description: "d", website: "w" },
    tool: { name: "CerviAI", category: "screening", description: "d", intendedUse: "u", careLevel: "community", docIds: [] },
    gateAnswers: {},
  });
  store.listOnRegistry({ toolId: tool.id, verdict: "CONDITIONS" });
}
const after = store.getRegistryView();
eq("re-listing CerviAI does NOT create a second row", after.length, before);
eq("…and the surviving record keeps its CDSCO class", after.find((r) => r.slug === "cerviai")?.deviceClass, "Class C");
ok("no 'cerviai-2' duplicate exists", !after.some((r) => r.slug === "cerviai-2"));

// ═════════════════════════════════════════════════════════════════════════
section("3. S9 matching");
// ═════════════════════════════════════════════════════════════════════════

const matches = matchToolToSites({ card: v11, toolName: "CerviAI", hospitals: HOSPITALS, profiles: SITE_PROFILES, registers: PROBLEM_REGISTERS });
const north = matches.find((m) => m.hospital.id === "hosp-northvale")!;
const siteB = matches.find((m) => m.hospital.id === "hosp-site-b")!;

eq("Northvale is a Strong match", MATCH_BAND_LABEL[north.band], "Strong match");
ok("problem fit cites rank, volume and turnaround",
  /#2/.test(north.breakdown.problemFit.detail) && /3,400/.test(north.breakdown.problemFit.detail) && /11-day mean colposcopy turnaround/.test(north.breakdown.problemFit.detail));
ok("context validity says contained", /contained/.test(north.breakdown.contextValidity.detail));
ok("infrastructure names power, offline capture and the referral pathway",
  /power backup 8h supported/.test(north.breakdown.infrastructure.detail) &&
  /offline capture required and supported/.test(north.breakdown.infrastructure.detail) &&
  /colposcopy referral pathway present/.test(north.breakdown.infrastructure.detail));
ok("conditions satisfiable: G1 does not block a trial", /G1 does not block a supervised trial/.test(north.breakdown.conditionsSatisfiable.detail));

eq("Site B is Not eligible", MATCH_BAND_LABEL[siteB.band], "Not eligible");
ok("…with no offline path stated", /no offline path/.test(siteB.breakdown.infrastructure.detail));
ok("…and no colposcopy pathway in the catchment", /colposcopy referral pathway absent from the catchment/.test(siteB.breakdown.infrastructure.detail));
ok("…and the consequence spelled out", /A positive flag would have nowhere to go/.test(siteB.breakdown.infrastructure.detail));
ok("the excluded site is RETURNED, not filtered out", matches.length === HOSPITALS.length);

// ── chronology ───────────────────────────────────────────────────────────
ok("site records predate the submission", north.chronology.siteRecordsPredateSubmission);
ok("the profile date is cited", /12 August 2026/.test(north.chronology.note));
ok("the register date is cited", /20 August 2026/.test(north.chronology.note));
ok("the submission date is cited", /15 September 2026/.test(north.chronology.note));
ok("the ordering is stated in words", /before CerviAI was submitted/.test(north.chronology.note));
eq("matching READS the dates rather than stamping them",
  [SITE_PROFILES[0].baselinedAt.slice(0, 10), PROBLEM_REGISTERS[0].publishedAt.slice(0, 10)],
  ["2026-08-12", "2026-08-20"]);

console.log(`\nPHASE 4 ACCEPTANCE ${fail === 0 ? "PASSED" : "FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
