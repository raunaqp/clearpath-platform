"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Building2 } from "lucide-react";
import type { RegistryToolView } from "@/lib/registry";
import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import type { SiteListing } from "@/lib/schemas/site";
import type { Hospital } from "@/lib/schemas/hospital";
import { getRegistryView, getSiteListings, getHospitals } from "@/lib/mock/api";
import { VERDICT_STYLE, SITE_GRADE_STYLE } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { RegistryTable } from "@/components/registry/RegistryTable";

const VERDICTS: (ToolVerdict | "ALL")[] = ["ALL", "DEPLOY", "CONDITIONS", "NOTYET"];
const ACTIVITY = [
  { value: "ALL", label: "All activity" },
  { value: "trials", label: "Has trials" },
  { value: "deployments", label: "Has deployments" },
  { value: "assessed", label: "Assessed only" },
];

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
        <RegistryTable rows={filtered} />
      )}
    </div>
  );
}
