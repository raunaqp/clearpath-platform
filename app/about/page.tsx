import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * About — built from ClearPath_About_Copy.md. Copy is fixed; this file is
 * presentation only. Section order follows the source document.
 *
 * Two sections in the source are marked [[double brackets]] — decisions Raunaq
 * has to make before this ships — and are deliberately ABSENT rather than
 * stubbed:
 *   · Team — needs names, roles, and a founder/employee/collaborator call.
 *     The source is explicit: ship without it rather than with invented bios.
 *   · Contact — the mailto address is unconfirmed. "Get in touch." therefore
 *     currently has no link under it. That is intentional, not an oversight.
 *
 * Calibration (source §Who we work with): ICMR-NIRDH and ONHS are CONVERSATIONS
 * and PROPOSALS. Do not upgrade the verbs to "partnered with" / "selected by" /
 * "in collaboration with".
 *
 * The "3 AI tools, 8 districts, 75,000+ beneficiaries" figure is shared with
 * app/framework/page.tsx:277 — if one changes, change both.
 */

const COMMITMENTS = [
  {
    lead: "Neutral by construction.",
    body: "We are not a reseller and we do not take a position on any vendor's tool. The directory is open; the assessment is the same regardless of who submitted it.",
  },
  {
    lead: "Calibrated, not confident.",
    body: "We say what the evidence supports and no more. Where something is unestablished, the assessment says so rather than rounding up. A readiness verdict is a description of submitted evidence, not a guarantee of performance.",
  },
  {
    lead: "Open standard.",
    body: "The PDMF is published, not a private checklist. A hospital should be able to see the standard it is being assessed against, disagree with it, and argue about it.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-16 pb-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="space-y-5 pt-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal-deep">
          About ClearPath
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl">
          Built inside a health system, for health systems.
        </h1>
        <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-ink-2">
          <p>
            Every hospital is offered more AI tools than it can safely evaluate.
            Most of what follows is a pilot that runs, produces a report, and
            ends — leaving the hospital no better placed to decide than before.
          </p>
          <p>
            ClearPath exists to make that decision structured, evidenced, and
            owned by the people who carry the risk.
          </p>
        </div>
      </section>

      {/* ── What we do ───────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl text-ink">
            A platform, and a standard underneath it.
          </h2>
          <p className="text-sm text-muted">ClearPath is two things working together.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-bg-card p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
              The standard
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              The PDMF — the Pre-Deployment Maturity Framework. It sets out what
              a clinical AI tool has to demonstrate before it reaches patients,
              across four dimensions: clinical and regulatory quality, system
              fit, workflow fit, and data governance. It is open,
              practitioner-led, and sits beside a regulator rather than
              replacing one.
            </p>
          </div>
          <div className="rounded-card border border-line bg-bg-card p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
              The platform
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Where the standard gets used. Hospitals discover tools, check their
              own site readiness, run structured trials or deployments, and get a
              scorecard they can defend. Innovators submit a tool, get a
              calibrated readiness verdict, and are matched to a hospital that
              can actually run it.
            </p>
          </div>
        </div>

        {/* Pull quote — callout treatment, not a blockquote (source note). */}
        <div className="rounded-card border border-teal-deep/20 bg-teal-light/30 px-6 py-5">
          <p className="font-serif text-xl leading-snug text-ink sm:text-2xl">
            The framework describes. The assessment decides. The hospital owns
            the call.
          </p>
        </div>

        <p className="max-w-3xl leading-relaxed text-ink-2">
          That separation is deliberate. We do not certify tools, and we do not
          tell a hospital what to buy. We structure the evidence and make the
          reasoning legible — the decision, and the accountability for it, stays
          with the health system.
        </p>
      </section>

      {/* ── Where it came from ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-ink">
          It was built in practice, not in a paper.
        </h2>
        <div className="max-w-3xl space-y-4 leading-relaxed text-ink-2">
          <p>
            The PDMF came out of the Primary Care Innovation Unit, embedded
            inside a state Department of Health in Punjab. Over two years it was
            used to evaluate and scale digital and AI tools in primary care —
            across{" "}
            <span className="text-ink">
              3 AI tools, 8 districts, and 75,000+ beneficiaries
            </span>
            .
          </p>
          <p>
            Every item in the framework earned its place by catching a failure in
            the field. The literature review came first — implementation science
            models, WHO&apos;s digital health classification, India&apos;s
            regulatory architecture — but the framework is shaped by what
            actually went wrong at sites, not by what the literature predicted
            would.
          </p>
          <p>
            It is still changing. Every new tool, provider, and setting it meets
            changes it.
          </p>
        </div>
        <Link
          href="/framework"
          className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline"
        >
          How the framework was built <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* ── How we work ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-ink">Three commitments.</h2>
        <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
          {COMMITMENTS.map((c) => (
            <div key={c.lead} className="bg-bg-card px-5 py-4">
              <p className="font-serif text-lg text-ink">{c.lead}</p>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who we work with ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-ink">Where this is going.</h2>
        <p className="max-w-3xl leading-relaxed text-ink-2">
          We are in conversation with ICMR-NIRDH about turning the framework into
          a standalone scoring guide, and working toward an evaluation and
          observability layer for providers on the ONHS platform. We are
          recruiting beta testers to run the framework against live tools and
          live data.
        </p>
      </section>

      {/* Team section omitted — [[bracketed]] in the source, pending Raunaq. */}

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <section className="space-y-4 border-t border-line pt-8">
        <h2 className="font-serif text-2xl text-ink">Get in touch.</h2>
        <p className="max-w-3xl leading-relaxed text-ink-2">
          We&apos;re looking for hospitals willing to run the framework against a
          real tool, innovators who want an honest readiness read, and people
          building open datasets and benchmarks for clinical AI in India.
        </p>
        <a
          href="mailto:raunaq.pradhan@gmail.com"
          className="inline-flex items-center gap-1 text-teal-deep underline decoration-line underline-offset-4 hover:opacity-80"
        >
          raunaq.pradhan@gmail.com
        </a>
      </section>
    </div>
  );
}
