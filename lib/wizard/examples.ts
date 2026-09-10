import type { CreateAssessmentInput } from "@/lib/mock/store";
import { VENDORS } from "@/lib/mock/fixtures/vendors";
import { TOOLS } from "@/lib/mock/fixtures/tools";
import { TOOL_GATE_ANSWERS } from "@/lib/mock/fixtures/gate-answers";

/**
 * "Load an example" presets (BUILD_SPEC §3.1) — prefill the whole wizard from a
 * seed tool so the demo is one click. Built from the same fixtures + gate
 * answers the store seeds, so the generated card matches the story.
 */
export type WizardExample = {
  key: string;
  /** The seeded card this example already has. Lets the button land on it. */
  slug: string;
  label: string;
  hint: string;
  /** The build being assessed. The card header renders it. */
  toolVersion?: string;
  /** The model build behind it, where there is one. */
  modelVersion?: string;
  input: CreateAssessmentInput;
};

/** Versions for the seeded examples, matching their v2 fixtures. */
const EXAMPLE_VERSIONS: Record<string, { toolVersion: string; modelVersion: string }> = {
  "tool-cerviai": { toolVersion: "2.3.1", modelVersion: "cerv-vision-2026.07" },
  "tool-retinascan": { toolVersion: "1.8", modelVersion: "retina-dr-2026.03" },
};

function build(toolId: string, hint: string): WizardExample {
  const tool = TOOLS.find((t) => t.id === toolId)!;
  const vendor = VENDORS.find((v) => v.id === tool.vendorId)!;
  return {
    key: toolId,
    slug: tool.slug,
    label: tool.name,
    hint,
    ...EXAMPLE_VERSIONS[toolId],
    input: {
      vendor: {
        name: vendor.name,
        founder: vendor.founder,
        description: vendor.description,
        website: vendor.website,
      },
      tool: {
        name: tool.name,
        category: tool.category,
        scopedFeature: tool.scopedFeature,
        description: tool.description,
        intendedUse: tool.intendedUse,
        careLevel: tool.careLevel,
        docIds: [...tool.docIds],
      },
      gateAnswers: { ...TOOL_GATE_ANSWERS[toolId] },
    },
  };
}

export const WIZARD_EXAMPLES: WizardExample[] = [
  build("tool-cerviai", "Cervical screening AI → deploy with conditions"),
  build("tool-chestxr", "TB screening → deploy"),
  build("tool-symptombot", "Patient symptom checker → not yet"),
];
