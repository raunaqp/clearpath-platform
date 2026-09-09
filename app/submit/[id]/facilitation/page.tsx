"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { FacilitationRecord } from "@/lib/schemas/handoff";
import { FACILITATION_LABEL } from "@/lib/schemas/handoff";
import { getFacilitation, isRequestFormOpen } from "@/lib/mock/api-handoff";
import { formatCardDateShort } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S11 — ClearPath facilitation.
 *
 * THE GOVERNANCE FIREWALL, MADE VISIBLE. Without this screen the platform reads
 * as a directory: a vendor finds a hospital and contacts it. The four states
 * are what separate a coordination layer from a search box — somebody checked
 * the fit against records the site published before this tool existed, somebody
 * confirmed what could be shared, and the hospital was asked rather than
 * notified.
 *
 * ClearPath does not certify and does not recommend procurement. That line is
 * on the screen because facilitation is the moment a reader is most likely to
 * mistake coordination for endorsement.
 */
export default function FacilitationPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<FacilitationRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [f, o] = await Promise.all([getFacilitation(id), isRequestFormOpen(id)]);
      if (!live) return;
      setRecord(f ?? null);
      setOpen(o);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <p className="font-serif text-xl text-ink">Facilitation has not started</p>
        <p className="text-sm leading-relaxed text-muted">
          Facilitation begins once interest is with ClearPath. Nothing has been shared with any
          hospital.
        </p>
        <Link href={`/submit/${id}/interest`} className="inline-block text-sm text-teal-deep">
          Express interest to ClearPath →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Link href={`/submit/${id}/card`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Readiness card
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          ClearPath facilitation
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{record.hospitalName}</h1>
      </header>

      <ol className="space-y-3">
        {record.entries.map((entry, i) => (
          <li
            key={entry.step}
            className={cn(
              "rounded-card border px-5 py-4",
              entry.completed ? "border-line bg-bg-card" : "border-dashed border-line bg-bg-sink/40"
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="flex items-center gap-2.5 font-serif text-lg text-ink">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                    entry.completed ? "bg-teal-light text-teal-deep" : "bg-bg-sink text-muted"
                  )}
                >
                  {entry.completed ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {FACILITATION_LABEL[entry.step]}
              </p>
              <span className="font-mono text-xs text-muted">
                {/*
                  formatCardDateShort, not toLocaleDateString — en-GB renders
                  September as "Sept", giving a four-letter month in a column of
                  three-letter ones.
                */}
                {entry.at ? formatCardDateShort(entry.at) : "pending"}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{entry.detail}</p>
            <ul className="mt-2 space-y-1">
              {entry.points.map((p) => (
                <li key={p} className="flex gap-2 text-sm leading-relaxed text-muted">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {/* The line a reader most needs at exactly this point */}
      <p className="rounded-card border border-line bg-bg-sink/50 px-5 py-4 text-sm leading-relaxed text-ink-2">
        ClearPath does not certify and does not recommend procurement. Facilitation validates fit and
        coordinates the introduction; the hospital forms its own verdict.
      </p>

      {open ? (
        <Link
          href={`/submit/${id}/request`}
          className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        >
          Open the structured request <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <p className="rounded-card border border-dashed border-line px-5 py-4 text-sm leading-relaxed text-muted">
          The request form opens once both sides have indicated willingness. Until then there is
          nothing for you to send.
        </p>
      )}
    </div>
  );
}
