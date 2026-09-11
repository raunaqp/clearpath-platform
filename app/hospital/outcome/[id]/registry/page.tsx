"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import type { WriteBack } from "@/lib/mock/registry-writeback";
import { getWriteBack } from "@/lib/mock/api-outcome";
import { formatCardDateShort } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S26 — the registry write-back.
 *
 * Updates the SAME canonical record Phase 4 created, keyed by toolId. Never a
 * second row: appending one is how a marketplace comes to show a tool twice
 * with two different statuses and no way to tell which is current.
 *
 * THE MISSED ENDPOINT IS PUBLISHED. A marketplace that carries only what
 * worked is an advertisement, and the limitation lines are what stop a second
 * hospital reading a single-district result as a general claim.
 */

const STATUS_LABEL: Record<string, string> = {
  assessed: "Assessed",
  piloting: "In trial",
  deployed: "Deployed",
};

export default function RegistryWriteBackPage() {
  const { id } = useParams<{ id: string }>();
  const [wb, setWb] = useState<WriteBack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void getWriteBack(id).then((v) => {
      if (!live) return;
      setWb(v ?? null);
      setLoading(false);
    });
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  if (!wb) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">Nothing to publish</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A field result needs a completed trial and a decision about it. Publishing without both
          would put a claim in the public record with nothing behind it.
        </p>
        <Link href="/registry" className="mt-4 inline-block text-sm text-teal-deep">
          ← The marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/outcome/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Outcome decision
      </Link>

      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Published to the marketplace
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">
          {wb.toolName} {wb.toolVersion.replace(wb.toolName, "").trim()} · model {wb.modelVersion}
        </h1>
        <p className="text-sm text-ink-2">
          {wb.hospitalName} · {wb.hospitalLocation}
        </p>
        <p className="text-sm text-muted">{wb.contextLine}</p>
      </header>

      {/* THREE FIELDS, separate. A tool can carry a good assessment and a poor
          field result, and that combination is the most useful row on the page. */}
      <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        {[
          ["Assessment verdict", wb.entry.verdict],
          ["Field status", STATUS_LABEL[wb.entry.status] ?? wb.entry.status],
          ["Latest outcome", wb.entry.publishedResult?.recommendation ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-bg-card px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-1 font-serif text-xl text-ink">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <p className="text-sm text-ink">{wb.scopeLine}</p>
        <ul className="mt-3 space-y-1.5">
          {wb.endpoints.map((e) => (
            <li key={e.name} className="flex items-start gap-2 text-sm leading-relaxed">
              {e.met ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B6D11]" aria-hidden />
              ) : (
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#993C1D]" aria-hidden />
              )}
              <span className={cn(e.met ? "text-ink" : "text-[#993C1D]")}>
                {e.name} {e.result} <span className="text-muted">(target {e.target})</span>
              </span>
            </li>
          ))}
        </ul>
        {wb.actuals.filter((a) => /load/i.test(a.label)).map((a) => (
          <p key={a.label} className="mt-2 text-sm leading-relaxed text-ink-2">
            {a.label}: {a.actual} measured against {a.estimate}
          </p>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-bg-card px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Decision</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{wb.decisionLine}</p>
        </div>
        <div className="rounded-card border border-line bg-bg-card px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Card</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{wb.cardLine}</p>
        </div>
      </section>

      <section className="rounded-card border border-[#BA7517]/30 bg-[#FAEEDA] px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#BA7517]">
          Limitations
        </p>
        <ul className="mt-2 space-y-1.5">
          {wb.limitations.map((l) => (
            <li key={l} className="flex gap-2 text-sm leading-relaxed text-[#8A5610]">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#BA7517]" />
              {l}
            </li>
          ))}
        </ul>
      </section>

      {/* THE EVENT LOG, which did not exist — listedAt was a fixture date with
          nothing behind it. A write-back has to record what it changed. */}
      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Write-back log
        </p>
        {wb.events.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            The record already said this. Nothing changed, so nothing is logged.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {wb.events.map((e) => (
              <li key={e.id} className="text-sm leading-relaxed">
                <p className="text-ink">
                  <span className="font-mono text-xs text-muted">{formatCardDateShort(e.at)}</span>{" "}
                  {e.changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-muted">{e.source}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href={`/registry/${id}`} className="inline-block text-sm text-teal-deep hover:underline">
        See the public listing →
      </Link>
    </div>
  );
}
