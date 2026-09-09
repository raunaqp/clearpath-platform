"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import {
  ASSESSMENT_SCOPE_FOOTER,
  UNDER_ASSESSMENT_NOTE,
  runAssessment,
  type AssessmentRun,
} from "@/lib/engine/assessment-run";
import { getRegisteredSubmission } from "@/lib/mock/cards-v2";
import { cn } from "@/lib/utils";

/**
 * S5 — the assessment transition.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY A SCREEN AT ALL
 * ─────────────────────────────────────────────────────────────────────────
 * Without it, seventeen answers go in and a card comes out, and the card reads
 * as a restatement of the vendor's own answers — because that is very nearly
 * what it would be. Making assessment a visible, separate act, with the
 * declaration checked AGAINST the documents rather than simply totalled, is the
 * difference between a form that echoes and a process that examines.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NO NUMERIC INDICATOR APPEARS HERE
 * ─────────────────────────────────────────────────────────────────────────
 * No confidence percentage, no grounding rate, no "63 of 112 items evidenced".
 * The engine does not return the ratios behind the coverage band, so this page
 * could not render one if it tried. What is counted here is countable things —
 * documents mapped, discrepancies found — which is not the same as scoring
 * them, and is not presentable as measured performance.
 */

type Stage = { label: string; note?: string };

export default function AssessPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [view, setView] = useState<CardV2View | null>(null);
  const [run, setRun] = useState<AssessmentRun | null>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const v = await getCardV2(id);
      if (!live || !v) { setView(null); return; }
      const registered = getRegisteredSubmission(id);
      const declaration =
        registered?.declaration ??
        // Seeded tools carry their declaration inside the v2 setup; the card is
        // built from it, so the conditions on the card are the same evidence of
        // it. Fall back to an empty declaration rather than inventing answers.
        { submissionId: `sub-${id}`, gateAnswers: {}, clarificationAnswers: [] };
      setView(v);
      setRun(
        runAssessment({
          declaration,
          evidence: v.evidence,
          conditions: v.card.conditions,
        })
      );
    })();
    return () => { live = false; };
  }, [id]);

  const stages: Stage[] = useMemo(() => {
    if (!run || !view) return [];
    return [
      { label: `Mapping ${run.documentsMapped} ${run.documentsMapped === 1 ? "document" : "documents"} to gates and items` },
      {
        label: "Checking declaration against evidence",
        note:
          run.discrepancies.length === 0
            ? "no discrepancies"
            : `${run.discrepancies.length} ${run.discrepancies.length === 1 ? "discrepancy" : "discrepancies"}`,
      },
      { label: "Scoring against the 17 demo gates" },
    ];
  }, [run, view]);

  // Roughly three seconds, one stage at a time.
  useEffect(() => {
    if (stages.length === 0 || done >= stages.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), 950);
    return () => clearTimeout(t);
  }, [stages.length, done]);

  if (!view || !run) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  const complete = done >= stages.length;
  const held = run.outcome === "UNDER_ASSESSMENT";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Assessment
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{view.tool.name}</h1>
      </header>

      {/* Resolving stages */}
      <ol className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
        {stages.map((s, i) => {
          const finished = i < done;
          const active = i === done;
          return (
            <li key={s.label} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className={cn("text-sm", finished ? "text-ink" : active ? "text-ink" : "text-muted")}>
                {s.label}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {finished && s.note && <span className="text-xs text-muted">{s.note}</span>}
                {finished ? (
                  <Check className="h-4 w-4 text-teal-deep" />
                ) : active ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
                ) : (
                  <span className="h-4 w-4" />
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Scope banner — above the indicators, so it frames them rather than footnoting them */}
      <div className="rounded-card border border-[#BA7517]/40 bg-[#FAEEDA] px-5 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Illustrative demo assessment using 17 gates
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#8A5610]">
          Full funded assessment covers 112 items and at least two blind independent assessors
          scoring in parallel with an AI pass.
        </p>
      </div>

      {complete && (
        <>
          {/* Qualitative indicators. No numbers, by construction. */}
          <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
            <div className="bg-bg-card px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Evidence coverage
              </p>
              <p className="mt-1 font-serif text-2xl capitalize text-ink">{run.evidenceCoverage}</p>
            </div>
            <div className="bg-bg-card px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Unsupported gates
              </p>
              <p className="mt-1 font-serif text-2xl text-ink">
                {run.unsupportedGates.length === 0 ? "none" : run.unsupportedGates.join(", ")}
              </p>
              <p className="mt-1.5 text-sm text-muted">→ {run.outcomeLine}</p>
            </div>
          </div>

          {held ? (
            <section className="rounded-card border border-teal-deep/40 bg-teal-light/30 px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">
                Under assessment
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{UNDER_ASSESSMENT_NOTE}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Nothing to do right now. You can attach evidence for{" "}
                {run.unsupportedGates.join(", ")} to shorten the wait.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/submit/${id}/card`}
                      className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90">
                  See the demonstration card <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={`/submit/${id}/remediate`}
                      className="inline-flex items-center rounded-md border border-line px-4 py-2 text-sm text-ink-2 hover:bg-bg-sink">
                  Fix readiness gaps
                </Link>
              </div>
            </section>
          ) : (
            <button
              onClick={() => router.push(`/submit/${id}/card`)}
              className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
            >
              See the readiness card <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {/* Discrepancies, named. A count with no detail is a number to argue with. */}
          {run.discrepancies.length > 0 && (
            <section className="rounded-card border border-line bg-bg-card px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Where the declaration and the evidence differ
              </p>
              <ul className="mt-2 space-y-2">
                {run.discrepancies.map((d) => (
                  <li key={d.gateId} className="text-sm leading-relaxed text-ink">
                    <span className="font-mono text-xs text-muted">{d.gateId}</span> — {d.explanation}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="text-xs leading-relaxed text-muted">{ASSESSMENT_SCOPE_FOOTER}</p>
    </div>
  );
}
