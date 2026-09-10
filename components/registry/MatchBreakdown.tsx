"use client";

import { useState } from "react";
import { Check, X, Minus, ChevronDown } from "lucide-react";
import type { ContextMatch, MatchFinding } from "@/lib/match";
import { MATCH_BAND_LABEL } from "@/lib/match";
import { cn } from "@/lib/utils";

/**
 * S9 — why a hospital and a tool fit.
 *
 * THREE COLUMNS, NOT SIX. The four fit dimensions were columns of their own,
 * each carrying a sentence, which needed 864px inside a 726px container at
 * 1280px — so the answer to "can we place this?" sat behind a sideways
 * scroll. Site, band and the ONE deciding reason fit without scrolling; the
 * four-dimension detail is one click away, per row.
 *
 * The four stay separate INSIDE the detail for the reason they always did: a
 * single fit percentage hides which part failed, and the part that failed is
 * the entire actionable content. A vendor told "62% fit" learns nothing; a
 * vendor told "no colposcopy pathway in the catchment" knows exactly what they
 * are looking at.
 *
 * INELIGIBLE SITES ARE ROWS, NOT OMISSIONS. A site quietly dropped teaches a
 * vendor nothing and reads as a broken screen — an empty list looks like a
 * bug, while a stated reason is the product working.
 */

const BAND_STYLE: Record<ContextMatch["band"], string> = {
  STRONG: "bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/30",
  GAPS: "bg-[#FAEEDA] text-[#BA7517] border-[#BA7517]/30",
  NOT_ELIGIBLE: "bg-[#FAECE7] text-[#993C1D] border-[#993C1D]/30",
};

const DIMENSIONS = [
  ["Problem fit", "problemFit"],
  ["Context validity", "contextValidity"],
  ["Infrastructure", "infrastructure"],
  ["Conditions satisfiable", "conditionsSatisfiable"],
] as const;

/**
 * The one line that decides the row.
 *
 * A blocking failure is why a site is ineligible, so it wins. Otherwise the
 * first dimension that does not hold is what a reader has to act on. A site
 * where all four hold gets the positive, not an empty cell — "nothing to
 * report" and "we did not check" must not look the same.
 */
function decidingReason(m: ContextMatch): { text: string; tone: "block" | "gap" | "ok" } {
  const findings = DIMENSIONS.map(([, key]) => m.breakdown[key]);
  const blocked = findings.find((f) => !f.ok && f.blocking);
  if (blocked) return { text: blocked.detail, tone: "block" };
  const gap = findings.find((f) => !f.ok);
  if (gap) return { text: gap.detail, tone: "gap" };
  return { text: m.breakdown.problemFit.detail, tone: "ok" };
}

function FindingIcon({ finding }: { finding: MatchFinding }) {
  const Icon = finding.ok ? Check : finding.blocking ? X : Minus;
  return (
    <Icon
      className={cn(
        "mt-0.5 h-3.5 w-3.5 shrink-0",
        finding.ok ? "text-[#3B6D11]" : finding.blocking ? "text-[#993C1D]" : "text-[#BA7517]"
      )}
      aria-hidden
    />
  );
}

export function MatchTable({ matches }: { matches: ContextMatch[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-line">
          {["Site", "Band", "Why"].map((h) => (
            <th
              key={h}
              className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted"
            >
              {h}
            </th>
          ))}
          {/* aria-label, not an sr-only span: a span's text lands in
              innerText and reads as a stray header. */}
          <th className="pb-2" aria-label="Detail" />
        </tr>
      </thead>
      {matches.map((m) => {
        const expanded = open === m.hospital.id;
        const reason = decidingReason(m);
        return (
          <tbody key={m.hospital.id} className="border-b border-line">
            <tr className="align-top">
              <td className="w-[26%] border-t border-line-soft py-3 pr-4">
                <p className="text-sm leading-snug text-ink">{m.hospital.name}</p>
                <p className="mt-0.5 text-xs text-muted">{m.hospital.location}</p>
              </td>
              <td className="w-[17%] border-t border-line-soft py-3 pr-4">
                {/* whitespace-nowrap: a band that wraps mid-phrase reads as two
                    states rather than one. */}
                <span
                  className={cn(
                    "inline-block whitespace-nowrap rounded-pill border px-2.5 py-0.5 text-xs font-medium",
                    BAND_STYLE[m.band]
                  )}
                >
                  {MATCH_BAND_LABEL[m.band]}
                </span>
              </td>
              <td className="border-t border-line-soft py-3 pr-4">
                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    reason.tone === "block" ? "text-[#993C1D]" : reason.tone === "gap" ? "text-[#BA7517]" : "text-ink-2"
                  )}
                >
                  {reason.text}
                </p>
              </td>
              <td className="w-[7rem] border-t border-line-soft py-3 text-right">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : m.hospital.id)}
                  aria-expanded={expanded}
                  aria-controls={`match-${m.hospital.id}`}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs text-ink-2 transition-colors hover:bg-bg-sink"
                >
                  {expanded ? "Less" : "Detail"}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
                </button>
              </td>
            </tr>

            {expanded && (
              <tr id={`match-${m.hospital.id}`}>
                <td colSpan={4} className="pb-4">
                  <div className="rounded-card border border-line-soft bg-bg-sink/40 px-4 py-3">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {DIMENSIONS.map(([label, key]) => (
                        <div key={label} className="flex items-start gap-2">
                          <FindingIcon finding={m.breakdown[key]} />
                          <div className="min-w-0">
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                              {label}
                            </dt>
                            <dd className="mt-0.5 text-xs leading-relaxed text-ink">
                              {m.breakdown[key].detail}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                    {/*
                      The dates, shown rather than merely checked. A site profile
                      written after a tool arrives is a justification, not a
                      baseline, and the only way a reader can tell the difference
                      is if the ordering is on screen.
                    */}
                    <p
                      className={cn(
                        "mt-3 rounded-md px-3 py-2 text-xs leading-relaxed",
                        m.chronology.siteRecordsPredateSubmission
                          ? "bg-bg-card text-muted"
                          : "bg-[#FAEEDA] text-[#BA7517]"
                      )}
                    >
                      {m.chronology.note}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        );
      })}
    </table>
  );
}
