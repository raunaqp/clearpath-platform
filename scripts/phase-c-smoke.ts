/**
 * Phase C smoke (run: `npx tsx scripts/phase-c-smoke.ts`).
 * Drives the seeded CerviAI clinical TRIAL through Analysis → Closeout → Publish
 * and confirms the registry loop closes with trial endpoints.
 */

import * as api from "@/lib/mock/api";
import { buildTrialEndpoints, buildOwnership } from "@/lib/engine/deployment-report";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

async function main() {
  let dep = await api.getDeployment("deploy-cerviai");
  if (!dep) return console.log("no seed deployment");
  check("CerviAI is a clinical trial, mid-flight", dep.kind === "trial" && dep.phase === "monitoring", `day ${dep.dayOf}/${dep.totalDays}`);
  check("has live metrics + alerts + drift", dep.metrics.length > 0 && dep.alerts.length > 0 && !!dep.driftWatch);

  // Analysis — study endpoints (not an operational scorecard)
  const { endpoints, recommendation } = buildTrialEndpoints(dep);
  await api.updateDeployment(dep.id, { endpoints, recommendation });
  dep = (await api.advanceDeployment(dep.id, "analysis"))!;
  check("study endpoints generated (4)", dep.endpoints.length === 4, dep.endpoints.map((e) => `${e.name}:${e.met ? "met" : "miss"}`).join(", "));
  check("recommendation present", !!dep.recommendation, dep.recommendation?.decision);

  // Closeout — ownership + publish
  const ownership = buildOwnership({ hospitalName: "Northvale Institute of Medical Sciences", vendorName: "CerviAI Health" });
  await api.updateDeployment(dep.id, { ownership });
  dep = (await api.advanceDeployment(dep.id, "closeout"))!;
  check("ownership plan filled", !!dep.ownership?.runs);

  await api.publishToRegistry(dep.id);
  dep = (await api.getDeployment(dep.id))!;
  check("trial marked published", dep.published === true);

  const view = await api.getRegistryView();
  const cervi = view.find((v) => v.toolId === "tool-cerviai");
  check("registry shows CerviAI trial completed at Northvale", cervi?.trials.some((t) => t.status === "completed" && t.hospitalName === "Northvale Institute of Medical Sciences") ?? false, cervi?.trials.map((t) => `${t.hospitalName}:${t.status}`).join(", "));

  console.log(`\n${failures === 0 ? "PHASE C OK" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
