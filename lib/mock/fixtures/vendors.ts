import type { Vendor } from "@/lib/schemas/vendor";

/** Seed vendors — one per tool (BUILD_SPEC §6). */
export const VENDORS: Vendor[] = [
  {
    id: "vendor-cerviai",
    name: "CerviAI Health",
    founder: "Dr. Ananya Rao",
    description:
      "AI-assisted cervical cancer screening from colposcopy and VIA images, built for high-volume community screening.",
    website: "cerviai.example.in",
  },
  {
    id: "vendor-chestxr",
    name: "ChestXR Labs",
    founder: "Rahul Menon",
    description:
      "Chest X-ray triage AI for tuberculosis screening in primary care and camp settings.",
    website: "chestxr.example.in",
  },
  {
    id: "vendor-symptombot",
    name: "SymptomBot",
    founder: "Kavya Iyer",
    description:
      "Patient-facing symptom checker and triage assistant delivered over chat.",
    website: "symptombot.example.in",
  },
  {
    id: "vendor-retinascan",
    name: "RetinaScan AI",
    founder: "Dr. Vikram Shah",
    description:
      "Point-of-care diabetic retinopathy detection from fundus images for PHC-level screening.",
    website: "retinascan.example.in",
  },
  {
    id: "vendor-embryograde",
    name: "EmbryoGrade AI",
    founder: "Dr. Neha Kulkarni",
    description:
      "AI embryo assessment from time-lapse imaging to support blastocyst selection in IVF.",
    website: "embryograde.example.in",
  },
  {
    id: "vendor-ovareserve",
    name: "OvaReserve",
    founder: "Dr. Sameer Joshi",
    description:
      "Ovarian-reserve prediction from hormone panels and antral follicle counts to guide stimulation protocols.",
    website: "ovareserve.example.in",
  },
];
