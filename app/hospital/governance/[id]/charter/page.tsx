"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Link2, Lock } from "lucide-react";
import type { TrialCharter } from "@/lib/schemas/governance";
import { getCharter } from "@/lib/mock/api-governance";
import { formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S20 — the trial charter.
 *
 * TWO DERIVATIONS ARE SHOWN, NOT ASSERTED.
 *
 * The endpoints trace to the success definition this site published on 20
 * August — 26 days before it saw this tool. That link is rendered on screen
 * because it is the only thing that makes "these endpoints were not retrofitted
 * to the data" checkable rather than a claim. Endpoints that appear for the
 * first time in a charter can always be fitted to whatever the numbers showed;
 * these cannot.
 *
 * The support taper is READ from the vendor's DeploymentRequest, not retyped. A
 * charter that restated it could promise support the vendor never offered, and
 * nobody would notice until week seven.
 *
 * THE DECISION RULE IS FIXED NOW. That single field is what makes the eventual
 * outcome defensible rather than negotiated once the data arrives — it is how a
 * trial that missed its endpoints stays a trial that missed its endpoints,
 * rather than becoming one that "showed promise".
 */
export default function CharterPage() {
  const { id } = useParams<{ id: string }>();
  const [charter, setCharter] = useState<TrialCharter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const c = await getCharter(id);
      if (!live) return;
      setCharter(c ?? null); setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!charter) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">No charter</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A charter needs a committee verdict, a request, and a named owner. There is no charter
          without one named individual.
        </p>
      </div>
    );
  }

  const d = charter.derivation;
  const lead = Math.round(
    (new Date(d.toolSubmittedAt).getTime() - new Date(d.publishedAt).getTime()) / 86_400_000
  );
  const primary = charter.endpoints.filter((e) => e.kind === "primary");
  const secondary = charter.endpoints.filter((e) => e.kind === "secondary");

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/governance/${id}/placement`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Placement
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Trial charter
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{charter.question}</h1>
        <p className="text-sm text-muted">
          Owner: <span className="text-ink">{charter.owner.name}</span>, {charter.owner.role} ·{" "}
          {charter.scope.participants.toLocaleString("en-IN")} women · {charter.scope.days} days ·{" "}
          {charter.scope.sites} CHCs · {charter.budget.display}
        </p>
      </header>

      {/* Derivation 1 — the endpoints' provenance */}
      <section className="rounded-card border border-teal-deep/30 bg-teal-light/30 px-5 py-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-teal-deep">
          <Link2 className="h-3.5 w-3.5" /> Endpoints derive from the problem register
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          &ldquo;{d.successDefinition}&rdquo;
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {d.registerEntryName}, published {formatCardDate(d.publishedAt)} —{" "}
          <strong className="text-ink-2">{lead} days before</strong> this tool was submitted on{" "}
          {formatCardDate(d.toolSubmittedAt)}. Endpoints written after a tool arrives can be fitted
          to whatever the data showed; these were written first, and the dates are how anyone
          checks.
        </p>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-bg-card">
        <p className="border-b border-line-soft px-5 py-3 font-serif text-lg text-ink">Endpoints</p>
        <ul className="divide-y divide-line-soft">
          {[...primary, ...secondary].map((e) => (
            <li key={e.name} className="px-5 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-sm text-ink">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {e.kind}
                  </span>{" "}
                  {e.name}
                </p>
                <span className="font-serif text-lg tabular-nums text-ink">{e.threshold}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                <span
                  className={cn(
                    "rounded-pill px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                    e.derivedFrom === "SUCCESS_DEFINITION_LITERAL"
                      ? "bg-[#EAF3DE] text-[#3B6D11]"
                      : "bg-bg-sink text-muted"
                  )}
                >
                  {e.derivedFrom === "SUCCESS_DEFINITION_LITERAL" ? "stated" : "operationalised"}
                </span>{" "}
                from &ldquo;{e.sourceText}&rdquo;
              </p>
            </li>
          ))}
        </ul>
        <p className="border-t border-line-soft bg-bg-sink/50 px-5 py-3 text-xs leading-relaxed text-muted">
          <strong>Stated</strong> endpoints carry a number the site wrote down itself.{" "}
          <strong>Operationalised</strong>{" "}ones turn the site&apos;s stated intent into a measurable
          threshold — the intent is theirs, the specific number is a clinical convention applied on
          top, and it is open to argument.
        </p>
      </section>

      {/* The field that makes the outcome defensible */}
      <section className="rounded-card border border-[#BA7517]/40 bg-[#FAEEDA] px-5 py-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#BA7517]">
          <Lock className="h-3.5 w-3.5" /> Decision rule — fixed now, before any data exists
        </p>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[#0E1411]">
          <li><strong>Adopt</strong> — {charter.decisionRule.adopt}</li>
          <li><strong>Extend</strong> — {charter.decisionRule.extend}</li>
          <li><strong>Retire</strong> — {charter.decisionRule.retire}</li>
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-[#8A5610]">
          Writing this after the numbers arrive is how a trial that missed its endpoints becomes one
          that &ldquo;showed promise&rdquo;.
        </p>
      </section>

      <section className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
        <Row label="Safety stop">{charter.stops.safety}</Row>
        <Row label="Futility stop">{charter.stops.futility}</Row>
        <Row label="Operational stop">{charter.stops.operational}</Row>
        <Row label="Review points">
          {charter.reviewPoints.map((r) => `Day ${r.day} ${r.name.toLowerCase()}${r.authorityToStop ? " with authority to stop" : ""}`).join(" · ")}
        </Row>
        <Row label="Exit">
          Devices returned within {charter.exit.deviceReturnDays} days. {charter.exit.dataExport}{" "}
          {charter.exit.followUp}
        </Row>
      </section>

      {/* Derivation 2 — the taper, read from the vendor's request */}
      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <Link2 className="h-3.5 w-3.5" /> Commitments — read from the vendor&apos;s request
        </p>
        <ol className="mt-2 flex flex-wrap gap-2">
          {charter.commitments.supportTaper.map((phase) => (
            <li key={phase.fromWeek} className="rounded-md border border-line px-3 py-1.5 text-sm text-ink">
              <span className="font-mono text-xs text-muted">
                {phase.toWeek === null ? `wk ${phase.fromWeek}+` : `wk ${phase.fromWeek}–${phase.toWeek}`}
              </span>{" "}
              {phase.level}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-ink">
          Model version {charter.commitments.modelVersionFrozen ? "frozen for the duration" : "not frozen"}.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Mirrored from the submitted request rather than restated here — a charter that retyped the
          taper could promise support the vendor never offered, and nobody would notice until week
          seven.
        </p>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">{children}</p>
    </div>
  );
}
