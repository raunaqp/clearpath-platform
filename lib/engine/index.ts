/**
 * Engine barrel — the pure logic layer (BUILD_SPEC §7).
 *
 * v2 (Phase 1): `item-bank.ts` is the source of truth for WHAT is assessed;
 * score / evidence / verdict / routing are the engines over it.
 *
 * v1: `gates.ts` still holds the 17-gate definitions the item bank seeds from,
 * and `legacy-gates.ts` is the ONLY producer of the old card shape. Nothing new
 * should read either directly.
 */
export * from "./gates";
export * from "./soften-certainty";
export * from "./readiness-tool";
export * from "./readiness-site";
export * from "./hospital-audit";

// v2 engines.
export * from "./item-bank";
export * from "./score";
/**
 * `verdict.ts` is re-exported by name: its `deriveVerdict` (v2, over the item
 * bank) collides with `readiness-tool.ts`'s `deriveVerdict` (v1, over 17 gate
 * results). Aliased rather than renamed at source, so neither file reads oddly
 * on its own.
 */
export {
  GATE_CLEARS_AT,
  buildGateSummary,
  deriveVerdict as deriveCardVerdict,
  buildConditions,
  computeExpiresAt,
  buildReadinessCard,
} from "./verdict";
export type { ExpiryDecision, CardInput } from "./verdict";
export * from "./routing";
export * from "./legacy-gates";
export {
  computeGeneralisability,
  computeExpiry,
  evaluateEvidence,
  evaluateAll,
  evidenceForItem,
  itemsWithEvidence,
  earliestRegulatoryExpiry,
  settingMatches,
  cadreMatches,
} from "./evidence";
