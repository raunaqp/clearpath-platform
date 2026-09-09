/**
 * Phase 2 acceptance — the Readiness Card and the remediation loop.
 *
 * Run: npm run verify:phase2
 *
 * Divergences from the brief's fixture targets are reported SEPARATELY from
 * regressions, with the arithmetic, and are never made to pass by moving the
 * target. The exit code stays non-zero while one stands, so a divergence has to
 * be resolved rather than lived with — but the counts distinguish it from a
 * genuine break.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { versionLabel } from "@/lib/schemas/readiness-card";
import { makeCardId, isCardId } from "@/lib/engine/card-id";
import { SCOPE_NOTE, TRIAL_BLOCKING_CLUSTERS, describeConditions, deriveVerdict } from "@/lib/engine/verdict";
import { resolveAll, type FinalLevel } from "@/lib/engine/score";
import { itemsForPath, legacyGateToItemId } from "@/lib/engine/item-bank";
import { toLegacyCard, assertLegacyScale } from "@/lib/engine/legacy-gates";
import { applyRemediation } from "@/lib/engine/remediation";
import { buildScorecard } from "@/lib/engine/deployment-report";
import {
  CERVIAI_CARD_ID,
  CERVIAI_G1_ITEM,
  CERVIAI_G15_ITEM,
  CERVIAI_ISSUED_AT,
  CERVIAI_REISSUED_AT,
  buildCerviaiCardV1,
  buildCerviaiCardV11,
  cerviaiScoredSet,
  CERVIAI_EVIDENCE,
} from "@/lib/mock/fixtures/cerviai-v2";
import type { Deployment } from "@/lib/schemas/deployment";

let pass = 0;
let fail = 0;
let diverged = 0;
const notes: string[] = [];

const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const eq = (label: string, actual: unknown, expected: unknown) =>
  ok(label, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
/** A stated fixture target the engine cannot produce. Reported, never silenced. */
const divergence = (label: string, extra: string) => {
  diverged++;
  console.log(`⚠ ${label} — ${extra}`);
};
const section = (t: string) => console.log(`\n── ${t} ──`);

const v1 = buildCerviaiCardV1();
const { card: v11, delta } = buildCerviaiCardV11(v1);

// ═════════════════════════════════════════════════════════════════════════
section("1. Card identity, version and expiry");
// ═════════════════════════════════════════════════════════════════════════

eq("card id is CP-2026-0915-CERVIAI-001", v1.id, "CP-2026-0915-CERVIAI-001");
ok("card id matches the CP-YYYY-MMDD-<SLUG>-NNN format", isCardId(v1.id));
ok("card id is deterministic", makeCardId("cerviai", CERVIAI_ISSUED_AT) === CERVIAI_CARD_ID);
eq("v1.0 displays as v1.0", versionLabel(v1.version), "v1.0");
eq("v1.1 displays as v1.1", versionLabel(v11.version), "v1.1");
ok("the id does NOT change on reissue", v11.id === v1.id, `${v1.id} → ${v11.id}`);

eq("issued 15 September 2026", v1.issuedAt.slice(0, 10), "2026-09-15");
eq("expires 15 September 2027", v1.expiresAt.slice(0, 10), "2027-09-15");
eq("reissued 22 September 2026", v11.issuedAt.slice(0, 10), "2026-09-22");
ok("expiresAt is IDENTICAL across v1.0 and v1.1", v1.expiresAt === v11.expiresAt, `${v1.expiresAt} vs ${v11.expiresAt}`);
ok("firstIssuedAt survives the reissue", v11.firstIssuedAt === v1.issuedAt);

ok("version is monotonic", v11.version === v1.version + 1, `${v1.version} → ${v11.version}`);
eq("v1.0: changeLog.length === version - 1", v1.changeLog.length, v1.version - 1);
eq("v1.1: changeLog.length === version - 1", v11.changeLog.length, v11.version - 1);

// ═════════════════════════════════════════════════════════════════════════
section("2. Verdict rules");
// ═════════════════════════════════════════════════════════════════════════

eq("CerviAI v1.0 is CONDITIONALLY_DEPLOYABLE", v1.verdict, "CONDITIONALLY_DEPLOYABLE");
eq("two conditions", v1.conditions.length, 2);
ok(
  "both are gates at level 1 — that is what '2 conditions' means",
  [CERVIAI_G1_ITEM, CERVIAI_G15_ITEM].every((id) => v1.conditions.some((c) => c.itemId === id))
);
eq(
  "the verdict line names the blocking split",
  describeConditions(v1.conditions),
  "2 conditions. One blocks a trial. One blocks routine deployment."
);

/** A gate at 0 anywhere forces NOT_DEPLOYABLE, whatever surrounds it. */
const perfect = new Map<string, FinalLevel>(itemsForPath("PUBLIC").map((i) => [i.id, i.status === "active" ? 2 : null]));
eq("all gates at 2 → DEPLOYABLE", deriveVerdict(perfect, "PUBLIC"), "DEPLOYABLE");
for (const gateItem of itemsForPath("PUBLIC").filter((i) => i.isGate)) {
  const one = new Map(perfect);
  one.set(gateItem.id, 0);
  if (deriveVerdict(one, "PUBLIC") !== "NOT_DEPLOYABLE_IN_CONTEXT") {
    ok(`a gate at 0 (${gateItem.legacyGateId}) forces NOT_DEPLOYABLE_IN_CONTEXT`, false);
  }
}
ok(
  "a gate at 0 forces NOT_DEPLOYABLE_IN_CONTEXT — every gate, no averaging out",
  itemsForPath("PUBLIC")
    .filter((i) => i.isGate)
    .every((g) => {
      const one = new Map(perfect);
      one.set(g.id, 0);
      return deriveVerdict(one, "PUBLIC") === "NOT_DEPLOYABLE_IN_CONTEXT";
    })
);
ok(
  "a gate at 1 yields CONDITIONALLY_DEPLOYABLE",
  itemsForPath("PUBLIC")
    .filter((i) => i.isGate)
    .every((g) => {
      const one = new Map(perfect);
      one.set(g.id, 1);
      return deriveVerdict(one, "PUBLIC") === "CONDITIONALLY_DEPLOYABLE";
    })
);

// ═════════════════════════════════════════════════════════════════════════
section("3. Blocking scope");
// ═════════════════════════════════════════════════════════════════════════

const g15 = v1.conditions.find((c) => c.itemId === CERVIAI_G15_ITEM)!;
const g1 = v1.conditions.find((c) => c.itemId === CERVIAI_G1_ITEM)!;
eq("G15 (DPDP residency) blocks TRIAL", g15.blocks, "TRIAL");
eq("G1 (independent validation) blocks ROUTINE_DEPLOYMENT", g1.blocks, "ROUTINE_DEPLOYMENT");
ok("every condition declares a blocking scope", v1.conditions.every((c) => !!c.blocks));
console.log(`  ↳ trial-blocking clusters: ${TRIAL_BLOCKING_CLUSTERS.join(", ")}`);

// ═════════════════════════════════════════════════════════════════════════
section("4. Placement, scope note, limitations");
// ═════════════════════════════════════════════════════════════════════════

eq(
  "placement statement",
  v1.placement.statement,
  "Potentially suitable for a supervised trial at CHC level, subject to local validation and DPDP controls."
);
eq("sub-centre is explicitly excluded", v1.placement.excluded, ["Sub-centre placement is outside this assessment."]);
ok("placement ran through softenCertainty (no hard claims)", !/\bmust\b|\bguaranteed\b|\bdefinitely\b/i.test(v1.placement.statement));

eq("scopeNote is the engine constant, identical on both versions", [v1.scopeNote, v11.scopeNote], [SCOPE_NOTE, SCOPE_NOTE]);
ok(
  "scope note says 'blind independent assessors', not 'independent reviewers'",
  SCOPE_NOTE.includes("two blind independent assessors") && !SCOPE_NOTE.includes("independent reviewers")
);

ok("the card cannot render without conditions[]", Array.isArray(v1.conditions));
ok("the card cannot render without couldNotEstablish[]", Array.isArray(v1.couldNotEstablish));
ok("couldNotEstablish is non-empty and says something true", v1.couldNotEstablish.length === 3, `${v1.couldNotEstablish.length} entries`);
ok(
  "it names the clusters with nothing authored (D1.A, D4.A, D4.B)",
  ["D1.A", "D4.A", "D4.B"].every((c) => v1.couldNotEstablish.some((l) => l.includes(c)))
);

// ═════════════════════════════════════════════════════════════════════════
section("5. Dimensions");
// ═════════════════════════════════════════════════════════════════════════

const means = {
  D1: v1.dimensionScores.D1!.mean,
  D2: v1.dimensionScores.D2!.mean,
  D3: v1.dimensionScores.D3!.mean,
  D4: v1.dimensionScores.D4!.mean,
};
eq("D2 is 2.0", means.D2, 2);
eq("D3 is 2.0", means.D3, 2);
ok("every mean is on the 0-2 ladder", Object.values(means).every((m) => m >= 0 && m <= 2));

const TARGET = { D1: 1.6, D4: 1.6 };
if (means.D1 !== TARGET.D1 || means.D4 !== TARGET.D4) {
  divergence(
    "D1 and D4 mean 1.6 in the brief",
    `engine gives D1 ${means.D1}, D4 ${means.D4}`
  );
  notes.push(
    [
      "DIMENSION MEANS — D1 and D4 come out at 1.8, not the 1.6 the brief states.",
      "",
      "  Not a tuning problem. The declaration is pinned by the brief at 15 gates Pass,",
      "  G1 Partial, G15 Partial, 0 Fail. On the 0-2 ladder that is one item at 1 in D1",
      "  and one at 1 in D4, and every non-gate item is a stub excluded from the",
      "  denominator, so each dimension's mean is taken over its gates alone:",
      "",
      "    D1 = (1 + 2 + 2 + 2 + 2) / 5 = 1.8      D4 = (2 + 2 + 2 + 2 + 1) / 5 = 1.8",
      "",
      "  1.6 is 8/5, which needs TWO items at 1 in each dimension. Producing it would",
      "  mean either a third and fourth condition — contradicting 'Conditions: G15 and",
      "  G1' — or hardcoding the means, which the brief forbids in the same sentence",
      "  that states them.",
      "",
      "  Same root cause as the Phase 1 golden trace: with 95 of 112 items unauthored,",
      "  a dimension mean can only land on k/5, k/4 or k/3. The reachable values near",
      "  1.6 are 1.4 and 1.8.",
      "",
      "  Everything else in the fixture is exact: verdict, both conditions and their",
      "  blocking scopes, D2 and D3, the card id, both dates, and the changelog.",
    ].join("\n")
  );
}

// ═════════════════════════════════════════════════════════════════════════
section("6. Remediation — a scoped delta");
// ═════════════════════════════════════════════════════════════════════════

eq("G15 was the item re-scored", delta.itemId, CERVIAI_G15_ITEM);
eq("level 1 → 2", [delta.levelBefore, delta.levelAfter], [1, 2]);
eq("D4 recomputed 1.8 → 2.0", [delta.dimensionMeanBefore, delta.dimensionMeanAfter], [1.8, 2]);
eq("D1, D2, D3 were NOT recomputed", delta.dimensionsUntouched, ["D1", "D2", "D3"]);
ok(
  "…and are byte-identical to v1.0",
  (["D1", "D2", "D3"] as const).every(
    (d) => JSON.stringify(v1.dimensionScores[d]) === JSON.stringify(v11.dimensionScores[d])
  )
);
eq("cluster D4.F recomputed 1.0 → 2.0", [delta.clusterMeanBefore, delta.clusterMeanAfter], [1, 2]);
eq("one condition remains", v11.conditions.length, 1);
eq("the remaining condition is G1", v11.conditions[0].itemId, CERVIAI_G1_ITEM);
eq("and it does NOT block a trial", v11.conditions[0].blocks, "ROUTINE_DEPLOYMENT");
eq(
  "the changelog entry names the gate, the document and what went away",
  v11.changeLog[0].summary,
  "G15 cleared — DPDP data-residency addendum attached. Trial-blocking condition removed."
);
eq("v1.1 placement drops the DPDP caveat", v11.placement.statement,
  "Potentially suitable for a supervised trial at CHC level, subject to local validation.");

// Unbound evidence must count for nothing.
let threw = false;
try {
  applyRemediation({
    card: v1,
    scored: cerviaiScoredSet(),
    itemId: CERVIAI_G15_ITEM,
    evidence: { ...CERVIAI_EVIDENCE[0], id: "ev-unbound", itemRefs: ["D1.B.01"] },
    allEvidence: CERVIAI_EVIDENCE,
    assessorId: "a", clearedToLevel: 2, note: "", issuedAt: CERVIAI_REISSUED_AT,
  });
} catch {
  threw = true;
}
ok("evidence not bound to the condition's item is refused, not quietly applied", threw);

// ═════════════════════════════════════════════════════════════════════════
section("7. No composite score reaches the vendor card");
// ═════════════════════════════════════════════════════════════════════════

ok("the v2 card has no overallScore field", !("overallScore" in (v1 as object)));

/**
 * Scan app/submit/ and the v2 component tree for the token in CODE. Comments
 * are stripped first: the v2 card carries a comment explaining why the field
 * was removed rather than demoted, and deleting that explanation to satisfy a
 * grep would lose the reason and keep only the rule.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".tsx") || full.endsWith(".ts") ? [full] : [];
  });
}
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const offenders = [...walk("app/submit"), ...walk("components/card/v2")].filter((f) =>
  stripComments(readFileSync(f, "utf8")).includes("overallScore")
);
ok("no overallScore in code under app/submit/ or components/card/v2/", offenders.length === 0, offenders.join(", "));

const submitFiles = [...walk("app/submit"), ...walk("components/card/v2")];
/** Rendered code only — the comments explaining what was removed are not renders. */
const submitCode = submitFiles.map((f) => stripComments(readFileSync(f, "utf8"))).join("\n");
ok(
  "no 'required fixes … to firm up' phrasing survives",
  !/required fix(es)? and \{?\w+\}? to firm up/i.test(submitCode)
);
ok("the dimensions column header reads 'Score (illustrative)'", submitCode.includes("Score (illustrative)"));
ok(
  "the illustrative caveat is present",
  submitCode.includes("Illustrative fixture values, not validated measurements.")
);
ok(
  "no per-dimension item denominator is rendered",
  !/itemsScored|itemsTotal/.test(submitCode)
);
ok("the limitations section is not collapsible", !/details|summary|aria-expanded/i.test(readFileSync("components/card/v2/Limitations.tsx", "utf8")));

// ═════════════════════════════════════════════════════════════════════════
section("8. The legacy adapter still holds");
// ═════════════════════════════════════════════════════════════════════════

const resolved = resolveAll(cerviaiScoredSet());
const legacy = toLegacyCard({
  card: v1,
  resolved,
  toolId: "tool-cerviai",
  toolName: "CerviAI",
  docIds: CERVIAI_EVIDENCE.map((e) => e.id),
});
assertLegacyScale(legacy);
eq("v2 CONDITIONALLY_DEPLOYABLE projects to v1 CONDITIONS", legacy.verdict, "CONDITIONS");
eq("D1 mean 1.8 rescales to 90", legacy.dimensionScores.D1, 90);
ok("dimension scores are 0-100, not 0-2 means", Object.values(legacy.dimensionScores).every((v) => v > 2 && v <= 100));
ok("conditions map back to legacy gate ids", legacy.conditions.some((c) => c.gateId === "G15"));
ok("blocking scope does not leak into the v1 shape", !("blocks" in legacy.conditions[0]));

const { scorecard } = buildScorecard({ alerts: [] } as unknown as Deployment, legacy);
const clinical = scorecard.find((l) => l.key === "clinical")!.score;
eq("buildScorecard's `d1 - 4` gets 90 - 4 = 86", clinical, 86);
ok("…not the 0 a raw 0-2 mean would silently produce", clinical !== 0);

// ═════════════════════════════════════════════════════════════════════════
const verdict = fail > 0 ? "FAILED" : diverged > 0 ? "DIVERGED" : "PASSED";
console.log(
  `\nPHASE 2 ACCEPTANCE ${verdict} — ${pass} passed, ${fail} regressions, ${diverged} documented divergences`
);
if (notes.length > 0) {
  console.log("\n════════ STOP AND READ ════════\n");
  for (const n of notes) console.log(n + "\n");
}
process.exit(fail === 0 && diverged === 0 ? 0 : 1);
