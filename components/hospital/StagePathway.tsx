import { PATHWAY_STEPS, type DecisionOutcome, type PilotOutcome } from "@/lib/stages";
import { cn } from "@/lib/utils";

/**
 * Compact horizontal pathway (New · Evaluated · Decision · Pilot) with the
 * current stage highlighted. The Decision and Pilot steps show their outcome
 * once known (Approved/Declined · Ongoing/Complete).
 */
export function StagePathway({
  index,
  decisionOutcome,
  pilotOutcome,
}: {
  index: number;
  decisionOutcome?: DecisionOutcome;
  pilotOutcome?: PilotOutcome;
}) {
  return (
    <div className="flex items-center gap-1">
      {PATHWAY_STEPS.map((step, i) => {
        const done = i < index;
        const current = i === index;

        let label: string = step.label;
        let outcomeTone: string | null = null;
        if (step.key === "decision" && decisionOutcome) {
          label = decisionOutcome === "approved" ? "Approved" : "Declined";
          outcomeTone = decisionOutcome === "approved" ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FAECE7] text-[#993C1D]";
        }
        if (step.key === "pilot" && pilotOutcome) {
          label = pilotOutcome === "ongoing" ? "Ongoing" : "Complete";
          outcomeTone = "bg-[#EAF3DE] text-[#3B6D11]";
        }

        const tone =
          outcomeTone ??
          (current
            ? "bg-[#0F6E56] text-white"
            : done
              ? "bg-[#E1F5EE] text-[#0F6E56]"
              : "bg-[#EFECE3] text-[#6B766F]");

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && <span className="h-px w-3 bg-[#D9D5C8]" />}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
