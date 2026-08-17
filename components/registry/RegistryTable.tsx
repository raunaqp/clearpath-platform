"use client";

import Link from "next/link";
import { FlaskConical, Rocket, ArrowRight } from "lucide-react";
import type { RegistryToolView, RegistryActivity } from "@/lib/registry";
import { VERDICT_STYLE } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * The registry directory table — tools side by side with verdict, CDSCO class,
 * status, and where each has been trialled or deployed.
 *
 * Lifted verbatim out of `app/registry/page.tsx` so it has one home and can be
 * rendered elsewhere (the home page's §3.1 demo box). PURE REFACTOR: the markup
 * is unchanged and `/registry` renders byte-identically. Data loading, the
 * filters, the site cards, and the loading spinner all stay in the page — only
 * the table moved. `rows` is the already-filtered list.
 */

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

export function RegistryTable({ rows }: { rows: RegistryToolView[] }) {
  return (
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
          {rows.map((r) => {
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
          {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-12 text-center text-sm text-muted">No tools match these filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
