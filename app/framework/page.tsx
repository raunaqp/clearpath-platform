import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Framework (methodology) page — DESCRIBES the authoritative standard.
 * Additive and static: it does not touch the engine, scoring, verdicts, or any
 * flow.
 *
 * The "PDMF" acronym was dropped SITEWIDE (20 Aug) — it is now "the framework"
 * in body copy and "Maturity Assessment Framework" where the standard needs a
 * proper name. /about and /research were updated in the same pass; the acronym
 * should not come back on one page alone.
 *
 * The platform's gate set is a focused SUBSET the tool runs today. It is
 * related to the clusters below but NOT one-to-one with them, and this file
 * must not claim otherwise. The totals coincide on both buyer paths — 17 gates
 * and 17 clusters public, 19 and 19 private — but the per-dimension splits do
 * not: clusters run 4/3/4/6 across D1–D4 while gates run 5/3/4/5. Matching
 * totals are a coincidence of two independently-built sets, not a mapping.
 */

type Cluster = { code: string; name: string; count: number; assesses: string };
type PrivateItem = { name: string; assesses: string };
type Dimension = {
  id: string;
  name: string;
  weight: number;
  question: string;
  clusters: Cluster[];
  /** D2 is buyer-conditional: the clusters above are the public variant; this
   *  is the private-buyer variant. Present only on D2. */
  buyerConditional?: { note: string; private: PrivateItem[] };
};

const DIMENSIONS: Dimension[] = [
  {
    id: "D1",
    name: "Clinical, Scientific & Regulatory Quality",
    weight: 31,
    question: "Does it do what it claims, is the evidence credible and independent, and is it properly classified and approved?",
    clusters: [
      { code: "D1.A", name: "Patient Outcomes", count: 4, assesses: "Whether the tool improves real patient outcomes, not just model metrics." },
      { code: "D1.B", name: "Evidence Quality", count: 5, assesses: "How credible, independent, and generalisable the supporting evidence is." },
      { code: "D1.C", name: "Clinical Performance & Safety", count: 14, assesses: "Measured accuracy, failure modes, and safe behaviour in real use." },
      { code: "D1.D", name: "Regulatory Status", count: 8, assesses: "Device classification, approvals, and the legal basis to deploy." },
    ],
  },
  {
    id: "D2",
    name: "System Fit",
    weight: 14,
    question: "Has the buyer prioritised this, can it be procured or funded, and does the infrastructure exist?",
    clusters: [
      { code: "D2.A", name: "Program Fit", count: 4, assesses: "Whether the health system has prioritised the problem this addresses." },
      { code: "D2.B", name: "Infrastructural Requirements", count: 1, assesses: "Whether the baseline infrastructure to run it exists." },
      { code: "D2.C", name: "Procurement Fit", count: 9, assesses: "Whether it can actually be bought, funded, and contracted." },
    ],
    buyerConditional: {
      note: "System Fit is buyer-conditional — the questions change with who is buying. The clusters above are the PUBLIC (state / government) procurement variant. A PRIVATE hospital is assessed on its own investment case instead. D1, D3, and D4 are the shared spine and do not vary by buyer.",
      private: [
        { name: "ROI / payback", assesses: "Whether there is a credible return-on-investment / payback case." },
        { name: "Liability & indemnity", assesses: "Whether liability and indemnity are clearly allocated (shared with the intake audit)." },
        { name: "Reimbursement & billing fit", assesses: "Whether the pathway is payable / reimbursable (shared with the intake audit)." },
        { name: "Service-line fit", assesses: "Whether it fits a service line the hospital runs and can grow." },
        { name: "Capital vs operating cost", assesses: "Whether the capital-versus-operating cost structure is workable." },
      ],
    },
  },
  {
    id: "D3",
    name: "User Experience & Workflow Fit",
    weight: 33,
    question: "Does it work for the people who use it, in real conditions, and do they keep using it?",
    clusters: [
      { code: "D3.A", name: "Learnability & Training Burden", count: 8, assesses: "How much training staff need before they can use it well." },
      { code: "D3.B", name: "Cognitive & Operational Fit", count: 10, assesses: "Whether it fits real workload, attention, and clinic conditions." },
      { code: "D3.C", name: "Clinical Behaviour", count: 7, assesses: "Whether it changes clinical decisions and actions appropriately." },
      { code: "D3.D", name: "Adoption & Sustained Fit", count: 8, assesses: "Whether people keep using it after the novelty and support fade." },
    ],
  },
  {
    id: "D4",
    name: "Technology, Data Governance & Usability",
    weight: 34,
    question: "Can it run here, can data move without lock-in, is patient data safe, and can the programme see what's happening?",
    clusters: [
      { code: "D4.A", name: "Infrastructure Readiness", count: 7, assesses: "Whether devices, connectivity, and power can run it here." },
      { code: "D4.B", name: "Interface Design & Accessibility", count: 7, assesses: "Whether the interface works across languages, literacy, and access needs." },
      { code: "D4.C", name: "Interoperability & Data Portability", count: 6, assesses: "Whether data moves in and out without vendor lock-in." },
      { code: "D4.D", name: "Monitoring, Analytics & Oversight", count: 6, assesses: "Whether the programme can see performance and drift in production." },
      { code: "D4.E", name: "Patient Consent & Data Rights", count: 4, assesses: "Whether patients consent and can exercise their data rights." },
      { code: "D4.F", name: "Data Privacy, Storage & Security", count: 4, assesses: "Whether patient data is stored and secured lawfully." },
    ],
  },
];

/**
 * Three-step ladder, 0–2. This replaced a four-step 0–3 ladder (20 Aug) — the
 * old rung 2 "Adequate with support" was folded into rung 1, and "System-owned"
 * moved from 3 to 2.
 *
 * MAX_LEVEL is the single source of the denominator. The sample report below
 * renders "/ {MAX_LEVEL}" and sizes its bars against it, so the scale and the
 * scores can never drift apart again — the previous version shipped 0–3 scores
 * under a 0–2 ladder because the denominator was typed as a literal.
 */
const MAX_LEVEL = 2;

const LADDER = [
  { level: 0, label: "Absent / fails", text: "The tool fails outright and needs changes to fit into this context." },
  { level: 1, label: "Requires support", text: "Only functions through specific support and initiative." },
  // Their version read "Built into how the system to survive changes" — kept the
  // sense (it outlives changes of staff), fixed the grammar.
  { level: 2, label: "System-owned", text: "Built into how the system runs, and survives changes of staff." },
];

/**
 * Illustrative only. Rescaled from the old 0–3 ladder by ×2/3, to one decimal:
 * 2.4→1.6, 1.8→1.2, 2.1→1.4, 1.6→1.1. Relative ordering is unchanged
 * (D1 > D3 > D2 > D4), and every value still sits between "requires support"
 * and "system-owned", which is what the "conditionally deployable" verdict says.
 */
const SAMPLE = [
  { id: "D1", name: "Clinical, Scientific & Regulatory Quality", avg: 1.6 },
  { id: "D2", name: "System Fit", avg: 1.2 },
  { id: "D3", name: "User Experience & Workflow Fit", avg: 1.4 },
  { id: "D4", name: "Technology, Data Governance & Usability", avg: 1.1 },
];

/** §7.1 — how the framework was built, and what is still ahead. */
const TIMELINE = [
  {
    when: "2024",
    status: "Complete" as const,
    title: "Literature review",
    text: "Global and Indian frameworks reviewed: implementation science models (NASSS, RE-AIM, CFIR), existing digital health evaluation approaches, WHO's digital health classification, and India's regulatory architecture (CDSCO MDR 2017, ABDM interoperability standards, DPDP Act 2023).",
  },
  {
    when: "2025 to early 2026",
    status: "Complete" as const,
    title: "Field documentation",
    text: "Implementation insights from three point-of-care screening tools, documented through the work of the Primary Care Innovation Unit inside Punjab's public health system. The empirical basis for the framework, not an afterthought.",
  },
  {
    when: "Q1 to Q2 2026",
    status: "Complete" as const,
    title: "Framework drafting",
    // Counts carry the buyer split here too, and "112" is exact — the live edit
    // said "112+", which reads as an unbounded estimate of a number the page
    // derives precisely from DIMENSIONS.
    text: "The literature review and field documentation became a structured framework: 4 dimensions, 17 public / 19 private clusters, 112 items. Refined with partner organisations and advisory contributors.",
  },
  {
    when: "Q2 to Q3 2026",
    status: "Ongoing" as const,
    title: "Beta testing",
    text: "Structured discovery conversations with hospital administrators, state government health officials, AI health technology companies, and frontline health workers are complete. Now recruiting beta testers to run the framework against live tools and live data.",
  },
  {
    when: "H2 2026 onward",
    status: "Planned" as const,
    title: "Continuous revision",
    text: "Every new tool, provider, and setting the framework meets will change it.",
  },
];

/** §7.2 */
const BUILT = [
  "Developed inside the Primary Care Innovation Unit, embedded in a state Department of Health.",
  "Used over two years to evaluate and scale digital and AI tools in primary care.",
  "Every item earned its place by catching a failure in the field.",
];

/**
 * §7.3 — conversations and proposals, not signed engagements. The brief's
 * first bullet named ICMR-NIRDH; the live edit says "identifying design
 * partners" instead. Kept the softer version — it is the later text and it
 * matches the brief's own "do not upgrade the verbs" guardrail.
 */
const NEXT = [
  "Identifying design partners to turn the framework into a standalone scoring guide.",
  "Working to create an evaluation and observability layer for providers on the ONHS platform.",
  "A streamlining body for digital trials, just like clinical trials for pharma.",
  "Community building mechanism for open source benchmarking of different solutions catering to clinicians, frontline workers or patients.",
];

const STATUS_STYLE: Record<string, string> = {
  Complete: "bg-teal-light text-teal-deep",
  Ongoing: "bg-[#FAEEDA] text-[#BA7517]",
  Planned: "bg-bg-sink text-muted",
};

const TOTAL_QUESTIONS = DIMENSIONS.reduce((n, d) => n + d.clusters.reduce((m, c) => m + c.count, 0), 0);

/**
 * Cluster counts are BUYER-CONDITIONAL, because D2 is. The public-procurement
 * variant has 17 clusters; a private buyer swaps D2's 3 public clusters for its
 * 5 investment-case items, giving 19.
 *
 * Both are derived, never typed as literals — the page renders the 17 public
 * clusters by name, so a hand-written total can silently disagree with what is
 * actually on screen. The item count (112) is the public path and does not vary:
 * the private D2 items are not individually counted in the standard.
 */
const PUBLIC_CLUSTERS = DIMENSIONS.reduce((n, d) => n + d.clusters.length, 0);
const PRIVATE_CLUSTERS = DIMENSIONS.reduce(
  (n, d) => n + (d.buyerConditional ? d.buyerConditional.private.length : d.clusters.length),
  0
);

export default function FrameworkPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-16 pb-10">
      {/* Intro */}
      <section className="space-y-5 pt-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal-deep">
          Maturity Assessment Framework
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl">
          A readiness standard for digital and clinical AI before it reaches patients.
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-ink-2">
          The framework is a practitioner-led, open standard that answers the question of{" "}
          <span className="text-ink">whether the tool is fit for a particular context</span> — not
          whether it works in general, but whether it is ready to be deployed here. It is a
          sector-led benchmark that sits beside a regulator rather than replacing one — the same
          shape as open standards like EdTech Tulna, translated to clinical AI.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          {[["4", "dimensions"], [`${PUBLIC_CLUSTERS} / ${PRIVATE_CLUSTERS}`, "clusters · public / private"], [`${TOTAL_QUESTIONS}`, "assessment items"], [`0–${MAX_LEVEL}`, "maturity scale"]].map(([n, l]) => (
            <span key={l} className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-bg-card px-3 py-1">
              <span className="font-serif text-base text-teal-deep">{n}</span>
              <span className="text-muted">{l}</span>
            </span>
          ))}
        </div>
      </section>

      {/* The four dimensions + their clusters */}
      <section className="space-y-4">
        <div className="space-y-1">
          {/* Spelled out, so it has to be edited by hand when the counts change —
              a find-and-replace on "17" sails straight past it.

              The headline leads with SEVENTEEN because seventeen is what the
              body below renders, cluster by cluster. Nineteen follows as the
              private-buyer path. Leading with the number the reader cannot
              count on the page is the contradiction this ordering avoids. */}
          <h2 className="font-serif text-2xl text-ink">
            Four dimensions, seventeen clusters — nineteen on the private-buyer path.
          </h2>
          <p className="max-w-3xl text-sm text-muted">
            Every assessment item carries equal weight, so a dimension's weight is simply its share
            of the {TOTAL_QUESTIONS} items. Workflow and data governance count as much as clinical
            quality. The count depends on who is buying: the {PUBLIC_CLUSTERS} clusters named below
            are the public-procurement path, and a private buyer swaps D2&apos;s three procurement
            clusters for five investment-case items, making {PRIVATE_CLUSTERS}.
          </p>
        </div>

        <div className="space-y-5">
          {DIMENSIONS.map((d) => (
            <div key={d.id} className="overflow-hidden rounded-card border border-line bg-bg-card">
              {/* Dimension header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-teal-light/40 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">Dimension {d.id}</p>
                  <h3 className="mt-0.5 font-serif text-xl text-ink">{d.name}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">{d.question}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-serif text-3xl leading-none text-teal-deep">{d.weight}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">weight / {TOTAL_QUESTIONS}</p>
                  {d.buyerConditional && (
                    <span className="mt-1.5 inline-flex rounded-full bg-[#FAEEDA] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#BA7517]">Buyer-conditional</span>
                  )}
                </div>
              </div>
              {d.buyerConditional && (
                <p className="border-b border-line bg-bg-sink/40 px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Public · state / government procurement variant
                </p>
              )}
              {/* Clusters (public variant) */}
              <div className="grid gap-px bg-line sm:grid-cols-2">
                {d.clusters.map((c) => (
                  <div key={c.code} className="bg-bg-card px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">
                        <span className="font-mono text-xs text-teal-deep">{c.code}</span> {c.name}
                      </p>
                      <span className="shrink-0 rounded-full bg-bg-sink px-2 py-0.5 font-mono text-[10px] text-ink-2">{c.count} items</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{c.assesses}</p>
                  </div>
                ))}
              </div>
              {/* Private-buyer variant (D2 only) */}
              {d.buyerConditional && (
                <div className="border-t border-line">
                  <p className="bg-bg-sink/40 px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                    Private · private-hospital investment-case variant
                  </p>
                  <div className="grid gap-px bg-line sm:grid-cols-2">
                    {d.buyerConditional.private.map((p) => (
                      <div key={p.name} className="bg-bg-card px-5 py-3.5">
                        <p className="text-sm font-medium text-ink">{p.name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{p.assesses}</p>
                      </div>
                    ))}
                  </div>
                  <p className="px-5 py-3 text-xs leading-relaxed text-ink-2">{d.buyerConditional.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Maturity ladder */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl text-ink">The maturity ladder.</h2>
          <p className="max-w-3xl text-sm text-muted">
            Each item is scored not pass/fail but on a three-step maturity scale. The goal isn't a
            tool that merely works — it's a tool that is <span className="text-ink">system-owned</span>,
            rather than a scaffolded programme that depends on one champion staying in post.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {LADDER.map((s) => (
            <div key={s.level} className="rounded-card border border-line bg-bg-card p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-deep font-serif text-sm text-white">{s.level}</span>
              <p className="mt-3 font-serif text-base text-ink">{s.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="rounded-card border border-[#BA7517]/25 bg-[#FAEEDA]/50 px-4 py-3 text-sm text-ink-2">
          <span className="font-medium text-ink">Gate items are deployment-blocking</span> — a failure
          on a gate stops deployment regardless of how high the surrounding scores are.
        </p>
      </section>

      {/* Weighting note */}
      <section className="rounded-2xl border border-line bg-bg-card px-6 py-6">
        <h2 className="font-serif text-2xl text-ink">Why workflow and data weigh as much as evidence.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
          User experience &amp; workflow fit (D3 · 33) and technology &amp; data governance (D4 · 34)
          together outweigh clinical, scientific &amp; regulatory quality (D1 · 31). This is
          deliberate: a tool can be clinically excellent and still be undeployable if clinicians won't
          use it, if it can't run on local infrastructure, or if data can't move without lock-in.
          Strong evidence is necessary — it is not sufficient.
        </p>
      </section>

      {/* Sample report */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl text-ink">What an assessment looks like.</h2>
          <p className="text-sm text-muted">An illustrative example — not a real product's result.</p>
        </div>
        <div className="rounded-card border border-[#BA7517]/30 bg-bg-card">
          <div className="border-b border-line px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">Verdict · illustrative</p>
            <p className="mt-1 font-serif text-xl leading-snug text-ink">
              Conditionally deployable — works as a scaffolded programme, not yet a standalone,
              system-owned tool.
            </p>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-2">
            {SAMPLE.map((s) => (
              <div key={s.id} className="bg-bg-card px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-sm text-ink-2">
                    <span className="font-mono text-xs text-teal-deep">{s.id}</span> {s.name}
                  </p>
                  <p className="shrink-0 font-serif text-lg text-ink">{s.avg.toFixed(1)}<span className="text-xs text-muted"> / {MAX_LEVEL}</span></p>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-sink">
                  <div className="h-full rounded-full bg-teal-deep" style={{ width: `${(s.avg / MAX_LEVEL) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Openness */}
      <section className="rounded-2xl border border-line bg-teal-light/30 px-6 py-6">
        <h2 className="font-serif text-xl text-ink">Open, and built on real deployments.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
          The framework is open and practitioner-led — built and pressure-tested on real deployments
          across <span className="text-ink">3 AI tools, 8 districts, and 75,000+ beneficiaries</span>,
          and it keeps evolving with the field. It sits beside regulators and funders as a shared,
          transparent standard rather than a private checklist.
        </p>
        <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          ClearPath implements this framework progressively. The live tool runs a focused subset
          today — a gate set drawn from these same four dimensions, which is related to the clusters
          above but does not map onto them one-to-one: the totals happen to match, the per-dimension
          split does not. This page describes the standard and the {TOTAL_QUESTIONS} items it
          specifies, not the current question count in the product.
        </p>
      </section>

      {/* ── How it was built (brief §7.1–7.3) ────────────────────────────────
          Provenance, not a roadmap: the timeline says where each part of the
          standard came from, and the two columns say what exists versus what is
          still a conversation. §7.3 is deliberately hedged — "identifying",
          "working to create" — and must not be upgraded into signed work. */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl text-ink">How it was built.</h2>
          <p className="max-w-3xl text-sm text-muted">
            Built inside a working health system, and what&apos;s still ahead.
          </p>
        </div>

        <ol className="relative space-y-0 border-l border-line pl-0">
          {TIMELINE.map((e) => (
            <li key={e.title} className="relative pb-6 pl-6 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-teal-deep"
              />
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{e.when}</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLE[e.status]}`}
                >
                  {e.status}
                </span>
              </div>
              <h3 className="mt-1 font-serif text-lg text-ink">{e.title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{e.text}</p>
            </li>
          ))}
        </ol>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card border border-line bg-bg-card px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">What we built</p>
            <ul className="mt-3 space-y-2.5">
              {BUILT.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-deep" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-bg-card px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
              What we&apos;re building next
            </p>
            <ul className="mt-3 space-y-2.5">
              {NEXT.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                  <ArrowRight aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0 text-[#BA7517]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="font-serif text-lg leading-snug text-ink">
          It was built in practice. It needs beta users to refine it further.
        </p>
      </section>

      {/* ── Community call (brief §7.4) ──────────────────────────────────────
          Flagged in the brief as present in the earlier draft but absent from
          the 14 Aug Word doc; open question 7 asked keep-or-cut. RESOLVED
          (17 Aug): keep. Contact is a single mailto, matching the same call
          made for /about — a form would mean storage and a DPDP notice. */}
      <section className="space-y-4 rounded-2xl border border-line bg-bg-card px-6 py-6">
        <h2 className="font-serif text-2xl text-ink">We&apos;re building a community for:</h2>
        <ul className="space-y-2.5">
          {[
            ["Open data sets", "Shared, documented evaluation data for clinical AI in India, rather than each team rebuilding a private set."],
            ["Benchmarking existing LLMs", "Measuring what general-purpose models actually get right and wrong on regulatory and clinical tasks, in the open."],
            ["Open call for collaborations", "Hospitals, innovators, researchers, and funders who want to work on this with us — reach out."],
          ].map(([lead, rest]) => (
            <li key={lead} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-deep" />
              <span>
                <span className="font-medium text-ink">{lead}</span> — {rest}
              </span>
            </li>
          ))}
        </ul>
        <a
          href="mailto:raunaq.pradhan@gmail.com"
          className="inline-flex items-center gap-1 text-sm text-teal-deep underline decoration-line underline-offset-4 hover:opacity-80"
        >
          raunaq.pradhan@gmail.com
        </a>
      </section>

      {/* Cross-link to /research. The framework is the deployment standard; the
          research page is the regulatory engine. Same method, different
          question — and /research is reachable only from here and home §4,
          never from the public nav. */}
      <section className="rounded-2xl border border-line bg-bg-card px-6 py-6">
        <h2 className="font-serif text-xl text-ink">How we built the regulatory engine.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
          The framework answers whether a tool is ready to deploy. A separate question — what
          regulatory class a device is in, and whether a language model can be trusted to
          say — got the same treatment: we measured the naive approach first, and built
          around where it failed.
        </p>
        <Link href="/research" className="mt-4 inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
          Read the benchmark <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
