/**
 * BASELINE capture for the D2 buyer-conditional change (safety protocol).
 * Records the current seeded verdict + dimension scores for every tool, and the
 * seeded demo stage for every submission. Re-run after the change: it MUST match.
 *
 * Run: npx tsx scripts/d2-baseline.ts
 */
import { TOOLS } from "@/lib/mock/fixtures/tools";
import { SUBMISSIONS } from "@/lib/mock/fixtures/submissions";
import { HOSPITALS } from "@/lib/mock/fixtures/hospitals";
import { TOOL_GATE_ANSWERS } from "@/lib/mock/fixtures/gate-answers";
import { runToolAssessment } from "@/lib/engine/readiness-tool";
import { submissionStage } from "@/lib/stages";

const cardOf = (toolId: string) => {
  const tool = TOOLS.find((t) => t.id === toolId)!;
  return runToolAssessment({
    id: `card-${toolId}`,
    toolId,
    toolName: tool.name,
    careLevel: tool.careLevel,
    gateAnswers: TOOL_GATE_ANSWERS[toolId],
    docIds: tool.docIds,
    createdAt: "2026-01-15T00:00:00.000Z",
  });
};

console.log("TOOL VERDICTS (computed) ─────────────────────────────────────");
for (const tool of TOOLS) {
  const c = cardOf(tool.id);
  console.log(
    `${tool.name.padEnd(16)} ${String(c.verdict).padEnd(10)} ` +
    `D1 ${c.dimensionScores.D1} · D2 ${c.dimensionScores.D2} · D3 ${c.dimensionScores.D3} · D4 ${c.dimensionScores.D4} · overall ${c.overallScore} · conditions ${c.conditions.length}`
  );
}

console.log("\nSUBMISSION STAGES (seeded) ───────────────────────────────────");
const hospitalName = (id: string) => HOSPITALS.find((h) => h.id === id)?.name ?? id;
for (const s of SUBMISSIONS) {
  const tool = TOOLS.find((t) => t.id === s.toolId)!;
  const verdict = cardOf(s.toolId).verdict;
  const stage = submissionStage(s);
  console.log(
    `${tool.name.padEnd(16)} @ ${hospitalName(s.hospitalId).padEnd(34)} ` +
    `${String(s.requestType ?? "—").padEnd(11)} verdict=${String(verdict).padEnd(10)} stage="${stage.label}"`
  );
}
