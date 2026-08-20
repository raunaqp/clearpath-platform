import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { REGULATORY_URL } from "@/lib/links";

/**
 * Research — how the regulatory tool was built. Built from
 * `platform-docs/ClearPath_Research_Page_Copy.md`, but the SOURCE OF RECORD for
 * every figure is `~/work/clearpath/research/paper/results_claims.md` (the
 * claims register). Presentation only: no engine, routing, or state changes.
 *
 * ── THE RULE FOR THIS FILE ────────────────────────────────────────────────
 * Every figure on this page must trace to a numbered claim (C1…C17) in the
 * register. If the register does not contain it, it does not go on this page.
 * Each number below carries a [Cn] comment naming its claim. Adding a figure
 * means adding its claim reference too — or not adding the figure.
 *
 * Two figures from the source copy were CUT under that rule, deliberately:
 *   · "barely above what you'd get from a model that guessed the same class
 *     every time" — no majority-class baseline claim exists in the register.
 *     It is also false as written: a constant-class baseline scores macro-F1
 *     0.149 against the observed 0.523.
 *   · "Class A devices get pushed up" (A→B) — real in the underlying CSV (182
 *     convergent devices) but the register makes no A→B claim. The registered
 *     upward finding is C7 (B→C), which is used instead.
 *
 * Register constraints honoured here, each mandatory where noted:
 *   · C1 — macro-F1 must be reported ALONGSIDE accuracy and weighted-F1, with
 *     the class-weighting stated. See the method note.
 *   · C3 — must state that Class A cannot be under-classified by construction,
 *     so 0.0% is structural, not empirical.
 *   · C4 — "no model correct", "unanimous under-classification" and "no
 *     Class-D vote" are the SAME event (all 40/163). Report ONE. This page
 *     reports the no-Class-D-vote form only.
 *   · C7 — descriptive only. No mechanism claim about why C attracts.
 *   · META-1 — the six models are NOT named. OpenRouter aliases are mutable
 *     and were not recorded, so a named comparison is not defensible.
 *   · Forbidden list — no clinical-validation, fairness, regulatory-outcome, or
 *     deployment-impact claim, and no claim that any real device is
 *     misclassified. The CDSCO reference list is the oracle, not adjudicated
 *     ground truth; the copy says "the reference list places", never "is".
 *
 * Calibration (source §Calibration): this is an INTERNAL benchmark, not a
 * published finding. "Our benchmark found", never "research shows". No causal
 * claims. The patient-safety finding is stated plainly with no adjectives —
 * "life-supporting" was removed from every Class D reference on 17 Aug.
 *
 * The "nine regulatory bodies" figure in §Scope is the ONE number on this page
 * that does not come from the register — it traces to `medtech/README.md`,
 * which the register (a benchmark-paper register) has no scope for.
 */

/** The design brief that came out of the benchmark. No figures — safe by construction. */
const PRINCIPLES = [
  {
    lead: "Never sound more certain than the regulator.",
    body: "Every output passes a certainty-calibration step before it reaches a user. “Class C SaMD” becomes “likely Class B/C”. “CDSCO required” becomes “approval likely required”. Where the pathway is genuinely unsettled — as it is for much of SaMD — the tool says so instead of resolving it.",
  },
  {
    lead: "Decompose before classifying.",
    body: "Most digital health products aren’t one device. A platform with a scribe feature inside it has a regulatory position for the feature, not the platform. The engine separates the sub-feature and scopes the assessment to it, because a whole-product classification is the fastest route to the wrong class.",
  },
  {
    lead: "Keep a human in the expensive part.",
    body: "The free readiness card is fast and calibrated. The draft pack maps content to regulatory structure — it does not fill government forms, and that distinction is legal, not cosmetic. Anything going to a regulator gets expert review before it goes.",
  },
];

/** Under-classification rate by true class [C3]. Strictly increasing — the core claim. */
const UNDERCLASS = [
  { cls: "A", rate: 0.0, note: "structural — cannot be under-classified" },
  { cls: "B", rate: 9.3, note: "566 of 6,102 decisions" },
  { cls: "C", rate: 29.3, note: "1,305 of 4,452 decisions" },
  { cls: "D", rate: 50.5, note: "494 of 978 decisions" },
];

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-16 pb-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="space-y-5 pt-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal-deep">
          Research
        </p>
        <h1 className="font-serif text-4xl leading-[1.05] text-ink sm:text-5xl">
          We tested whether a language model can classify a medical device. It
          can&apos;t — and it fails in the direction that matters.
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-ink-2">
          Before building a regulatory readiness tool, we wanted to know what the
          naive version would get wrong. So we ran the naive version. The result
          shaped everything about how the tool works.
        </p>
      </section>

      {/* ── The question ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-ink">Could you just ask a model?</h2>
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink-2">
          <p>
            CDSCO classifies medical devices into risk classes A through D. The
            class determines the approval pathway, the evidence burden, and the
            timeline — it is the first thing a founder needs to know and the
            thing they most often get wrong.
          </p>
          <p>
            It also looks like a task a language model should handle. The rules
            are written down. The device descriptions are short. So we tested it
            directly: give{" "}
            {/* [C1] six frontier and open-weight LLMs; 2,395 evaluated devices. */}
            <span className="text-ink">six models</span> — frontier and
            open-weight — only a device name and its intended use, and ask for
            the risk class. We ran{" "}
            <span className="text-ink">2,395 devices</span> from the CDSCO
            reference lists through all six.
          </p>
        </div>
      </section>

      {/* ── The result ───────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-2xl text-ink">A ceiling of 0.523 macro-F1.</h2>

        <div className="rounded-card border border-line bg-bg-card px-6 py-6">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {/* [C1] best macro-F1 0.5230; range 0.3540–0.5230 across the six. */}
            <p className="font-serif text-5xl leading-none text-teal-deep">0.523</p>
            <p className="text-sm text-muted">
              best macro-F1 of the six · range 0.354–0.523
            </p>
          </div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-2">
            Across the panel, the best any single model managed was a macro-F1 of
            0.523. That is the ceiling, not the average — and it is the ceiling
            on the easiest possible version of the task, where the class is
            inferred from a short description rather than a full technical file.
          </p>
        </div>

        {/* Method note — REQUIRED by C1: report accuracy and weighted-F1
            alongside macro-F1, and state the class weighting. */}
        <div className="rounded-card border border-line-soft bg-bg-sink/40 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            How to read that number
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
            {/* [C1] accuracy 0.5445, weighted-F1 0.5448; D = 6.81%, B = 42.46%. */}
            The same best model scores <span className="text-ink">54.5% accuracy</span>{" "}
            and a <span className="text-ink">weighted-F1 of 0.545</span>. We lead
            with macro-F1 because it weights Class D — 6.8% of the devices —
            equally with Class B, which is 42.5% of them. That is a deliberate
            choice for a safety argument: a metric that lets the rarest and
            highest-risk class disappear into the average is the wrong metric for
            this question.
          </p>
        </div>

        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink-2">
          <p>
            {/* [C2] panel majority macro-F1 0.4902; 288 of 2,395 (12.0%) unresolved ties. */}
            Aggregation does not rescue it. Taking a majority vote across all six
            models performs <span className="text-ink">worse</span> than the best
            single model — a macro-F1 of{" "}
            <span className="text-ink">0.490</span> — and yields no prediction at
            all on <span className="text-ink">288 of the 2,395 devices</span>{" "}
            (12.0%), where the vote ties. We report the ties rather than breaking
            them silently.
          </p>
        </div>
      </section>

      {/* ── The callout: the finding that matters ────────────────────────── */}
      <section className="space-y-5">
        <div className="rounded-2xl border border-[#BA7517]/30 bg-[#FAEEDA]/50 px-6 py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
            The finding that matters
          </p>
          <p className="mt-3 max-w-3xl font-serif text-2xl leading-snug text-ink">
            The errors are structured, not random. The panel collapses toward the
            middle of the scale — and the devices it pulls down are the ones the
            reference list places at the top.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-2">
            {/* [C6] 58 true-D devices with ≥4/6 agreeing on C; 0 of those 58 reach majority D. */}
            On <span className="font-medium text-ink">58 devices</span> that the
            CDSCO reference list places in Class D, at least{" "}
            <span className="font-medium text-ink">four of the six models</span>{" "}
            agreed on Class C instead. Not one of those 58 reached majority
            agreement on the correct class.
          </p>
        </div>

        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink-2">
          <p>
            Under-classification is the dangerous direction. A device pushed up a
            class costs its manufacturer time and money. A device pulled down a
            class enters a lighter approval pathway than its risk warrants — and
            agreement across models makes that error look like confidence.
          </p>
          <p>
            A founder asking a general-purpose model what class their device
            falls into can receive a confident, consistent, and wrong answer, in
            the direction that under-states risk.
          </p>
        </div>

        {/* [C3] The gradient — the core registered claim. */}
        <div className="rounded-card border border-line bg-bg-card">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-serif text-lg text-ink">
              Under-classification rises with real risk.
            </h3>
            <p className="mt-1 text-sm text-muted">
              Share of model decisions that place a device below its reference
              class, by that reference class.
            </p>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-4">
            {UNDERCLASS.map((u) => (
              <div key={u.cls} className="bg-bg-card px-5 py-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                  Class {u.cls}
                </p>
                <p className="mt-1 font-serif text-3xl leading-none text-ink">
                  {u.rate.toFixed(1)}
                  <span className="text-base text-muted">%</span>
                </p>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-sink">
                  <div
                    className="h-full rounded-full bg-[#BA7517]"
                    style={{ width: `${(u.rate / 50.5) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{u.note}</p>
              </div>
            ))}
          </div>
          {/* MANDATORY per C3 — the 0.0% is structural, not an empirical finding. */}
          <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-muted">
            Class A cannot be under-classified by construction — it is the lowest
            class — so its 0.0% is structural, not a result. The gradient across
            B, C and D is the finding: it is strictly increasing, and the C and D
            intervals do not overlap.
          </p>
        </div>

        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink-2">
          <p>
            {/* [C5] 494/494 = 100% of Class-D errors are under-classifications. */}
            At the top of the scale the direction is not mixed at all.{" "}
            <span className="text-ink">
              Every single Class-D error in the benchmark — all 494 of them — is
              an under-classification.
            </span>{" "}
            {/* [C4] 40 of 163 (24.5%). Reported in ONE form only, per the register. */}
            And on <span className="text-ink">40 of the 163 Class-D devices</span>,
            not one of the six models cast a single Class-D vote.
          </p>
          <p>
            {/* [C7] 2,132 of 6,102 true-B decisions assigned C (34.9%). Descriptive only. */}
            The same pull shows from below. Class C is where the panel lands:{" "}
            <span className="text-ink">2,132 of 6,102</span> decisions on
            true-Class-B devices assign Class C instead — 34.9%, and the largest
            single block of errors in the benchmark. We report that as a pattern
            in the outputs and stop there; we did not test why it happens.
          </p>
          <p>
            {/* [C8] mean self-consistency 0.9216 against a 0.523 ceiling. */}
            This is bias, not noise. Asked the same question repeatedly, the
            models agree with themselves{" "}
            <span className="text-ink">92.2% of the time</span> — while topping
            out at 0.523. They are not guessing and then landing badly. They are
            reliably producing the same wrong answer, which is exactly what makes
            it hard for a non-expert to catch.
          </p>
        </div>
      </section>

      {/* ── What we built instead ────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="font-serif text-2xl text-ink">The benchmark is the design brief.</h2>
        <p className="max-w-3xl text-base leading-relaxed text-ink-2">
          Three things follow directly from the result.
        </p>
        <div className="space-y-3">
          {PRINCIPLES.map((p) => (
            <div key={p.lead} className="rounded-card border border-line bg-bg-card px-5 py-4">
              <p className="font-serif text-lg text-ink">{p.lead}</p>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-2">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="max-w-3xl rounded-card border border-line-soft bg-bg-sink/40 px-5 py-4 text-base leading-relaxed text-ink-2">
          The tool is narrow on purpose. It is built around a measured failure,
          not around what the technology can be made to appear to do.
        </p>
      </section>

      {/* ── Scope ────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-ink">What this covers, and what it doesn&apos;t.</h2>
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink-2">
          <p>
            {/* NOT from the register — traces to medtech/README.md ("9 bodies"). */}
            The engine reasons across nine regulatory bodies — CDSCO MDR, CDSCO
            Pharmacy, DPDP, ICMR, ABDM, NABH, MCI Telemed, IRDAI, and NABL — and
            is calibrated against real Indian digital health products. CDSCO is
            the pilot regulator.
          </p>
          <p>
            It is a readiness assessment, not regulatory advice, and not a
            substitute for a regulatory consultant on a filing. It tells a
            founder where they stand and what the likely pathway looks like,
            early enough to change what they build.
          </p>
        </div>
        <a
          href={REGULATORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-teal-deep underline decoration-line underline-offset-4 hover:opacity-80"
        >
          Try the regulatory tool <ArrowUpRight className="h-3.5 w-3.5 text-[#BA7517]" />
        </a>
      </section>

      {/* ── Limits ───────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-bg-card px-6 py-6">
        <h2 className="font-serif text-xl text-ink">What this benchmark is not.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
          This is an internal benchmark, not a peer-reviewed finding. The
          reference classes come from published CDSCO classification lists, which
          we treat as the oracle — not as adjudicated ground truth, and the lists
          are themselves inconsistent at exactly the C/D boundary this page is
          about. Nothing here says any real device is misclassified, and nothing
          here is a claim about clinical performance, fairness, or what a
          regulator would actually decide.
        </p>
      </section>

      {/* ── Cross-link to /framework ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-teal-light/30 px-6 py-6">
        <h2 className="font-serif text-xl text-ink">The same method, one layer up.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
          This page explains the regulatory engine — how a device gets classified
          and why we distrust a confident answer. The Maturity Assessment
          Framework explains the deployment standard — whether a tool is ready
          to reach patients here, and against what benchmark. Different
          questions, same method: measure the failure first, then build to it.
        </p>
        <Link
          href="/framework"
          className="mt-4 inline-flex items-center gap-1 text-sm text-teal-deep hover:underline"
        >
          See the deployment framework <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
