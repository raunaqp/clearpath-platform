"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  Building2, Boxes, Store, ArrowRight, ArrowUpRight, ChevronDown,
  ClipboardCheck, MapPin, Play, BadgeCheck,
} from "lucide-react";
import { REGULATORY_URL } from "@/lib/links";
import { ProductPreview } from "@/components/home/ProductPreview";
import { SiteReadinessDemo } from "@/components/home/SiteReadinessDemo";
import { MonitoringDemo } from "@/components/home/MonitoringDemo";
import { DirectoryDemo } from "@/components/home/DirectoryDemo";
import { AssessDemo } from "@/components/home/AssessDemo";
import { cn } from "@/lib/utils";

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
    href: "#for-hospitals",
    icon: Building2,
    eyebrow: "For hospitals",
    body: "Discover, evaluate and deploy tools safely",
  },
  {
    href: "#for-innovators",
    icon: Boxes,
    eyebrow: "For innovators",
    body: "Identify your regulatory readiness first? Get your product evaluated",
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
          Discover, deployment and evaluation platform for digital and AI
          solutions for hospitals.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Every hospital is offered more AI tools than it can safely evaluate and
          deploy. ClearPath is the platform through which hospitals can identify
          technologies they need, evaluate, and run, without pilot hell.
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

      <ForHospitals />
      <ForInnovators />

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

/* ─────────────────────────────────────────────────────────────────────────
 * §3 "For hospitals" — four items, collapsed by default, one open at a time.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * `demo` is the live product component for that step (brief §3). It is OPTIONAL
 * and genuinely absent on two items — see the note above HOSPITAL_ITEMS. An
 * item with no demo renders its copy full-width rather than showing an empty or
 * invented box.
 */
type Item = {
  id: string;
  title: string;
  body: React.ReactNode;
  demo?: { label: string; height: number; scale?: number; node: React.ReactNode };
};

/**
 * All four steps now show a live product component. None of these are mocks or
 * screenshots — each is the same component the product renders, wired to the
 * same fixtures, so the demos stay true as the product changes.
 */
const HOSPITAL_ITEMS: Item[] = [
  {
    id: "discover",
    title: "Discover and compare",
    body: (
      <div className="space-y-4">
        <p className="font-serif text-lg text-ink">Select products</p>
        <p className="text-sm leading-relaxed text-ink-2">
          Via India&apos;s first vendor-neutral AI marketplace for healthcare.
        </p>
        <p className="text-sm leading-relaxed text-ink-2">
          We curate and assess AI solutions, filtering by safety, compliance, and
          clinical relevance. Our team helps you identify the applications that
          truly fit your health system&apos;s needs, avoiding wasted time,
          resources and vendor lock-in.
        </p>
        <p className="text-sm leading-relaxed text-ink-2">
          Matching you to the best-suited product for your health system through:
        </p>
        <ul className="space-y-2.5">
          {[
            ["Needs validation and compatibility fit", "Clinical and operational team will support you to define the problem and identify compatible solutions that match your needs"],
            ["Clinical validation and regulatory compliance", "Independently check that the product's regulatory and clinical compliance requirements are documented and evidenced"],
            ["Understanding procurement", "Support for shortlisting and understanding one-time and recurring costs of the technology"],
          ].map(([lead, rest]) => (
            <li key={lead} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-deep" />
              <span>
                <span className="font-medium text-ink">{lead}</span> — {rest}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ),
    demo: {
      label: "Marketplace directory · assessed tools",
      height: 350,
      scale: 0.5,
      node: <DirectoryDemo />,
    },
  },
  {
    id: "readiness",
    title: "Check your site readiness",
    body: (
      <div className="space-y-4">
        <ul className="space-y-2.5">
          {[
            "What level of health system readiness is needed to introduce the technology to the hospital?",
            "Where does the hospital currently stand on it?",
            "Detailed action report on next steps for the hospital to be able to support introduction of new technologies",
          ].map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-deep" />
              {line}
            </li>
          ))}
        </ul>
        <Link href="/site-readiness" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
          Check site readiness <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    ),
    demo: {
      label: "Site readiness · six domains",
      height: 420,
      scale: 0.72,
      node: <SiteReadinessDemo />,
    },
  },
  {
    id: "deploy",
    title: "Deploy and test",
    body: (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-ink-2">
          On hospital data in the sandbox environment.
        </p>
        <p className="text-sm leading-relaxed text-ink-2">
          Test multiple AI apps in parallel to see how well they perform on your
          own data, in your systems.
        </p>
      </div>
    ),
    demo: {
      label: "Monitoring · governance dashboard",
      height: 350,
      scale: 0.62,
      node: <MonitoringDemo />,
    },
  },
  {
    id: "audit",
    title: "Audit trail and scorecard",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">
          Objective performance monitoring, and a final verdict.
        </p>
        <p className="text-sm leading-relaxed text-ink-2">
          Scorecard built on the framework.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/registry/chestxr" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
            See a published scorecard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/framework" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
            How we built the framework <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    ),
    demo: {
      label: "Assess tool applications · verdicts",
      height: 350,
      scale: 0.62,
      node: <AssessDemo />,
    },
  },
];

function ForHospitals() {
  // Collapsed by default, one open at a time (brief §3).
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="for-hospitals" className="scroll-mt-20 space-y-6">
      <h2 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
        Stop running pilots that go nowhere.
      </h2>
      <div className="divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-bg-card">
        {HOSPITAL_ITEMS.map((item) => {
          const expanded = open === item.id;
          return (
            <div key={item.id}>
              <h3>
                <button
                  onClick={() => setOpen(expanded ? null : item.id)}
                  aria-expanded={expanded}
                  aria-controls={`panel-${item.id}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-bg-sink/50"
                >
                  <span className="font-serif text-lg text-ink">{item.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted transition-transform",
                      expanded && "rotate-180"
                    )}
                  />
                </button>
              </h3>
              {expanded && (
                <div id={`panel-${item.id}`} className="border-t border-line-soft px-5 py-5">
                  {item.demo ? (
                    // Copy one side, the live demo of that step on the other.
                    // Stacks on mobile — the accordion is the main mobile
                    // surface, so the demo sits below the copy at 375px.
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>{item.body}</div>
                      <ProductPreview
                        label={item.demo.label}
                        height={item.demo.height}
                        scale={item.demo.scale}
                      >
                        {item.demo.node}
                      </ProductPreview>
                    </div>
                  ) : (
                    item.body
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * §4 "For innovators"
 * ───────────────────────────────────────────────────────────────────────── */

function ForInnovators() {
  return (
    <section id="for-innovators" className="scroll-mt-20 space-y-5">
      <h2 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
        From readiness card to a hospital that&apos;ll run it.
      </h2>
      <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
        Submit your tool, get a calibrated readiness verdict, and send a request
        to the best-fit hospital — as a trial or a deployment. Need regulatory
        readiness first?{" "}
        <a
          href={REGULATORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-teal-deep underline decoration-line underline-offset-4 hover:opacity-80"
        >
          Start there <ArrowUpRight className="h-3.5 w-3.5 text-[#BA7517]" />
        </a>
      </p>
      <Link href="/vendors" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
        For innovators <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
