"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, FlaskConical, Rocket, ArrowRight, Building2 } from "lucide-react";
import type { RegistryToolView, RegistryActivity } from "@/lib/registry";
import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import type { SiteListing } from "@/lib/schemas/site";
import type { Hospital } from "@/lib/schemas/hospital";
import { getRegistryView, getSiteListings, getHospitals } from "@/lib/mock/api";
import { VERDICT_STYLE, SITE_GRADE_STYLE } from "@/lib/ui";
import { cn } from "@/lib/utils";

const VERDICTS: (ToolVerdict | "ALL")[] = ["ALL", "DEPLOY", "CONDITIONS", "NOTYET"];
const ACTIVITY = [
  { value: "ALL", label: "All activity" },
  { value: "trials", label: "Has trials" },
  { value: "deployments", label: "Has deployments" },
  { value: "assessed", label: "Assessed only" },
];

const STATUS_STYLE: Record<RegistryToolView["currentStatus"], { label: string; tint: string }> = {
  ongoing: { label: "Ongoing", tint: "bg-amber-light text-amber-brand" },
  completed: { label: "Completed", tint: "bg-green-light text-green-dark" },
  assessed: { label: "Assessed", tint: "bg-bg-sink text-muted" },
};

function ActivityCell({ items }: { items: RegistryActivity[] }) {
  if (items.length === 0) return <span className="text-xs text-muted">— not done</span>;
  return (
    <div className="space-y-1.5">
      {items.map((a, i) => (
        <div key={i} className="text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink">{a.hospitalName}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", a.status === "completed" ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FAEEDA] text-[#BA7517]")}>{a.status}</span>
            {a.outcome && <span className="text-muted">· {a.outcome}</span>}
          </div>
          {a.detail && <p className="text-muted">{a.detail}</p>}
        </div>
      ))}
    </div>
  );
}

export default function RegistryPage() {
  const [rows, setRows] = useState<RegistryToolView[] | null>(null);
  const [sites, setSites] = useState<{ listing: SiteListing; hospital: Hospital | undefined }[]>([]);
  const [verdict, setVerdict] = useState<ToolVerdict | "ALL">("ALL");
  const [activity, setActivity] = useState("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => { void getRegistryView().then(setRows); }, []);
  useEffect(() => {
    void Promise.all([getSiteListings(), getHospitals()]).then(([listings, hospitals]) => {
      setSites(listings.map((listing) => ({ listing, hospital: hospitals.find((h) => h.id === listing.hospitalId) })));
    });
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (verdict !== "ALL" && r.verdict !== verdict) return false;
      if (activity === "trials" && r.trials.length === 0) return false;
      if (activity === "deployments" && r.deployments.length === 0) return false;
      if (activity === "assessed" && !r.assessedOnly) return false;
      if (q && !`${r.toolName} ${r.vendorName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, verdict, activity, query]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink">Registry</h1>
        <p className="text-sm text-muted">
          Where each tool has been trialled and deployed, and the outcome. Clinical trials and
          deployments are tracked as separate categories.
        </p>
      </header>

      {sites.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
            <Building2 className="h-3.5 w-3.5" /> Sites on the network
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {sites.map(({ listing, hospital }) => {
              const g = SITE_GRADE_STYLE[listing.grade];
              return (
                <div key={listing.hospitalId} className="rounded-card border border-line bg-bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{hospital?.name ?? listing.hospitalId}</p>
                    <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs", g.tint)}>
                      {listing.grade === "NOT_READY" ? "Developing" : g.label}
                    </span>
                  </div>
                  {hospital?.location && <p className="mt-0.5 text-xs text-muted">{hospital.location}</p>}
                  <p className="mt-2 text-sm text-ink-2">{listing.headline}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tool or vendor…" className="w-56 rounded-md border border-line bg-bg-card py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-muted" />
        </div>
        <select value={verdict} onChange={(e) => setVerdict(e.target.value as ToolVerdict | "ALL")} className="rounded-md border border-line bg-bg-card px-2.5 py-1.5 text-sm text-ink">
          {VERDICTS.map((v) => <option key={v} value={v}>{v === "ALL" ? "All verdicts" : VERDICT_STYLE[v].label}</option>)}
        </select>
        <select value={activity} onChange={(e) => setActivity(e.target.value)} className="rounded-md border border-line bg-bg-card px-2.5 py-1.5 text-sm text-ink">
          {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted">{rows ? `${filtered.length} of ${rows.length}` : "…"}</span>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-card text-left align-bottom text-[11px] font-mono uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 font-normal">Tool</th>
                <th className="px-3 py-2.5 font-normal">Vendor</th>
                <th className="px-3 py-2.5 font-normal">Verdict</th>
                <th className="px-3 py-2.5 font-normal">CDSCO class</th>
                <th className="px-3 py-2.5 font-normal">Status</th>
                <th className="px-3 py-2.5 font-normal"><span className="inline-flex items-center gap-1"><FlaskConical className="h-3 w-3" /> Clinical trials</span></th>
                <th className="px-3 py-2.5 font-normal"><span className="inline-flex items-center gap-1"><Rocket className="h-3 w-3" /> Deployments</span></th>
                <th className="px-3 py-2.5 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const v = r.verdict ? VERDICT_STYLE[r.verdict] : null;
                const st = STATUS_STYLE[r.currentStatus];
                return (
                  <tr key={r.toolId} className="border-b border-line-soft align-top last:border-0 hover:bg-bg-card">
                    <td className="px-3 py-3 text-ink">{r.toolName}</td>
                    <td className="px-3 py-3 text-ink-2">{r.vendorName}</td>
                    <td className="px-3 py-3">{v ? <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs", v.tint)}><span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />{v.label}</span> : "—"}</td>
                    <td className="px-3 py-3"><span className="rounded-md bg-bg-sink px-2 py-0.5 font-mono text-xs text-ink">{r.deviceClass ?? "—"}</span></td>
                    <td className="px-3 py-3"><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", st.tint)}>{st.label}</span></td>
                    <td className="px-3 py-3"><ActivityCell items={r.trials} /></td>
                    <td className="px-3 py-3"><ActivityCell items={r.deployments} /></td>
                    <td className="px-3 py-3">
                      <Link href={`/registry/${r.slug}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:bg-bg-sink">
                        View details <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-12 text-center text-sm text-muted">No tools match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
