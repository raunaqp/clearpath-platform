/**
 * Verifies the six changes (run: `npx tsx scripts/six-changes-smoke.ts`).
 */

import * as api from "@/lib/mock/api";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

async function freshTool() {
  const { tool, card } = await api.createAssessment({
    vendor: { name: "SixCo", founder: "S", description: "d", website: "x.in" },
    tool: { name: "SixTool", category: "screening", description: "d", intendedUse: "u", careLevel: "community", docIds: [] },
    gateAnswers: { G1: "partial", G2: "pass", G3: "pass", G4: "pass", G5: "pass", G6: "pass", G7: "pass", G8: "pass", G9: "pass", G10: "pass", G11: "pass", G12: "pass", G13: "pass", G14: "pass", G15: "partial", G16: "pass" },
  });
  return { tool, card };
}

async function main() {
  console.log("── 1 · Tier-driven request type + inbox label ──");
  const { tool, card } = await freshTool();
  // Northvale = TIER_B → trial; Site B = TIER_A → deployment; Rural = NOT_READY → no action.
  const trial = await api.submitToHospital({ toolId: tool.id, readinessCardId: card.id, hospitalId: "hosp-northvale", requestType: "trial" });
  check("trial request persisted with type", trial.requestType === "trial");
  const northvaleInbox = await api.getSubmissions("hosp-northvale");
  check("trial request lands in Northvale inbox labelled", northvaleInbox.some((s) => s.id === trial.id && s.requestType === "trial"));
  const { tool: t2, card: c2 } = await freshTool();
  const deploy = await api.submitToHospital({ toolId: t2.id, readinessCardId: c2.id, hospitalId: "hosp-site-b", requestType: "deployment" });
  check("deployment request persisted with type", deploy.requestType === "deployment");

  console.log("\n── 3 · AI TL;DR per tool (mock, swappable) ──");
  const cervi = await api.getAiSuggestion("tool-cerviai");
  const symp = await api.getAiSuggestion("tool-symptombot");
  check("CerviAI TL;DR present", /validation/i.test(cervi), cervi.slice(0, 48) + "…");
  check("SymptomBot TL;DR present", /not deployable/i.test(symp), symp.slice(0, 48) + "…");

  console.log("\n── 4 · Add supporting document ──");
  const doc = await api.addSupportingDocument({ toolId: tool.id, cardId: card.id, name: "External validation study (sample)", kind: "validation", path: "/sample-docs/chestxr-validation-study.pdf" });
  const docs = await api.getDocumentsByIds([doc.id]);
  const toolAfter = await api.getTool(tool.id);
  check("supporting doc created + attached to tool", docs.length === 1 && !!toolAfter?.docIds.includes(doc.id), doc.id);

  console.log("\n── 5 · Decision at audit: approve/reject with reason (audit-gated) ──");
  // Approve path — audit must be complete first
  await api.runAudit({ submissionId: trial.id, auditor: "Northvale Institute of Medical Sciences", gateAnswers: { H1: "pass" } });
  const approved = await api.setDecision({ submissionId: trial.id, decision: "approved", reason: "Strong fit for a supervised trial." });
  check("approve → decision approved + reason + deployment", approved?.decision === "approved" && approved.decisionReason === "Strong fit for a supervised trial." && !!(await api.getDeploymentBySubmission(trial.id)));
  // Reject path
  await api.runAudit({ submissionId: deploy.id, auditor: "Site B", gateAnswers: { H1: "fail" } });
  const rejected = await api.setDecision({ submissionId: deploy.id, decision: "rejected", reason: "Insufficient evidence." });
  check("reject → decision rejected + reason", rejected?.decision === "rejected" && rejected.decisionReason === "Insufficient evidence.");

  console.log("\n── 6 · Two vendor journeys still work ──");
  const { tool: t3, card: c3 } = await freshTool();
  check("generate does not auto-list", !(await api.isListedOnRegistry(t3.id)));
  await api.listOnRegistry({ toolId: t3.id, verdict: c3.verdict });
  check("list → assessed in registry", (await api.getRegistry()).some((r) => r.toolId === t3.id && r.status === "assessed"));
  const req = await api.submitToHospital({ toolId: t3.id, readinessCardId: c3.id, hospitalId: "hosp-northvale", requestType: "trial" });
  check("send request → inbox", (await api.getSubmissions("hosp-northvale")).some((s) => s.id === req.id));

  console.log(`\n${failures === 0 ? "SIX CHANGES OK" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
