/**
 * Reads for S24-S27. Split out of api.ts for the reason every other surface
 * was: every route compiles api.ts, and growing it made the browser suite's
 * timing flaky.
 */
import { buildOutcomeView, currentOutcome } from "./outcome";
import { buildReviewTriggers } from "@/lib/engine/review-triggers";
import { buildWriteBack } from "./registry-writeback";

function latency<T>(value: T): Promise<T> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const getOutcomeView = (slug: string) => latency(buildOutcomeView(slug));
export const getOutcome = (slug: string) => latency(currentOutcome(slug));
export const getReviewTriggers = (slug: string) => latency(buildReviewTriggers(slug));
export const getWriteBack = (slug: string) => latency(buildWriteBack(slug));
