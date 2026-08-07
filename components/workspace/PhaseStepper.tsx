import { Check } from "lucide-react";
import type { Phase } from "@/lib/schemas/deployment";
import type { PhaseDef } from "@/lib/workspace/phases";
import { cn } from "@/lib/utils";

/**
 * Persistent phase stepper (BUILD_SPEC §8), driven by the workflow's own phase
 * list (trial vs deployment). `reachedIndex` is how far the pilot has advanced;
 * `view` is the panel being shown. All phases are clickable (peek-ahead).
 */
export function PhaseStepper({
  phases,
  reachedIndex,
  view,
  onSelect,
}: {
  phases: PhaseDef[];
  reachedIndex: number;
  view: Phase;
  onSelect: (p: Phase) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-[640px] items-center gap-1">
        {phases.map((p, i) => {
          const done = i < reachedIndex;
          const current = i === reachedIndex;
          const selected = p.key === view;
          return (
            <li key={p.key} className="flex flex-1 items-center gap-1">
              {i > 0 && <span className={cn("h-px flex-1", i <= reachedIndex ? "bg-teal-deep" : "bg-line")} />}
              <button
                onClick={() => onSelect(p.key)}
                className="flex flex-col items-center gap-1 rounded-md px-2 py-1 text-center transition-colors hover:bg-bg-sink"
              >
                {/* Three distinct states: COMPLETED (check + filled) · CURRENT
                    (filled + ring) · UPCOMING (hollow + greyed) */}
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                    done && "bg-teal-deep text-white",
                    current && "bg-teal-deep text-white ring-2 ring-teal-deep/35 ring-offset-2 ring-offset-bg-card",
                    !done && !current && "border border-line bg-transparent text-muted"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("whitespace-nowrap text-xs", current ? "font-medium text-ink" : done ? "text-ink-2" : "text-muted", selected && "underline underline-offset-4")}>
                  {p.label}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted">{p.group}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
