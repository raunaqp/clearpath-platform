/**
 * Acceptance test for the four fixes (run: `npx tsx scripts/acceptance.ts`).
 *
 * Proves, for all three demo tools, through the real api/engine (no browser):
 *   1. the wizard input computes the right verdict + conditions,
 *   2. each tool's referenced present/flagged PDFs exist on disk (openable),
 *      and missing docs have no file (shown as gaps),
 *   3. a request sent from the tool lands in the chosen hospital's inbox.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import * as api from "@/lib/mock/api";
import { applicableHospitals } from "@/lib/match";
import { WIZARD_EXAMPLES } from "@/lib/wizard/examples";
import { DOCUMENTS } from "@/lib/mock/fixtures/documents";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

const EXPECT: Record<string, { verdict: string; conditions: number }> = {
  "tool-cerviai": { verdict: "CONDITIONS", conditions: 2 },
  "tool-chestxr": { verdict: "DEPLOY", conditions: 0 },
  "tool-symptombot": { verdict: "NOTYET", conditions: 14 },
};

async function main() {
  const hospitals = await api.getHospitals();

  console.log("── 1 · Wizard flow → verdict + conditions (all three tools) ──");
  const createdTools: { toolId: string; newToolId: string; cardId: string }[] = [];
  for (const ex of WIZARD_EXAMPLES) {
    const { tool, card } = await api.createAssessment(ex.input);
    const want = EXPECT[ex.key];
    check(`${ex.label} verdict`, card.verdict === want.verdict, card.verdict);
    check(`${ex.label} conditions`, card.conditions.length === want.conditions, `${card.conditions.length}`);
    createdTools.push({ toolId: ex.key, newToolId: tool.id, cardId: card.id });
  }

  console.log("\n── 2 · Documents exist / gaps (per tool) ──");
  for (const ex of WIZARD_EXAMPLES) {
    const docs = DOCUMENTS.filter((d) => d.toolId === ex.key);
    let ok = docs.length > 0;
    for (const d of docs) {
      if (d.status === "missing") {
        if (d.path) ok = false; // a missing doc must not have a file
      } else {
        if (!d.path || !existsSync(join(process.cwd(), "public", d.path))) ok = false;
      }
    }
    const present = docs.filter((d) => d.status === "present").length;
    const flagged = docs.filter((d) => d.status === "flagged").length;
    const missing = docs.filter((d) => d.status === "missing").length;
    check(`${ex.label} docs`, ok, `present ${present} · flagged ${flagged} · missing ${missing}`);
  }

  console.log("\n── 3 · Applicable hospitals + send request → inbox ──");
  for (const c of createdTools) {
    const tool = await api.getTool(c.newToolId);
    if (!tool) { check(`${c.toolId} tool exists`, false); continue; }
    const matches = applicableHospitals(tool, hospitals);
    check(`${tool.name} has applicable hospitals`, matches.length > 0, matches.map((m) => m.hospital.name).join(", "));
    if (matches.length === 0) continue;
    const target = matches[matches.length - 1].hospital; // pick a non-default one when possible
    const sub = await api.submitToHospital({ toolId: tool.id, readinessCardId: c.cardId, hospitalId: target.id });
    const inbox = await api.getSubmissions(target.id);
    check(`${tool.name} → lands in ${target.name} inbox`, inbox.some((s) => s.id === sub.id));
  }

  console.log(`\n${failures === 0 ? "ACCEPTANCE PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
