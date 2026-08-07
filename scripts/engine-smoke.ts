/**
 * Engine smoke test (run: `npm run engine:smoke`).
 *
 * Proves the pure logic in `lib/engine/*` produces the verdicts the demo story
 * depends on — the story only holds if these are COMPUTED, not asserted.
 */

import { runToolAssessment } from "@/lib/engine/readiness-tool";
import { runSiteAssessment } from "@/lib/engine/readiness-site";
import { runHospitalAudit, prefillFromToolCard } from "@/lib/engine/hospital-audit";
import { TOOLS } from "@/lib/mock/fixtures/tools";
import { TOOL_GATE_ANSWERS } from "@/lib/mock/fixtures/gate-answers";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
}

const EXPECTED_VERDICT: Record<string, string> = {
  "tool-cerviai": "CONDITIONS",
  "tool-chestxr": "DEPLOY",
  "tool-symptombot": "NOTYET",
  "tool-retinascan": "CONDITIONS",
  "tool-embryograde": "CONDITIONS",
  "tool-ovareserve": "CONDITIONS",
};

console.log("── Tool readiness ──");
for (const tool of TOOLS) {
  const card = runToolAssessment({
    id: `card-${tool.id}`,
    toolId: tool.id,
    toolName: tool.name,
    careLevel: tool.careLevel,
    gateAnswers: TOOL_GATE_ANSWERS[tool.id],
    docIds: tool.docIds,
    createdAt: "2026-01-15T00:00:00.000Z",
  });
  check(`${tool.name} verdict`, card.verdict, EXPECTED_VERDICT[tool.id]);
  console.log(
    `    D1 ${card.dimensionScores.D1} · D2 ${card.dimensionScores.D2} · D3 ${card.dimensionScores.D3} · D4 ${card.dimensionScores.D4} · conditions: ${card.conditions.length}`
  );
  console.log(`    placement: ${card.placement}`);
  if (tool.id === "tool-cerviai") {
    check("  CerviAI D1", card.dimensionScores.D1, 90);
    check("  CerviAI D4", card.dimensionScores.D4, 90);
    check("  CerviAI conditions", card.conditions.length, 2);
    check(
      "  CerviAI placement emits care-level string",
      card.placement.includes("community health centres (CHC) & sub-centres"),
      true
    );
  }
}

console.log("\n── D2 buyer-conditional (shared spine D1/D3/D4 unchanged) ──");
{
  const emb = TOOLS.find((t) => t.id === "tool-embryograde")!;
  const base = {
    id: "card-emb", toolId: emb.id, toolName: emb.name, careLevel: emb.careLevel,
    gateAnswers: TOOL_GATE_ANSWERS[emb.id], docIds: emb.docIds, createdAt: "2026-01-15T00:00:00.000Z",
  };
  const pub = runToolAssessment({ ...base, buyerType: "public" });
  const priv = runToolAssessment({ ...base, buyerType: "private" });
  const ids = (c: typeof pub) => c.gateResults.map((r) => r.gateId);
  check("EmbryoGrade public verdict", pub.verdict, "CONDITIONS");
  check("EmbryoGrade private verdict (preserved)", priv.verdict, "CONDITIONS");
  check("public D2 = G5/G6/G7", ["G5", "G6", "G7"].every((g) => ids(pub).includes(g)) && !ids(pub).includes("GP1"), true);
  check("private D2 = GP1–GP5", ["GP1", "GP2", "GP3", "GP4", "GP5"].every((g) => ids(priv).includes(g)) && !ids(priv).includes("G5"), true);
  check("D1 spine unchanged across buyer", pub.dimensionScores.D1 === priv.dimensionScores.D1, true);
  check("D3 spine unchanged across buyer", pub.dimensionScores.D3 === priv.dimensionScores.D3, true);
  check("D4 spine unchanged across buyer", pub.dimensionScores.D4 === priv.dimensionScores.D4, true);
}

console.log("\n── Site readiness ──");
const northvale = runSiteAssessment({
  governance: "TIER_A",
  people: "TIER_A",
  infrastructure: "TIER_B",
  data: "TIER_A",
  regulatory: "TIER_A",
  access: "TIER_B",
});
check("Northvale (mixed A/B) grade", northvale.grade, "TIER_B");
check("Northvale gaps (trial-ready → gap-free)", northvale.gaps.length, 0);

const siteB = runSiteAssessment({
  governance: "TIER_A",
  people: "TIER_A",
  infrastructure: "TIER_A",
  data: "TIER_A",
  regulatory: "TIER_A",
  access: "TIER_A",
});
check("Site B (all A) grade", siteB.grade, "TIER_A");
check("Site B gaps (target Tier B → none)", siteB.gaps.length, 0);

const rural = runSiteAssessment({
  governance: "NOT_YET",
  people: "NOT_YET",
  infrastructure: "NOT_YET",
  data: "TIER_B",
  regulatory: "NOT_YET",
  access: "TIER_B",
});
check("Rural CHC (has NOT_YET) grade", rural.grade, "NOT_READY");
check("Rural CHC gaps (target Tier A → all 6 below A)", rural.gaps.length, 6);

console.log("\n── Hospital audit (pre-filled from CerviAI card) ──");
const cerviCard = runToolAssessment({
  id: "card-tool-cerviai",
  toolId: "tool-cerviai",
  toolName: "CerviAI",
  careLevel: "community",
  gateAnswers: TOOL_GATE_ANSWERS["tool-cerviai"],
  docIds: [],
  createdAt: "2026-01-15T00:00:00.000Z",
});
const seeded = prefillFromToolCard(cerviCard);
console.log(`    seeded ${Object.keys(seeded).length} of 13 gates from the vendor card`);
// Hospital answers the remaining hospital-only gates; leave H9 (liability) as a gap.
const audit = runHospitalAudit({
  id: "audit-1",
  submissionId: "sub-cerviai",
  auditor: "Northvale Institute of Medical Sciences",
  gateAnswers: {
    ...seeded,
    H7: "pass",
    H9: "partial", // liability terms still being agreed
    H10: "pass",
    H12: "partial", // billing to resolve
  },
  createdAt: "2026-01-15T00:00:00.000Z",
});
check("CerviAI audit verdict", audit.verdict, "CONDITIONS");
console.log(`    score: ${audit.score}`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
