/**
 * Trial data surface — S21 telemetry, S22 monitoring provenance, S23 results.
 * Separate from `api.ts` for the reason every other surface is.
 */
import { CERVIAI_ACTUALS, CERVIAI_ADOPTION, CERVIAI_ALERTS, CERVIAI_ENDPOINT_RESULTS, CERVIAI_TELEMETRY } from "./fixtures/telemetry";
import { buildCharter, NORTHVALE_PLACEMENT } from "./governance";
import { getDeploymentRequest } from "./handoff";
import {
  actualsAgainstPlan,
  adoptionAgainstTaper,
  analyticalRecommendation,
  endpointResults,
  supportAtWeek,
  weekOfDay,
  type ActualVsEstimate,
  type EndpointResult,
} from "@/lib/engine/trial-report";
import type { AdoptionPoint, AlertRecord, TrialTelemetry } from "@/lib/schemas/telemetry";

function latency<T>(value: T): Promise<T> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type TrialView = {
  telemetry: TrialTelemetry;
  /** Support level in force today, and when it next steps down. */
  support: { level: string; nextTaperWeek: number | null; week: number };
  /** Export formats, read from the vendor's own request. */
  exportFormats: string[];
  alerts: AlertRecord[];
  adoption: AdoptionPoint[];
  endpoints: EndpointResult[];
  actuals: ActualVsEstimate[];
  conditionsSupplied: typeof CERVIAI_ACTUALS.conditionsSupplied;
  recommendation: string;
};

/**
 * Only CerviAI carries full trial telemetry. Other deployments keep the
 * existing workspace panels — seeding telemetry for every tool would be
 * fabricating operational detail for trials nobody is running.
 */
export function buildTrialView(slug: string): TrialView | undefined {
  if (slug !== "cerviai") return undefined;
  const charter = buildCharter(slug);
  if (!charter) return undefined;

  const t = CERVIAI_TELEMETRY;
  const week = weekOfDay(t.enrolment.dayOf);
  const taper = charter.commitments.supportTaper;
  const adoption = adoptionAgainstTaper(CERVIAI_ADOPTION, taper);
  const endpoints = endpointResults(charter, CERVIAI_ENDPOINT_RESULTS);
  const request = getDeploymentRequest(slug);

  return {
    telemetry: t,
    support: { ...supportAtWeek(taper, week), week },
    exportFormats: request?.dataExport.formats ?? [],
    alerts: CERVIAI_ALERTS,
    adoption,
    endpoints,
    actuals: actualsAgainstPlan({
      charter,
      placement: NORTHVALE_PLACEMENT,
      measuredLoadMin: CERVIAI_ACTUALS.nurseLoadMeasuredMin,
      costSpent: CERVIAI_ACTUALS.costSpent,
      costSpentDisplay: CERVIAI_ACTUALS.costSpentDisplay,
      costNote: CERVIAI_ACTUALS.costNote,
      adoption,
    }),
    conditionsSupplied: CERVIAI_ACTUALS.conditionsSupplied,
    recommendation: analyticalRecommendation(endpoints),
  };
}

export const getTrialView = (slug: string) => latency(buildTrialView(slug));
