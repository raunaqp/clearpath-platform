"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Tool } from "@/lib/schemas/tool";
import type { Vendor } from "@/lib/schemas/vendor";
import type { Submission } from "@/lib/schemas/submission";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Deployment } from "@/lib/schemas/deployment";
import {
  getSubmissions, getTool, getVendors, getHospitals, getDeploymentBySubmission,
} from "@/lib/mock/api";
import { useRole } from "@/lib/role/RoleContext";
import { stageIndex } from "@/lib/vendor/stage";
import { StageTimeline } from "@/components/vendor/StageTimeline";
import { cn } from "@/lib/utils";

/**
 * "My applications" — the vendor's mirror of the hospital inbox. One row per
 * tool-hospital pairing showing its pipeline stage + headline numbers; each row
 * opens the read-only vendor status dashboard for that tool.
 */
type Row = {
  submission: Submission;
  tool: Tool | null;
  hospital: Hospital | null;
  deployment: Deployment | null;
};

type Group = { tool: Tool; vendor: Vendor | null; rows: Row[] };

export default function MyApplicationsPage() {
  const { setRole } = useRole();
  useEffect(() => { setRole("vendor"); }, [setRole]);

  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [subs, vendors, hospitals] = await Promise.all([getSubmissions(), getVendors(), getHospitals()]);
      const rows: Row[] = await Promise.all(
        subs.map(async (submission) => {
          const [tool, deployment] = await Promise.all([
            getTool(submission.toolId),
            getDeploymentBySubmission(submission.id),
          ]);
          const hospital = hospitals.find((h) => h.id === submission.hospitalId) ?? null;
          return { submission, tool: tool ?? null, hospital, deployment: deployment ?? null };
        })
      );
      if (!live) return;
      // Group by tool; rows within a tool sorted by hospital name.
      const byTool = new Map<string, Row[]>();
      for (const r of rows) {
        if (!r.tool) continue;
        const list = byTool.get(r.tool.id) ?? [];
        list.push(r);
        byTool.set(r.tool.id, list);
      }
      const built: Group[] = [...byTool.entries()].map(([toolId, rs]) => {
        const tool = rs[0].tool!;
        const vendor = vendors.find((v) => v.id === tool.vendorId) ?? null;
        rs.sort((a, b) => (a.hospital?.name ?? "").localeCompare(b.hospital?.name ?? ""));
        return { tool, vendor, rows: rs };
      });
      built.sort((a, b) => a.tool.name.localeCompare(b.tool.name));
      setGroups(built);
    })();
    return () => { live = false; };
  }, []);

  const total = groups?.reduce((n, g) => n + g.rows.length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink">My applications</h1>
        <p className="text-sm text-muted">
          Every tool you&apos;ve submitted, and where it stands at each hospital. Open a row to see
          the live status.
        </p>
      </header>

      {groups === null ? (
        <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>
      ) : total === 0 ? (
        <div className="rounded-card border border-line bg-bg-card px-5 py-12 text-center">
          <p className="text-sm text-ink">You haven&apos;t submitted any tools yet.</p>
          <Link href="/submit" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-teal-deep px-3.5 py-2 text-sm text-white transition-opacity hover:opacity-90">
            Submit a tool
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.tool.id} className="space-y-2">
              <h2 className="flex flex-wrap items-baseline gap-2">
                <span className="font-serif text-lg text-ink">{g.tool.name}</span>
                <span className="text-xs text-muted">{g.vendor?.name}</span>
              </h2>
              <ul className="space-y-2">
                {g.rows.map((row) => (
                  <ApplicationRow key={row.submission.id} row={row} slug={g.tool.slug} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationRow({ row, slug }: { row: Row; slug: string }) {
  const { submission, hospital, deployment } = row;
  const { declined } = stageIndex(submission);
  const enrol = deployment?.metrics.find((m) => m.key === "enrolment");

  return (
    <li>
      <Link
        href={`/workspace/${slug}`}
        className="flex flex-col gap-3 rounded-card border border-line bg-bg-card p-4 transition-colors hover:border-teal-deep/40 hover:bg-bg-card sm:flex-row sm:items-center sm:gap-4"
      >
        {/* Hospital + request type */}
        <div className="min-w-0 sm:w-52">
          <p className="truncate text-sm font-medium text-ink">{hospital?.name ?? "—"}</p>
          {submission.requestType && (
            <span className="mt-0.5 inline-flex rounded-full bg-bg-sink px-1.5 py-0.5 text-[10px] text-ink-2">
              {submission.requestType === "trial" ? "Trial request" : "Deployment request"}
            </span>
          )}
        </div>

        {/* Stage timeline */}
        <div className="sm:flex-1">
          <StageTimeline submission={submission} />
        </div>

        {/* Headline numbers */}
        <div className="sm:w-36 sm:text-right">
          {deployment ? (
            <>
              {enrol && <p className="text-sm text-ink">{enrol.value}</p>}
              <p className="text-xs text-muted">Day {deployment.dayOf} of {deployment.totalDays}</p>
            </>
          ) : (
            <p className={cn("text-xs", declined ? "text-coral-brand" : "text-muted")}>
              {declined ? "Declined" : "Awaiting decision"}
            </p>
          )}
        </div>

        <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted sm:block" />
      </Link>
    </li>
  );
}
