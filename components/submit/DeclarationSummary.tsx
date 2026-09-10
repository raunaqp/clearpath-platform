"use client";

import { FileText, Check, AlertTriangle } from "lucide-react";
import type { Evidence } from "@/lib/schemas/evidence";
import type { GateGap } from "@/lib/engine/assessment-run";
import { findGateGaps, gatesEstablished } from "@/lib/engine/assessment-run";
import { getItem } from "@/lib/engine/item-bank";
import { cn } from "@/lib/utils";

/**
 * S4 — the declaration, as a SUMMARY of what was submitted.
 *
 * It used to be seventeen questions the vendor answered about their own tool.
 * That made the card look like a restatement of those answers, because it very
 * nearly was: a tool grading itself, in a form, before anyone had opened a
 * document. Removing the questionnaire removes the only place a submission
 * could assert its way to a gate.
 *
 * What is left is two halves, and the vendor asserts nothing in either:
 *
 *   WHAT YOU ATTACHED   the documents, and the gates each one answers.
 *   WHAT WE FOUND       gates the documents establish, and gates nothing on
 *                       file speaks to.
 *
 * This screen and the card now agree by construction. It used to hedge —
 * "establish on their own" — because the card could resolve a gate from the
 * vendor's declared answer, so a gate unestablished here could still clear
 * there. That fallback is gone: documents are what resolves a gate, and the
 * hedge was describing a disagreement that no longer exists.
 *
 * Both halves are derived live from the attachments. The word "verdict" does
 * not appear — no assessment has happened yet, and this screen must not read
 * as one.
 */

const KIND_LABEL: Record<GateGap["kind"], string> = {
  NO_EVIDENCE: "nothing on file",
  NON_TRANSFERRING: "generated elsewhere",
  UNCORROBORATED: "not independent",
};

export function DeclarationSummary({ evidence }: { evidence: Evidence[] }) {
  const gaps = findGateGaps(evidence);
  const established = gatesEstablished(evidence);
  // Blocking gaps first — the ones an assessor has to look at before a card
  // can issue — then the rest.
  const ordered = [...gaps].sort((a, b) => Number(b.blocking) - Number(a.blocking));

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-teal-deep/30 bg-teal-light/30 px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">
          What is on file
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink">
          {evidence.length} {evidence.length === 1 ? "document" : "documents"} ·{" "}
          {established.length} of 17 gates established
          {gaps.length > 0 && (
            <>
              {" · "}
              {gaps.length} {gaps.length === 1 ? "gate" : "gates"} your documents don&apos;t yet
              establish
            </>
          )}
        </p>
      </div>

      {/* ── What you attached ─────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="font-serif text-lg text-ink">What you attached</h3>
        {evidence.length === 0 ? (
          <p className="rounded-card border border-line bg-bg-card px-4 py-6 text-sm text-muted">
            Nothing attached. The assessment will be silent on every gate — go back to the checklist
            and attach at least one document.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
            {evidence.map((e) => {
              const gateIds = e.itemRefs
                .map((r) => getItem(r)?.legacyGateId ?? r)
                .filter(Boolean);
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{e.name || "Untitled document"}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {gateIds.length === 0 ? (
                        <span className="text-[#BA7517]">
                          not bound to a gate — counts for nothing until it is
                        </span>
                      ) : (
                        <>answers {gateIds.join(", ")}</>
                      )}
                      {e.generalisability.limited && (
                        <> · generated somewhere this deployment is not</>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── What we found ─────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="font-serif text-lg text-ink">What we found</h3>

        <div className="rounded-card border border-line bg-bg-card px-4 py-3">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B6D11]" aria-hidden />
            <span>
              {established.length === 0 ? (
                "No gate is established by the documents on file yet."
              ) : (
                <>
                  Your documents establish{" "}
                  <span className="font-medium">{established.join(", ")}</span>.
                </>
              )}
            </span>
          </p>
        </div>

        {ordered.length > 0 && (
          <ul className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
            {ordered.map((g) => (
              <li key={g.gateId} className="flex items-start gap-3 px-4 py-3">
                <AlertTriangle
                  className={cn("mt-0.5 h-4 w-4 shrink-0", g.blocking ? "text-[#993C1D]" : "text-[#BA7517]")}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm text-ink">
                    <span className="font-mono text-xs text-muted">{g.gateId}</span> ·{" "}
                    {getItem(g.itemId)?.text ?? g.itemId}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    <span
                      className={cn(
                        "mr-1.5 rounded-pill px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        g.blocking ? "bg-[#FAECE7] text-[#993C1D]" : "bg-bg-sink text-muted"
                      )}
                    >
                      {KIND_LABEL[g.kind]}
                    </span>
                    {g.explanation}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
