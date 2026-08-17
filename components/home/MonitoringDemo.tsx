"use client";

import { useEffect, useState } from "react";
import type { Deployment } from "@/lib/schemas/deployment";
import { MonitoringDashboard } from "@/components/workspace/MonitoringDashboard";
import { getDeployment } from "@/lib/mock/api";
import { PreviewSpinner } from "./SiteReadinessDemo";

/**
 * Demo for brief §3.3 — the Monitoring · governance dashboard.
 *
 * Renders the REAL <MonitoringDashboard> from the trial workspace: performance
 * over time, data/prediction drift (JSD), subgroup fairness, and the alerts
 * feed. Wired to the CerviAI deployment fixture — the one the seed data leaves
 * mid-flight — so the charts show a live-looking pilot rather than an empty
 * state. Same component, same data path as `/workspace/[deploymentId]`.
 */
export function MonitoringDemo() {
  const [dep, setDep] = useState<Deployment | null>(null);

  useEffect(() => {
    let live = true;
    void getDeployment("deploy-cerviai").then((d) => {
      if (live) setDep(d ?? null);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!dep) return <PreviewSpinner />;
  return <MonitoringDashboard deploymentId={dep.id} alerts={dep.alerts} />;
}
