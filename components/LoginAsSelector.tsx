"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogIn, ArrowUpRight } from "lucide-react";
import { useRole, type Role } from "@/lib/role/RoleContext";
import { REGULATORY_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

/**
 * "Login as ▾" — top-level selector that replaces the Vendor/Hospital toggle.
 * Hospital and Vendor instantly re-scope the app (lightweight, flip anytime — NOT
 * a real login). "Regulatory filing ↗" is a REDIRECT out to the separate
 * regulatory product, styled as an exit so it doesn't read as an in-app persona.
 */
const ROLES: { role: Role; label: string; hint: string }[] = [
  { role: "hospital", label: "Hospital", hint: "Evaluate, place & run clinical AI" },
  { role: "vendor", label: "Vendor / startup", hint: "Get your tool evaluated & deployed" },
];

export function LoginAsSelector() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = ROLES.find((r) => r.role === role);

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
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-bg-card px-3 py-1 text-sm text-ink transition-colors hover:bg-bg-sink"
      >
        <LogIn className="h-3.5 w-3.5 text-teal-deep" />
        <span className="hidden text-muted sm:inline">Login as</span>
        <span className="font-medium">{current?.label ?? "…"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-card border border-line bg-bg-card shadow-lg">
          {ROLES.map((r) => {
            const active = r.role === role;
            return (
              <button
                key={r.role}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setRole(r.role); setOpen(false); }}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-sink",
                  active && "bg-teal-light/60"
                )}
              >
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-teal-deep" : "text-transparent")} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{r.label}</span>
                  <span className="block text-xs text-muted">{r.hint}</span>
                </span>
              </button>
            );
          })}

          {/* Exit — a redirect out to the regulatory product, not a persona here. */}
          <a
            href={REGULATORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 border-t border-line bg-bg-sink/50 px-3 py-2.5 text-sm text-ink-2 transition-colors hover:bg-bg-sink hover:text-teal-deep"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-[#BA7517]" />
              Regulatory filing
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted">Opens ↗</span>
          </a>
        </div>
      )}
    </div>
  );
}
