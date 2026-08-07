"use client";

import { cn } from "@/lib/utils";

/**
 * Segmented control — the Yes / Partial / No inputs that feed the gates
 * (BUILD_SPEC §3.3), and reused for any small either/or choice in the wizard.
 */
export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Optional accent when selected: "pass" | "partial" | "fail". */
  tone?: "pass" | "partial" | "fail" | "neutral";
};

const TONE: Record<string, string> = {
  pass: "bg-green-dark text-white",
  partial: "bg-amber-brand text-white",
  fail: "bg-coral-brand text-white",
  neutral: "bg-teal-deep text-white",
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-pill border border-line bg-bg-card p-0.5"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-pill px-3 py-1 text-sm transition-colors",
              active
                ? TONE[opt.tone ?? "neutral"]
                : "text-ink-2 hover:bg-bg-sink"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
