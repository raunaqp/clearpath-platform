/**
 * Handoff data surface. Separate from `api.ts` for the same reason
 * `api-registry.ts` is: every route compiles `api.ts`, so anything folded in
 * there slows every page in the app.
 */

import * as handoff from "./handoff";

function latency<T>(value: T): Promise<T> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const expressInterest = (i: handoff.ExpressInterestInput) =>
  latency(handoff.expressInterest(i));
export const getInterest = (slug: string) => latency(handoff.getInterest(slug));
export const getFacilitation = (slug: string) => latency(handoff.getFacilitation(slug));
export const isRequestFormOpen = (slug: string) => latency(handoff.isRequestFormOpen(slug));
export const createDeploymentRequest = (i: handoff.CreateRequestInput) =>
  latency(handoff.createDeploymentRequest(i));
export const getDeploymentRequest = (slug: string) => latency(handoff.getDeploymentRequest(slug));
export const getHandoffState = (slug: string) => latency(handoff.handoffState(slug));

export const recordTriage = (i: handoff.RecordTriageInput) => latency(handoff.recordTriage(i));
export const getTriage = (slug: string) => latency(handoff.getTriage(slug));
export const triageReturnForInnovator = (slug: string) =>
  latency(handoff.triageReturnForInnovator(slug));
