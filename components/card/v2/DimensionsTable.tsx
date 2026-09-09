import type { DimensionId, ReadinessCard } from "@/lib/schemas/readiness-card";
import { DIMENSIONS } from "@/lib/engine/gates";
import { MAX_LEVEL } from "@/lib/schemas/score";

/**
 * The four dimensions on the 0-2 maturity ladder.
 *
 * TWO THINGS DELIBERATELY ABSENT.
 *
 * Percentages. A dimension on a three-step ladder is not a percentage, and
 * rendering 1.6 as 80% invites comparison arithmetic the ladder does not
 * support.
 *
 * A per-dimension item denominator. "5 of 31 items assessed" is pseudo-
 * precision: it reads as though the framework is measurably 15% built and this
 * dimension is measurably 16% assessed, when the truth is that the other 26
 * items are not yet written. The scope line below says that once, in words,
 * which is the honest version of the same fact.
 */
const DIMENSION_ORDER: DimensionId[] = ["D1", "D2", "D3", "D4"];

export function DimensionsTable({ card }: { card: ReadinessCard }) {
  return (
    <div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#D9D5C8]">
            <th className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[#6B766F]">
              Dimension
            </th>
            <th className="w-32 pb-2 text-right font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[#6B766F]">
              Score (illustrative)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E4D6]">
          {DIMENSION_ORDER.map((d) => {
            const mean = card.dimensionScores[d]?.mean ?? 0;
            return (
              <tr key={d}>
                <td className="py-2.5 pr-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B766F]">
                    {d}
                  </span>{" "}
                  <span className="text-[15px] text-[#0E1411]">{DIMENSIONS[d].title}</span>
                </td>
                <td className="py-2.5 text-right font-serif text-lg tabular-nums text-[#0E1411]">
                  {mean.toFixed(1)}{" "}
                  <span className="font-sans text-xs text-[#6B766F]">/ {MAX_LEVEL}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs leading-relaxed text-[#6B766F]">
        Illustrative fixture values, not validated measurements.
      </p>
    </div>
  );
}
