import * as assessor from "./assessor";

function latency<T>(value: T): Promise<T> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const getQueue = () => latency(assessor.assessorQueue());
export const getItemsForReview = (slug: string) => latency(assessor.itemsForReview(slug));
export const getCarriedForward = (slug: string) => latency(assessor.carriedForwardCount(slug));
export const getCurrentReview = (slug: string) => latency(assessor.currentReview(slug));
export const recordReview = (i: assessor.RecordReviewInput) => latency(assessor.recordReview(i));
