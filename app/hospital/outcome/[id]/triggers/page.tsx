"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import type { ReviewTrigger } from "@/lib/schemas/outcome";
import { getReviewTriggers } from "@/lib/mock/api-outcome";
import { applyTrigger, STEADY_STATE, TRIGGER_EFFECT_LABEL, type TriggeredState } from "@/lib/engine/review-triggers";
import { formatCardDateShort } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S27 — the review schedule and its triggers.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FIRING CHANGES STATE, IT DOES NOT POST A NOTICE
 * ─────────────────────────────────────────────────────────────────────────
 * The scenario selector fires each trigger and the four status pills move.
 * That is the whole point: a trigger whose only effect is a notice is a
 * trigger nobody acts on, and "we will review this" is what a governance
 * process says when it has no mechanism.
 *
 * Nothing in the build had a trigger concept before this.
 */

const STATE_ROWS: { key: keyof TriggeredState; label: string; steady: string }[] = [
  { key: "cardStatus", label: "Card", steady: "valid" },
  { key: "runStatus", label: "Run", steady: "running" },
  { key: "listingStatus", label: "Listing", steady: "listed" },
  { key: "reviewStatus", label: "Review", steady: "scheduled" },
];

export default function TriggersPage() {
  const { id } = useParams<{ id: string }>();
  const [triggers, setTriggers] = useState<ReviewTrigger[] | null>(null);
  const [fired, setFired] = useState<ReviewTrigger | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void getReviewTriggers(id).then((t) => {
      if (!live) return;
      setTriggers(t ?? null);
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

  if (!triggers) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No triggers</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Every trigger watches something about a card — its validity, its expiry, the model it was
          issued against. There is no card here, so there is nothing to watch.
        </p>
        <Link href="/hospital" className="mt-4 inline-block text-sm text-teal-deep">
          ← Back to inbox
        </Link>
      </div>
    );
  }

  const state = fired ? applyTrigger(fired) : STEADY_STATE;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/outcome/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Outcome decision
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Review schedule and triggers
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">When this gets looked at again.</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Six triggers watch this tool. Fire one to see what changes — a trigger whose only effect
          is a notice is a trigger nobody acts on.
        </p>
      </header>

      {/* ── live state, so firing is visible rather than announced ────────── */}
      <section
        className={cn(
          "rounded-card border px-5 py-4 transition-colors",
          fired ? "border-[#BA7517]/40 bg-[#FAEEDA]" : "border-line bg-bg-card"
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {fired ? `State after "${fired.label}" fires` : "Current state — nothing fired"}
          </p>
          {fired && (
            <button
              type="button"
              onClick={() => setFired(null)}
              className="text-xs text-teal-deep underline underline-offset-2 hover:opacity-80"
            >
              Reset
            </button>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATE_ROWS.map((r) => {
            const value = state[r.key];
            const changed = value !== r.steady;
            return (
              <div key={r.key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {r.label}
                </dt>
                <dd
                  className={cn(
                    "mt-1 inline-block whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-medium",
                    changed
                      ? "bg-[#993C1D] text-white"
                      : "border border-line bg-bg-card text-ink-2"
                  )}
                >
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>
        {fired && (
          <p className="mt-3 text-sm leading-relaxed text-[#8A5610]">{fired.consequence}</p>
        )}
      </section>

      <ul className="space-y-3">
        {triggers.map((t) => (
          <li
            key={t.kind}
            className={cn(
              "rounded-card border px-5 py-4",
              fired?.kind === t.kind ? "border-[#BA7517] bg-[#FAEEDA]/60" : "border-line bg-bg-card"
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-serif text-lg text-ink">{t.label}</p>
              <span className="shrink-0 whitespace-nowrap rounded-pill border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                {t.state}
                {t.dueAt ? ` · ${formatCardDateShort(t.dueAt)}` : ""}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.watching}</p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {t.effects.map((e) => (
                <span
                  key={e}
                  className="whitespace-nowrap rounded-pill bg-bg-sink px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted"
                >
                  {TRIGGER_EFFECT_LABEL[e]}
                </span>
              ))}
            </p>
            <button
              type="button"
              onClick={() => setFired(t)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs text-ink-2 transition-colors hover:bg-bg-sink"
            >
              <Zap className="h-3 w-3" aria-hidden /> Fire this trigger
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
