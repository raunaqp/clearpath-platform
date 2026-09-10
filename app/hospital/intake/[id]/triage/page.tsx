"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, HelpCircle, X } from "lucide-react";
import type { DeploymentRequest, TriageDecision } from "@/lib/schemas/handoff";
import type { ProblemRegister, SiteOperatingProfile } from "@/lib/schemas/site-profile";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { getDeploymentRequest, getTriage, recordTriage } from "@/lib/mock/api-handoff";
import { getProblemRegister, getSiteProfile } from "@/lib/mock/api-registry";
import { getCardV2 } from "@/lib/mock/api";
import { runTriage, TRIAGE_OUTCOME_LABEL, type TriageAssessment, type TriageOutcome } from "@/lib/engine/triage";
import { formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S16 — triage.
 *
 * A short, cheap, high-mortality screen. MOST SUBMISSIONS SHOULD DIE HERE and
 * that is the point: it is the mechanism that removes most intake volume, which
 * is what makes a real audit affordable on the few that survive. Hiding it —
 * folding it into the audit, or showing only the ones that passed — hides why
 * the rest of the process is possible at all.
 *
 * Four findings, each rendered separately. A single triage score would hide
 * which question failed, and the question that failed IS the decline: "not on
 * our register" and "no colposcopy pathway" send a vendor to entirely different
 * places.
 *
 * Every decline reason returns to the innovator, and the form will not submit a
 * park or a decline without one.
 */
const AUDITOR = "Dr. Meera Raghavan, clinical governance lead";

export default function TriagePage() {
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<DeploymentRequest | null>(null);
  const [view, setView] = useState<CardV2View | null>(null);
  const [profile, setProfile] = useState<SiteOperatingProfile | undefined>(undefined);
  const [register, setRegister] = useState<ProblemRegister | undefined>(undefined);
  const [existing, setExisting] = useState<TriageDecision | null>(null);
  const [loading, setLoading] = useState(true);

  const [outcome, setOutcome] = useState<TriageOutcome>("ADVANCE");
  const [reason, setReason] = useState("");
  const [revisitAt, setRevisitAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const req = await getDeploymentRequest(id);
      const [v, p, r, t] = await Promise.all([
        getCardV2(id),
        req ? getSiteProfile(req.hospitalId) : Promise.resolve(undefined),
        req ? getProblemRegister(req.hospitalId) : Promise.resolve(undefined),
        getTriage(id),
      ]);
      if (!live) return;
      setRequest(req ?? null);
      setView(v ?? null);
      setProfile(p);
      setRegister(r);
      setExisting(t ?? null);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  /**
   * Triage READS the site's records. It does not create them — and where a
   * record is missing the question comes back UNANSWERABLE rather than passing
   * quietly.
   */
  const assessment: TriageAssessment | null = useMemo(() => {
    if (!request || !view) return null;
    return runTriage({ request, card: view.card, profile, register });
  }, [request, view, profile, register]);

  async function decide() {
    if (!assessment) return;
    setError(null);
    setBusy(true);
    try {
      const d = await recordTriage({
        slug: id,
        outcome,
        decidedBy: AUDITOR,
        reason: reason.trim() || undefined,
        revisitAt: revisitAt || undefined,
        findings: assessment.checks.map((c) => ({
          key: c.key,
          question: c.question,
          status: c.status,
          finding: c.finding,
        })),
      });
      setExisting(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the decision.");
    }
    setBusy(false);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!request || !view || !assessment) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No request to triage</p>
        <Link href="/hospital" className="mt-3 inline-block text-sm text-teal-deep">← Inbox</Link>
      </div>
    );
  }

  const needsReason = outcome !== "ADVANCE";

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/intake/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Request
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">Triage</p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{request.toolName}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Four questions answerable from records we already hold. No document reading, no scoring,
          no meeting. Most requests should stop here — that is what makes a full audit affordable on
          the ones that do not.
        </p>
      </header>

      <ol className="space-y-3">
        {assessment.checks.map((c, i) => {
          const Icon = c.status === "pass" ? Check : c.status === "fail" ? X : HelpCircle;
          const tint =
            c.status === "pass" ? "text-[#3B6D11]" : c.status === "fail" ? "text-[#993C1D]" : "text-[#BA7517]";
          return (
            <li key={c.key} className="rounded-card border border-line bg-bg-card px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="flex items-center gap-2.5 text-[15px] text-ink">
                  <span className="font-mono text-xs text-muted">{i + 1}</span>
                  {c.question}
                </p>
                <span className={cn("flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider", tint)}>
                  <Icon className="h-3.5 w-3.5" />
                  {c.status}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.finding}</p>
            </li>
          );
        })}
      </ol>

      {existing ? (
        <section className="rounded-card border border-[#3B6D11]/40 bg-[#EAF3DE] px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#3B6D11]">
            {TRIAGE_OUTCOME_LABEL[existing.outcome]}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0E1411]">
            Decided {formatCardDate(existing.decidedAt)} by {existing.decidedBy}.
          </p>
          {existing.reason && (
            <p className="mt-1 text-sm leading-relaxed text-[#0E1411]">
              Reason: {existing.reason}
              {existing.revisitAt && ` Revisit ${formatCardDate(existing.revisitAt)}.`}
            </p>
          )}
          {existing.returnedToInnovator && (
            <p className="mt-2 text-xs leading-relaxed text-[#3B6D11]">
              This reason has been returned to the innovator. A decline they cannot read is
              indistinguishable from being ignored.
            </p>
          )}
        </section>
      ) : (
        <section className="space-y-4 rounded-card border border-line bg-bg-card px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Decision</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["ADVANCE", "PARK", "DECLINE"] as TriageOutcome[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  disabled={o === "ADVANCE" && !assessment.canAdvance}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40",
                    outcome === o ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink"
                  )}
                >
                  {TRIAGE_OUTCOME_LABEL[o]}
                </button>
              ))}
            </div>
            {!assessment.canAdvance && (
              <p className="mt-2 text-sm leading-relaxed text-[#BA7517]">
                Advancing is unavailable:{" "}
                {assessment.checks
                  .filter((c) => c.status !== "pass")
                  .map((c) => `${c.key.replace(/_/g, " ")} ${c.status}`)
                  .join(", ")}
                .
              </p>
            )}
          </div>

          {needsReason && (
            <>
              <label className="block">
                <span className="text-sm text-ink">Reason</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  This returns to the innovator. A decline with nothing in it is indistinguishable
                  from a submission that was ignored.
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1.5 min-h-[64px] w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink"
                  placeholder="What the innovator needs to know"
                />
              </label>
              {outcome === "PARK" && (
                <label className="block">
                  <span className="text-sm text-ink">Revisit on</span>
                  <input
                    type="date"
                    value={revisitAt}
                    onChange={(e) => setRevisitAt(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink"
                  />
                </label>
              )}
            </>
          )}

          {error && <p className="text-sm text-coral-brand">{error}</p>}

          <button
            onClick={decide}
            disabled={busy || (needsReason && !reason.trim())}
            aria-busy={busy}
            className="rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Recording…" : `Record — ${TRIAGE_OUTCOME_LABEL[outcome].toLowerCase()}`}
          </button>
        </section>
      )}
    </div>
  );
}
