"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Hospital } from "@/lib/schemas/hospital";
import {
  getHospital,
  getSubmissions,
  getTool,
  getVendors,
  getReadinessCard,
  skipSubmission,
  unskipSubmission,
} from "@/lib/mock/api";
import { suggestedSkipReason } from "@/lib/stages";
import { useHospital } from "@/lib/hospital/HospitalContext";
import { ApplicationList, type Row } from "@/components/hospital/ApplicationList";

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
        <ApplicationList active={active} skipped={skipped} busy={busy} onSkip={skip} onUnskip={unskip} />
      )}
    </div>
  );
}
