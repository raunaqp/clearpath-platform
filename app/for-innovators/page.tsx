"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { REGULATORY_URL } from "@/lib/links";
import { ProductPreview } from "@/components/home/ProductPreview";
import { AssessDemo } from "@/components/home/AssessDemo";
import { DirectoryDemo } from "@/components/home/DirectoryDemo";

/**
 * "For innovators" — its own scrollable page, matching the shape of
 * /for-hospitals: numbered steps, explanation left, live product right.
 *
 * Every preview is the REAL component on the real fixtures. Nothing here shows
 * a composite score or a /3 maturity scale — the product has neither.
 */

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((line) => (
        <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-deep" />
          {line}
        </li>
      ))}
    </ul>
  );
}

export default function ForInnovatorsPage() {
  return (
    <div className="space-y-14 pb-8">
      <section className="max-w-3xl space-y-4 pt-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
          ← Back to home
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal-deep">
          For innovators
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl">
          From readiness card to a hospital that&apos;ll run it.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Submit your tool, get a calibrated readiness verdict, and send a request to the best-fit
          hospital — as a trial or a deployment. Need regulatory readiness first?{" "}
          <a
            href={REGULATORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-teal-deep underline decoration-line underline-offset-4 hover:opacity-80"
          >
            Start there <ArrowUpRight className="h-3.5 w-3.5 text-[#BA7517]" />
          </a>
        </p>
      </section>

      <section className="scroll-mt-20 space-y-5" id="step-01">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-teal-deep">Step 01</span>
          <h2 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
            Declare the context, attach the evidence
          </h2>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Bullets
              items={[
                "Say where the tool is being deployed — level of care, who operates it, and what it decides. The card that comes out is valid only inside that context.",
                "A checklist generated from your context says what a submission of this kind is expected to bring, before you attach anything.",
                "Attach a document against each line, with its provenance. Evidence generated with a different cadre or setting is flagged, not silently counted.",
              ]}
            />
            <Link href="/submit" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
              Submit a tool <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ProductPreview label="Assess tool applications · verdicts" height={350} scale={0.62}>
            <AssessDemo />
          </ProductPreview>
        </div>
      </section>

      <section className="scroll-mt-20 space-y-5" id="step-02">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-teal-deep">Step 02</span>
          <h2 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
            Get a calibrated readiness card
          </h2>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Bullets
              items={[
                "17 gates across 4 dimensions, on a 0–2 ladder. A verdict and its conditions, never a composite score.",
                "What the assessment could not establish is on the card, in the same weight as everything else.",
                "Where a gate is unclear we ask you, rather than assuming — capped at five questions, blocking ones first.",
              ]}
            />
            <Link href="/registry/chestxr" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
              See a published card <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ProductPreview label="Marketplace directory · assessed tools" height={350} scale={0.5}>
            <DirectoryDemo />
          </ProductPreview>
        </div>
      </section>

      <section className="scroll-mt-20 space-y-5" id="step-03">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-teal-deep">Step 03</span>
          <h2 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
            Reach a hospital that will actually run it
          </h2>
        </div>
        <div className="max-w-2xl space-y-4">
          <Bullets
            items={[
              "Matched against each site's own operating profile and problem register — records the site wrote before your tool arrived.",
              "Sites that do not fit are shown with the reason, not filtered out.",
              "You express interest to ClearPath, not to a hospital. We validate the fit, confirm what you are willing to share, and approach the site on your behalf.",
            ]}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/vendors" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
              For innovators <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/research" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
              How we built the regulatory tool <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-teal-light/30 px-6 py-6">
        <p className="max-w-3xl text-base leading-relaxed text-ink-2">
          We&apos;re looking for innovators who want an honest readiness assessment.
        </p>
        <a
          href="mailto:raunaq.pradhan@gmail.com"
          className="mt-3 inline-flex items-center gap-1 text-sm text-teal-deep underline decoration-line underline-offset-4 hover:opacity-80"
        >
          Get in touch about a readiness assessment <ArrowRight className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}
