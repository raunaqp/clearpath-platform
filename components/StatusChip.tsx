import type { GateStatus } from "@/lib/schemas/gate";
import { GATE_STATUS_STYLE } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Pass / partial / fail / not-answered pill in the ClearPath badge idiom
 * (solid for pass/fail, outline for partial, muted for not-answered).
 */
export function StatusChip({
  status,
  className,
}: {
  status: GateStatus | "notAnswered";
  className?: string;
}) {
  const s = GATE_STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        s.pill,
        className
      )}
    >
      {s.label}
    </span>
  );
}
