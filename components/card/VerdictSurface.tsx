import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import { VERDICT_CARD } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Verdict-tinted outer surface — the ClearPath RiskTintedSurface pattern,
 * tinted by our verdict states so the surface previews the verdict the band
 * below states in words.
 */
export function VerdictSurface({
  verdict,
  children,
}: {
  verdict: ToolVerdict;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-6", VERDICT_CARD[verdict].outer)}>
      {children}
    </div>
  );
}
