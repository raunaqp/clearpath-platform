"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Lock } from "lucide-react";
import type { AssessorReview, QueueEntry, ReviewedItem } from "@/lib/mock/assessor";
import type { ConflictPosition } from "@/lib/schemas/attributable";
import {
  getCarriedForward,
  getCurrentReview,
  getItemsForReview,
  getQueue,
  recordReview,
} from "@/lib/mock/api-assessor";
import { ASSESSMENT_SCOPE_FOOTER } from "@/lib/engine/assessment-run";
import { formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S5c — the assessor console.
 *
 * ONE SCREEN, and an exception queue rather than a scoring surface. It exists
 * to make the funded model concrete — a human touches the handful of gates the
 * automated pass could not support, not 112 items — not to build an assessment
 * operation.
 *
 * Sorted by unsupported TRIAL-BLOCKING gates first: a gate that blocks a trial
 * with nothing behind it is where an assessor's time is worth most, because
 * nothing downstream can start until it resolves and no amount of automated
 * confidence can resolve it.
 *
 * The review is attributable and append-only, through the same guard the
 * committee verdict uses. A named assessor and a conflict position are
 * required — an anonymous review is not an attributable record, which is the
 * one thing this cannot be.
 */
export default function AssessorConsole() {
  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewedItem[]>([]);
  const [carried, setCarried] = useState(0);
  const [existing, setExisting] = useState<AssessorReview | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Independent assessor");
  const [conflict, setConflict] = useState<ConflictPosition>("NONE");
  const [conflictNote, setConflictNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => setQueue(await getQueue()), []);
  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const open = useCallback(async (slug: string) => {
    setActive(slug);
    setError(null);
    const [i, c, r] = await Promise.all([
      getItemsForReview(slug),
      getCarriedForward(slug),
      getCurrentReview(slug),
    ]);
    setItems(i); setCarried(c); setExisting(r ?? null);
  }, []);

  async function complete() {
    if (!active) return;
    setBusy(true); setError(null);
    try {
      const entry = queue?.find((q) => q.slug === active);
      const review = await recordReview({
        slug: active,
        toolName: entry?.toolName ?? active,
        assessor: {
          name,
          role,
          conflictPosition: conflict,
          conflictNote: conflict === "NONE" ? null : conflictNote,
        },
        reviewed: items,
      });
      setExisting(review);
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the review.");
    }
    setBusy(false);
  }

  const canComplete = name.trim().length > 0 && role.trim().length > 0 &&
    (conflict === "NONE" || conflictNote.trim().length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Assessor console
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">Exception queue</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Only the items the automated pass could not support. Everything else carries forward
          untouched and is not re-opened.
        </p>
      </header>

      {queue === null ? (
        <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>
      ) : queue.length === 0 ? (
        <p className="rounded-card border border-line bg-bg-card px-5 py-6 text-sm leading-relaxed text-muted">
          Nothing held. Every submission cleared the threshold without human review — which is the
          intended shape: the queue is an exception path, not a workload.
        </p>
      ) : (
        <ul className="space-y-2">
          {queue.map((q) => (
            <li key={q.slug}>
              <button
                onClick={() => void open(q.slug)}
                className={cn(
                  "flex w-full flex-wrap items-center justify-between gap-3 rounded-card border px-5 py-4 text-left transition-colors",
                  active === q.slug ? "border-teal-deep bg-teal-light/30" : "border-line bg-bg-card hover:bg-bg-sink"
                )}
              >
                <div className="min-w-0">
                  <p className="font-serif text-lg text-ink">{q.toolName}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {q.unsupported.length} unsupported · coverage {q.coverage}
                    {q.reviewed && " · reviewed"}
                  </p>
                </div>
                {q.trialBlockingUnsupported.length > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-[#FAECE7] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#993C1D]">
                    <AlertTriangle className="h-3 w-3" />
                    {q.trialBlockingUnsupported.join(", ")} blocks a trial
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && (
        <section className="space-y-4 rounded-card border border-line bg-bg-card px-5 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              To review — {items.length} item{items.length === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {carried} items carry forward untouched. An assessor is not asked to re-open what the
              automated pass could support.
            </p>
            <ul className="mt-2 divide-y divide-line-soft">
              {items.map((i) => (
                <li key={i.itemId} className="py-2.5">
                  <p className="text-sm text-ink">
                    <span className="font-mono text-xs text-muted">{i.gateId}</span> {i.question}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {existing ? (
            <div className="rounded-card border border-[#3B6D11]/40 bg-[#EAF3DE] px-4 py-3">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#3B6D11]">
                <Check className="h-3.5 w-3.5" /> Card issued by human review
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#0E1411]">
                {existing.assessor.name}, {existing.assessor.role} ·{" "}
                {formatCardDate(existing.decidedAt)} · conflict{" "}
                {existing.assessor.conflictPosition.toLowerCase()}
                {existing.assessor.conflictNote ? ` (${existing.assessor.conflictNote})` : ""}
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#3B6D11]">
                <Lock className="h-3 w-3" /> Append-only · revision {existing.revision}
              </p>
              <Link href={`/submit/${active}/card`} className="mt-2 inline-block text-sm text-[#0F6E56] hover:underline">
                See the card →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-ink">Assessor name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Required — a review must be attributable"
                    className="mt-1.5 w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink" />
                </label>
                <label className="block">
                  <span className="text-sm text-ink">Role</span>
                  <input value={role} onChange={(e) => setRole(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink" />
                </label>
              </div>

              <div>
                <p className="text-sm text-ink">Conflict of interest</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Required. &ldquo;None&rdquo; is a declaration, not an absence — the difference
                  between saying you have no conflict and never being asked is the whole value of
                  asking.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["NONE", "DECLARED", "RECUSED"] as ConflictPosition[]).map((c) => (
                    <button key={c} type="button" onClick={() => setConflict(c)}
                      className={cn("rounded-md border px-3 py-1.5 text-sm transition-colors",
                        conflict === c ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink")}>
                      {c === "NONE" ? "No conflict" : c === "DECLARED" ? "Declared" : "Recused"}
                    </button>
                  ))}
                </div>
                {conflict !== "NONE" && (
                  <input value={conflictNote} onChange={(e) => setConflictNote(e.target.value)}
                    placeholder="What the conflict is"
                    className="mt-2 w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink" />
                )}
              </div>

              {error && <p className="text-sm text-coral-brand">{error}</p>}

              <button onClick={complete} disabled={busy || !canComplete} aria-busy={busy}
                className="rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {busy ? "Recording…" : "Complete review and issue the card"}
              </button>
            </>
          )}
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">
        {ASSESSMENT_SCOPE_FOOTER} This screen shows the shape of that with one assessor instead of
        two.
      </p>
    </div>
  );
}
