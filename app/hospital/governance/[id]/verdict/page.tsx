"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import type { CommitteeVerdict } from "@/lib/schemas/governance";
import { COMMITTEE_DECISION_LABEL } from "@/lib/schemas/governance";
import { getVerdicts } from "@/lib/mock/api-governance";
import { formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S18 — the committee verdict.
 *
 * SEPARATE STATE FROM THE AUDIT. The audit is fourteen findings; the verdict is
 * what the institution decided to do about them, and the two can legitimately
 * differ — a committee may accept a conditional gate or refuse on a clear one.
 *
 * IMMUTABLE AND ATTRIBUTABLE. This is the record the institution reaches for six
 * months later, when the tool is being defended or discontinued and someone asks
 * who agreed to it. So it carries the chair by name, the quorum, the conflicts
 * declared and who stood down, and the dissent — recorded whether or not it
 * changed the outcome, because a verdict that records only agreement is one
 * nobody can audit.
 *
 * A reversal is a NEW verdict referencing the old, never an edit. The store
 * enforces that; this screen shows the chain.
 */
export default function VerdictPage() {
  const { id } = useParams<{ id: string }>();
  const [verdicts, setVerdicts] = useState<CommitteeVerdict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const v = await getVerdicts(id);
      if (!live) return;
      setVerdicts(v); setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (verdicts.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No verdict recorded</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The committee has not decided. An audit is findings; a verdict is what the institution
          decided to do about them.
        </p>
      </div>
    );
  }

  const superseded = new Set(verdicts.map((v) => v.supersedes).filter(Boolean));
  const current = [...verdicts].reverse().find((v) => !superseded.has(v.id))!;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/governance/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Our audit
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Committee verdict
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{current.hospitalName}</h1>
      </header>

      <section className="rounded-card border border-teal-deep/40 bg-teal-light/30 px-5 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal-deep">Decision</p>
        <p className="mt-1 font-serif text-3xl uppercase tracking-wide text-ink">
          {COMMITTEE_DECISION_LABEL[current.decision]}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {formatCardDate(current.decidedAt)}, signed by {current.chair.name}, {current.chair.role.toLowerCase()}.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Quorum {current.quorum.present} of {current.quorum.total} ·{" "}
          {current.conflicts.length === 0
            ? "no conflicts declared"
            : `${current.conflicts.length} conflict${current.conflicts.length === 1 ? "" : "s"} declared${current.conflicts.some((c) => c.recused) ? " and recused" : ""}`}
        </p>
        <p className="mt-3 flex items-center gap-1.5 border-t border-teal-deep/20 pt-3 font-mono text-[10px] uppercase tracking-wider text-teal-deep">
          <Lock className="h-3 w-3" /> Immutable · revision {current.revision}
        </p>
      </section>

      {current.conflicts.length > 0 && (
        <Block title="Conflicts declared">
          <ul className="space-y-1.5">
            {current.conflicts.map((c) => (
              <li key={c.member} className="text-sm leading-relaxed text-ink">
                <span className="text-ink-2">{c.member}</span> — {c.nature}.{" "}
                {c.recused ? "Recused." : "Did not recuse."}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Local conditions">
        <ul className="space-y-1.5">
          {current.localConditions.map((c) => (
            <li key={c} className="flex gap-2 text-sm leading-relaxed text-ink">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          These are this site&apos;s conditions, over and above the card&apos;s. They bind here and
          nowhere else.
        </p>
      </Block>

      {current.dissent.length > 0 && (
        <Block title="Dissent">
          <ul className="space-y-2">
            {current.dissent.map((d) => (
              <li key={d.member} className="text-sm leading-relaxed text-ink">
                <span className="text-ink-2">{d.member}</span> — {d.position}{" "}
                <span className={cn(d.accepted ? "text-[#3B6D11]" : "text-muted")}>{d.resolution}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Recorded whether or not it changed the outcome. A verdict that records only agreement is
            one nobody can audit.
          </p>
        </Block>
      )}

      {verdicts.length > 1 && (
        <Block title="Revision history">
          <ul className="space-y-1.5">
            {[...verdicts].reverse().map((v) => (
              <li key={v.id} className="text-sm leading-relaxed text-ink">
                <span className="font-mono text-xs text-muted">rev {v.revision}</span>{" "}
                {COMMITTEE_DECISION_LABEL[v.decision]} · {formatCardDate(v.decidedAt)}
                {v.supersedes && <span className="text-muted"> — supersedes {v.supersedes}</span>}
                {superseded.has(v.id) && <span className="text-muted"> · superseded</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/hospital/governance/${id}/placement`} className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90">
          Placement and site fit <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={`/hospital/governance/${id}/charter`} className="inline-flex items-center rounded-md border border-line px-4 py-2 text-sm text-ink-2 hover:bg-bg-sink">
          Trial charter
        </Link>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-bg-card px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}
