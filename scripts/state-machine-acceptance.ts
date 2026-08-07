/**
 * Submission state-machine acceptance (run: `npx tsx scripts/state-machine-acceptance.ts`).
 *
 * Drives a CerviAI submission through the full pathway and asserts every surface
 * (all derived from the single source of truth) reflects the right stage:
 *   not_run → run audit → complete → approve → not_started → start pilot → ongoing
 * Plus: the audit-gate on decisions, and the E1 seed-consistency fix.
 */

import * as api from "@/lib/mock/api";
import { submissionStage } from "@/lib/stages";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

const CERVIAI_ANSWERS = {
  G1: "partial", G2: "pass", G3: "pass", G4: "pass", G5: "pass", G6: "pass",
  G7: "pass", G8: "pass", G9: "pass", G10: "pass", G11: "pass", G12: "pass",
  G13: "pass", G14: "pass", G15: "partial", G16: "pass",
} as const;

/** Assert a submission's derived stage matches, reading from the store each time. */
async function stageOf(id: string) {
  const s = (await api.getSubmission(id))!;
  return { sub: s, stage: submissionStage(s) };
}

async function main() {
  console.log("── E1 · seed is internally consistent ──");
  const seed = await api.getSubmission("sub-cerviai");
  const seedAudit = await api.getAuditBySubmission("sub-cerviai");
  check("seeded CerviAI approved is backed by a completed audit (no E1)", seed?.decision === "approved" && seed?.audit === "complete" && !!seedAudit, `audit=${seed?.audit} decision=${seed?.decision}`);

  console.log("\n── Drive a fresh CerviAI: not_run → ongoing ──");
  const { tool, card } = await api.createAssessment({
    vendor: { name: "CerviAI Health", founder: "Dr. Ananya Rao", description: "d", website: "cerviai.example.in" },
    tool: { name: "CerviAI", category: "screening", description: "AI cervical screening", intendedUse: "u", careLevel: "community", docIds: [] },
    gateAnswers: CERVIAI_ANSWERS,
  });
  const submission = await api.submitToHospital({ toolId: tool.id, readinessCardId: card.id, hospitalId: "hosp-northvale", requestType: "trial" });

  // 1 · New
  let cur = await stageOf(submission.id);
  check("1 · New: audit=not_run, decision=pending, pilot=not_started", cur.sub.audit === "not_run" && cur.sub.decision === "pending" && cur.sub.pilot === "not_started");
  check("1 · stage = New, action Run our audit", cur.stage.index === 0 && cur.stage.action.label === "Run our audit");
  check("1 · appears in inbox with that stage", (await api.getSubmissions("hosp-northvale")).some((s) => s.id === submission.id));

  // guard: cannot approve before audit is complete
  await api.setDecision({ submissionId: submission.id, decision: "approved", reason: "premature" });
  check("guard · approve is a no-op before audit complete", (await api.getSubmission(submission.id))?.decision === "pending");

  // 2 · Run audit → Evaluated
  await api.runAudit({ submissionId: submission.id, auditor: "Northvale Institute of Medical Sciences", gateAnswers: { H7: "pass", H9: "partial", H10: "pass", H12: "partial" } });
  cur = await stageOf(submission.id);
  check("2 · Evaluated: audit=complete", cur.sub.audit === "complete");
  check("2 · stage = Evaluated, action Decide", cur.stage.index === 1 && cur.stage.action.label === "Decide");
  check("2 · audit result recorded", !!(await api.getAuditBySubmission(submission.id)));

  // 3 · Approve → deployment created, pilot not_started
  await api.setDecision({ submissionId: submission.id, decision: "approved", reason: "Strong fit for a supervised trial." });
  cur = await stageOf(submission.id);
  const dep = await api.getDeploymentBySubmission(submission.id);
  check("3 · Approved: decision=approved, pilot=not_started", cur.sub.decision === "approved" && cur.sub.pilot === "not_started");
  check("3 · trial deployment created (ethics_setup)", dep?.kind === "trial" && dep?.phase === "ethics_setup");
  check("3 · stage = Approved · Start pilot", cur.stage.index === 2 && cur.stage.decisionOutcome === "approved" && cur.stage.action.label === "Start pilot");

  // 4 · Start pilot → ongoing
  if (dep) await api.startPilot(dep.id);
  cur = await stageOf(submission.id);
  const depAfter = await api.getDeploymentBySubmission(submission.id);
  check("4 · Ongoing: pilot=ongoing", cur.sub.pilot === "ongoing");
  check("4 · trial enrolment started", depAfter?.kind === "trial" && depAfter?.phase === "enrolment");
  check("4 · stage = Pilot ongoing", cur.stage.index === 3 && cur.stage.pilotOutcome === "ongoing");
  check("4 · registry reflects piloting", (await api.getRegistry()).some((r) => r.toolId === tool.id && r.status === "piloting"));

  console.log(`\n${failures === 0 ? "STATE MACHINE ACCEPTANCE PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
