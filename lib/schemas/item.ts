import { z } from "zod";
import { DimensionIdEnum } from "./readiness-card";
import { EvidenceTypeEnum } from "./evidence";

/**
 * Assessment item — one of the 112 criteria in the Maturity Assessment
 * Framework (see /framework for the authoritative cluster table).
 *
 * STUBS. Most items ship with `text: null` and `status: "draft"`. That is
 * deliberate and it is not a placeholder to be filled in with something
 * plausible. These are real assessment criteria that go in front of hospitals;
 * an invented item that reads well is worse than an obvious blank, because a
 * blank gets authored and a plausible fake gets used. A stub renders as "Item
 * pending definition" and is excluded from every scoring denominator.
 *
 * GATES ARE A SUBSET. `isGate` marks the 17 items the platform gates on today.
 * They are a focused subset of the 112 items — they are NOT the clusters, and
 * they are not one-to-one with them. /framework says so explicitly and this
 * model keeps that true.
 */

/** "BOTH" is the default. D2's public clusters are PUBLIC; GP1-GP5 are PRIVATE. */
export const ItemPathEnum = z.enum(["BOTH", "PUBLIC", "PRIVATE"]);
export type ItemPath = z.infer<typeof ItemPathEnum>;

/** draft = stub, not yet authored. active = has text and can be scored. */
export const ItemStatusEnum = z.enum(["draft", "active"]);
export type ItemStatus = z.infer<typeof ItemStatusEnum>;

export const AssessmentItemSchema = z.object({
  /** Stable id, e.g. "D1.C.03". Filling a stub is a text edit, not a renumber. */
  id: z.string(),
  dimension: DimensionIdEnum,
  /** e.g. "D1.C" — matches a cluster code on /framework. */
  clusterCode: z.string(),
  /** null = stub, not yet authored. Never invent this. */
  text: z.string().nullable(),
  status: ItemStatusEnum,
  isGate: z.boolean(),
  path: ItemPathEnum,
  acceptsEvidence: z.array(EvidenceTypeEnum),
  /** What to do about it. null on stubs. */
  fix: z.string().nullable(),
  /** G1..G17 / GP1..GP5, where this item carries a legacy 17-gate question. */
  legacyGateId: z.string().optional(),
});
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>;

/** An item is scoreable only if it has actually been authored. */
export function isScoreable(item: AssessmentItem): boolean {
  return item.status === "active" && item.text !== null;
}

/** What a stub renders as. Single source, so no screen invents its own wording. */
export const STUB_LABEL = "Item pending definition";
