/**
 * Verifies this phase's fixes (run: `npx tsx scripts/phase-fixes-smoke.ts`).
 *   1. the DOC_STATUS_STYLE guard survives an undefined status (the crash)
 *   2. the two vendor journeys are distinct (registry listing vs hospital request)
 *   3. the hospital stage model + decision transitions
 */

import * as api from "@/lib/mock/api";
import { DOC_STATUS_STYLE } from "@/lib/ui";
import { submissionStage } from "@/lib/stages";
import type { Submission } from "@/lib/schemas/submission";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

function sub(fields: Partial<Submission>): Submission {
  return { id: "s1", toolId: "t", readinessCardId: "c", hospitalId: "h", audit: "not_run", decision: "pending", pilot: "not_started", createdAt: "", ...fields };
}

async function main() {
  console.log("── 1 · Crash guard (undefined doc status) ──");
  const lookup = DOC_STATUS_STYLE as Record<string, { tint: string; label: string } | undefined>;
  const s = lookup["undefined_status"] ?? DOC_STATUS_STYLE.present;
  check("undefined status falls back to a real style", !!s?.tint, s?.label);
  check("map has present/flagged/missing", ["present", "flagged", "missing"].every((k) => (DOC_STATUS_STYLE as Record<string, unknown>)[k]));

  console.log("\n── 2 · Two vendor journeys are distinct ──");
  const { tool, card } = await api.createAssessment({
    vendor: { name: "TwoJourneys Co", founder: "T", description: "d", website: "x.in" },
    tool: { name: "TwoJourneys", category: "screening", description: "d", intendedUse: "u", careLevel: "primary", docIds: [] },
    gateAnswers: { G1: "pass", G2: "pass", G3: "pass", G4: "pass", G5: "pass", G6: "pass", G7: "pass", G8: "pass", G9: "pass", G10: "pass", G11: "pass", G12: "pass", G13: "pass", G14: "pass", G15: "pass", G16: "pass" },
  });
  check("generate does NOT auto-list on registry", !(await api.isListedOnRegistry(tool.id)));
  // Journey 2: list on registry (no hospital)
  await api.listOnRegistry({ toolId: tool.id, verdict: card.verdict });
  const reg = await api.getRegistry();
  check("List on registry → appears as assessed", reg.some((r) => r.toolId === tool.id && r.status === "assessed"));
  // Journey 1: send pilot request to a hospital
  const submission = await api.submitToHospital({ toolId: tool.id, readinessCardId: card.id, hospitalId: "hosp-site-b" });
  const inbox = await api.getSubmissions("hosp-site-b");
  check("Send pilot request → lands in that hospital inbox as New", inbox.some((s) => s.id === submission.id && s.audit === "not_run"));

  console.log("\n── 3 · Derived stage model ──");
  check("audit not_run → New / Run our audit", submissionStage(sub({})).action.label === "Run our audit" && submissionStage(sub({})).index === 0);
  check("audit complete, pending → Evaluated / Decide", submissionStage(sub({ audit: "complete" })).action.label === "Decide" && submissionStage(sub({ audit: "complete" })).index === 1);
  check("approved, not_started → Start pilot", submissionStage(sub({ audit: "complete", decision: "approved" })).action.label === "Start pilot" && submissionStage(sub({ audit: "complete", decision: "approved" })).decisionOutcome === "approved");
  check("approved, ongoing → pilot ongoing", submissionStage(sub({ audit: "complete", decision: "approved", pilot: "ongoing" })).pilotOutcome === "ongoing");
  check("rejected → declined outcome", submissionStage(sub({ audit: "complete", decision: "rejected" })).decisionOutcome === "declined");

  console.log(`\n${failures === 0 ? "PHASE FIXES OK" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
