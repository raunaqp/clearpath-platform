/**
 * Generate per-tool placeholder documents (BUILD_SPEC §5) under
 * /public/sample-docs/. Each PDF has a correct title and a STATUS line
 * (present / flagged / missing-context). Real specimen PDFs (e.g. CerviAI's)
 * can be dropped in at the same filename — this script SKIPS any file that
 * already exists, so it never clobbers a real document.
 *
 * Regulatory copy stays generic: no invented CDSCO form numbers/timelines
 * beyond the vendor-supplied filename (guardrail §11).
 *
 * Run: `npm run docs:gen`
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Doc = {
  file: string;
  title: string;
  status: string;
  statusTone: "present" | "flagged";
  body: string[];
};

const TEAL = rgb(0.059, 0.431, 0.337);
const INK = rgb(0.055, 0.078, 0.067);
const MUTED = rgb(0.42, 0.463, 0.435);
const AMBER = rgb(0.729, 0.459, 0.09);
const GREEN = rgb(0.231, 0.427, 0.067);

const COMMON = [
  "",
  "Representative placeholder generated for the ClearPath demo.",
  "Drop a real PDF at this filename to replace it — no code change needed.",
];

const DOCS: Doc[] = [
  // CerviAI — the vendor's real specimens live at these names; placeholders
  // here until they're added.
  { file: "cerviai-validation-study.pdf", title: "CerviAI — Independent Validation Study", status: "FLAGGED · single-centre, non-Indian cohort", statusTone: "flagged", body: ["Retrospective evaluation against expert colposcopy reference.", "Single centre; cohort is non-Indian. This is why the readiness", "engine marks G1 (independent validation) as a firm-up.", ...COMMON] },
  { file: "cerviai-cdsco-md15.pdf", title: "CerviAI — CDSCO MD-15 Licence", status: "PRESENT", statusTone: "present", body: ["Manufacturing / import licence document on file for the intended use.", ...COMMON] },
  { file: "cerviai-dpdp-policy.pdf", title: "CerviAI — DPDP Privacy Policy", status: "FLAGGED · secondary environment outside India", statusTone: "flagged", body: ["Data-handling policy on file. A secondary processing environment is", "hosted outside India — this is why G15 (DPDP residency) is a firm-up.", ...COMMON] },
  { file: "cerviai-clinical-eval-report.pdf", title: "CerviAI — Clinical Evaluation Report", status: "PRESENT", statusTone: "present", body: ["Intended use, performance summary, and known limitations documented.", ...COMMON] },
  { file: "cerviai-ethics-approval.pdf", title: "CerviAI — Ethics Approval", status: "PRESENT", statusTone: "present", body: ["Institutional ethics review of the pilot protocol on file.", ...COMMON] },

  // ChestXR-TB — clean, complete set.
  { file: "chestxr-validation-study.pdf", title: "ChestXR-TB — Independent Validation Study", status: "PRESENT · multi-centre incl. Indian sites", statusTone: "present", body: ["Multi-centre validation including Indian sites.", "Sensitivity ~0.94; specificity ~0.88.", ...COMMON] },
  { file: "chestxr-cdsco-licence.pdf", title: "ChestXR-TB — CDSCO Licence", status: "PRESENT", statusTone: "present", body: ["Licence document on file for the intended use.", ...COMMON] },
  { file: "chestxr-dpdp-policy.pdf", title: "ChestXR-TB — DPDP Privacy Policy", status: "PRESENT · India residency", statusTone: "present", body: ["DPDP-aligned; data residency within India.", ...COMMON] },
  { file: "chestxr-clinical-eval-report.pdf", title: "ChestXR-TB — Clinical Evaluation Report", status: "PRESENT", statusTone: "present", body: ["Clinical evidence collated for the intended use.", ...COMMON] },
  { file: "chestxr-ethics-approval.pdf", title: "ChestXR-TB — Ethics Approval", status: "PRESENT", statusTone: "present", body: ["Ethics review of the pilot protocol on file.", ...COMMON] },
  { file: "chestxr-user-manual.pdf", title: "ChestXR-TB — User Manual", status: "PRESENT", statusTone: "present", body: ["Operator quick-start guide.", ...COMMON] },

  // SymptomBot — three docs on file, all with caveats (flagged).
  { file: "symptombot-dpdp-policy.pdf", title: "SymptomBot — DPDP Privacy Policy", status: "FLAGGED · consent basis unclear", statusTone: "flagged", body: ["Data-handling policy for the patient-facing chat assistant.", "Consent basis for processing is unclear (relates to G14).", ...COMMON] },
  { file: "symptombot-user-manual.pdf", title: "SymptomBot — User Manual", status: "FLAGGED · no clinician override", statusTone: "flagged", body: ["Patient guide to the symptom checker.", "No clinician guidance / override pathway described (relates to G2).", ...COMMON] },
  { file: "symptombot-clinical-eval-report.pdf", title: "SymptomBot — Internal Evaluation", status: "FLAGGED · internal, not independent", statusTone: "flagged", body: ["Internal evaluation of the triage suggestions.", "Not an independent study (relates to G1).", ...COMMON] },

  // RetinaScan — kept consistent (out of the 3-tool demo scope).
  { file: "retinascan-validation-study.pdf", title: "RetinaScan — Independent Validation Study", status: "FLAGGED · predicate-based", statusTone: "flagged", body: ["Predicate-based evidence; local validation firming up (G1).", ...COMMON] },
  { file: "retinascan-dpdp-policy.pdf", title: "RetinaScan — DPDP Privacy Policy", status: "PRESENT", statusTone: "present", body: ["DPDP-aligned data-handling policy.", ...COMMON] },
  { file: "retinascan-user-manual.pdf", title: "RetinaScan — User Manual", status: "PRESENT", statusTone: "present", body: ["Operator quick-start guide.", ...COMMON] },
];

async function build(doc: Doc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 56;
  let y = 780;

  page.drawText("CLEARPATH", { x: left, y, size: 10, font: sansBold, color: TEAL });
  y -= 40;
  page.drawText(doc.title, { x: left, y, size: 20, font: serif, color: INK });
  y -= 24;
  page.drawText(`Status: ${doc.status}`, {
    x: left,
    y,
    size: 11,
    font: sansBold,
    color: doc.statusTone === "flagged" ? AMBER : GREEN,
  });
  y -= 16;
  page.drawRectangle({ x: left, y, width: 595 - left * 2, height: 0.6, color: rgb(0.85, 0.836, 0.784) });
  y -= 26;

  for (const line of doc.body) {
    page.drawText(line, { x: left, y, size: 11, font: sans, color: line ? INK : MUTED });
    y -= 18;
  }

  page.drawText("Placeholder document · ClearPath demo · not a real regulatory record", {
    x: left,
    y: 40,
    size: 8,
    font: sans,
    color: MUTED,
  });
  return pdf.save();
}

async function main() {
  const outDir = join(process.cwd(), "public", "sample-docs");
  mkdirSync(outDir, { recursive: true });
  let written = 0;
  let skipped = 0;
  for (const doc of DOCS) {
    const target = join(outDir, doc.file);
    if (existsSync(target)) {
      console.log(`• skip (exists) ${doc.file}`);
      skipped += 1;
      continue;
    }
    writeFileSync(target, await build(doc));
    console.log(`✓ ${doc.file}`);
    written += 1;
  }
  console.log(`\nWrote ${written}, skipped ${skipped} existing, in public/sample-docs/`);
}

main();
