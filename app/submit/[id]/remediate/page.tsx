"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import type { CardCondition } from "@/lib/schemas/readiness-card";
import { versionLabel } from "@/lib/schemas/readiness-card";
import type { RemediationDelta } from "@/lib/engine/remediation";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { getCardV2, remediateCondition } from "@/lib/mock/api";
import { getItem } from "@/lib/engine/item-bank";
import { CERVIAI_G15_ITEM, CERVIAI_REMEDIATION_EVIDENCE } from "@/lib/mock/fixtures/cerviai-v2";
import { BLOCKING_SCOPE_LABEL, BLOCKING_SCOPE_STYLE, formatCardDateShort } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S7 — Fix readiness gaps.
 *
 * Replaces "Add a supporting document", which attached a file to the submission
 * at large and produced no consequence: the card did not move, no condition
 * closed, and nothing told the vendor whether the thing they had just done was
 * the thing that mattered. Evidence that is not bound to an item counts for
 * nothing, so an unbound attach was always going to be theatre.
 *
 * Here, evidence is attached AGAINST A CONDITION. The reissue that follows is a
 * scoped delta — one item, its cluster, its dimension — and the page shows
 * exactly what moved and what did not.
 *
 * A route rather than a modal. Remediation is work a vendor comes back to, and
 * a modal is not somewhere you can be sent a link to.
 */
export default function RemediatePage() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const router = useRouter();

  const [view, setView] = useState<CardV2View | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ delta: RemediationDelta; version: number } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const v = await getCardV2(slug);
      if (!live) return;
      setView(v ?? null);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  /** Trial-blocking first. The ordering is the answer to "what do I do first?". */
  const ranked = useMemo(() => {
    const list = view?.card.conditions ?? [];
    return [...list].sort((a, b) => (a.blocks === b.blocks ? 0 : a.blocks === "TRIAL" ? -1 : 1));
  }, [view]);

  /**
   * Open the most blocking condition by default — the RANKED first, not the
   * first in item order. The engine emits conditions in item-bank order, which
   * put a routine-blocking D1 item above a trial-blocking D4 one; landing on
   * that would have quietly recommended the less urgent fix.
   */
  const defaultOpenId = ranked[0]?.itemId ?? null;
  const activeId = touched ? openId : defaultOpenId;

  async function attach(condition: CardCondition) {
    if (!view) return;
    setBusy(true);
    const isCerviaiDpdp = condition.itemId === CERVIAI_G15_ITEM && slug === "cerviai";
    const next = await remediateCondition({
      slug,
      itemId: condition.itemId,
      // The CerviAI residency addendum is a named fixture document; anything
      // else is synthesised and bound to this condition's own item.
      evidenceId: isCerviaiDpdp ? CERVIAI_REMEDIATION_EVIDENCE.id : `ev-${slug}-${condition.itemId}`,
      evidenceName: isCerviaiDpdp
        ? CERVIAI_REMEDIATION_EVIDENCE.name
        : `Supporting evidence for ${getItem(condition.itemId)?.legacyGateId ?? condition.itemId}`,
      note: "Attached against this condition and reviewed by an assessor.",
    });
    setBusy(false);
    if (!next) return;
    const delta = next.deltas.at(-1);
    setView(next);
    if (delta) setResult({ delta, version: next.card.version });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">Card not found</p>
        <Link href="/submit" className="mt-4 inline-block text-sm text-teal-deep">
          Start a new assessment →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/submit/${slug}/card`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep"
      >
        <ArrowLeft className="h-4 w-4" /> Readiness card
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          {view.card.id} · {versionLabel(view.card.version)}
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">Fix readiness gaps</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Attach evidence against a specific condition. Evidence that is not bound to a condition
          does not count towards anything — so there is no general upload here. Clearing a
          condition reissues the card at a new version; the expiry does not move, because it is
          anchored to the original assessment.
        </p>
      </header>

      {/* The scoped-delta receipt */}
      {result && (
        <section className="rounded-xl border border-[#3B6D11]/40 bg-[#EAF3DE] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#3B6D11]">
            <Check className="h-3.5 w-3.5" /> Card reissued at {versionLabel(result.version)}
          </p>
          <dl className="mt-3 space-y-1.5 text-sm text-[#0E1411]">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[#6B766F]">Re-scored:</dt>
              <dd>
                {result.delta.legacyGateId ?? result.delta.itemId} ({result.delta.itemId}) —{" "}
                {result.delta.levelBefore ?? "unscored"} → {result.delta.levelAfter}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[#6B766F]">Cluster {result.delta.clusterCode}:</dt>
              <dd>
                {result.delta.clusterMeanBefore?.toFixed(1) ?? "—"} →{" "}
                {result.delta.clusterMeanAfter?.toFixed(1) ?? "—"}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[#6B766F]">Dimension {result.delta.dimension}:</dt>
              <dd>
                {result.delta.dimensionMeanBefore.toFixed(1)} →{" "}
                {result.delta.dimensionMeanAfter.toFixed(1)}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[#6B766F]">Not recomputed:</dt>
              <dd>{result.delta.dimensionsUntouched.join(", ")} — carried forward unchanged</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[#6B766F]">Expires:</dt>
              <dd>{formatCardDateShort(view.card.expiresAt)} — unchanged</dd>
            </div>
          </dl>
          <button
            onClick={() => router.push(`/submit/${slug}/card`)}
            className="mt-4 rounded-lg bg-[#0F6E56] px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            See the reissued card
          </button>
        </section>
      )}

      {/* Conditions, trial-blocking first */}
      {ranked.length === 0 ? (
        <section className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-6">
          <p className="font-serif text-lg text-ink">No open conditions</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Everything screened in the 17 gates is clear. That is not the same as everything being
            assessed — the card&apos;s limitations section says what was not reached.
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {ranked.map((c) => {
            const item = getItem(c.itemId);
            const open = activeId === c.itemId;
            return (
              <li
                key={c.itemId}
                className="overflow-hidden rounded-xl border border-[#D9D5C8] bg-white"
              >
                <button
                  onClick={() => {
                    setTouched(true);
                    setOpenId(open ? null : c.itemId);
                  }}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          BLOCKING_SCOPE_STYLE[c.blocks]
                        )}
                      >
                        Blocks {BLOCKING_SCOPE_LABEL[c.blocks].toLowerCase()}
                      </span>
                      <span className="font-mono text-xs text-[#6B766F]">
                        {item?.legacyGateId ?? c.itemId} · {c.itemId}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[15px] leading-snug text-[#0E1411]">
                      {item?.text ?? "Item pending definition"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-[#6B766F] transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>

                {open && (
                  <div className="space-y-4 border-t border-[#E8E4D6] px-5 py-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">
                        Why it blocks {BLOCKING_SCOPE_LABEL[c.blocks].toLowerCase()}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[#0E1411]">
                        {c.blocks === "TRIAL"
                          ? "Running a supervised trial cannot establish this — a trial is the activity it gates. It has to be cleared before anyone is enrolled."
                          : "A supervised trial is a route through this. It is the kind of thing a trial exists to find out, so it need not be settled before one starts."}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">
                        What clears it
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[#0E1411]">{c.fix}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#6B766F]">{c.clearedBy}</p>
                    </div>

                    <div className="rounded-lg bg-[#F4F2EA] px-4 py-3">
                      <p className="text-sm text-[#0E1411]">
                        Attach evidence against{" "}
                        <span className="font-mono text-xs">{c.itemId}</span>
                        {item && item.acceptsEvidence.length > 0 && (
                          <span className="text-[#6B766F]">
                            {" "}
                            · accepts{" "}
                            {item.acceptsEvidence
                              .map((t) => t.toLowerCase().replace(/_/g, " "))
                              .join(", ")}
                          </span>
                        )}
                      </p>
                      <button
                        onClick={() => attach(c)}
                        disabled={busy}
                        className="mt-3 rounded-lg bg-[#0F6E56] px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? "Attaching…" : "Attach evidence and reissue"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
