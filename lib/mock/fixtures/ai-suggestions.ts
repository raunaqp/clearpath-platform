/**
 * Mock "AI suggestion" TL;DRs (BUILD_SPEC — audit AI summary). One pre-written
 * summary per tool, presented as an AI-generated suggestion over the submitted
 * documents. This is the ONLY place the text lives — `getAiSuggestion` in the
 * api reads it, so the source can later be swapped for a real model call with
 * no UI changes.
 */
export const AI_SUGGESTIONS: Record<string, string> = {
  "tool-cerviai":
    "Strong tool; firm up Indian-population validation and data residency before scaling. Evidence, safety and workflow are solid — the two open items are the independent-validation cohort and DPDP residency.",
  "tool-chestxr":
    "Complete evidence set — multi-centre validation including Indian sites, CDSCO licence and DPDP-aligned residency on file. Looks deployable at PHC screening with standard monitoring.",
  "tool-symptombot":
    "Insufficient evidence and no CDSCO licence — not deployable yet. No independent validation, no clinician override, and no informed-consent basis on file; treat as early-stage.",
};

/** Fallback for tools without a hand-written suggestion (e.g. custom submissions). */
export function fallbackSuggestion(toolName: string): string {
  return `Automated summary for ${toolName} is not available in this demo. Review the attached documents and score each gate against them.`;
}
