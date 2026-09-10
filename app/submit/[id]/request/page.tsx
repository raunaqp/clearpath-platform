"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Send } from "lucide-react";
import type { ConditionPlan, DeploymentRequest } from "@/lib/schemas/handoff";
import { REQUEST_STATUS_LABEL } from "@/lib/schemas/handoff";
import {
  createDeploymentRequest,
  getOwnRequest,
  getFacilitation,
  isRequestFormOpen,
} from "@/lib/mock/api-handoff";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { getItem } from "@/lib/engine/item-bank";
import { findProblem } from "@/lib/match";
import { getProblemRegisters } from "@/lib/mock/api-registry";
import type { ProblemEntry } from "@/lib/schemas/site-profile";
import { cn } from "@/lib/utils";

/**
 * S12 — the structured deployment request.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNREACHABLE BEFORE FACILITATION COMPLETES
 * ─────────────────────────────────────────────────────────────────────────
 * Two layers, and the important one is not this file. `createDeploymentRequest`
 * in the store THROWS unless facilitation reached "both sides willing" — so
 * typing the URL, deep-linking, or any future screen that links here cannot
 * produce a request. The redirect below is the courtesy on top: it sends a
 * reader somewhere useful rather than showing them a form that would fail.
 *
 * The object this builds is what hospital intake receives in Phase 6. Its shape
 * is deliberate — particularly `conditionPlans`, which is a row per open
 * condition with a named supplier rather than a free-text paragraph, because a
 * hospital cannot hold anyone to a paragraph.
 */

const PLAN_TEXT: Record<string, { plan: string; suppliedBy: string; prerequisite: { description: string; dueBy: string } | null }> = {
  G1: {
    plan: "This trial generates the India-population evidence.",
    suppliedBy: "Innovator",
    prerequisite: { description: "CTRI registration", dueBy: "Before day 1" },
  },
};

export default function RequestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [view, setView] = useState<CardV2View | null>(null);
  const [existing, setExisting] = useState<DeploymentRequest | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<ProblemEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [open, v, req, f, registers] = await Promise.all([
        isRequestFormOpen(id),
        getCardV2(id),
        // Only a request THIS session sent counts as "already sent" — a seeded
        // fixture exists to make downstream screens reachable, not to stand in
        // for the vendor's own action.
        getOwnRequest(id),
        getFacilitation(id),
        getProblemRegisters(),
      ]);
      if (!live) return;
      // The same mapper matching and the facilitation pack use, so all three
      // name the same register entry.
      const register = registers.find((r) => r.hospitalId === f?.hospitalId);
      setProblem(v ? findProblem(register, v.card.context.exactClaim, v.tool.name) ?? null : null);
      setView(v ?? null);
      setExisting(req ?? null);
      setHospitalName(f?.hospitalName ?? "");
      setAllowed(open);
      // Routing enforcement, not just copy: a reader who arrives early is sent
      // to facilitation rather than shown a form that cannot be submitted.
      if (!open) router.replace(`/submit/${id}/facilitation`);
    })();
    return () => { live = false; };
  }, [id, router]);

  const conditions = view?.card.conditions ?? [];

  function buildPlans(): ConditionPlan[] {
    return conditions.map((c) => {
      const item = getItem(c.itemId);
      const gateId = item?.legacyGateId ?? c.itemId;
      const preset = PLAN_TEXT[gateId];
      return {
        itemId: c.itemId,
        gateId,
        label: item?.text?.slice(0, 70) ?? c.itemId,
        blocks: c.blocks,
        plan: preset?.plan ?? "Addressed during the engagement.",
        suppliedBy: preset?.suppliedBy ?? "Innovator",
        prerequisite: preset?.prerequisite ?? null,
      };
    });
  }

  async function send() {
    if (!view) return;
    setBusy(true);
    setError(null);
    try {
      const req = await createDeploymentRequest({
        slug: id,
        mode: "trial",
        question:
          "Does CerviAI-assisted VIA screening increase detection of referable abnormalities at CHC level without increasing nurse workload?",
        scope: { sites: 4, siteType: "CHC", days: 90, participants: 1000, operatorCadre: "Staff nurse" },
        supportTaper: [
          { fromWeek: 1, toWeek: 2, level: "On-site" },
          { fromWeek: 3, toWeek: 6, level: "Weekly" },
          { fromWeek: 7, toWeek: null, level: "On-call" },
        ],
        devices: { count: 4, description: "Tablets with offline capture", offlineCapture: true, replacementHours: 72 },
        training: { hoursPerOperator: 6, operatorCount: 12 },
        dataExport: { formats: ["CSV", "FHIR bundle"], onRequest: true, noticePeriodDays: 0 },
        modelPolicy: { frozenForDuration: true, onChange: "STOP_AND_REVIEW" },
        conditionPlans: buildPlans(),
      });
      setExisting(req);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the request.");
    }
    setBusy(false);
  }

  if (allowed === null || !view) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!allowed) {
    // The redirect is already in flight; this is what shows for the instant before.
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">Not open yet</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The request form opens once both sides have indicated willingness.
        </p>
      </div>
    );
  }

  const plans = existing?.conditionPlans ?? buildPlans();

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Link href={`/submit/${id}/facilitation`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Facilitation
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Structured request · trial
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{hospitalName}</h1>
        <p className="text-sm text-muted">
          Card {`v1.${view.card.version - 1}`} · {view.tool.name}
        </p>
      </header>

      {existing && (
        <section className="rounded-card border border-[#3B6D11]/40 bg-[#EAF3DE] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#3B6D11]">
            <Check className="h-3.5 w-3.5" /> {REQUEST_STATUS_LABEL[existing.status]}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0E1411]">
            The hospital can accept, decline, or counter. A counter is a proposal of different terms,
            not a refusal.
          </p>
        </section>
      )}

      <section className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
        <Row label="Question">
          Does CerviAI-assisted VIA screening increase detection of referable abnormalities at CHC
          level without increasing nurse workload?
        </Row>
        <Row label="Addresses">
          {problem ? (
            <>
              {problem.name} — ranked #{problem.rank} on {hospitalName}&apos;s problem register,{" "}
              {problem.volumePerYear.toLocaleString("en-IN")} per year
              <span className="ml-1.5 font-mono text-xs text-muted">{problem.id}</span>
            </>
          ) : (
            <span className="text-muted">
              Nothing on this site&apos;s register matches the claim. Intake will see that stated
              rather than left blank.
            </span>
          )}
        </Row>
        <Row label="Scope">4 CHCs · 90 days · 1,000 women · staff nurse operators</Row>
        <Row label="Support taper">
          On-site weeks 1–2 · weekly weeks 3–6 · on-call from week 7
        </Row>
        <Row label="Devices">
          4 tablets with offline capture · replacement within 72 hours
        </Row>
        <Row label="Training">6 hours per nurse · 12 nurses</Row>
        <Row label="Data export">
          CSV and FHIR bundle on request, at any point, no notice period
        </Row>
        <Row label="Model">
          Version frozen for the duration · any change is stop-and-review
        </Row>
      </section>

      {/* The part S15 reads most carefully */}
      <section className="rounded-card border border-line bg-bg-card">
        <div className="border-b border-line-soft px-5 py-3">
          <h2 className="font-serif text-lg text-ink">Condition plan</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            One row per open condition, with who supplies it. Not a paragraph — a hospital cannot
            hold anyone to a paragraph.
          </p>
        </div>
        <ul className="divide-y divide-line-soft">
          {plans.map((p) => (
            <li key={p.itemId} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{p.gateId}</span>
                <span className="text-sm font-medium text-ink">{p.plan}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                Supplied by <span className="text-ink">{p.suppliedBy}</span>
                {p.prerequisite && (
                  <>
                    {" · "}
                    {p.prerequisite.description} {p.prerequisite.dueBy.toLowerCase()}
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="text-sm text-coral-brand">{error}</p>}

      {!existing && (
        <button
          onClick={send}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90",
            busy && "opacity-50"
          )}
        >
          <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send request to the hospital"}
        </button>
      )}
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
