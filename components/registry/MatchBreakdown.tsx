import { Check, X, Minus } from "lucide-react";
import type { ContextMatch, MatchFinding } from "@/lib/match";
import { MATCH_BAND_LABEL } from "@/lib/match";
import { cn } from "@/lib/utils";

/**
 * S9 — why a hospital and a tool fit, in four findings rather than one score.
 *
 * The four stay separate for the same reason the routing numbers do: a single
 * fit percentage hides which part failed, and the part that failed is the
 * entire actionable content. A vendor told "62% fit" learns nothing; a vendor
 * told "no colposcopy pathway in the catchment" knows exactly what they are
 * looking at.
 *
 * INELIGIBLE SITES ARE RENDERED, NOT FILTERED OUT. A site that is quietly
 * dropped teaches a vendor nothing and reads as a broken screen — an empty
 * list looks like a bug, while a stated reason is the product working.
 */

const BAND_STYLE: Record<ContextMatch["band"], string> = {
  STRONG: "bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/30",
  GAPS: "bg-[#FAEEDA] text-[#BA7517] border-[#BA7517]/30",
  NOT_ELIGIBLE: "bg-[#FAECE7] text-[#993C1D] border-[#993C1D]/30",
};

function FindingRow({ label, finding }: { label: string; finding: MatchFinding }) {
  const Icon = finding.ok ? Check : finding.blocking ? X : Minus;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          finding.ok ? "text-[#3B6D11]" : finding.blocking ? "text-[#993C1D]" : "text-[#BA7517]"
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink">{finding.detail}</p>
      </div>
    </div>
  );
}

export function MatchBreakdownCard({ match }: { match: ContextMatch }) {
  return (
    <li className="rounded-card border border-line bg-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-lg text-ink">{match.hospital.name}</p>
          <p className="text-xs text-muted">{match.hospital.location}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-pill border px-2.5 py-0.5 text-xs font-medium",
            BAND_STYLE[match.band]
          )}
        >
          {MATCH_BAND_LABEL[match.band]}
        </span>
      </div>

      <div className="mt-2 divide-y divide-line-soft border-t border-line-soft">
        <FindingRow label="Problem fit" finding={match.breakdown.problemFit} />
        <FindingRow label="Context validity" finding={match.breakdown.contextValidity} />
        <FindingRow label="Infrastructure" finding={match.breakdown.infrastructure} />
        <FindingRow label="Conditions satisfiable" finding={match.breakdown.conditionsSatisfiable} />
      </div>

      {/*
        The dates, shown rather than merely checked. A site profile written
        after a tool arrives is a justification, not a baseline, and the only
        way a reader can tell the difference is if the ordering is on screen.
      */}
      <p
        className={cn(
          "mt-3 rounded-md px-3 py-2 text-xs leading-relaxed",
          match.chronology.siteRecordsPredateSubmission
            ? "bg-bg-sink text-muted"
            : "bg-[#FAEEDA] text-[#BA7517]"
        )}
      >
        {match.chronology.note}
      </p>
    </li>
  );
}
