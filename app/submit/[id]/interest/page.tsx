"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import type { InterestRecord } from "@/lib/schemas/handoff";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { expressInterest, getInterest } from "@/lib/mock/api-handoff";
import { getItem } from "@/lib/engine/item-bank";
import { formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S10 — express interest, TO CLEARPATH.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NO HOSPITAL IS NAMED AS HAVING AGREED TO ANYTHING
 * ─────────────────────────────────────────────────────────────────────────
 * This screen replaces "Request clinical trial", which sent the innovator
 * straight into a hospital's inbox. Interest is submitted to ClearPath. A
 * hospital may be named as a PREFERENCE — a geography, a matched site — but
 * nothing here says a hospital has accepted, because at this point none has
 * been asked.
 *
 * The sharing permission is the real gate. It is not a consent checkbox
 * alongside the form; it is the thing that decides whether the next step can
 * happen at all, and the submit button says so.
 */

const CONTACT = { name: "Dr. Ananya Rao", role: "Clinical and regulatory point of contact" };

export default function InterestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [view, setView] = useState<CardV2View | null>(null);
  const [existing, setExisting] = useState<InterestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(true);
  const [busy, setBusy] = useState(false);

  const [objective, setObjective] = useState(
    "Supervised CHC trial generating India-population evidence toward G1."
  );
  const [state, setStateGeo] = useState("Tamil Nadu");
  const [district, setDistrict] = useState("Coimbatore district");
  const [mode, setMode] = useState<InterestRecord["preferredMode"]>("TRIAL_UNDER_CHARTER");

  useEffect(() => {
    let live = true;
    (async () => {
      const [v, i] = await Promise.all([getCardV2(id), getInterest(id)]);
      if (!live) return;
      setView(v ?? null);
      setExisting(i ?? null);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  async function submit() {
    if (!sharing) return;
    setBusy(true);
    const record = await expressInterest({
      slug: id,
      contact: CONTACT,
      objective,
      geography: { state, districtPreferred: district },
      preferredMode: mode,
      sharingGranted: sharing,
    });
    setExisting(record);
    setBusy(false);
    router.push(`/submit/${id}/facilitation`);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!view) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">Card not found</p>
        <Link href="/submit" className="mt-4 inline-block text-sm text-teal-deep">Start a new assessment →</Link>
      </div>
    );
  }

  const cardVersion = `v1.${view.card.version - 1}`;
  const conditions = view.card.conditions;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Link href={`/submit/${id}/card`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Readiness card
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">Express interest</p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{view.tool.name}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Interest goes to ClearPath, who validate the fit and approach a hospital on your behalf.
          You are not contacting a hospital here, and no hospital has yet been asked anything.
        </p>
      </header>

      {/* Submitted to — the correction, stated */}
      <section className="rounded-card border border-teal-deep/30 bg-teal-light/30 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal-deep">Submitted to</p>
        <p className="mt-1 font-serif text-xl text-ink">ClearPath</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Not to a hospital. ClearPath validates fit against the site&apos;s own published records,
          confirms what you are willing to share, and makes the introduction.
        </p>
      </section>

      {existing ? (
        <section className="rounded-card border border-[#3B6D11]/40 bg-[#EAF3DE] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#3B6D11]">
            <Check className="h-3.5 w-3.5" /> Interest received by ClearPath
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0E1411]">
            Submitted {formatCardDate(existing.createdAt)}.
            No hospital has accepted anything at this point.
          </p>
          <Link href={`/submit/${id}/facilitation`} className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90">
            Follow facilitation <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          <section className="space-y-5 rounded-card border border-line bg-bg-card p-5">
            <Row label="Contact">
              <p className="text-sm text-ink">{CONTACT.name}</p>
              <p className="text-xs text-muted">{CONTACT.role}</p>
            </Row>

            <Row label="Objective" hint="What this engagement is for. Tie it to what the card leaves open.">
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="min-h-[64px] w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink"
              />
              {conditions.length > 0 && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Open on {cardVersion}:{" "}
                  {conditions.map((c) => getItem(c.itemId)?.legacyGateId ?? c.itemId).join(", ")} — carried
                  through to the request as a plan with a named supplier.
                </p>
              )}
            </Row>

            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="State">
                <input value={state} onChange={(e) => setStateGeo(e.target.value)} className="w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink" />
              </Row>
              <Row label="District preferred">
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink" />
              </Row>
            </div>

            <Row label="Preferred mode">
              <div className="flex flex-wrap gap-2">
                {([
                  ["TRIAL_UNDER_CHARTER", "Clinical trial under charter"],
                  ["ROUTINE_DEPLOYMENT", "Routine deployment"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMode(v)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      mode === v ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Row>
          </section>

          {/* The gate */}
          <section className={cn("rounded-card border px-5 py-4", sharing ? "border-teal-deep/40 bg-teal-light/30" : "border-[#993C1D]/40 bg-[#FAECE7]")}>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-teal-deep">
              <Lock className="h-3.5 w-3.5" /> Sharing permission
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={sharing} onChange={(e) => setSharing(e.target.checked)} className="mt-1 h-4 w-4 accent-[#0F6E56]" />
              <span className="text-sm leading-relaxed text-ink">
                ClearPath may share Card {cardVersion} <strong>in full, conditions intact</strong>, with
                matched hospitals.
              </span>
            </label>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Commercial terms, pricing and consumables are not shared at this stage. The card cannot be
              shared with its conditions removed — a verdict without them is a verdict without its meaning.
            </p>
            {!sharing && (
              <p className="mt-2 text-sm leading-relaxed text-[#993C1D]">
                Without this, nothing about {view.tool.name} reaches any hospital and facilitation cannot
                begin. This is the gate, not a formality.
              </p>
            )}
          </section>

          <button
            onClick={submit}
            disabled={!sharing || busy}
            aria-busy={busy}
            className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit interest to ClearPath"} <ArrowRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
