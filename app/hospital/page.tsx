"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, SkipForward, RotateCcw, Undo2 } from "lucide-react";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Submission } from "@/lib/schemas/submission";
import type { Tool, ToolCategory } from "@/lib/schemas/tool";
import type { Vendor } from "@/lib/schemas/vendor";
import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import {
  getHospital,
  getSubmissions,
  getTool,
  getVendors,
  getReadinessCard,
  skipSubmission,
  unskipSubmission,
} from "@/lib/mock/api";
import { VERDICT_STYLE } from "@/lib/ui";
import { submissionStage, suggestedSkipReason } from "@/lib/stages";
import { useHospital } from "@/lib/hospital/HospitalContext";
import { cn } from "@/lib/utils";

type Row = { submission: Submission; tool: Tool | null; vendor: Vendor | null; verdict: ToolVerdict | null };

const CATEGORY_LABEL: Record<ToolCategory, string> = {
  screening: "Screening",
  cds: "Clinical decision support (CDS)",
  samd: "Software as a medical device (SaMD)",
  "point-of-care": "Point-of-care / imaging",
  "patient-facing": "Patient-facing",
  platform: "Platform",
};
const CATEGORY_ORDER: ToolCategory[] = ["screening", "point-of-care", "cds", "samd", "patient-facing", "platform"];

export default function HospitalInbox() {
  const { hospitalId } = useHospital();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Guards against a stale response landing after the persona changed: on a fast
  // persona swap the previous hospital's fetch can resolve last and clobber the
  // new inbox. Each load stamps a request id; only the latest one may commit.
  const reqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void getHospital(hospitalId).then((h) => { if (!cancelled) setHospital(h ?? null); });
    return () => { cancelled = true; };
  }, [hospitalId]);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    setRows(null);
    const [subs, vendors] = await Promise.all([getSubmissions(hospitalId), getVendors()]);
    const resolved = await Promise.all(
      subs.map(async (submission) => {
        const [tool, card] = await Promise.all([getTool(submission.toolId), getReadinessCard(submission.readinessCardId)]);
        const vendor = tool ? vendors.find((v) => v.id === tool.vendorId) ?? null : null;
        return { submission, tool: tool ?? null, vendor, verdict: card?.verdict ?? null };
      })
    );
    if (req !== reqRef.current) return; // a newer load started — drop this stale result
    resolved.sort((a, b) => b.submission.createdAt.localeCompare(a.submission.createdAt));
    setRows(resolved);
  }, [hospitalId]);

  useEffect(() => { void load(); }, [load]);

  async function skip(row: Row) {
    setBusy(row.submission.id);
    await skipSubmission(row.submission.id, suggestedSkipReason(row.verdict));
    await load();
    setBusy(null);
  }
  async function unskip(row: Row) {
    setBusy(row.submission.id);
    await unskipSubmission(row.submission.id);
    await load();
    setBusy(null);
  }

  const active = (rows ?? []).filter((r) => !r.submission.skipped);
  const skipped = (rows ?? []).filter((r) => r.submission.skipped);
  const byCategory = CATEGORY_ORDER
    .map((cat) => ({ cat, items: active.filter((r) => r.tool?.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink">Assess tool applications</h1>
        <p className="text-sm text-muted">
          {hospital?.name ? `${hospital.name} · ` : ""}tools submitted to your hospital for review,
          grouped by category.
        </p>
        {hospital?.specialty && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-teal-light px-2.5 py-0.5 text-xs text-teal-deep">
            {hospital.specialty} · specialty-scoped
          </p>
        )}
      </header>

      {rows === null ? (
        <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>
      ) : active.length === 0 && skipped.length === 0 ? (
        <div className="rounded-card border border-line bg-bg-card px-5 py-12 text-center">
          <p className="text-sm text-ink">This site isn&apos;t assessing tools yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {hospital?.name ?? "This hospital"} is building toward hosting AI. Start with the
            site-readiness self-assessment, then list your site on the registry so vendors and
            sponsors can find you as you mature.
          </p>
          <Link href="/site-readiness" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-teal-deep px-3.5 py-2 text-sm text-white transition-opacity hover:opacity-90">
            Check our site readiness
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {byCategory.map(({ cat, items }) => (
            <section key={cat}>
              <h2 className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                {CATEGORY_LABEL[cat]}
                <span className="rounded-full bg-bg-sink px-1.5 py-0.5 text-[10px]">{items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((row) => (
                  <ApplicationRow key={row.submission.id} row={row} busy={busy === row.submission.id} onSkip={() => skip(row)} />
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
                    <button onClick={() => unskip(row)} disabled={busy === row.submission.id} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 hover:bg-bg-sink disabled:opacity-60">
                      <Undo2 className="h-3.5 w-3.5" /> Un-skip
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
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
