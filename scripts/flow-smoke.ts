/**
 * Flow smoke test (run: `npx tsx scripts/flow-smoke.ts`).
 *
 * Proves state flows A → B → C → registry through the mock api/store — the
 * continuity requirement in BUILD_SPEC §1. Runs against the real api layer
 * (latency included), no browser.
 */

import * as api from "@/lib/mock/api";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

async function main() {
  // A · create an assessment (new tool + computed card)
  const { tool, card } = await api.createAssessment({
    vendor: { name: "FlowTest Health", founder: "T. Tester", description: "demo", website: "flowtest.example.in" },
    tool: {
      name: "FlowTest",
      category: "screening",
      description: "demo screening tool",
      intendedUse: "demo",
      careLevel: "primary",
      docIds: ["doc-dpdp"],
    },
    // one partial → CONDITIONS
    gateAnswers: {
      G1: "pass", G2: "pass", G3: "pass", G4: "pass", G17: "pass", G5: "pass", G6: "pass",
      G7: "pass", G8: "pass", G9: "pass", G10: "pass", G11: "pass", G12: "pass",
      G13: "pass", G14: "pass", G15: "partial", G16: "pass",
    },
  });
  check("A · card generated", !!card.id, `verdict ${card.verdict}`);
  check("A · verdict is CONDITIONS", card.verdict === "CONDITIONS");

  // B · submit → appears in the hospital inbox
  const submission = await api.submitToHospital({
    toolId: tool.id,
    readinessCardId: card.id,
    hospitalId: "hosp-northvale",
  });
  const inbox = await api.getSubmissions("hosp-northvale");
  check("B · submission in Northvale inbox", inbox.some((s) => s.id === submission.id));

  // B · run the hospital audit
  const audit = await api.runAudit({
    submissionId: submission.id,
    auditor: "Northvale Institute of Medical Sciences",
    gateAnswers: {
      H1: "pass", H2: "pass", H3: "pass", H4: "pass", H5: "pass", H6: "pass",
      H7: "pass", H8: "pass", H9: "partial", H10: "pass", H11: "pass", H12: "pass", H13: "pass",
    },
  });
  check("B · audit produced", audit.verdict === "CONDITIONS", `score ${audit.score}`);

  // C · approve (audit complete) → deployment created, then start pilot → ongoing
  await api.setDecision({ submissionId: submission.id, decision: "approved", reason: "demo approve" });
  const deployment = await api.getDeploymentBySubmission(submission.id);
  check("C · deployment created", !!deployment, `phase ${deployment?.phase}`);
  if (deployment) await api.startPilot(deployment.id);
  const afterApprove = await api.getSubmission(submission.id);
  check("C · pilot ongoing after start", afterApprove?.decision === "approved" && afterApprove?.pilot === "ongoing");

  // C · advance + publish → registry closes the loop
  if (deployment) {
    await api.updateDeployment(deployment.id, {
      recommendation: { decision: "SCALE", rationale: "demo scale" },
    });
    await api.publishToRegistry(deployment.id);
  }
  const registry = await api.getRegistry();
  const entry = registry.find((r) => r.toolId === tool.id);
  check("registry · entry deployed + published", entry?.status === "deployed" && !!entry?.publishedResult, `rec ${entry?.publishedResult?.recommendation}`);

  console.log(`\n${failures === 0 ? "FLOW A→B→C→REGISTRY OK" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
