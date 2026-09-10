import { Check, X, Minus } from "lucide-react";
import type { ContextMatch, MatchFinding } from "@/lib/match";
import { MATCH_BAND_LABEL } from "@/lib/match";
import { cn } from "@/lib/utils";

/**
 * S9 — why a hospital and a tool fit, as a TABLE.
 *
 * Sites are rows and the four fit dimensions are columns, so a reader compares
 * sites down a column instead of holding four separate blocks in their head.
 * The four stay separate for the same reason the routing numbers do: a single
 * fit percentage hides which part failed, and the part that failed is the
 * entire actionable content. A vendor told "62% fit" learns nothing; a vendor
 * told "no colposcopy pathway in the catchment" knows exactly what they are
 * looking at — so every cell carries its own reason, not just its own icon.
 *
 * INELIGIBLE SITES ARE ROWS, NOT OMISSIONS. A site that is quietly dropped
 * teaches a vendor nothing and reads as a broken screen — an empty list looks
 * like a bug, while a stated reason is the product working.
 */

const BAND_STYLE: Record<ContextMatch["band"], string> = {
  STRONG: "bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/30",
  GAPS: "bg-[#FAEEDA] text-[#BA7517] border-[#BA7517]/30",
  NOT_ELIGIBLE: "bg-[#FAECE7] text-[#993C1D] border-[#993C1D]/30",
};

const COLUMNS = [
  ["Problem fit", "problemFit"],
  ["Context validity", "contextValidity"],
  ["Infrastructure", "infrastructure"],
  ["Conditions satisfiable", "conditionsSatisfiable"],
] as const;

function FindingCell({ finding }: { finding: MatchFinding }) {
  const Icon = finding.ok ? Check : finding.blocking ? X : Minus;
  return (
    <td className="w-[19%] border-t border-line-soft py-3 pr-4 align-top">
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0",
            finding.ok ? "text-[#3B6D11]" : finding.blocking ? "text-[#993C1D]" : "text-[#BA7517]"
          )}
          aria-hidden
        />
        <span className="text-xs leading-relaxed text-ink">{finding.detail}</span>
      </div>
    </td>
  );
}

export function MatchTable({ matches }: { matches: ContextMatch[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[54rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {["Site", ...COLUMNS.map(([label]) => label), "Band"].map((h) => (
              <th
                key={h}
                className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        {matches.map((m) => (
          <tbody key={m.hospital.id} className="border-b border-line">
            <tr className="align-top">
              <td className="w-[18%] border-t border-line-soft py-3 pr-4">
                <p className="text-sm leading-snug text-ink">{m.hospital.name}</p>
                <p className="mt-0.5 text-xs text-muted">{m.hospital.location}</p>
              </td>
              {COLUMNS.map(([label, key]) => (
                <FindingCell key={label} finding={m.breakdown[key]} />
              ))}
              <td className="w-[9%] border-t border-line-soft py-3 align-top">
                <span
                  className={cn(
                    "inline-block rounded-pill border px-2.5 py-0.5 text-xs font-medium",
                    BAND_STYLE[m.band]
                  )}
                >
                  {MATCH_BAND_LABEL[m.band]}
                </span>
              </td>
            </tr>
            {/*
              The dates, shown rather than merely checked. A site profile written
              after a tool arrives is a justification, not a baseline, and the
              only way a reader can tell the difference is if the ordering is on
              screen. Spans the row so it stays attached to its own site.
            */}
            <tr>
              <td colSpan={6} className="pb-3">
                <p
                  className={cn(
                    "rounded-md px-3 py-2 text-xs leading-relaxed",
                    m.chronology.siteRecordsPredateSubmission
                      ? "bg-bg-sink text-muted"
                      : "bg-[#FAEEDA] text-[#BA7517]"
                  )}
                >
                  {m.chronology.note}
                </p>
              </td>
            </tr>
          </tbody>
        ))}
      </table>
    </div>
  );
}
