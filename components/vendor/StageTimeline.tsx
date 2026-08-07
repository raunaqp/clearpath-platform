"use client";

import { Check, X } from "lucide-react";
import type { Submission } from "@/lib/schemas/submission";
import { VSTAGES, stageIndex } from "@/lib/vendor/stage";
import { cn } from "@/lib/utils";

/**
 * The 5-stage vendor pipeline timeline (New → Complete) with the current stage
 * highlighted. Shared by the vendor status dashboard and "My applications".
 * `compact` drops the stage labels for dense rows.
 */
export function StageTimeline({ submission, compact = false }: { submission: Submission; compact?: boolean }) {
  const { index, declined } = stageIndex(submission);

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {VSTAGES.map((label, i) => {
        const done = !declined && i < index;
        const current = !declined && i === index;
        const isDeclinedStep = declined && i === 2;
        return (
          <div key={label} className="flex items-center gap-1">
            {i > 0 && <span className={cn("h-px w-4", !declined && i <= index ? "bg-teal-deep" : "bg-line")} />}
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                  isDeclinedStep && "bg-coral-brand text-white",
                  done && "bg-teal-deep text-white",
                  current && "bg-teal-deep text-white ring-2 ring-teal-deep/35 ring-offset-2 ring-offset-bg-card",
                  !done && !current && !isDeclinedStep && "border border-line bg-transparent text-muted"
                )}
              >
                {isDeclinedStep ? <X className="h-3.5 w-3.5" /> : done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {!compact && (
                <span className={cn("whitespace-nowrap text-[10px]", current ? "font-medium text-ink" : "text-muted")}>
                  {isDeclinedStep ? "Declined" : label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
