import type { Metric } from "@/lib/schemas/deployment";

/** Live metric card (BUILD_SPEC §8) — ClearPath metric-block idiom. */
export function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-lg border border-[#D9D5C8] bg-white px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">
        {metric.label}
      </p>
      <p className="mt-1 font-serif text-2xl text-[#0E1411]">{metric.value}</p>
      {metric.hint && <p className="mt-0.5 text-xs text-[#6B766F]">{metric.hint}</p>}
    </div>
  );
}
