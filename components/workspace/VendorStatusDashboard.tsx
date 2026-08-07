"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Tool } from "@/lib/schemas/tool";
import type { Submission } from "@/lib/schemas/submission";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Deployment } from "@/lib/schemas/deployment";
import {
  getToolBySlug, getSubmissionsByToolId, getHospital, getDeploymentBySubmission,
} from "@/lib/mock/api";
import { stageIndex } from "@/lib/vendor/stage";
import { StageTimeline } from "@/components/vendor/StageTimeline";

/**
 * Vendor status dashboard (read-only). Viewing as Vendor, a tool shows where it
 * is in each hospital's pipeline — a light stage timeline + a few headline
 * numbers. No monitoring charts, no documents, no workspace controls.
 */
type Row = { submission: Submission; hospital: Hospital | null; deployment: Deployment | null };

export default function VendorStatusDashboard() {
  const { deploymentId: slug } = useParams<{ deploymentId: string }>();
  const [tool, setTool] = useState<Tool | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const t = await getToolBySlug(slug);
      if (!t) { if (live) setRows([]); return; }
      const subs = await getSubmissionsByToolId(t.id);
      const resolved = await Promise.all(
        subs.map(async (submission) => {
          const [hospital, deployment] = await Promise.all([
            getHospital(submission.hospitalId),
            getDeploymentBySubmission(submission.id),
          ]);
          return { submission, hospital: hospital ?? null, deployment: deployment ?? null };
        })
      );
      if (!live) return;
      setTool(t);
      setRows(resolved);
    })();
    return () => { live = false; };
  }, [slug]);

  if (rows === null) return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/registry" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Registry
      </Link>
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">Deployment status · read-only</p>
        <h1 className="font-serif text-3xl text-ink">{tool?.name ?? "Tool"}</h1>
        <p className="text-sm text-muted">Where your tool is in each hospital's pipeline.</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-bg-card px-4 py-12 text-center text-sm text-muted">
          Not yet sent to any hospital.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <HospitalStatusCard key={row.submission.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function HospitalStatusCard({ row }: { row: Row }) {
  const { submission, hospital, deployment } = row;
  const { declined } = stageIndex(submission);
  const enrol = deployment?.metrics.find((m) => m.key === "enrolment");
  const alerts = deployment?.metrics.find((m) => m.key === "alerts");

  return (
    <div className="rounded-card border border-line bg-bg-card p-5">
      <p className="mb-3 text-sm font-medium text-ink">{hospital?.name ?? "—"}</p>

      {/* Light stage timeline */}
      <StageTimeline submission={submission} />

      {/* Headline numbers (only once a pilot exists) */}
      {deployment ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric label="Enrolment" value={enrol?.value ?? "—"} />
          <Metric label="Day" value={`${deployment.dayOf} of ${deployment.totalDays}`} />
          <Metric label="Open alerts" value={alerts?.value ?? "0"} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">{declined ? "Declined by this hospital." : "Awaiting the hospital's decision."}</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-0.5 font-serif text-lg text-ink">{value}</p>
    </div>
  );
}
