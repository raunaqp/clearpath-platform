"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import type { Closeout, Owner } from "@/lib/schemas/outcome";
import { getOutcomeView } from "@/lib/mock/api-outcome";
import { formatCardDateShort } from "@/lib/ui";

/**
 * S25 — closeout and ownership.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NAMED PEOPLE, NEVER FUNCTIONS
 * ─────────────────────────────────────────────────────────────────────────
 * "Site referral coordinator closes the loop" names nobody, so nobody does it.
 * Every row here is a person with an employer, because an orphaned tool
 * running unowned in a clinical pathway is the failure this record exists to
 * prevent — and naming a function instead of a person is exactly how it
 * happens: the post falls vacant and the record still reads as filled.
 *
 * The vacancy trigger is on screen for the same reason. A rule that lives in a
 * policy document nobody opens is a rule that fires for nobody.
 */

function OwnerRow({ label, owner }: { label: string; owner: Owner }) {
  return (
    <div className="border-t border-line-soft py-3 first:border-t-0 first:pt-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm text-ink">
        <span className="font-medium">{owner.name}</span> · {owner.role}
      </p>
      <p className="mt-0.5 text-xs text-muted">{owner.org}</p>
      {owner.detail && <p className="mt-1 text-sm leading-relaxed text-ink-2">{owner.detail}</p>}
    </div>
  );
}

export default function CloseoutPage() {
  const { id } = useParams<{ id: string }>();
  const [closeout, setCloseout] = useState<Closeout | null>(null);
  const [hasDecision, setHasDecision] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void getOutcomeView(id).then((v) => {
      if (!live) return;
      setCloseout(v?.closeout ?? null);
      setHasDecision(!!v);
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

  if (!closeout) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No closeout</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {hasDecision
            ? "A decision has been taken but the handover has not been recorded. There is nobody named yet, so there is nothing to show."
            : "Nothing has been decided about this trial, so there is nothing to hand over."}
        </p>
        <Link href="/hospital" className="mt-4 inline-block text-sm text-teal-deep">
          ← Back to inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/outcome/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Outcome decision
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Closeout and ownership
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">Who runs it now.</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Handed over {formatCardDateShort(closeout.handoverAt)} · next review{" "}
          {formatCardDateShort(closeout.nextReviewAt)} · monitoring{" "}
          {closeout.monitoringCadence.toLowerCase()}
        </p>
      </header>

      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <OwnerRow label="Runs it" owner={closeout.runs} />
        <OwnerRow label="Maintains the model" owner={closeout.maintainsModel} />
        <OwnerRow label="Maintains the integration" owner={closeout.maintainsIntegration} />
        <OwnerRow label="Referral backstop" owner={closeout.referralBackstop} />
        <OwnerRow label="Performance monitoring" owner={closeout.performanceMonitoring} />
        <div className="border-t border-line-soft py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Pays</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{closeout.pays}</p>
        </div>
      </section>

      {/* The vacancy trigger, stated where the owners are named rather than in
          a policy nobody opens. */}
      <section className="rounded-card border border-[#BA7517]/30 bg-[#FAEEDA] px-5 py-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#BA7517]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> If a named post falls vacant
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#8A5610]">
          {closeout.ownerVacancyTrigger}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/hospital/outcome/${id}/registry`}
          className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        >
          Publish to the marketplace <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/hospital/outcome/${id}/triggers`}
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink"
        >
          Review schedule and triggers
        </Link>
      </div>
    </div>
  );
}
