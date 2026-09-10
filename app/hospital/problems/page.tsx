"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ProblemRegister } from "@/lib/schemas/site-profile";
import type { Hospital } from "@/lib/schemas/hospital";
import { getProblemRegister } from "@/lib/mock/api-registry";
import { getHospital } from "@/lib/mock/api";
import { formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S14 — the problem register.
 *
 * The site's own priorities, in its own order, written down before it has seen
 * any tool. Everything downstream leans on that ordering: matching cites the
 * rank, the deployment request names the entry by id, and triage cannot answer
 * its first question without it.
 *
 * THE SUCCESS DEFINITION IS THE HIGHEST-LEVERAGE FIELD HERE. The S20 charter's
 * endpoints derive from it. Writing it before tool exposure is what stops
 * endpoints being retrofitted to whatever the data happened to show — so the
 * publication date sits beside it rather than in a footer, because the date is
 * what makes "written first" a checkable claim rather than an assurance.
 */
const HOSPITAL_ID = "hosp-northvale";
const SUBMITTED_AT = "2026-09-15T00:00:00.000Z";
const FEATURED = "pr-northvale-cervical-screening";

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export default function ProblemRegisterPage() {
  const [register, setRegister] = useState<ProblemRegister | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [r, h] = await Promise.all([getProblemRegister(HOSPITAL_ID), getHospital(HOSPITAL_ID)]);
      if (!live) return;
      setRegister(r ?? null);
      setHospital(h ?? null);
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!register || !hospital) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No problem register published</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Without one, an incoming request cannot be checked against anything this site has said it
          needs — and triage cannot answer its first question.
        </p>
      </div>
    );
  }

  const total = register.entries.length;
  const featured = register.entries.find((e) => e.id === FEATURED);
  const lead = daysBetween(register.publishedAt, SUBMITTED_AT);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href="/hospital" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Inbox
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Problem register
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{hospital.name}</h1>
        <p className="text-sm text-muted">
          {total} problems ranked · published {formatCardDate(register.publishedAt)}, {lead} days
          before CerviAI was submitted
        </p>
      </header>

      {featured && (
        <section className="rounded-card border border-teal-deep/30 bg-bg-card">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-soft bg-teal-light/30 px-5 py-3">
            <p className="font-serif text-xl text-ink">
              <span className="font-mono text-sm text-teal-deep">#{featured.rank} of {total}</span>{" "}
              {featured.name}
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {featured.id}
            </span>
          </div>
          <dl className="divide-y divide-line-soft">
            <Row label="Problem">{featured.description}</Row>
            <Row label="Service line and volume">
              {featured.serviceLine}, {featured.volumePerYear.toLocaleString("en-IN")} women per year
            </Row>
            <Row label="Current pathway">
              {featured.currentPathway}
              {featured.currentMetric && ` ${featured.currentMetric}.`}
            </Row>
            <Row label="Constraint">{featured.constraint}</Row>

            {/* The field the charter's endpoints will derive from. */}
            <div className="bg-[#FAEEDA]/40 px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#BA7517]">
                  Success definition
                </dt>
                <span className="font-mono text-[10px] text-muted">
                  written {formatCardDate(register.publishedAt)}
                </span>
              </div>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-ink">
                {featured.successDefinition}
              </dd>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                The trial charter&apos;s endpoints derive from this line. It was written {lead} days
                before this site saw the tool, which is what stops endpoints being fitted to whatever
                the data turned out to show.
              </p>
            </div>
          </dl>
        </section>
      )}

      <section className="overflow-hidden rounded-card border border-line bg-bg-card">
        <p className="border-b border-line-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          The full register
        </p>
        <ul className="divide-y divide-line-soft">
          {[...register.entries].sort((a, b) => a.rank - b.rank).map((e) => (
            <li
              key={e.id}
              className={cn(
                "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3",
                e.id === FEATURED && "bg-teal-light/20"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm text-ink">
                  <span className="font-mono text-xs text-muted">#{e.rank}</span> {e.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{e.currentPathway}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm tabular-nums text-ink">{e.volumePerYear.toLocaleString("en-IN")}/yr</p>
                {!e.successDefinition && (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    not yet authored in full
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
