import type { GateResult } from "@/lib/schemas/gate";

/**
 * Gates-clear chip — top-right of the card header, in ClearPath's
 * RegulationCountBadge idiom (a COUNT, not a composite: serif number + small
 * print, teal outline on white).
 */
export function ScoreChip({ gateResults }: { gateResults: GateResult[] }) {
  const total = gateResults.length;
  const passed = gateResults.filter((r) => r.status === "pass").length;
  const partial = gateResults.filter((r) => r.status === "partial").length;
  const failed = gateResults.filter((r) => r.status === "fail").length;

  return (
    <span
      className="inline-flex items-baseline gap-1.5 rounded-full border border-[#0F6E56]/40 bg-white px-3 py-1 text-xs font-medium text-[#0F6E56]"
      title={`${passed} pass · ${partial} partial · ${failed} not met`}
    >
      <span className="font-serif tabular-nums text-sm">{passed}</span>
      <span className="text-[10px] opacity-80">/ {total} gates clear</span>
    </span>
  );
}
