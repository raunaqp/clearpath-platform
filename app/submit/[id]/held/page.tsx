"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Circle, Loader2 } from "lucide-react";
import type { ClarifyState } from "@/lib/mock/api-clarify";
import { getClarifyState } from "@/lib/mock/api-clarify";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { DIMENSIONS } from "@/lib/engine/gates";
import { formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S5b — under assessment, from the innovator's side.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DELIBERATELY THIN, AND THE THINNESS IS THE DESIGN
 * ─────────────────────────────────────────────────────────────────────────
 * Progress by cluster, open clarifications, nothing else. NO partial scores and
 * NO provisional verdict.
 *
 * The temptation is obvious: an anxious vendor is refreshing this page, and a
 * number would settle them. It would be the most damaging figure on the
 * platform. A provisional score is a score that MOVES, and a score that moves
 * is one somebody screenshots at its highest point and puts in a deck — after
 * which the real card is the thing that has to be argued down from. There is no
 * version of releasing it that survives contact with a fundraise.
 *
 * So the page says what is happening and refuses to say how it is going.
 */
const CLUSTER_STATE = ["reviewed", "reviewed", "in review", "not started"] as const;

export default function HeldPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ClarifyState | null>(null);
  const [view, setView] = useState<CardV2View | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [s, v] = await Promise.all([getClarifyState(id), getCardV2(id)]);
      if (!live) return;
      setState(s ?? null); setView(v ?? null); setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!state || !view) {
    return <div className="mx-auto max-w-lg py-16 text-center"><p className="font-serif text-xl text-ink">Nothing under assessment</p></div>;
  }

  const open = state.questions.filter((q) => !q.answer).length;
  const dims = (["D1", "D2", "D3", "D4"] as const).map((d, i) => ({
    id: d,
    title: DIMENSIONS[d].title,
    status: CLUSTER_STATE[i],
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Link href={`/submit/${id}/card`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Readiness card
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Under assessment
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{state.toolName}</h1>
        <p className="text-sm text-muted">
          Received {formatCardDate(view.card.firstIssuedAt)}
        </p>
      </header>

      <section className="rounded-card border border-teal-deep/40 bg-teal-light/30 px-5 py-4">
        <p className="text-[15px] leading-relaxed text-ink">
          This is a delay, not a denial. There is no rejected state at this step — the assessment
          completes and a card issues.
        </p>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-bg-card">
        <p className="border-b border-line-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Progress
        </p>
        <ul className="divide-y divide-line-soft">
          {dims.map((d) => {
            const Icon = d.status === "reviewed" ? Check : d.status === "in review" ? Loader2 : Circle;
            return (
              <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm text-ink">
                  <span className="font-mono text-xs text-muted">{d.id}</span> {d.title}
                </span>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider",
                    d.status === "reviewed" ? "text-[#3B6D11]" : d.status === "in review" ? "text-[#BA7517]" : "text-muted"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", d.status === "in review" && "animate-spin")} />
                  {d.status}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line-soft bg-bg-sink/50 px-5 py-3 text-xs leading-relaxed text-muted">
          Cluster progress only. No partial scores and no provisional verdict are released while an
          assessment is open — a figure that moves is a figure someone screenshots.
        </p>
      </section>

      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Open with you</p>
        <p className="mt-1 font-serif text-xl text-ink">
          {open} clarification request{open === 1 ? "" : "s"} awaiting a response
        </p>
        {open > 0 && (
          <Link
            href={`/submit/${id}/clarify`}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            Answer them <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>
    </div>
  );
}
