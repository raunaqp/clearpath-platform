/**
 * S27 — the review schedule and its triggers.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * A TRIGGER THAT ONLY POSTS A NOTICE IS A TRIGGER NOBODY ACTS ON
 * ─────────────────────────────────────────────────────────────────────────
 * Every trigger here declares an EFFECT — suspend the card, pause the run,
 * expire the listing, stop immediately. The screen shows the state change, not
 * just that something was noticed. "We will review this" is what a governance
 * process says when it has no mechanism.
 *
 * Nothing in the build had a trigger concept before this. It is not an
 * extension of the review points on a charter: those end a trial, these watch
 * a tool that is already running and decide when it has to be looked at again.
 */

import type { ReviewTrigger, TriggerEffect } from "@/lib/schemas/outcome";
import { getCardV2 } from "@/lib/mock/cards-v2";
import { buildCharter } from "@/lib/mock/governance";
import { currentOutcome } from "@/lib/mock/outcome";
import { CLOSEOUT_FIXTURES } from "@/lib/mock/fixtures/outcomes";
import { softenCertainty } from "./soften-certainty";

export const TRIGGER_EFFECT_LABEL: Record<TriggerEffect, string> = {
  REVIEW_ON_SCHEDULE: "Committee sits on the date",
  SUSPEND_CARD: "Card validity suspends",
  PAUSE_RUN: "Run pauses",
  EXPIRE_LISTING: "Listing moves to expired",
  STOP_IMMEDIATELY: "Immediate stop",
  FLAG_FOR_REVIEW: "Tool flagged for review",
  BRING_REVIEW_FORWARD: "Scheduled review brought forward",
};

/** Weekly screens below this and the scheduled review comes forward. */
export const USAGE_FLOOR_PER_WEEK = 40;

/**
 * Build the trigger set for a tool.
 *
 * UNDEFINED WITHOUT A CARD. Every trigger here watches something about a card
 * — its validity, its expiry, the model version it was issued against. Arming
 * a trigger against a card that does not exist would be watching nothing and
 * saying so confidently.
 */
export function buildReviewTriggers(slug: string): ReviewTrigger[] | undefined {
  const view = getCardV2(slug);
  if (!view) return undefined;

  const outcome = currentOutcome(slug);
  const charter = buildCharter(slug);
  const closeout = CLOSEOUT_FIXTURES[slug];

  const scheduledAt =
    closeout?.nextReviewAt ??
    outcome?.extension?.reviewOn ??
    outcome?.adoption?.reviewOn ??
    null;

  const triggers: ReviewTrigger[] = [];

  if (scheduledAt) {
    triggers.push({
      kind: "SCHEDULED_REVIEW",
      label: "Scheduled review",
      state: "due",
      watching: "The review date set when the outcome was decided.",
      dueAt: scheduledAt,
      // Nothing changes before the date. A scheduled review that suspended
      // something on arming would be a stop rule wearing a calendar.
      effects: ["REVIEW_ON_SCHEDULE"],
      consequence: softenCertainty(
        "The committee sits and the tool's status is decided again. Nothing suspends in the meantime."
      ),
    });
  }

  triggers.push({
    kind: "MODEL_VERSION_CHANGE",
    label: "Model version change",
    state: "armed",
    watching: charter?.commitments.modelVersionFrozen
      ? `Model frozen for the duration — ${view.card.modelVersion || "version not stated"}.`
      : `Model version ${view.card.modelVersion || "not stated"}.`,
    dueAt: null,
    /*
      Both effects, and the order matters. A card is a claim about a specific
      model build; a different build has not been assessed, so the card cannot
      speak for it and the run cannot continue on it.
    */
    effects: ["SUSPEND_CARD", "PAUSE_RUN"],
    consequence: softenCertainty(
      "Card validity suspends and the run pauses pending a delta re-assessment. The card was issued against this build and says nothing about another."
    ),
  });

  triggers.push({
    kind: "CARD_EXPIRY",
    label: "Card expiry",
    state: "due",
    watching: "The expiry the card carries.",
    dueAt: view.card.expiresAt,
    effects: ["EXPIRE_LISTING"],
    consequence: softenCertainty(
      "The marketplace listing moves to expired and re-assessment is required before it returns."
    ),
  });

  triggers.push({
    kind: "MATERIAL_SAFETY_EVENT",
    label: "Material safety event",
    state: "armed",
    watching: charter?.stops.safety ?? "Any event attributable to a tool output.",
    dueAt: null,
    effects: ["STOP_IMMEDIATELY", "FLAG_FOR_REVIEW"],
    consequence: softenCertainty(
      "The tool stops the same day and the committee sits within 7 days. This one does not wait for a scheduled review."
    ),
  });

  if (closeout) {
    triggers.push({
      kind: "OWNER_VACANT",
      label: "Owner vacant",
      state: "armed",
      watching: `Owner ${closeout.performanceMonitoring.name}, and every other named post on the closeout.`,
      dueAt: null,
      effects: ["FLAG_FOR_REVIEW", "PAUSE_RUN"],
      consequence: softenCertainty(closeout.ownerVacancyTrigger),
    });
  }

  triggers.push({
    kind: "USAGE_BELOW_FLOOR",
    label: "Usage below floor",
    state: "armed",
    watching: `Floor ${USAGE_FLOOR_PER_WEEK} screens per week.`,
    dueAt: null,
    effects: ["BRING_REVIEW_FORWARD"],
    consequence: softenCertainty(
      "The scheduled review is brought forward. A tool nobody is using is not a tool that is working."
    ),
  });

  return triggers;
}

/**
 * What a tool's card and run look like once a trigger has fired.
 *
 * The scenario selector on S27 drives this. Showing the notice without the
 * state change would teach a reader that a trigger is an announcement.
 */
export type TriggeredState = {
  cardStatus: "valid" | "suspended" | "expired";
  runStatus: "running" | "paused" | "stopped";
  listingStatus: "listed" | "expired";
  reviewStatus: "scheduled" | "brought forward" | "within 7 days";
};

export const STEADY_STATE: TriggeredState = {
  cardStatus: "valid",
  runStatus: "running",
  listingStatus: "listed",
  reviewStatus: "scheduled",
};

export function applyTrigger(trigger: ReviewTrigger): TriggeredState {
  const next: TriggeredState = { ...STEADY_STATE };
  for (const e of trigger.effects) {
    if (e === "REVIEW_ON_SCHEDULE") next.reviewStatus = "scheduled";
    if (e === "SUSPEND_CARD") next.cardStatus = "suspended";
    if (e === "PAUSE_RUN") next.runStatus = "paused";
    if (e === "EXPIRE_LISTING") { next.cardStatus = "expired"; next.listingStatus = "expired"; }
    if (e === "STOP_IMMEDIATELY") { next.runStatus = "stopped"; next.reviewStatus = "within 7 days"; }
    if (e === "FLAG_FOR_REVIEW" && next.reviewStatus === "scheduled") next.reviewStatus = "brought forward";
    if (e === "BRING_REVIEW_FORWARD") next.reviewStatus = "brought forward";
  }
  return next;
}
