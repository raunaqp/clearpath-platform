"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import type { AuditResult } from "@/lib/schemas/audit";
import type { AuditAssignment } from "@/lib/schemas/governance";
import type { Divergence } from "@/lib/engine/divergence";
import { DIVERGENCE_FRAMING } from "@/lib/engine/divergence";
import { getAssignments, getAudit, getDivergences } from "@/lib/mock/api-governance";
import { HOSPITAL_GATES, HOSPITAL_GROUPS, type HospitalGateId } from "@/lib/engine/gates";
import { GATE_STATUS_STYLE, gateDisplayStatus } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S17 — the hospital's own 13-gate audit, and where it diverges from the card.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE READINESS CARD IS AN INPUT, NOT A CONCLUSION
 * ─────────────────────────────────────────────────────────────────────────
 * The two-sided design's central claim is that the hospital forms its own
 * verdict, and until this screen existed that claim was invisible — the card
 * was the only assessment on screen anywhere. Here the institution answers its
 * own fourteen questions, with a NAMED PERSON against each one and the evidence
 * they looked at.
 *
 * No composite. "11 pass · 2 conditional" is a count of discrete findings a
 * reader can check gate by gate; a mean of fourteen gates that are not on a
 * common scale would invent a scale.
 */
export default function GovernanceAuditPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [assignments, setAssignments] = useState<AuditAssignment[]>([]);
  const [divergences, setDivergences] = useState<Divergence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [a, asg, d] = await Promise.all([getAudit(id), getAssignments(), getDivergences(id)]);
      if (!live) return;
      setAudit(a); setAssignments(asg); setDivergences(d); setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!audit) {
    return <div className="mx-auto max-w-lg py-16 text-center"><p className="font-serif text-xl text-ink">No audit</p></div>;
  }

  const byGate = new Map(audit.gateResults.map((r) => [r.gateId as HospitalGateId, r]));
  const owner = (g: string) => assignments.find((a) => a.gateId === g);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/intake/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Request
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Our independent audit
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{audit.auditor}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Fourteen questions this institution answers for itself. The vendor&apos;s Readiness Card is
          an input to this, not a conclusion.
        </p>
        <p className="pt-1 font-serif text-2xl text-ink">
          {audit.tally.pass} pass · {audit.tally.conditional} conditional
          {audit.tally.notMet > 0 && ` · ${audit.tally.notMet} not met`}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          A tally, not a score. Averaging fourteen gates that are not on a common scale would invent
          one.
        </p>
      </header>

      {/* Divergence — DERIVED by comparing the two records */}
      {divergences.length > 0 && (
        <section className="rounded-card border border-[#BA7517]/40 bg-[#FAEEDA] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
            <AlertTriangle className="h-3.5 w-3.5" /> Where our audit diverges from the card
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#0E1411]">
            The vendor&apos;s card records consent as satisfied. Northvale&apos;s audit records it as
            conditional — the vendor&apos;s consent flow assumes a digital capture this hospital does
            not use in camps. {DIVERGENCE_FRAMING}
          </p>
          <ul className="mt-3 space-y-2 border-t border-[#BA7517]/30 pt-3">
            {divergences.map((d) => (
              <li key={d.hospitalGateId} className="text-sm leading-relaxed text-[#0E1411]">
                <span className="font-mono text-xs text-[#8A5610]">
                  {d.hospitalGateId} ↔ {d.vendorGateId}
                </span>{" "}
                <span className="font-medium">{d.hospitalGateTitle}</span> — {d.vendorReads}{" "}
                {d.hospitalReads}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The 14 gates, grouped, each with an owner */}
      {(["should_pilot", "can_run", "who_owns"] as const).map((groupId) => {
        const group = HOSPITAL_GROUPS[groupId];
        return (
          <section key={groupId} className="overflow-hidden rounded-card border border-line bg-bg-card">
            <p className="border-b border-line-soft px-5 py-3 font-serif text-lg text-ink">
              {group.title}
            </p>
            <ul className="divide-y divide-line-soft">
              {group.gates.map((g) => {
                const result = byGate.get(g);
                const status = result ? gateDisplayStatus(result) : "notAnswered";
                const style = GATE_STATUS_STYLE[status];
                const a = owner(g);
                return (
                  <li key={g} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          <span className="font-mono text-xs text-muted">{g}</span>{" "}
                          {HOSPITAL_GATES[g].question}
                        </p>
                        {a && (
                          <p className="mt-1 text-xs text-muted">
                            <span className="text-ink-2">{a.ownerName}</span> · {a.ownerRole}
                          </p>
                        )}
                        {a?.evidence && (
                          <p className="mt-0.5 text-xs leading-relaxed text-muted">{a.evidence}</p>
                        )}
                        {result?.note && (
                          <p className="mt-1.5 rounded-md bg-bg-sink px-2.5 py-1.5 text-xs leading-relaxed text-ink-2">
                            {result.note}
                          </p>
                        )}
                      </div>
                      <span className={cn("shrink-0 rounded-pill px-2.5 py-0.5 text-xs", style.pill)}>
                        {status === "partial" ? "Conditional" : style.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <Link
        href={`/hospital/governance/${id}/verdict`}
        className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
      >
        Committee verdict <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
