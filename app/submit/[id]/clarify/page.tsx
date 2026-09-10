"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { ClarifyState } from "@/lib/mock/api-clarify";
import { answerClarification, getClarifyState } from "@/lib/mock/api-clarify";
import { ASSESSMENT_SCOPE_FOOTER } from "@/lib/engine/assessment-run";
import { MAX_CLARIFYING_QUESTIONS } from "@/lib/engine/routing";
import { cn } from "@/lib/utils";

/**
 * S5a — clarifying questions.
 *
 * Phase 1 built the cap and the ranking and the recompute; none of it had ever
 * had a screen, so the one scenario whose purpose is showing the routing
 * threshold WORK instead demonstrated a system that holds submissions and never
 * resolves them.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE CAP IS SHOWN, NOT JUST ENFORCED
 * ─────────────────────────────────────────────────────────────────────────
 * Five, never six, even where more discrepancies exist — and the count of what
 * was NOT asked is on screen. A vendor who sees "5 of 14" knows the other nine
 * were found and judged less material; a vendor who sees five questions and no
 * denominator has no idea whether that is everything.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AN ANSWER SUPPLIES A BINDING, NOT EVIDENCE
 * ─────────────────────────────────────────────────────────────────────────
 * "Section 4 of the study we already filed covers this" points an existing
 * document at a gate it was never bound to. That is the only thing an answer
 * can honestly change — and it is why answering can release a held submission
 * without anyone uploading anything new.
 *
 * Answers attach to the assessment, never to the declaration. The declaration
 * is what the vendor claimed at a point in time; if answering could edit it,
 * "your declaration exceeds your evidence" would become unfalsifiable.
 */
export default function ClarifyPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ClarifyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s = await getClarifyState(id);
    setState(s ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(q: ClarifyState["questions"][number]) {
    const text = (drafts[q.id] ?? "").trim();
    if (!text) return;
    setBusy(q.id);
    await answerClarification({
      slug: id,
      questionId: q.id,
      gateId: q.gateId,
      itemId: q.itemId,
      answer: text,
      bindsEvidenceId: q.binds,
    });
    await refresh();
    setBusy(null);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!state) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No assessment to clarify</p>
        <Link href="/submit" className="mt-4 inline-block text-sm text-teal-deep">Start a new assessment →</Link>
      </div>
    );
  }

  const answered = state.questions.filter((q) => q.answer).length;
  const notAsked = state.totalDiscrepancies - state.questions.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Link href={`/submit/${id}/assess`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Assessment
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Clarifying questions
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{state.toolName}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          {state.questions.length} of {state.totalDiscrepancies} discrepancies raised.
          {notAsked > 0 && " The rest are recorded and not asked."}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Capped at {MAX_CLARIFYING_QUESTIONS}. Ranked by what is holding the submission up, then by
          how far the claim runs ahead of the document. Answers attach to the assessment — your
          declaration is unchanged.
        </p>
      </header>

      {/* Routing, live */}
      <section
        className={cn(
          "rounded-card border px-5 py-4",
          state.run.outcome === "ISSUE"
            ? "border-[#3B6D11]/40 bg-[#EAF3DE]"
            : "border-teal-deep/40 bg-teal-light/30"
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Routing</p>
        <p className="mt-1 font-serif text-xl text-ink">
          Evidence coverage <span className="capitalize">{state.run.evidenceCoverage}</span> ·{" "}
          {state.run.unsupportedGates.length === 0
            ? "no unsupported gates"
            : `${state.run.unsupportedGates.join(", ")} unsupported`}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
          {state.alreadyClear ? (
            answered > 0
              ? "Answers recorded. Routing unchanged — this submission already clears the threshold."
              : "This submission already clears the threshold. Answering will not change its routing."
          ) : state.routingMoved ? (
            <>
              Coverage moved from{" "}
              <span className="capitalize">{state.baseline.evidenceCoverage}</span> to{" "}
              <span className="capitalize">{state.run.evidenceCoverage}</span>. The submission now
              issues without human review.
            </>
          ) : (
            `Held. ${state.run.unsupportedGates.length} gate${state.run.unsupportedGates.length === 1 ? "" : "s"} still have nothing bound to them.`
          )}
        </p>
      </section>

      <ol className="space-y-3">
        {state.questions.map((q, i) => (
          <li key={q.id} className="rounded-card border border-line bg-bg-card px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="flex items-baseline gap-2 text-[15px] leading-relaxed text-ink">
                <span className="font-mono text-xs text-muted">{i + 1}</span>
                {q.question}
              </p>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">
                {q.gateId}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{q.why}</p>

            {q.answer ? (
              <div className="mt-3 rounded-md bg-[#EAF3DE] px-3 py-2">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#3B6D11]">
                  <Check className="h-3 w-3" /> Answered
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#0E1411]">{q.answer.answer}</p>
                {q.answer.bindsEvidenceId && (
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    binds {q.answer.bindsEvidenceId} → {q.itemId}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  value={drafts[q.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  placeholder="Point at the document and the section. An answer binds evidence you have already filed — it cannot add a new one."
                  className="min-h-[64px] w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink"
                />
                <button
                  onClick={() => submit(q)}
                  disabled={busy === q.id || !(drafts[q.id] ?? "").trim()}
                  className="mt-2 rounded-md bg-teal-deep px-3.5 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy === q.id ? "Recording…" : "Answer"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {state.run.outcome === "ISSUE" && (
        <Link
          href={`/submit/${id}/card`}
          className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        >
          See the readiness card <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <p className="text-xs leading-relaxed text-muted">{ASSESSMENT_SCOPE_FOOTER}</p>
    </div>
  );
}
