/**
 * BLOCKING verification for the D2 buyer-conditional change.
 * Computes every seeded tool card the way the store does (buyer-aware) and
 * asserts the verdict + demo stage match the pre-change baseline exactly.
 *
 * Run: npx tsx scripts/d2-verify.ts   (exit 1 if any verdict/stage drifts)
 */
import { TOOLS } from "@/lib/mock/fixtures/tools";
import { SUBMISSIONS } from "@/lib/mock/fixtures/submissions";
import { HOSPITALS } from "@/lib/mock/fixtures/hospitals";
import { TOOL_GATE_ANSWERS } from "@/lib/mock/fixtures/gate-answers";
import { runToolAssessment } from "@/lib/engine/readiness-tool";
import type { BuyerType } from "@/lib/engine/gates";
import { submissionStage } from "@/lib/stages";

// Pre-change baseline (captured by scripts/d2-baseline.ts before the change).
const BASELINE: Record<string, { verdict: string; stage: string }> = {
  "tool-cerviai": { verdict: "CONDITIONS", stage: "Pilot ongoing" },
  "tool-chestxr": { verdict: "DEPLOY", stage: "Pilot complete" },
  "tool-symptombot": { verdict: "NOTYET", stage: "Declined" },
  "tool-retinascan": { verdict: "CONDITIONS", stage: "New" },
  "tool-embryograde": { verdict: "CONDITIONS", stage: "New" },
  "tool-ovareserve": { verdict: "CONDITIONS", stage: "Pilot ongoing" },
};

const buyerOf = (toolId: string): BuyerType => {
  const sub = SUBMISSIONS.find((s) => s.toolId === toolId);
  const h = sub && HOSPITALS.find((x) => x.id === sub.hospitalId);
  return (h?.buyerType as BuyerType) ?? "public";
};

const cardOf = (toolId: string) => {
  const tool = TOOLS.find((t) => t.id === toolId)!;
  return runToolAssessment({
    id: `card-${toolId}`, toolId, toolName: tool.name, careLevel: tool.careLevel,
    gateAnswers: TOOL_GATE_ANSWERS[toolId], buyerType: buyerOf(toolId),
    docIds: tool.docIds, createdAt: "2026-01-15T00:00:00.000Z",
  });
};

let failures = 0;
console.log("D2 BUYER-CONDITIONAL — baseline preservation check\n");
console.log("tool             buyer    verdict     stage                D2  overall  vs baseline");
console.log("─".repeat(92));
for (const s of SUBMISSIONS) {
  const tool = TOOLS.find((t) => t.id === s.toolId)!;
  const c = cardOf(s.toolId);
  const stage = submissionStage(s).label;
  const base = BASELINE[s.toolId];
  const ok = base && c.verdict === base.verdict && stage === base.stage;
  if (!ok) failures++;
  console.log(
    `${tool.name.padEnd(16)} ${buyerOf(s.toolId).padEnd(8)} ${String(c.verdict).padEnd(11)} ${stage.padEnd(20)} ` +
    `${String(c.dimensionScores.D2).padStart(3)} ${String(c.overallScore).padStart(6)}   ${ok ? "✓ match" : `✗ DRIFT (was ${base?.verdict}/${base?.stage})`}`
  );
}
console.log("─".repeat(92));
console.log(failures === 0 ? "\nBASELINE PRESERVED — all verdicts + stages match." : `\n${failures} DRIFT(S) — STOP.`);
process.exit(failures === 0 ? 0 : 1);
