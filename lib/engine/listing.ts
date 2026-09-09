/**
 * S8 — the registry listing.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLISHING A LISTING IS AN EVENT, NOT A STATE TRANSITION
 * ─────────────────────────────────────────────────────────────────────────
 * A vendor listing a tool has DONE something; the tool has not BECOME
 * something. Its journey state stays "Assessed" — it has been assessed and
 * nothing more has happened to it. "Published" belongs to the outcome
 * write-back at S26, when a hospital has actually run the thing and reported
 * what happened, and using the word here would spend it on the wrong event.
 *
 * The distinction is what makes the registry a discovery layer rather than a
 * results archive: a tool is findable long before any hospital outcome exists,
 * and the listing has to say plainly that no outcome exists yet.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE WHOLE VERDICT OR NOTHING
 * ─────────────────────────────────────────────────────────────────────────
 * A listing cannot be built from a card stripped of its conditions or its
 * limitations. A vendor publishing "CONDITIONALLY DEPLOYABLE" without the
 * conditions has published a verdict with its meaning removed — and the
 * limitations are the honest counterweight that stops a hospital reading
 * silence as reassurance. `buildListing` throws rather than producing a
 * partial listing, because a partial listing looks exactly like a complete one.
 */

import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import { versionLabel } from "@/lib/schemas/readiness-card";
import type { Tool } from "@/lib/schemas/tool";
import { CARE_LEVEL_SHORT, OPERATOR_CADRE_LABEL } from "@/lib/schemas/context";
import { getItem } from "./item-bank";
import { softenCertainty } from "./soften-certainty";

/** The tool's journey state. Listing does not move it. */
export type ToolJourneyState = "Assessed" | "In trial" | "In deployment" | "Published";

export type ListedCondition = {
  gateId: string;
  itemId: string;
  label: string;
  blocks: "TRIAL" | "ROUTINE_DEPLOYMENT";
  status: "open" | "cleared";
};

export type Listing = {
  toolId: string;
  slug: string;
  toolName: string;
  /** "Listed" — the event. Never a journey state. */
  listingState: "Listed";
  listedAt: string;
  cardId: string;
  cardVersion: string;
  /** The tool's journey state, unchanged by listing. */
  toolState: ToolJourneyState;
  /** Null until a hospital has actually run it and reported. */
  hospitalOutcome: null;
  capability: string;
  requirements: string[];
  conditionsShown: ListedCondition[];
  /** Carried through from the card. A listing without it cannot render. */
  couldNotEstablish: string[];
  commercials: { model: string; consumables: string };
  supportModel: { field: string; replacement: string };
};

export type ListingInput = {
  card: ReadinessCard;
  tool: Tool;
  listedAt: string;
  requirements: string[];
  commercials: { model: string; consumables: string };
  supportModel: { field: string; replacement: string };
  toolState?: ToolJourneyState;
};

/**
 * A listing is only ever built from a WHOLE card. Both guards check for the
 * arrays' presence, not their length: a DEPLOYABLE card legitimately has zero
 * conditions, and an assessment that established everything legitimately has
 * nothing it could not establish. What is refused is a card that never carried
 * the fields at all.
 */
export function assertListable(card: ReadinessCard): void {
  if (!Array.isArray(card.conditions)) {
    throw new Error(
      "Listing: this card carries no conditions[]. A verdict published without its conditions is a verdict with its meaning removed."
    );
  }
  if (!Array.isArray(card.couldNotEstablish)) {
    throw new Error(
      "Listing: this card carries no couldNotEstablish[]. The limitations are what stop a reader taking silence for reassurance."
    );
  }
}

export function buildListing(input: ListingInput): Listing {
  const { card, tool } = input;
  assertListable(card);

  const capability = softenCertainty(
    [
      tool.description.replace(/\.$/, ""),
      CARE_LEVEL_SHORT[card.context.careLevel],
      OPERATOR_CADRE_LABEL[card.context.operatorCadre],
      tool.deviceClass,
    ]
      .filter(Boolean)
      .join(" · ")
  );

  return {
    toolId: tool.id,
    slug: tool.slug,
    toolName: tool.name,
    listingState: "Listed",
    listedAt: input.listedAt,
    cardId: card.id,
    cardVersion: versionLabel(card.version),
    toolState: input.toolState ?? "Assessed",
    hospitalOutcome: null,
    capability,
    requirements: input.requirements,
    conditionsShown: card.conditions.map((c) => ({
      gateId: getItem(c.itemId)?.legacyGateId ?? c.itemId,
      itemId: c.itemId,
      label: shortLabel(c.itemId),
      blocks: c.blocks,
      status: "open" as const,
    })),
    couldNotEstablish: card.couldNotEstablish,
    commercials: input.commercials,
    supportModel: input.supportModel,
  };
}

/** A short human label for a condition row. */
function shortLabel(itemId: string): string {
  const item = getItem(itemId);
  if (!item?.text) return itemId;
  const gate = item.legacyGateId;
  const LABELS: Record<string, string> = {
    G1: "India-population validation",
    G2: "Documented safe-fail behaviour",
    G3: "Realistic human-in-the-loop",
    G4: "Regulatory clearance for this use",
    G17: "Subgroup fairness",
    G5: "Programme priority",
    G6: "Operability in real conditions",
    G7: "Clean contractual exit",
    G8: "Actionable output",
    G9: "Net workload",
    G10: "Operator training",
    G11: "Operator value",
    G12: "Data ownership",
    G13: "Data portability",
    G14: "Consent basis",
    G15: "DPDP residency",
    G16: "Performance visibility",
  };
  return (gate && LABELS[gate]) ?? item.text.slice(0, 60);
}
