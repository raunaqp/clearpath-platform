import type { GateSummary } from "@/lib/schemas/readiness-card";

/**
 * The gates-clear chip.
 *
 * A COUNT, not a composite. "15 / 17 gates clear" is a tally of discrete
 * findings a reader can go and check one by one; a single 0-100 figure is an
 * average that hides which ones failed. That distinction is why this chip
 * survived the removal of the score disc — and why it is rendered from
 * `gateSummary`, the card's own tally, rather than recomputed here.
 *
 * `unscored` is added into the denominator but never into `pass`. A gate nobody
 * could establish is not a gate that cleared.
 */
export function GateSummaryChip({ gateSummary }: { gateSummary: GateSummary }) {
  const total = gateSummary.pass + gateSummary.fail + gateSummary.unscored;
  const title = [
    `${gateSummary.pass} clear`,
    `${gateSummary.fail} not clear`,
    gateSummary.unscored > 0 ? `${gateSummary.unscored} could not be established` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className="inline-flex items-baseline gap-1.5 rounded-full border border-[#0F6E56]/40 bg-white px-3 py-1 text-xs font-medium text-[#0F6E56]"
      title={title}
    >
      <span className="font-serif tabular-nums text-sm">{gateSummary.pass}</span>
      <span className="text-[10px] opacity-80">/ {total} gates clear</span>
    </span>
  );
}
