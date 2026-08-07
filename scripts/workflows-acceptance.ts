/**
 * Two-workflow + registry acceptance (run: `npx tsx scripts/workflows-acceptance.ts`).
 *   - a Tier B request opens a TRIAL workflow; a Tier A request opens a
 *     DEPLOYMENT workflow,
 *   - the registry shows both categories with per-tool hospital lists,
 *   - the CTRI step exists in the trial workflow only.
 */

import * as api from "@/lib/mock/api";
import { requestTypeForGrade } from "@/lib/match";
import { phasesFor, firstPhase } from "@/lib/workspace/phases";
import { getCtriDraft } from "@/lib/mock/fixtures/ctri-drafts";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

const ANSWERS = { G1: "pass", G2: "pass", G3: "pass", G4: "pass", G5: "pass", G6: "pass", G7: "pass", G8: "pass", G9: "pass", G10: "pass", G11: "pass", G12: "pass", G13: "pass", G14: "pass", G15: "pass", G16: "pass" } as const;

async function drive(toolName: string, hospitalId: string, requestType: "trial" | "deployment") {
  const { tool, card } = await api.createAssessment({
    vendor: { name: `${toolName} Co`, founder: "F", description: "d", website: "x.in" },
    tool: { name: toolName, category: "screening", description: "d", intendedUse: "u", careLevel: "community", docIds: [] },
    gateAnswers: ANSWERS,
  });
  const sub = await api.submitToHospital({ toolId: tool.id, readinessCardId: card.id, hospitalId, requestType });
  await api.runAudit({ submissionId: sub.id, auditor: "H", gateAnswers: { H7: "pass" } });
  await api.setDecision({ submissionId: sub.id, decision: "approved", reason: "ok" });
  const dep = await api.getDeploymentBySubmission(sub.id);
  return { tool, dep };
}

async function main() {
  const hospitals = await api.getHospitals();
  const northvale = hospitals.find((h) => h.id === "hosp-northvale")!;       // TIER_B (trial-ready)
  const siteB = hospitals.find((h) => h.id === "hosp-site-b")!; // NOT_READY (aspiring site)

  console.log("── Tier drives the request/workflow type ──");
  // Grade → request mapping (pure, fixture-independent).
  check("Tier B grade → trial", requestTypeForGrade("TIER_B") === "trial", "TIER_B");
  check("Tier A grade → deployment", requestTypeForGrade("TIER_A") === "deployment", "TIER_A");
  check("Not-ready grade → no request action", requestTypeForGrade("NOT_READY") === null, "NOT_READY");
  // Personas reflect the mapping.
  check("Northvale persona (Tier B) → trial", requestTypeForGrade(northvale.siteReadiness.grade) === "trial", northvale.siteReadiness.grade);
  check("Site B persona (Not ready) → no request action", requestTypeForGrade(siteB.siteReadiness.grade) === null, siteB.siteReadiness.grade);

  console.log("\n── Tier B request → TRIAL workflow ──");
  const trial = await drive("TrialTool", "hosp-northvale", "trial");
  check("deployment.kind = trial", trial.dep?.kind === "trial");
  check("starts at ethics_setup (trial first phase)", trial.dep?.phase === firstPhase("trial") && firstPhase("trial") === "ethics_setup");
  check("trial phases = ethics/CTRI setup → enrolment → monitoring → analysis → closeout", phasesFor("trial").map((p) => p.key).join(",") === "ethics_setup,enrolment,monitoring,analysis,closeout");

  console.log("\n── Tier A request → DEPLOYMENT workflow ──");
  const deploy = await drive("DeployTool", "hosp-site-b", "deployment");
  check("deployment.kind = deployment", deploy.dep?.kind === "deployment");
  check("starts at setup (deployment first phase)", deploy.dep?.phase === firstPhase("deployment") && firstPhase("deployment") === "setup");
  check("deployment phases = setup → go-live → monitoring → review → handover", phasesFor("deployment").map((p) => p.key).join(",") === "setup,go_live,monitoring,review,handover");

  console.log("\n── CTRI step is trial-only ──");
  check("trial workflow has the ethics/CTRI setup phase", phasesFor("trial").some((p) => p.key === "ethics_setup"));
  check("deployment workflow has NO ethics/CTRI phase", !phasesFor("deployment").some((p) => p.key === "ethics_setup"));
  const draft = getCtriDraft("tool-cerviai", "CerviAI");
  check("CTRI draft available (public title + ICD-10 suggestion)", !!draft.publicTitle && !!draft.suggestions.icd10.value, draft.suggestions.icd10.value);

  console.log("\n── Registry shows both categories with hospital lists ──");
  const view = await api.getRegistryView();
  const cervi = view.find((v) => v.toolId === "tool-cerviai");
  const chest = view.find((v) => v.toolId === "tool-chestxr");
  check("CerviAI listed under clinical trials (ongoing @ Northvale)", (cervi?.trials.some((t) => t.hospitalName === "Northvale Institute of Medical Sciences" && t.status === "ongoing")) ?? false, cervi?.trials.map((t) => `${t.hospitalName}:${t.status}`).join(", "));
  check("ChestXR listed under deployments (completed @ Northvale, with outcome)", (chest?.deployments.some((d) => d.hospitalName === "Northvale Institute of Medical Sciences" && d.status === "completed" && !!d.outcome)) ?? false, chest?.deployments.map((d) => `${d.hospitalName}:${d.status}:${d.outcome}`).join(", "));

  console.log(`\n${failures === 0 ? "WORKFLOWS ACCEPTANCE PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
