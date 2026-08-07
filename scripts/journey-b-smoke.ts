/**
 * Journey B smoke test (run: `npx tsx scripts/journey-b-smoke.ts`).
 *
 * Proves the "run our own audit" flow through the real engine/api:
 *   - the 13-gate intake pre-fills 9 gates from the vendor card and leaves the
 *     4 hospital-only gates (integration, liability, named owners, billing) blank
 *   - the hospital's audit is an INDEPENDENT verdict (its own gate set + score)
 *   - saving persists it against the submission
 */

import * as api from "@/lib/mock/api";
import { prefillFromToolCard, runHospitalAudit } from "@/lib/engine/hospital-audit";

let failures = 0;
function check(label: string, cond: boolean, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
}

const HOSPITAL_ONLY = ["H7", "H9", "H10", "H12"];

async function main() {
  const sub = await api.getSubmission("sub-cerviai");
  if (!sub) return console.log("no seed submission");
  const card = await api.getReadinessCard(sub.readinessCardId);
  if (!card) return console.log("no card");

  // Pre-fill from the vendor card.
  const seed = prefillFromToolCard(card);
  const seededKeys = Object.keys(seed);
  check("pre-fills 9 gates from the vendor card", seededKeys.length === 9, seededKeys.join(","));
  check(
    "the 4 hospital-only gates start blank",
    HOSPITAL_ONLY.every((g) => !(g in seed)),
    `blank: ${HOSPITAL_ONLY.filter((g) => !(g in seed)).join(",")}`
  );

  // Hospital answers the 4 hospital-only gates → independent verdict.
  const answers = { ...seed, H7: "pass", H9: "partial", H10: "pass", H12: "partial" } as const;
  const live = runHospitalAudit({ id: "preview", submissionId: sub.id, auditor: "Northvale Institute of Medical Sciences", gateAnswers: answers, createdAt: "" });
  check("hospital audit produces its own verdict", !!live.verdict, `${live.verdict} · ${live.score}/100`);
  check("independent of the vendor: 13 gates vs 16", live.gateResults.length === 13);
  console.log(`    vendor card verdict: ${card.verdict} (${card.overallScore}/100 · 16 gates)`);

  // Save → persists against the submission.
  const saved = await api.runAudit({ submissionId: sub.id, auditor: "Northvale Institute of Medical Sciences", gateAnswers: answers });
  const fetched = await api.getAuditBySubmission(sub.id);
  check("audit persists against the submission", fetched?.id === saved.id, fetched?.verdict);

  console.log(`\n${failures === 0 ? "JOURNEY B OK" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
