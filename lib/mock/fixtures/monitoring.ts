import type { Deployment } from "@/lib/schemas/deployment";

/**
 * Mock monitoring time-series for the governance dashboard (the idiom of
 * Ferrum / Aidoc / Parachute post-deployment monitoring). Deterministic — no
 * randomness — so the charts are stable. Swappable for real telemetry later.
 */
export type PerfPoint = { week: string; sensitivity: number; specificity: number };
export type DriftPoint = { week: string; dataJsd: number; predJsd: number };
export type SubgroupPoint = { group: string; sensitivity: number; n: number };

export type MonitoringData = {
  performance: PerfPoint[];
  drift: DriftPoint[];
  subgroups: SubgroupPoint[];
  /** Thresholds drawn as reference lines. */
  thresholds: { sensitivity: number; jsd: number };
};

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

export function buildMonitoring(dep: Deployment): MonitoringData {
  const hasReferralGap = dep.alerts.some((a) => /referral/i.test(a.title));

  // Sensitivity drifts very slightly; specificity stable.
  const sensBase = [0.91, 0.9, 0.92, 0.9, 0.89, 0.9, 0.91, 0.9];
  const specBase = [0.86, 0.87, 0.86, 0.85, 0.86, 0.86, 0.87, 0.86];
  const performance: PerfPoint[] = WEEKS.map((week, i) => ({
    week,
    sensitivity: sensBase[i],
    specificity: specBase[i],
  }));

  // Drift: data JSD ticks up around W5–W6 (a mild distribution shift); a tool
  // with an open referral gap shows a slightly larger prediction-drift bump.
  const dataJsd = [0.02, 0.03, 0.03, 0.04, 0.06, 0.07, 0.05, 0.04];
  const predBump = hasReferralGap ? 0.09 : 0.05;
  const predJsd = [0.02, 0.02, 0.03, 0.04, 0.06, predBump, 0.06, 0.05];
  const drift: DriftPoint[] = WEEKS.map((week, i) => ({ week, dataJsd: dataJsd[i], predJsd: predJsd[i] }));

  // Subgroup fairness — one subgroup lags (the fairness signal).
  const subgroups: SubgroupPoint[] = [
    { group: "Age < 40", sensitivity: 0.92, n: 180 },
    { group: "Age 40–60", sensitivity: 0.9, n: 260 },
    { group: "Age > 60", sensitivity: 0.85, n: 140 },
    { group: "PHC site", sensitivity: 0.9, n: 320 },
    { group: "Camp site", sensitivity: 0.87, n: 260 },
  ];

  return { performance, drift, subgroups, thresholds: { sensitivity: 0.85, jsd: 0.1 } };
}
