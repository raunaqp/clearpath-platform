import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import { VERDICT_CARD } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Overall readiness score — the scorecard headline (score-first idiom), in
 * ClearPath's ReadinessCircle form: a verdict-coloured disc with a big serif
 * number over a small "/100".
 */
export function ReadinessScore({
  score,
  verdict,
}: {
  score: number;
  verdict: ToolVerdict;
}) {
  const v = VERDICT_CARD[verdict];
  return (
    <div
      className={cn(
        "flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-transparent sm:h-24 sm:w-24",
        v.solid
      )}
    >
      <span className="whitespace-nowrap font-serif leading-none tabular-nums">
        <span className="text-3xl sm:text-4xl">{score}</span>
        <span className="text-base opacity-80">/100</span>
      </span>
    </div>
  );
}
