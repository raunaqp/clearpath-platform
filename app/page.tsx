"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Building2, Boxes, Store, ArrowRight,
  ClipboardCheck, MapPin, Play, BadgeCheck,
} from "lucide-react";

/**
 * Public home (brief §2–§4). Presentation only — no routing, engine, or state
 * changes. Copy marked [exact] in the brief is pasted verbatim and must not be
 * reworded.
 *
 * Not yet built, and deliberately absent rather than faked:
 *   §2.4 problem statement — copy is still TBD (open question 4).
 *
 * All four §3 demo boxes render a real product component, never a mock or a
 * screenshot (brief §3: "Don't build new mock UI for these boxes").
 */

/** [exact] — brief §2.2. All three are entry points with identical affordance. */
const ENTRY_CARDS = [
  {
    href: "/for-hospitals",
    icon: Building2,
    eyebrow: "For hospitals",
    body: "Discover, evaluate and deploy tools safely",
  },
  {
    href: "/for-innovators",
    icon: Boxes,
    eyebrow: "For innovators",
    body: "Identify your regulatory readiness first. Get your product evaluated",
  },
  {
    href: "/registry",
    icon: Store,
    eyebrow: "The marketplace",
    body: "India's first neutral marketplace for digital health and AI solutions and digital ready hospitals",
  },
];

/** brief §2.3 — supporting lines under the marketplace card. */
const MARKETPLACE_LINES = [
  "Get connected to hospitals and innovators based on your need",
  "A public directory of clinically assessed tools and digitally ready hospitals",
];

const STEPS = [
  { icon: ClipboardCheck, label: "Assess", text: "17 gates across 4 dimensions → a verdict, not a score." },
  { icon: MapPin, label: "Place", text: "Where in the system it belongs, and whether the site is ready." },
  { icon: Play, label: "Run", text: "Trial or deployment, monitored end-to-end." },
  { icon: BadgeCheck, label: "Prove", text: "A scorecard, a named owner, and back to the registry." },
];

/** Shared affordance so all three entry cards read as equally clickable. */
const CARD_CLASS =
  "group flex cursor-pointer flex-col rounded-card border border-line bg-bg-card p-6 transition-all hover:border-teal-deep/50 hover:shadow-sm focus-visible:border-teal-deep";

export default function Home() {
  return (
    <div className="space-y-20 pb-8">
      {/* ── §2.1 Hero ────────────────────────────────────────────────────── */}
      <section className="max-w-3xl space-y-5 pt-8">
        <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl">
          Discovery, deployment and evaluation platform for digital and AI
          solutions for hospitals.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Every hospital is offered more AI tools than it can safely evaluate and
          deploy. ClearPath is the platform through which hospitals can identify
          technologies they need and evaluate them for their settings, without
          pilot hell.
        </p>
      </section>

      {/* ── §2.2 Three entry cards ───────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {ENTRY_CARDS.map((c) => {
            const inner = (
              <>
                <c.icon className="h-6 w-6 text-teal-deep" />
                <p className="mt-4 font-serif text-xl leading-snug text-ink">{c.eyebrow}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{c.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-teal-deep">
                  Enter <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </>
            );
            // Same classes either way — an in-page anchor and a route have to be
            // indistinguishable to the eye (brief §2.2).
            return c.href.startsWith("#") ? (
              <a key={c.href} href={c.href} className={CARD_CLASS}>
                {inner}
              </a>
            ) : (
              <Link key={c.href} href={c.href} className={CARD_CLASS}>
                {inner}
              </Link>
            );
          })}
        </div>

        {/* §2.3 — marketplace supporting lines, as a band beneath the row. */}
        <div className="rounded-card border border-line-soft bg-bg-sink/40 px-6 py-5">
          <ul className="grid gap-2 sm:grid-cols-2">
            {MARKETPLACE_LINES.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-deep" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* §2.4 problem statement goes here once the copy exists (open q4). */}

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

      {/* Closing call. Same mailto as /framework's community block — a form
          would mean storage and a DPDP notice. The link text is descriptive
          rather than "click here": it has to say where it goes when read on its
          own, which is how a screen reader announces a link list. */}
      <section className="rounded-2xl border border-line bg-teal-light/30 px-6 py-6">
        <p className="max-w-3xl text-base leading-relaxed text-ink-2">
          We&apos;re looking for hospitals and innovators who want an honest readiness assessment,
          and people building open datasets and benchmarks for clinical AI in India.
        </p>
        <a
          href="mailto:raunaq.pradhan@gmail.com"
          className="mt-3 inline-flex items-center gap-1 text-sm text-teal-deep underline decoration-line underline-offset-4 hover:opacity-80"
        >
          Get in touch about a readiness assessment
          <ArrowRight className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}
