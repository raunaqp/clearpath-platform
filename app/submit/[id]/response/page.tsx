"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { getDeploymentRequest, triageReturnForInnovator } from "@/lib/mock/api-handoff";
import type { DeploymentRequest } from "@/lib/schemas/handoff";
import { REQUEST_STATUS_LABEL } from "@/lib/schemas/handoff";
import { formatCardDate } from "@/lib/ui";

/**
 * The innovator's view of what the hospital decided.
 *
 * `triageReturnForInnovator` was built in Phase 6a with nothing reading it. A
 * decline reason that reaches nobody is the same as being ignored — and being
 * ignored is exactly the experience the whole coordination layer exists to
 * stop. The reader had to exist for the writer to mean anything.
 *
 * Note what is NOT here: no appeal button, no "request reconsideration". A
 * hospital's decision about its own site is theirs. What the innovator gets is
 * the reason, in the hospital's words, and enough of it to act on somewhere
 * else.
 */
type Return = {
  outcome: "ADVANCE" | "PARK" | "DECLINE";
  hospitalName: string;
  reason: string | null;
  revisitAt: string | null;
  at: string;
};

export default function ResponsePage() {
  const { id } = useParams<{ id: string }>();
  const [ret, setRet] = useState<Return | null>(null);
  const [request, setRequest] = useState<DeploymentRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [r, req] = await Promise.all([triageReturnForInnovator(id), getDeploymentRequest(id)]);
      if (!live) return;
      setRet((r as Return) ?? null);
      setRequest(req ?? null);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Link href={`/submit/${id}/card`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Readiness card
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Hospital response
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">
          {request?.hospitalName ?? "Your request"}
        </h1>
      </header>

      {!request ? (
        <p className="rounded-card border border-line bg-bg-card px-5 py-6 text-sm leading-relaxed text-muted">
          No request has been sent yet. Interest goes to ClearPath first; a request follows once both
          sides are willing.
        </p>
      ) : !ret ? (
        <section className="rounded-card border border-teal-deep/30 bg-teal-light/30 px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">
            <Clock className="h-3.5 w-3.5" /> {REQUEST_STATUS_LABEL[request.status]}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {request.status === "UNDER_ASSESSMENT"
              ? "The hospital has triaged your request and is working through its own audit. This is a delay, not a decision — nothing has been declined."
              : "The hospital has your request. Nothing has come back yet."}
          </p>
        </section>
      ) : ret.outcome === "DECLINE" ? (
        <section className="rounded-card border border-[#993C1D]/40 bg-[#FAECE7] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#993C1D]">
            <XCircle className="h-3.5 w-3.5" /> Declined
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#0E1411]">{ret.reason}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#8A5610]">
            {ret.hospitalName}, {formatCardDate(ret.at)}. This is one site&apos;s decision about its
            own catchment, not an assessment of your tool — your card is unchanged and other sites
            may reach a different answer.
          </p>
        </section>
      ) : ret.outcome === "PARK" ? (
        <section className="rounded-card border border-[#BA7517]/40 bg-[#FAEEDA] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
            <Clock className="h-3.5 w-3.5" /> Parked
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#0E1411]">{ret.reason}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#8A5610]">
            {ret.hospitalName}, {formatCardDate(ret.at)}.
            {ret.revisitAt && ` They will look again on ${formatCardDate(ret.revisitAt)}.`}
          </p>
        </section>
      ) : (
        <section className="rounded-card border border-[#3B6D11]/40 bg-[#EAF3DE] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#3B6D11]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Advanced to audit
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0E1411]">
            {ret.hospitalName} triaged your request on {formatCardDate(ret.at)} and moved it to their
            own audit.
          </p>
        </section>
      )}
    </div>
  );
}
