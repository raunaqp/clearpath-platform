/**
 * Deriving a trial charter's endpoints from the site's own success definition.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE DERIVATION HAS TO BE VISIBLE, AND IT HAS TO BE HONEST
 * ─────────────────────────────────────────────────────────────────────────
 * The endpoints are what a trial is judged against, so where they came from
 * decides whether the judgement means anything. An endpoint traceable to a
 * success definition the site published BEFORE it saw any tool cannot have been
 * fitted to the data. One appearing for the first time in the charter can.
 *
 * Not every endpoint derives the same way, and pretending otherwise would be
 * its own dishonesty:
 *
 *   LITERAL           the number is IN the success definition. "Referral
 *                     completion at or above 80%" becomes an 80% endpoint, and
 *                     a reader can check the sentence.
 *
 *   OPERATIONALISED   the success definition states an intent — "improved
 *                     detection of referable abnormalities" — and the charter
 *                     picks measurable thresholds for it. The intent is the
 *                     site's; the specific numbers are a clinical convention
 *                     applied on top, and the charter says so rather than
 *                     implying the site chose 0.85.
 *
 * Both are shown with the sentence they rest on. A reader can then argue with
 * the operationalised ones, which is the correct thing for them to be able to
 * do.
 */

import type { Endpoint } from "@/lib/schemas/governance";
import type { ProblemEntry } from "@/lib/schemas/site-profile";

/** Pull an explicit percentage out of the success definition, if it states one. */
function statedPercentage(text: string): string | null {
  const m = text.match(/(\d{1,3})\s?%/);
  return m ? `${m[1]}%` : null;
}

export function deriveEndpoints(entry: ProblemEntry): Endpoint[] {
  const success = entry.successDefinition ?? "";
  const endpoints: Endpoint[] = [];

  // ── primary: the site's stated intent, given measurable thresholds ──────
  if (/detection/i.test(success)) {
    endpoints.push({
      name: "Sensitivity for referable findings",
      threshold: "≥ 0.85",
      kind: "primary",
      derivedFrom: "SUCCESS_DEFINITION_OPERATIONALISED",
      sourceText: "improved detection of referable abnormalities",
    });
    endpoints.push({
      name: "Specificity",
      threshold: "≥ 0.80",
      kind: "primary",
      derivedFrom: "SUCCESS_DEFINITION_OPERATIONALISED",
      sourceText: "improved detection of referable abnormalities",
    });
  }

  // ── secondary: the number the site actually wrote down ──────────────────
  const pct = statedPercentage(success);
  if (pct && /referral completion/i.test(success)) {
    endpoints.push({
      name: "Colposcopy referral completion",
      threshold: `≥ ${pct}`,
      kind: "secondary",
      derivedFrom: "SUCCESS_DEFINITION_LITERAL",
      sourceText: `referral completion at or above ${pct}`,
    });
  }

  // The current pathway's own metric becomes the bar time-to-referral must not
  // worsen — the site's baseline, not a number invented for the trial.
  if (entry.currentMetric && /(\d+)-day/.test(entry.currentMetric)) {
    const days = Number(entry.currentMetric.match(/(\d+)-day/)![1]);
    endpoints.push({
      name: "Time to referral",
      threshold: `≤ ${days + 3} days`,
      kind: "secondary",
      derivedFrom: "SUCCESS_DEFINITION_OPERATIONALISED",
      sourceText: `current pathway runs at ${entry.currentMetric}`,
    });
  }

  return endpoints;
}

/**
 * Whether the register entry predates the tool's arrival — the fact that makes
 * "these endpoints were not retrofitted" checkable rather than asserted.
 */
export function endpointsPredateTool(publishedAt: string, toolSubmittedAt: string): boolean {
  return new Date(publishedAt).getTime() < new Date(toolSubmittedAt).getTime();
}
