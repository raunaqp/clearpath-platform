import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { AuditResult } from "@/lib/schemas/audit";
import type { SiteReadinessCard } from "@/lib/schemas/site";

/**
 * Certainty calibration post-processor — ported verbatim in spirit from the
 * ClearPath skill (§1). Every user-visible string the engine emits runs through
 * this so ClearPath never sounds more certain than the regulator: "likely",
 * "may", "based on submitted evidence" — never "definitely / must / guaranteed".
 */

const HARD_TO_SOFT: ReadonlyArray<readonly [string, string]> = [
  ["Class C SaMD", "likely Class B/C"],
  ["CDSCO required", "approval likely required"],
  ["is required", "is likely required"],
  ["you need to", "you likely need to"],
  ["must file", "typically files"],
  ["you must", "you likely need to"],
  ["will be", "is likely to be"],
  ["guaranteed", "expected based on submitted evidence"],
  ["definitely", "likely"],
  ["certainly", "likely"],
  ["absolutely", "likely"],
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match the leading-character case-style of the matched substring. */
function matchLeadingCase(matched: string, replacement: string): string {
  if (replacement.length === 0) return replacement;
  const first = matched.charAt(0);
  if (!/[A-Za-z]/.test(first)) return replacement;
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement.charAt(0).toLowerCase() + replacement.slice(1);
}

export function softenCertainty(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [hard, soft] of HARD_TO_SOFT) {
    const re = new RegExp(escapeRegex(hard), "gi");
    out = out.replace(re, (matched) => matchLeadingCase(matched, soft));
  }
  return out;
}

/** Apply softenCertainty to every user-visible field on a tool card. */
export function softenToolCard(card: ToolReadinessCard): ToolReadinessCard {
  return {
    ...card,
    summary: softenCertainty(card.summary),
    placement: softenCertainty(card.placement),
    gateResults: card.gateResults.map((g) => ({
      ...g,
      ...(g.note !== undefined ? { note: softenCertainty(g.note) } : {}),
    })),
    conditions: card.conditions.map((c) => ({
      ...c,
      fix: softenCertainty(c.fix),
    })),
  };
}

/** Apply softenCertainty to every user-visible field on an audit result. */
export function softenAuditResult(result: AuditResult): AuditResult {
  return {
    ...result,
    gateResults: result.gateResults.map((g) => ({
      ...g,
      ...(g.note !== undefined ? { note: softenCertainty(g.note) } : {}),
    })),
  };
}

/** Apply softenCertainty to a site card's gap fixes. */
export function softenSiteCard(card: SiteReadinessCard): SiteReadinessCard {
  return {
    ...card,
    gaps: card.gaps.map((g) => ({ ...g, fix: softenCertainty(g.fix) })),
  };
}
