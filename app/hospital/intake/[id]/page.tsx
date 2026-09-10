"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DeploymentRequest } from "@/lib/schemas/handoff";
import type { ProblemRegister, SiteOperatingProfile } from "@/lib/schemas/site-profile";
import type { Listing } from "@/lib/engine/listing";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { getDeploymentRequest } from "@/lib/mock/api-handoff";
import { getListing, getProblemRegister, getSiteProfile } from "@/lib/mock/api-registry";
import { getCardV2 } from "@/lib/mock/api";
import { SiteArchetype } from "@/components/hospital/SiteArchetype";
import { BLOCKING_SCOPE_LABEL, CARD_VERDICT_STYLE, formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S15 — hospital intake.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * "STRUCTURED REQUEST RECEIVED FROM CLEARPATH" — never "Interest received"
 * ─────────────────────────────────────────────────────────────────────────
 * Interest sits with ClearPath at S10 and never reaches a hospital. What
 * arrives here is a structured request, made only after both sides indicated
 * willingness. Calling it interest would tell a hospital it was being sounded
 * out when in fact it is being asked.
 *
 * THIS SCREEN READS. It does not re-derive. The DeploymentRequest shape was
 * built for exactly this: conditionPlans carry a supplier so the row can name
 * one, prerequisite is a field so "CTRI registration before day 1" can be
 * checked rather than parsed out of prose, supportTaper is phases so it renders
 * as a timeline, and `blocks` travels through from the card so this screen
 * knows which conditions gate the trial without recomputing anything.
 */
export default function IntakePage() {
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<DeploymentRequest | null>(null);
  const [view, setView] = useState<CardV2View | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [profile, setProfile] = useState<SiteOperatingProfile | null>(null);
  const [register, setRegister] = useState<ProblemRegister | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const req = await getDeploymentRequest(id);
      const [v, l, p, r] = await Promise.all([
        getCardV2(id),
        getListing(id),
        req ? getSiteProfile(req.hospitalId) : Promise.resolve(undefined),
        req ? getProblemRegister(req.hospitalId) : Promise.resolve(undefined),
      ]);
      if (!live) return;
      setRequest(req ?? null);
      setView(v ?? null);
      setListing(l ?? null);
      setProfile(p ?? null);
      setRegister(r ?? null);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!request || !view) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <p className="font-serif text-xl text-ink">No request received</p>
        <p className="text-sm leading-relaxed text-muted">
          Nothing has been sent here. A hospital receives a structured request only after ClearPath
          has validated fit and both sides have indicated willingness.
        </p>
        <Link href="/hospital" className="inline-block text-sm text-teal-deep">← Inbox</Link>
      </div>
    );
  }

  const verdict = CARD_VERDICT_STYLE[view.card.verdict];
  // SOURCE IS DERIVED FROM STRUCTURE, not a stored string: a request carrying a
  // facilitationId is by construction one that came through ClearPath.
  const facilitated = Boolean(request.facilitationId);
  const entry = register?.entries.find((e) => e.id === request.problemRegisterEntryId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href="/hospital" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Inbox
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Structured request received from ClearPath
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{request.hospitalName}</h1>
        {profile && <SiteArchetype profile={profile} />}
      </header>

      <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        <Cell label="Source">
          {facilitated ? "Registry match, facilitated by ClearPath" : "Direct"}
        </Cell>
        <Cell label="Received">{formatCardDate(request.sentAt ?? request.createdAt)}</Cell>
        <Cell label="State">Hospital received</Cell>
      </section>

      {/* What is being asked about */}
      <section className="rounded-card border border-line bg-bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <p className="font-serif text-xl text-ink">{request.toolName}</p>
            <p className="mt-0.5 text-sm text-muted">
              Card {request.cardVersion} · {request.conditionPlans.length} condition
              {request.conditionPlans.length === 1 ? "" : "s"} planned
            </p>
          </div>
          <span className={cn("shrink-0 rounded-lg px-3 py-1.5 font-serif text-xs uppercase tracking-wide", verdict.solid)}>
            {verdict.label}
          </span>
        </div>

        <dl className="divide-y divide-line-soft">
          <Row label="Claimed problem fit">
            {entry ? (
              <>
                {entry.name} — ranked #{entry.rank} of {register?.entries.length} on our register,{" "}
                {entry.volumePerYear.toLocaleString("en-IN")} per year{" "}
                <span className="font-mono text-xs text-muted">{entry.id}</span>
              </>
            ) : request.problemRegisterEntryId ? (
              <span className="text-[#BA7517]">
                The request names {request.problemRegisterEntryId}, which is not on our register.
              </span>
            ) : (
              <span className="text-[#BA7517]">
                Nothing on our register matches the claim. The request addresses something we have
                not ranked.
              </span>
            )}
          </Row>
          <Row label="Question">{request.question}</Row>
          <Row label="Scope">
            {request.scope.sites} {request.scope.siteType}s · {request.scope.days} days ·{" "}
            {request.scope.participants.toLocaleString("en-IN")} women · {request.scope.operatorCadre} operators
          </Row>
          <Row label="Training">
            {request.training.hoursPerOperator} hours per operator · {request.training.operatorCount} operators
          </Row>
          <Row label="Devices">
            {request.devices.count} × {request.devices.description} · replacement within{" "}
            {request.devices.replacementHours} hours
          </Row>
          <Row label="Data export">
            {request.dataExport.formats.join(" and ")}
            {request.dataExport.onRequest ? " on request" : ""}
            {request.dataExport.noticePeriodDays === 0
              ? ", at any point, no notice period"
              : `, ${request.dataExport.noticePeriodDays} days' notice`}
          </Row>
          <Row label="Model">
            {request.modelPolicy.frozenForDuration ? "Version frozen for the duration" : "Not frozen"} ·
            {" "}
            {request.modelPolicy.onChange === "STOP_AND_REVIEW" ? "any change is stop-and-review" : request.modelPolicy.onChange.toLowerCase()}
          </Row>
        </dl>
      </section>

      {/* Support taper — rendered from data, not a sentence */}
      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Support taper</p>
        <ol className="mt-2 flex flex-wrap gap-2">
          {request.supportTaper.map((phase) => (
            <li key={phase.fromWeek} className="rounded-md border border-line px-3 py-1.5 text-sm text-ink">
              <span className="font-mono text-xs text-muted">
                {phase.toWeek === null ? `wk ${phase.fromWeek}+` : `wk ${phase.fromWeek}–${phase.toWeek}`}
              </span>{" "}
              {phase.level}
            </li>
          ))}
        </ol>
      </section>

      {/* Condition plans — the part with a named owner */}
      <section className="rounded-card border border-line bg-bg-card">
        <div className="border-b border-line-soft px-5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Condition plan</p>
        </div>
        <ul className="divide-y divide-line-soft">
          {request.conditionPlans.map((p) => (
            <li key={p.itemId} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{p.gateId}</span>
                <span
                  className={cn(
                    "rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                    p.blocks === "TRIAL" ? "bg-[#FAECE7] text-[#993C1D]" : "bg-[#FAEEDA] text-[#BA7517]"
                  )}
                >
                  blocks {BLOCKING_SCOPE_LABEL[p.blocks].toLowerCase()}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink">{p.plan}</p>
              <p className="mt-0.5 text-sm text-muted">
                Supplied by <span className="text-ink">{p.suppliedBy}</span>
                {p.prerequisite && (
                  <> · {p.prerequisite.description}, {p.prerequisite.dueBy.toLowerCase()}</>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Vendor-supplied, unassessed */}
      {listing && (
        <section className="rounded-card border border-line bg-bg-card">
          <div className="border-b border-line-soft px-5 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Vendor-supplied · not assessed
            </p>
          </div>
          <dl className="divide-y divide-line-soft">
            <Row label="Requirements">{listing.requirements.join(" · ")}</Row>
            <Row label="Commercials">
              {listing.commercials.model} · {listing.commercials.consumables}
            </Row>
            <Row label="Support model">
              {listing.supportModel.field} · {listing.supportModel.replacement}
            </Row>
          </dl>
          <p className="border-t border-line-soft bg-bg-sink/50 px-5 py-3 text-xs leading-relaxed text-muted">
            These three came from the vendor&apos;s listing and were not assessed by anyone. The
            verdict, conditions and limitations on the card were.
          </p>
        </section>
      )}

      <Link
        href={`/hospital/intake/${id}/triage`}
        className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
      >
        Triage this request <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card px-5 py-3.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">{children}</p>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
