"use client";

import Link from "next/link";
import { ClipboardCheck, SkipForward, RotateCcw, Undo2 } from "lucide-react";
import type { Submission } from "@/lib/schemas/submission";
import type { Tool, ToolCategory } from "@/lib/schemas/tool";
import type { Vendor } from "@/lib/schemas/vendor";
import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import { VERDICT_STYLE } from "@/lib/ui";
import { submissionStage } from "@/lib/stages";
import { cn } from "@/lib/utils";

/**
 * The "Assess tool applications" list — tools grouped by category with their
 * verdict chips, status badge, and per-row actions, plus the skipped section.
 *
 * Lifted verbatim out of `app/hospital/page.tsx` so it has one home and can be
 * rendered elsewhere (the home page's §3.4 demo box). PURE REFACTOR: the markup
 * is unchanged and `/hospital` renders byte-identically. Data loading, the
 * loading spinner, the empty state, and the page header all stay in the page —
 * only the list and its row moved.
 */

export type Row = {
  submission: Submission;
  tool: Tool | null;
  vendor: Vendor | null;
  verdict: ToolVerdict | null;
};

const CATEGORY_LABEL: Record<ToolCategory, string> = {
  screening: "Screening",
  cds: "Clinical decision support (CDS)",
  samd: "Software as a medical device (SaMD)",
  "point-of-care": "Point-of-care / imaging",
  "patient-facing": "Patient-facing",
  platform: "Platform",
};
const CATEGORY_ORDER: ToolCategory[] = ["screening", "point-of-care", "cds", "samd", "patient-facing", "platform"];

export function ApplicationList({
  active,
  skipped,
  busy,
  onSkip,
  onUnskip,
}: {
  active: Row[];
  skipped: Row[];
  busy: string | null;
  onSkip: (row: Row) => void;
  onUnskip: (row: Row) => void;
}) {
  const byCategory = CATEGORY_ORDER
    .map((cat) => ({ cat, items: active.filter((r) => r.tool?.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {byCategory.map(({ cat, items }) => (
        <section key={cat}>
          <h2 className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            {CATEGORY_LABEL[cat]}
            <span className="rounded-full bg-bg-sink px-1.5 py-0.5 text-[10px]">{items.length}</span>
          </h2>
          <ul className="space-y-2">
            {items.map((row) => (
              <ApplicationRow key={row.submission.id} row={row} busy={busy === row.submission.id} onSkip={() => onSkip(row)} />
            ))}
          </ul>
        </section>
      ))}

      {skipped.length > 0 && (
        <section>
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">Skipped</h2>
          <ul className="space-y-2">
            {skipped.map((row) => (
              <li key={row.submission.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-bg-card px-4 py-3">
                <div>
                  <p className="text-sm text-ink">{row.tool?.name}</p>
                  <p className="text-xs text-muted">Skipped — {row.submission.skipReason}</p>
                </div>
                <button onClick={() => onUnskip(row)} disabled={busy === row.submission.id} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 hover:bg-bg-sink disabled:opacity-60">
                  <Undo2 className="h-3.5 w-3.5" /> Un-skip
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ApplicationRow({ row, busy, onSkip }: { row: Row; busy: boolean; onSkip: () => void }) {
  const { submission, tool, vendor, verdict } = row;
  const slug = tool?.slug ?? submission.id;
  const stage = submissionStage(submission, slug);
  const canSkip = submission.decision === "pending";
  const auditComplete = submission.audit === "complete";
  const primaryLabel =
    submission.audit === "not_run" ? "Assess"
      : submission.decision === "pending" ? "Decide"
        : submission.decision === "rejected" ? "View"
          : submission.pilot === "not_started" ? "Start pilot" : "Open workspace";

  return (
    <li className="rounded-card border border-line bg-bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Tool */}
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink">{tool?.name ?? "—"}</p>
            {submission.requestType && (
              <span className="rounded-full bg-bg-sink px-1.5 py-0.5 text-[10px] text-ink-2">
                {submission.requestType === "trial" ? "Trial request" : "Deployment request"}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {vendor?.name}
            {verdict && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5", VERDICT_STYLE[verdict].tint)}>
                <span className={cn("h-1 w-1 rounded-full", VERDICT_STYLE[verdict].dot)} />
                {VERDICT_STYLE[verdict].label}
              </span>
            )}
          </p>
        </div>

        {/* STATUS — dedicated column */}
        <div className="sm:w-36">
          <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-wider text-muted">Status</span>
          <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", stage.badge.tint)}>{stage.badge.label}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link href={stage.action.href} className="inline-flex items-center gap-1.5 rounded-md bg-teal-deep px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-90">
            <ClipboardCheck className="h-3.5 w-3.5" /> {primaryLabel}
          </Link>
          {auditComplete && (
            <Link href={`/hospital/${slug}/audit`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:bg-bg-sink">
              <RotateCcw className="h-3.5 w-3.5" /> Re-run audit
            </Link>
          )}
          {canSkip && (
            <button onClick={onSkip} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:bg-bg-sink disabled:opacity-60">
              <SkipForward className="h-3.5 w-3.5" /> Skip
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
