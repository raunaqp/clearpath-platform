"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

/**
 * About — built from ClearPath_About_Copy.md. Copy is fixed; this file is
 * presentation only. Section order follows the source document.
 *
 * The source marks two sections [[double brackets]] — decisions Raunaq had to
 * make before this ships:
 *   · Team — RESOLVED (10 Sep): three real people, with the functional titles
 *     and bios supplied verbatim. NOTHING here may be embellished — no added
 *     seniority, no "founder"/"co-founder", no qualifier that was not written.
 *     Photos are optional and fall back to a monogram; a missing photo is not
 *     a reason to invent one.
 *   · Contact — RESOLVED (17 Aug): a single mailto, no form, so there is no
 *     storage and no DPDP notice to write.
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
    body: "The framework is published, not a private checklist. A hospital should be able to see the standard it is being assessed against, disagree with it, and argue about it.",
  },
];

/**
 * Core team. Titles and bios are VERBATIM as supplied — the `title` line is a
 * functional description, not a role in a hierarchy, and nothing may be added
 * to it. Photos are optional: drop a file at the `photo` path and it renders;
 * absent, the card shows a monogram rather than a broken image or a stock face.
 */
const TEAM = [
  {
    name: "Shalmalee",
    linkedin: "linkedin.com/in/shalmaleeaidoor",
    title: "Innovation lead · Biomedical scientist",
    photo: "/team/shalmalee.jpg",
    bio: "With 14+ years of experience, Shalmalee is a Biomedical Scientist by training and has crossed over from Big Pharma to the development sector to support improvement in outcomes in health and governance. Shalmalee leads the Primary Care Innovation Unit, a state-government unit embedded within Punjab's Department of Health that helps the government identify, evaluate and deploy innovations at scale.",
  },
  {
    name: "Pragya",
    linkedin: "linkedin.com/in/pragya-pasricha/",
    title: "Systems thinking · Public policy",
    photo: "/team/pragya.jpg",
    bio: "Pragya holds an undergraduate degree in Economics (Hons.) and a Master's in Public Policy from National Law School, Bangalore. She has worked with the state governments of Karnataka, Meghalaya and Punjab with a focus on policy. A founding member of the Primary Care Innovation Unit, she has led the introduction of digital innovations in public health systems.",
  },
  {
    name: "Raunaq",
    linkedin: "linkedin.com/in/raunaqpradhan/",
    title: "Venture Building. Digital health",
    photo: "/team/raunaq.jpg",
    bio: "I build ventures that solve real problems. For a decade, I've worked across digital health, sports, social impact, and now climate tech — taking ideas from concept to scale. I thrive in ambiguity, moving seamlessly between product, strategy, and venture building, while aligning teams around outcomes that matter.",
  },
];

/** Photo if one exists on disk, monogram if not. Never a stock face. */
function Avatar({ name, photo }: { name: string; photo: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light font-serif text-xl text-teal-deep"
      >
        {name.charAt(0)}
      </span>
    );
  }
  return (
    <Image
      src={photo}
      alt={name}
      width={56}
      height={56}
      className="h-14 w-14 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

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
          We enable healthcare providers to select, test, deploy, and monitor
          in-house and third-party AI products.
        </h1>
        <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-ink-2">
          <p>
            Every hospital is offered more AI tools than it can safely evaluate.
            ClearPath produces evidence that acts as a decision support tool for
            hospitals.
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
              The Maturity Assessment Framework. It sets out what a clinical AI
              tool has to demonstrate before it reaches patients, across four
              dimensions: clinical and regulatory quality, system fit, workflow
              fit, and data governance. It is open, practitioner-led, and sits
              beside a regulator rather than replacing one.
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
            The framework came out of the Primary Care Innovation Unit, embedded
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

      {/* ── Core team ────────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-2xl text-ink">Core team.</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m) => (
            <article key={m.name} className="flex flex-col rounded-card border border-line bg-bg-card p-5">
              <Avatar name={m.name} photo={m.photo} />
              <p className="mt-4 font-serif text-lg text-ink">{m.name}</p>
              <p className="mt-0.5 text-sm text-muted">{m.title}</p>
              <a
                href={`https://${m.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 self-start text-sm text-teal-deep hover:underline"
              >
                LinkedIn <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{m.bio}</p>
            </article>
          ))}
        </div>
      </section>

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
