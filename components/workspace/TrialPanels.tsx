"use client";

import { AlertTriangle, Check, CircleDot } from "lucide-react";
import type { TrialView } from "@/lib/mock/api-trial";
import { overrideRatePct } from "@/lib/schemas/telemetry";
import { formatCardDateShort } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S21–S23 — the trial as an operation, not a chart.
 *
 * A workspace-level label sits above all of it: these are representative
 * demonstration figures. The committee is a fixed seeded list of named people
 * and the telemetry is fabricated, and a screen this operational-looking has to
 * say so or it reads as live data from a real site.
 */
export function DemoDataLabel() {
  return (
    <p className="rounded-md bg-bg-sink px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
      Representative demonstration data
    </p>
  );
}

function Row({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">{children}</p>
      {note && <p className="mt-0.5 text-xs leading-relaxed text-muted">{note}</p>}
    </div>
  );
}

/**
 * S21 — operational telemetry.
 *
 * The four charts tell you whether the model is holding up. None of them tells
 * you whether the devices work, whether anyone is overriding the output, or
 * whether the export the vendor promised has ever been run. Those decide
 * whether the result means anything.
 */
export function TelemetryPanel({ trial }: { trial: TrialView }) {
  const t = trial.telemetry;
  const rate = overrideRatePct(t.overrides);
  const adherenceOk = t.protocolAdherence.pct >= t.protocolAdherence.targetPct;

  return (
    <section className="overflow-hidden rounded-card border border-line bg-bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
        <p className="font-serif text-lg text-ink">Run and telemetry</p>
        <DemoDataLabel />
      </div>
      <div className="divide-y divide-line-soft">
        <Row label="Enrolment">
          {t.enrolment.screened.toLocaleString("en-IN")} / {t.enrolment.target.toLocaleString("en-IN")} women
          screened · day {t.enrolment.dayOf} of {t.enrolment.totalDays}
        </Row>
        <Row label="Device health">
          {t.devices.online}/{t.devices.total} online ·{" "}
          {t.devices.replacements.map((r) => `1 replaced day ${r.day}`).join(", ")} · consumables{" "}
          {t.devices.consumablesPct}%
        </Row>
        <Row
          label="Failures"
          note="A refused read is the quality gate working — the device declining to guess on an image below threshold, rather than a fault."
        >
          {t.failures.refusedReads} refused reads · {t.failures.downtimeDays} downtime days
        </Row>
        {/* A measurement, not an error count. */}
        <Row
          label="Overrides"
          note="How the tool is actually being used. A high rate is a finding about trust or calibration, not a fault — which is why it is measured rather than counted as errors."
        >
          <span className="font-serif text-xl">{rate}%</span> of flags overridden by the clinician
          <span className="ml-1.5 font-mono text-xs text-muted">
            {t.overrides.flagsOverridden} of {t.overrides.flagsRaised}
          </span>
        </Row>
        <Row
          label="Support"
          note="Read from the charter's taper, which took it from the vendor's request by identity."
        >
          {trial.support.level} (week {trial.support.week})
          {trial.support.nextTaperWeek && ` · next taper week ${trial.support.nextTaperWeek}`}
        </Row>
        <Row
          label="Export"
          note="The request guaranteed these with no notice period. An export nobody has run is a promise, not a capability."
        >
          {trial.exportFormats.join(" + ")}{" "}
          {t.exportTest.testedOnDay ? `tested day ${t.exportTest.testedOnDay}` : "not yet tested"}
          {t.exportTest.result && (
            <span className="mt-0.5 block text-xs text-muted">{t.exportTest.result}</span>
          )}
        </Row>
        <Row label="Protocol adherence">
          <span className={cn("font-serif text-xl", adherenceOk ? "text-[#3B6D11]" : "text-[#993C1D]")}>
            {t.protocolAdherence.pct}%
          </span>{" "}
          <span className="text-muted">target ≥ {t.protocolAdherence.targetPct}%</span>
        </Row>
      </div>
    </section>
  );
}

/**
 * S22 — provenance and history, beside the charts.
 *
 * BOTH alert states are shown. An open alert alone says only that something is
 * wrong; the resolved one, with what was done and when, is what shows
 * governance working. A monitoring screen that can only display problems
 * teaches a reader that the platform finds faults rather than that the site
 * closes them.
 */
export function MonitoringContext({ trial }: { trial: TrialView }) {
  const p = trial.telemetry.provenance;
  return (
    <div className="space-y-3">
      <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
        <div className="bg-bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Last updated</p>
          <p className="mt-1 text-sm text-ink">
            {new Date(p.lastUpdated).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST
          </p>
        </div>
        <div className="bg-bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Source</p>
          <p className="mt-1 text-sm text-ink">{p.source}</p>
        </div>
        <div className="bg-bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Reviewer</p>
          <p className="mt-1 text-sm text-ink">{p.reviewer}</p>
        </div>
        <div className="bg-bg-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Cadence</p>
          <p className="mt-1 text-sm text-ink">{p.cadence}</p>
          <div className="mt-1.5"><DemoDataLabel /></div>
        </div>
      </section>

      {/* Adoption against the taper — D3 answered with a measurement. */}
      <section className="rounded-card border border-line bg-bg-card px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Adoption against the support taper
        </p>
        <ol className="mt-2 flex flex-wrap gap-1.5">
          {trial.adoption.map((a) => (
            <li key={a.week} className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink">
              <span className="font-mono text-[10px] text-muted">wk {a.week}</span>{" "}
              <span className="font-serif text-sm">{a.screens}</span>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-muted">
                {a.supportLevel}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Whether people kept using it as support was withdrawn — the D3 question answered with a
          measurement rather than an assertion.
        </p>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-bg-card">
        <p className="border-b border-line-soft px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Alert history
        </p>
        <ul className="divide-y divide-line-soft">
          {trial.alerts.map((a) => (
            <li key={a.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-ink">
                  <span className="font-mono text-xs text-muted">{formatCardDateShort(a.raisedAt)}</span>{" "}
                  {a.title}
                </p>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                    a.status === "open" ? "bg-[#FAEEDA] text-[#BA7517]" : "bg-[#EAF3DE] text-[#3B6D11]"
                  )}
                >
                  {a.status === "open" ? <CircleDot className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {a.severity} · {a.status === "open" ? "open" : `resolved ${formatCardDateShort(a.resolvedAt!)}`}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{a.action}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * S23 — prove.
 *
 * A missed endpoint is never dropped, and actuals sit beside the estimates
 * they were measured against. The analytical recommendation is kept apart from
 * the hospital's decision, which stays PENDING: applying the charter's rule is
 * the committee's act, and a screen that pre-empts it is how a rule fixed
 * before the trial gets renegotiated after it.
 */
/**
 * The day-45 interim: that the stop rule RAN, and that it did not fire.
 *
 * A trial that reports only its endpoints tells a reader what happened. It does
 * not tell them whether anyone was watching while it happened, and those are
 * different questions. Showing only fired stop rules would teach a reader that
 * this platform reports failures — the same mistake as showing only open
 * alerts. An unfired rule is evidence the rule was real.
 */
function InterimPanel({ interim }: { interim: NonNullable<TrialView["interim"]> }) {
  return (
    <section
      className={cn(
        "rounded-card border px-5 py-4",
        interim.fired ? "border-[#993C1D]/30 bg-[#FAECE7]" : "border-line bg-bg-card"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-serif text-lg text-ink">
          Day {interim.day} · {interim.name}
        </p>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-pill px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            interim.fired ? "bg-[#993C1D] text-white" : "bg-[#EAF3DE] text-[#3B6D11]"
          )}
        >
          {interim.fired ? "stop rule fired" : "stop rule did not fire"}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Rule, fixed at charter
          </dt>
          <dd className="mt-0.5 text-sm leading-relaxed text-ink">{interim.ruleText}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {interim.rule.measure} at day {interim.day}
          </dt>
          <dd className="mt-0.5 text-sm text-ink">
            <span className="font-medium">{interim.measuredDisplay}</span>{" "}
            <span className="text-muted">
              against a {interim.rule.threshold} bound
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm leading-relaxed text-ink-2">{interim.outcome}</p>

      {/*
        WHY THIS REVIEW POINT EXISTS. A review point that appeared from nowhere
        is a review point nobody owns. This one is here because a committee
        member dissented at S18 and the dissent was accepted — the link is
        derived from the verdict, not written here.
      */}
      {interim.tracesTo && (
        <div className="mt-4 rounded-md bg-bg-sink px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#BA7517]">
            Why day {interim.day}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            <span className="text-ink">{interim.tracesTo.member}</span>{" "}dissented at the committee:
            &ldquo;{interim.tracesTo.position}&rdquo; {interim.tracesTo.resolution}
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Reviewed by {interim.reviewer} · {formatCardDateShort(interim.reviewedAt)}
      </p>
    </section>
  );
}

export function ProvePanel({ trial }: { trial: TrialView }) {
  return (
    <div className="space-y-4">
      <DemoDataLabel />

      {trial.interim && <InterimPanel interim={trial.interim} />}

      <section className="overflow-hidden rounded-card border border-line bg-bg-card">
        <p className="border-b border-line-soft px-4 py-3 font-serif text-lg text-ink">Endpoints</p>
        <ul className="divide-y divide-line-soft">
          {trial.endpoints.map((e) => (
            <li key={e.name} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-ink">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{e.kind}</span>{" "}
                  {e.name}
                </p>
                <span
                  className={cn(
                    "shrink-0 rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                    e.met ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FAECE7] text-[#993C1D]"
                  )}
                >
                  {e.met ? "met" : "missed"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                target {e.target} · result <span className="text-ink">{e.result}</span>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{e.derivedFrom}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-bg-card">
        <p className="border-b border-line-soft px-4 py-3 font-serif text-lg text-ink">
          Actuals against plan
        </p>
        <ul className="divide-y divide-line-soft">
          {trial.actuals.map((a) => (
            <li key={a.label} className="px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{a.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                {a.estimate} → <span className={cn(!a.withinPlan && "text-[#BA7517]")}>{a.actual}</span>
              </p>
              {a.note && <p className="mt-1 text-xs leading-relaxed text-[#BA7517]">{a.note}</p>}
            </li>
          ))}
          {trial.conditionsSupplied.map((c) => (
            <li key={c.condition} className="px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Condition · {c.owner} to supply
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                {c.condition} → <span className={cn(!c.met && "text-[#BA7517]")}>{c.supplied}</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="border-t border-line-soft bg-bg-sink/50 px-4 py-3 text-xs leading-relaxed text-muted">
          Conditions actually supplied, against conditions promised. A trial where every condition
          was met exactly as written is a trial nobody was watching closely.
        </p>
      </section>

      <section className="rounded-card border border-line bg-bg-card px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Analytical recommendation
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-ink">{trial.recommendation}</p>
      </section>

      <section className="rounded-card border border-[#BA7517]/40 bg-[#FAEEDA] px-4 py-3">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#BA7517]">
          <AlertTriangle className="h-3.5 w-3.5" /> Hospital decision · Northvale clinical review committee
        </p>
        <p className="mt-1 font-serif text-xl text-ink">Pending</p>
        <p className="mt-1 text-sm text-[#8A5610]">Adopt · Extend · Retire</p>
        <p className="mt-2 text-xs leading-relaxed text-[#8A5610]">
          The charter&apos;s decision rule is applied to this data by the committee. It is not
          applied here, and the recommendation above deliberately stops short of one.
        </p>
      </section>
    </div>
  );
}
