import type { Tool } from "@/lib/schemas/tool";

/**
 * Seed tools (BUILD_SPEC §6). Four tools whose gate answers (see
 * `gate-answers.ts`) drive these target verdicts through the real engine:
 *   CerviAI    → CONDITIONS
 *   ChestXR-TB → DEPLOY
 *   SymptomBot → NOT YET
 *   RetinaScan → CONDITIONS
 */
export const TOOLS: Tool[] = [
  {
    id: "tool-cerviai",
    slug: "cerviai",
    vendorId: "vendor-cerviai",
    name: "CerviAI",
    category: "screening",
    description:
      "AI-assisted cervical cancer screening from VIA / colposcopy images.",
    intendedUse:
      "Assist screening nurses in flagging cervical abnormalities for colposcopy referral in community screening camps.",
    careLevel: "community",
    deviceClass: "Class C",
    bodhScore: { accuracy: 90, fairness: 88, safety: 92 },
    docIds: [
      "cerviai-validation",
      "cerviai-cdsco",
      "cerviai-dpdp",
      "cerviai-eval",
      "cerviai-ethics",
    ],
  },
  {
    id: "tool-chestxr",
    slug: "chestxr",
    vendorId: "vendor-chestxr",
    name: "ChestXR-TB",
    category: "screening",
    description: "Chest X-ray triage AI for tuberculosis screening.",
    intendedUse:
      "Triage chest X-rays at PHC and screening camps to prioritise likely-TB cases for confirmatory testing.",
    careLevel: "primary",
    deviceClass: "Class B",
    bodhScore: { accuracy: 94, fairness: 91, safety: 95 },
    docIds: ["chestxr-validation", "chestxr-cdsco", "chestxr-dpdp", "chestxr-eval"],
  },
  {
    id: "tool-symptombot",
    slug: "symptombot",
    vendorId: "vendor-symptombot",
    name: "SymptomBot",
    category: "patient-facing",
    description: "Patient-facing symptom checker and triage assistant.",
    intendedUse:
      "Let patients self-triage symptoms over chat and suggest a level of care to seek.",
    careLevel: "home",
    deviceClass: "Class A",
    bodhScore: { accuracy: 62, fairness: 55, safety: 60 },
    docIds: [
      "symptombot-eval",
      "symptombot-dpdp",
      "symptombot-manual",
      "symptombot-validation",
      "symptombot-cdsco",
      "symptombot-ethics",
    ],
  },
  {
    id: "tool-retinascan",
    slug: "retinascan",
    vendorId: "vendor-retinascan",
    name: "RetinaScan",
    category: "point-of-care",
    description:
      "Point-of-care diabetic retinopathy detection from fundus images.",
    intendedUse:
      "Screen diabetic patients for referable retinopathy at PHC level and flag for ophthalmology referral.",
    careLevel: "primary",
    deviceClass: "Class C",
    bodhScore: { accuracy: 89, fairness: 76, safety: 88 },
    docIds: ["retinascan-validation", "retinascan-dpdp", "retinascan-manual"],
  },
  // ── Fertility / IVF specialty tools (Lakeview persona) ──────────────────────
  {
    id: "tool-embryograde",
    slug: "embryograde",
    vendorId: "vendor-embryograde",
    name: "EmbryoGrade AI",
    category: "samd",
    description:
      "AI embryo assessment from time-lapse imaging to support blastocyst selection.",
    intendedUse:
      "Assist embryologists in grading and ranking blastocysts for transfer during IVF cycles.",
    careLevel: "tertiary",
    deviceClass: "Class C",
    bodhScore: { accuracy: 86, fairness: 80, safety: 84 },
    docIds: ["embryograde-validation", "embryograde-eval"],
  },
  {
    id: "tool-ovareserve",
    slug: "ovareserve",
    vendorId: "vendor-ovareserve",
    name: "OvaReserve",
    category: "cds",
    description:
      "Ovarian-reserve prediction from hormone panels and antral follicle counts.",
    intendedUse:
      "Support fertility clinicians in tailoring ovarian-stimulation protocols to predicted reserve.",
    careLevel: "secondary",
    deviceClass: "Class B",
    bodhScore: { accuracy: 82, fairness: 78, safety: 85 },
    docIds: ["ovareserve-validation", "ovareserve-manual"],
  },
];
