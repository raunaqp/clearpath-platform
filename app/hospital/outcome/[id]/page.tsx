"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type { OutcomeView } from "@/lib/mock/outcome";
import { getOutcomeView } from "@/lib/mock/api-outcome";
import { OUTCOME_DECISION_LABEL } from "@/lib/schemas/outcome";
import { formatCardDateShort } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S24 — the hospital's outcome decision.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE RULE IS RUN, NOT READ
 * ─────────────────────────────────────────────────────────────────────────
 * The charter fixed adopt / extend / retire before any data existed. This
 * screen shows which clause the predicate MATCHED and every comparison that
 * produced it, so the committee's job is checking arithmetic rather than
 * agreeing on a reading. A rule interpreted in the room where the result is
 * already known is not a rule.
 *
 * Where the charter and the endpoint results are still reachable the rule is
 * re-run live and the screen says whether the re-run agrees with what was
 * recorded. Where they are not, it shows the clause the record carries and
 * says plainly that it was not re-run — the record has to stand on its own
 * without implying a check that did not happen.
 */

const BAND: Record<string, string> = {
  ADOPT: "border-[#3B6D11]/30 bg-[#EAF3DE] text-[#3B6D11]",
  EXTEND: "border-[#BA7517]/30 bg-[#FAEEDA] text-[#BA7517]",
  RETIRE: "border-[#993C1D]/30 bg-[#FAECE7] text-[#993C1D]",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}

export default function OutcomePage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<OutcomeView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void getOutcomeView(id).then((v) => {
      if (!live) return;
      setView(v ?? null);
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

  if (!view) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No outcome decision</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Nothing has been decided about this trial. An outcome needs a completed run and a
          committee that has sat — until then there is no record to show.
        </p>
        <Link href="/hospital" className="mt-4 inline-block text-sm text-teal-deep">
          ← Back to inbox
        </Link>
      </div>
    );
  }

  const d = view.decision;
  const ext = d.extension;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/workspace/deploy-${d.slug}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Trial workspace
      </Link>

      {/* ── The decision ──────────────────────────────────────────────────── */}
      <section className={cn("rounded-card border px-5 py-4", BAND[d.decision])}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em]">
            Decision · {OUTCOME_DECISION_LABEL[d.decision]}
          </p>
          <p className="font-mono text-xs">{formatCardDateShort(d.decidedAt)}</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed">
          Signed {d.chair.name}, {d.chair.role.toLowerCase()} · quorum {d.quorum.present} of{" "}
          {d.quorum.total} · {d.dissent.length === 0 ? "0 dissent" : `${d.dissent.length} dissent`}
        </p>
      </section>

      {d.dissent.map((x) => (
        <section key={x.member} className="rounded-card border border-line bg-bg-card px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Dissent</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            <span className="font-medium">{x.member}</span> — {x.position}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{x.resolution}</p>
        </section>
      ))}

      {/* ── The rule, and the comparisons that produced the clause ────────── */}
      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Rule applied</p>
        <p className="mt-1 text-sm leading-relaxed text-ink">&ldquo;{d.ruleApplied.text}&rdquo;</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{d.ruleApplied.why}</p>

        {view.evaluation ? (
          <>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Comparisons the rule made
            </p>
            <ul className="mt-2 space-y-1.5">
              {view.evaluation.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm leading-relaxed">
                  {c.passed ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B6D11]" aria-hidden />
                  ) : (
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#993C1D]" aria-hidden />
                  )}
                  <span className="text-ink">
                    {c.label} — target {c.target}, result{" "}
                    <span className="font-medium">{c.actual}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p
              className={cn(
                "mt-3 rounded-md px-3 py-2 text-xs leading-relaxed",
                view.agreesWithRule ? "bg-bg-sink text-muted" : "bg-[#FAECE7] text-[#993C1D]"
              )}
            >
              {view.agreesWithRule
                ? `Re-run against the charter now: the rule still produces ${view.evaluation.clause}. The committee applied the rule rather than interpreting it.`
                : `Re-run against the charter now: the rule produces ${view.evaluation.clause}, and the committee recorded ${d.decision}. A decision that departs from its own rule has to say why.`}
            </p>
          </>
        ) : (
          <p className="mt-3 rounded-md bg-bg-sink px-3 py-2 text-xs leading-relaxed text-muted">
            The clause above is the one the rule produced at decision time, copied onto the record.
            It has not been re-run here — the charter or the endpoint results are no longer
            reachable for this trial.
          </p>
        )}
      </section>

      {/* ── What the branch requires ──────────────────────────────────────── */}
      {ext && (
        <section className="space-y-4 rounded-card border border-line bg-bg-card px-5 py-4">
          <Field label="New question">{ext.newQuestion}</Field>
          <Field label="New stop rule">{ext.newStopRule}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Extension">
              {ext.days} days · same {ext.sites} sites ·{" "}
              {ext.modelVersionUnchanged ? "model version unchanged" : "model version changes"}
            </Field>
            <Field label="Owner">
              {ext.owner.name} continues · review {formatCardDateShort(ext.reviewOn)}
            </Field>
          </div>
        </section>
      )}

      {d.adoption && (
        <section className="space-y-4 rounded-card border border-line bg-bg-card px-5 py-4">
          {/* A BAU owner distinct from the trial owner. Enforced in the store. */}
          <Field label="Business-as-usual owner">
            {d.adoption.bauOwner.name} · {d.adoption.bauOwner.role}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Funding line">{d.adoption.fundingLine}</Field>
            <Field label="First BAU review">{formatCardDateShort(d.adoption.reviewOn)}</Field>
          </div>
        </section>
      )}

      {d.retirement && (
        <section className="space-y-4 rounded-card border border-line bg-bg-card px-5 py-4">
          <Field label="Data">{d.retirement.dataPlan}</Field>
          <Field label="Devices">{d.retirement.devicePlan}</Field>
          <Field label="Patient continuity">{d.retirement.patientContinuityPlan}</Field>
          <Field label="Effective from">{formatCardDateShort(d.retirement.effectiveFrom)}</Field>
        </section>
      )}

      {view.closeout && (
        <Link
          href={`/hospital/outcome/${d.slug}/closeout`}
          className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        >
          Closeout and ownership <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Record {d.id} · revision {d.revision}
        {d.supersedes ? ` · supersedes ${d.supersedes}` : ""}. Append-only: a reversal is a new
        record naming the one it replaces, never a change to this one.
      </p>
    </div>
  );
}
