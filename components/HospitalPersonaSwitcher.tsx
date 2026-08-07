"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useHospital } from "@/lib/hospital/HospitalContext";
import { HOSPITAL_PERSONAS, personaById } from "@/lib/hospital/personas";
import { cn } from "@/lib/utils";

/**
 * "Viewing as: [Hospital] ▾" — the persona switch inside the hospital area
 * (one level below the Vendor/Hospital role toggle). Switching swaps the whole
 * hospital context, not a filter.
 */
export function HospitalPersonaSwitcher() {
  const { hospitalId, setHospitalId } = useHospital();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = personaById(hospitalId);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-bg-card px-3 py-1 text-sm text-ink transition-colors hover:bg-bg-sink"
      >
        <Building2 className="h-3.5 w-3.5 text-teal-deep" />
        <span className="hidden text-muted sm:inline">Viewing as</span>
        <span className="max-w-[9rem] truncate font-medium">{current.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-1.5 w-72 overflow-hidden rounded-card border border-line bg-bg-card shadow-lg"
        >
          {HOSPITAL_PERSONAS.map((p) => {
            const active = p.id === hospitalId;
            return (
              <button
                key={p.id}
                role="option"
                aria-selected={active}
                onClick={() => { setHospitalId(p.id); setOpen(false); }}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-sink",
                  active && "bg-teal-light/60"
                )}
              >
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-teal-deep" : "text-transparent")} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{p.name}</span>
                  <span className="block text-xs text-muted">{p.role}</span>
                </span>
              </button>
            );
          })}
          <p className="border-t border-line bg-bg-sink px-3 py-2 text-xs text-muted">
            Fictional demo data — these are not real institutions.
          </p>
        </div>
      )}
    </div>
  );
}
