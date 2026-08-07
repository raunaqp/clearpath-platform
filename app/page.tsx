"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Building2, Boxes, BookMarked, ArrowRight, ArrowUpRight,
  Activity, UserX, HelpCircle, ClipboardCheck, MapPin, Play, BadgeCheck,
} from "lucide-react";
import { REGULATORY_URL } from "@/lib/links";

/**
 * Umbrella home — a real landing page (problem → doors → how it works → proof),
 * one coherent ClearPath brand across three doors. Copy is fixed; this file is
 * presentation only (no routing/engine/state changes).
 */
const PROBLEMS = [
  { icon: Activity, text: "Pilots stall and die — no standing rubric, no defensible verdict." },
  { icon: UserX, text: "No one owns the tool after the champion moves on." },
  { icon: HelpCircle, text: "Nobody checks whether this site can actually host it." },
];

const DOORS = [
  { href: "/hospitals", icon: Building2, eyebrow: "For hospitals", title: "Evaluate, place & run clinical AI safely.", body: "Review applications, run your own intake audit, check site readiness, run the pilot end-to-end." },
  { href: "/vendors", icon: Boxes, eyebrow: "For vendors", title: "Get your tool evaluated & deployed.", body: "A calibrated readiness card, then a request to a best-fit hospital — trial or deployment. Regulatory on-ramp included." },
  { href: "/registry", icon: BookMarked, eyebrow: "Registry", title: "See where tools have run.", body: "A public directory of assessed clinical-AI tools — verdict, class, and where each has been trialled or deployed, with outcomes." },
];

const STEPS = [
  { icon: ClipboardCheck, label: "Assess", text: "17 gates across 4 dimensions → a verdict, not a score." },
  { icon: MapPin, label: "Place", text: "Where in the system it belongs, and whether the site is ready." },
  { icon: Play, label: "Run", text: "Trial or deployment, monitored end-to-end." },
  { icon: BadgeCheck, label: "Prove", text: "A scorecard, a named owner, and back to the registry." },
];

export default function Home() {
  return (
    <div className="space-y-20 pb-8">
      {/* Hero */}
      <section className="max-w-3xl space-y-5 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal-deep">
          Pre-deployment evaluation, placement &amp; deployment for clinical AI
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-6xl">
          Clinical AI, from validated to safely deployed.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Every hospital is offered more AI tools than it can safely evaluate. ClearPath is the
          layer between a clinical-AI tool and a hospital that can actually run it — evaluate,
          place, and run, without pilot hell.
        </p>
      </section>

      {/* Problem band */}
      <section className="rounded-2xl border border-[#993C1D]/20 bg-[#FAECE7]/40 p-6 sm:p-8">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-coral-brand">
          Pilot hell is the default
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.text} className="flex gap-3">
              <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-coral-brand" />
              <p className="text-sm leading-relaxed text-ink">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Three doors — the core */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl text-ink">Three ways in.</h2>
          <p className="hidden text-sm text-muted sm:block">One platform, two sides, and a public record.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {DOORS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group flex flex-col rounded-card border border-line bg-bg-card p-6 transition-all hover:border-teal-deep/50 hover:shadow-sm"
            >
              <d.icon className="h-6 w-6 text-teal-deep" />
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">{d.eyebrow}</p>
              <h3 className="mt-1 font-serif text-xl leading-snug text-ink">{d.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{d.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-teal-deep">
                Enter <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
        {/* Quiet regulatory on-ramp — subordinate to the three doors */}
        <p className="text-sm text-muted">
          Need CDSCO/DPDP regulatory readiness first?{" "}
          <a href={REGULATORY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink-2 underline decoration-line underline-offset-4 hover:text-teal-deep">
            Start your regulatory journey <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </p>
      </section>

      {/* How it works — the full arc: Assess → Place → Run → Prove */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl text-ink">How it works.</h2>
          <Link href="/framework" className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-teal-deep hover:underline">
            See the full framework <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {STEPS.map((s, i) => (
            <Fragment key={s.label}>
              <div className="flex-1 rounded-card border border-line bg-bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-light font-serif text-sm text-teal-deep">{i + 1}</span>
                  <s.icon className="h-4 w-4 text-teal-deep" />
                </div>
                <p className="mt-3 font-serif text-lg text-ink">{s.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.text}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex shrink-0 items-center justify-center py-1 lg:py-0">
                  <ArrowRight className="h-5 w-5 rotate-90 text-teal-deep/50 lg:rotate-0" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </section>

      {/* Trust line */}
      <section className="rounded-2xl border border-line bg-bg-card px-6 py-6 text-center">
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-ink-2">
          Built for India — CDSCO, DPDP, ABDM-aware. Verdicts use calibrated language, never more
          certain than the evidence.
        </p>
      </section>
    </div>
  );
}
