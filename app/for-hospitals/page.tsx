"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Scale, MapPin, ShieldCheck } from "lucide-react";
import { useRole } from "@/lib/role/RoleContext";
import { ProductPreview } from "@/components/home/ProductPreview";
import { SiteReadinessDemo } from "@/components/home/SiteReadinessDemo";
import { MonitoringDemo } from "@/components/home/MonitoringDemo";
import { DirectoryDemo } from "@/components/home/DirectoryDemo";
import { AssessDemo } from "@/components/home/AssessDemo";

/**
 * "For hospitals" — its own scrollable page.
 *
 * This used to be an accordion on home, collapsed by default and one panel
 * open at a time, which meant a hospital could not read the four steps in
 * order without four clicks and could not link anyone to step 3.
 *
 * Four numbered steps, explanation left and the live product right. Every
 * preview is the REAL component wired to the real fixtures — never a
 * screenshot and never invented UI, so a demo cannot drift away from what the
 * product does. That also rules out the two things the preview build shows
 * here: a 94/100 composite disc and a /3 maturity scale, neither of which
 * exists in our product any more.
 *
 * This page ABSORBED /hospitals, which carried the same headline. The value
 * props and both entry actions came across; what did not is the silent
 * `setRole("hospital")` that page ran on mount. Reading about hospitals is not
 * the same as being one, so the role is set by clicking an entry action —
 * which is also the only moment it means anything.
 */

/** From /hospitals. */
const VALUES = [
  { icon: Scale, lead: "Your own verdict, not the vendor's", rest: "an independent 14-gate intake audit." },
  { icon: MapPin, lead: "Placement & readiness", rest: "know if this tool fits your site before you commit." },
  { icon: ShieldCheck, lead: "Run it properly", rest: "trial or deployment, monitored, documented, owned." },
];

type Step = {
  n: string;
  title: string;
  body: React.ReactNode;
  demo: { label: string; height: number; scale?: number; node: React.ReactNode };
};

function Bullets({ items }: { items: (string | [string, string])[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const [lead, rest] = Array.isArray(item) ? item : [null, item];
        return (
          <li key={Array.isArray(item) ? item[0] : item} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-deep" />
            <span>
              {lead && <span className="font-medium text-ink">{lead}</span>}
              {lead ? " — " : ""}
              {rest}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Discover and compare",
    body: (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-2">
          We curate and assess AI solutions, filtering by safety, compliance, and clinical
          relevance. Our team helps you identify the applications that truly fit your health
          system&apos;s needs, avoiding wasted time, resources and vendor lock-in.
        </p>
        <Bullets
          items={[
            ["Needs validation and compatibility fit", "Clinical and operational team will support you to define the problem and identify compatible solutions that match your needs"],
            ["Clinical validation and regulatory compliance", "Independently check that the product's regulatory and clinical compliance requirements are documented and evidenced"],
            ["Understanding procurement", "Support for shortlisting and understanding one-time and recurring costs of the technology"],
          ]}
        />
        <Link href="/registry" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
          Browse the marketplace <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    ),
    demo: { label: "Marketplace directory · assessed tools", height: 350, scale: 0.5, node: <DirectoryDemo /> },
  },
  {
    n: "02",
    title: "Check your site readiness",
    body: (
      <div className="space-y-4">
        <Bullets
          items={[
            "What level of health system readiness is needed to introduce the technology to the hospital?",
            "Where does the hospital currently stand on it?",
            "Detailed action report on next steps for the hospital to be able to support introduction of new technologies",
          ]}
        />
        <Link href="/site-readiness" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
          Check site readiness <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    ),
    demo: { label: "Site readiness · six domains", height: 420, scale: 0.72, node: <SiteReadinessDemo /> },
  },
  {
    n: "03",
    title: "Deploy and test",
    body: (
      <div className="space-y-4">
        <Bullets
          items={[
            "On hospital data, in a sandbox environment, before anything touches a patient pathway",
            "Test multiple AI apps in parallel to see how well they perform on your own data, in your systems",
            "A named owner and a stop rule for every trial, agreed before it starts",
          ]}
        />
      </div>
    ),
    demo: { label: "Monitoring · governance dashboard", height: 350, scale: 0.62, node: <MonitoringDemo /> },
  },
  {
    n: "04",
    title: "Audit trail and scorecard",
    body: (
      <div className="space-y-4">
        <Bullets
          items={[
            "Objective performance monitoring against the thresholds set in the charter",
            "A scorecard built on the framework — gate results and conditions, never a composite score",
            "Every decision attributable, in force from the date it was taken, and published back to the marketplace",
          ]}
        />
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
    demo: { label: "Assess tool applications · verdicts", height: 350, scale: 0.62, node: <AssessDemo /> },
  },
];

export default function ForHospitalsPage() {
  const { setRole } = useRole();
  const router = useRouter();

  /** Enter the product AS a hospital. The role is set by the click, not by the view. */
  function enter(href: string) {
    setRole("hospital");
    router.push(href);
  }

  return (
    <div className="space-y-14 pb-8">
      <section className="max-w-3xl space-y-4 pt-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
          ← Back to home
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal-deep">
          For hospitals
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl">
          Stop running pilots that go nowhere.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Review the AI tools vendors send you, run your own independent audit, check whether
          you&apos;re ready to host, and run the trial or deployment end-to-end — with a named
          owner at the end.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => enter("/hospital")}
            className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            Open your inbox <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => enter("/site-readiness")}
            className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 text-sm text-ink-2 transition-colors hover:bg-bg-sink"
          >
            Check our site readiness
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.lead} className="rounded-card border border-line bg-bg-card px-5 py-4">
            <v.icon className="h-6 w-6 text-teal-deep" />
            <p className="mt-3 text-sm leading-relaxed text-ink">
              <span className="font-medium">{v.lead}</span>
              <span className="text-ink-2"> — {v.rest}</span>
            </p>
          </div>
        ))}
      </section>

      {STEPS.map((s) => (
        <section key={s.n} className="scroll-mt-20 space-y-5" id={`step-${s.n}`}>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-teal-deep">Step {s.n}</span>
            <h2 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">{s.title}</h2>
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>{s.body}</div>
            <ProductPreview label={s.demo.label} height={s.demo.height} scale={s.demo.scale}>
              {s.demo.node}
            </ProductPreview>
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-line bg-teal-light/30 px-6 py-6">
        <p className="max-w-3xl text-base leading-relaxed text-ink-2">
          We&apos;re looking for hospitals who want an honest readiness assessment.
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
