import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import type { AuditVerdict } from "@/lib/schemas/audit";
import { VERDICT_CARD } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Verdict band (BUILD_SPEC §3) — DEPLOY (green) / DEPLOY WITH CONDITIONS
 * (amber) / NOT YET (coral). Rendered as its own prominent solid band below the
 * card body, in the verdict's accent color.
 */
export function VerdictBanner({
  verdict,
  summary,
  className,
}: {
  verdict: ToolVerdict | AuditVerdict;
  summary: string;
  className?: string;
}) {
  const v = VERDICT_CARD[verdict];
  return (
    <div className={cn("rounded-xl px-6 py-5 shadow-sm", v.solid, className)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-80">
        Verdict
      </p>
      <p className="mt-1 font-serif text-2xl uppercase tracking-wide sm:text-3xl">
        {v.bandLabel}
      </p>
      <p className="mt-2 max-w-2xl text-sm/relaxed opacity-95">{summary}</p>
    </div>
  );
}
