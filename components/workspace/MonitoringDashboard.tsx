"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import type { Alert } from "@/lib/schemas/deployment";
import type { MonitoringData } from "@/lib/mock/fixtures/monitoring";
import { getMonitoring } from "@/lib/mock/api";
import { cn } from "@/lib/utils";

/**
 * Governance monitoring dashboard (Ferrum / Aidoc / Parachute idiom) — an
 * interactive read on a live model: performance over time, drift (data +
 * prediction JSD), subgroup fairness, and an alerts feed with escalation.
 */
const TEAL = "#0F6E56";
const AMBER = "#BA7517";
const CORAL = "#993C1D";
const GREEN = "#3B6D11";
const LINE = "#D9D5C8";

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm text-ink">{title}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function MonitoringDashboard({ deploymentId, alerts }: { deploymentId: string; alerts: Alert[] }) {
  const [data, setData] = useState<MonitoringData | null>(null);

  useEffect(() => { void getMonitoring(deploymentId).then((d) => setData(d ?? null)); }, [deploymentId]);

  if (!data) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;

  const axis = { fontSize: 11, fill: "#6B766F" };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Performance over time */}
        <Panel title="Performance over time" hint="weekly · threshold 0.85">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.performance} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={axis} tickLine={false} axisLine={{ stroke: LINE }} />
              <YAxis domain={[0.8, 1]} tick={axis} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderColor: LINE, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={data.thresholds.sensitivity} stroke={CORAL} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="sensitivity" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="specificity" stroke={AMBER} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        {/* Drift */}
        <Panel title="Drift — data & prediction (JSD)" hint="in band < 0.10">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.drift} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={axis} tickLine={false} axisLine={{ stroke: LINE }} />
              <YAxis domain={[0, 0.15]} tick={axis} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderColor: LINE, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={data.thresholds.jsd} stroke={CORAL} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="dataJsd" name="data JSD" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="predJsd" name="prediction JSD" stroke={CORAL} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        {/* Subgroup fairness */}
        <Panel title="Performance by subgroup (fairness)" hint="sensitivity · threshold 0.85">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.subgroups} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="group" tick={{ ...axis, fontSize: 10 }} tickLine={false} axisLine={{ stroke: LINE }} interval={0} />
              <YAxis domain={[0.7, 1]} tick={axis} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderColor: LINE, borderRadius: 8 }} />
              <ReferenceLine y={data.thresholds.sensitivity} stroke={CORAL} strokeDasharray="4 4" />
              <Bar dataKey="sensitivity" radius={[3, 3, 0, 0]}>
                {data.subgroups.map((s, i) => (
                  <Cell key={i} fill={s.sensitivity < data.thresholds.sensitivity ? CORAL : GREEN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Alerts feed */}
        <Panel title="Alerts feed" hint={`${alerts.length} open`}>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted">No open alerts.</p>
            ) : alerts.map((a) => (
              <div key={a.id} className="rounded-md border border-line-soft p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn("h-4 w-4", a.severity === "high" ? "text-coral-brand" : "text-amber-brand")} />
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", a.severity === "high" ? "bg-coral-light text-coral-brand" : "bg-amber-light text-amber-brand")}>{a.severity}</span>
                </div>
                <p className="mt-1 text-xs text-ink-2">{a.detail}</p>
                <p className="mt-1 text-xs text-muted">Escalation: {a.escalation}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
