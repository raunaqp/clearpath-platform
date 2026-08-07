import type { Condition } from "@/lib/schemas/readiness-card";
import { TOOL_GATES, type ToolGateId } from "@/lib/engine/gates";
import { cn } from "@/lib/utils";

/**
 * Conditions to meet (BUILD_SPEC §3) — failed gates (required) + partials (firm
 * up), each with its fix. Rendered in ClearPath's TopGapsList idiom: a mono
 * severity tag + bold title + muted fix line. Required first, then firm-up.
 */
export function ConditionsList({ conditions }: { conditions: Condition[] }) {
  if (conditions.length === 0) {
    return (
      <p className="text-sm text-[#6B766F]">
        No conditions — all gates clear based on submitted evidence.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {conditions.map((c) => {
        const title = TOOL_GATES[c.gateId as ToolGateId]?.title ?? c.gateId;
        const required = c.kind === "required";
        return (
          <li key={c.gateId} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                required
                  ? "border border-[#993C1D] bg-[#993C1D] text-white"
                  : "border border-[#BA7517] bg-transparent text-[#BA7517]"
              )}
            >
              {required ? "Required" : "Firm up"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug text-[#0E1411]">
                <span className="text-[#6B766F]">{c.gateId}</span> · {title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-[#6B766F]">{c.fix}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
