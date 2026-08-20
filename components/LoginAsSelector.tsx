"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, LogIn, ArrowUpRight } from "lucide-react";
import { useRole, type Role } from "@/lib/role/RoleContext";
import { REGULATORY_URL, PRODUCT_HOME } from "@/lib/links";
import { cn } from "@/lib/utils";

/**
 * "Login as ▾" — the persona selector. Two modes, one menu (brief §1):
 *
 *   mode="login"  — public header. Reads as **Login**; picking a persona signs
 *                   in, swaps the header to the product nav, and lands on that
 *                   persona's product home.
 *   mode="switch" — product header. The existing behaviour, unchanged: flips
 *                   the lens in place without navigating, so the switcher stays
 *                   available inside the product.
 *
 * Hospital and Vendor re-scope the app (lightweight, flip anytime — NOT a real
 * login; nothing is gated). "Regulatory filing ↗" is a REDIRECT out to the
 * separate regulatory product, styled as an exit so it doesn't read as an
 * in-app persona.
 */
const ROLES: { role: Role; label: string; hint: string }[] = [
  { role: "hospital", label: "Hospital", hint: "Evaluate, place & run clinical AI" },
  { role: "vendor", label: "Vendor / startup", hint: "Get your tool evaluated & deployed" },
];

export function LoginAsSelector({ mode = "switch" }: { mode?: "login" | "switch" }) {
  const { role, setRole, signIn } = useRole();
  const router = useRouter();
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

  function choose(next: Role) {
    setOpen(false);
    if (mode === "login") {
      signIn(next);
      router.push(PRODUCT_HOME[next]);
    } else {
      setRole(next);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1 text-sm transition-colors",
          mode === "login"
            ? "bg-teal-deep text-white hover:opacity-90"
            : "border border-line bg-bg-card text-ink hover:bg-bg-sink"
        )}
      >
        <LogIn className={cn("h-3.5 w-3.5 shrink-0", mode === "login" ? "text-white" : "text-teal-deep")} />
        {mode === "login" ? (
          <span className="font-medium">Login</span>
        ) : (
          <>
            {/* The "Login as" prefix is the first thing to go when the product
                nav is wide — the persona name alone still reads correctly. */}
            <span className="hidden text-muted xl:inline">Login as</span>
            <span className="font-medium">{current?.label ?? "…"}</span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            mode === "login" ? "text-white/80" : "text-muted",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-card border border-line bg-bg-card shadow-lg">
          {mode === "login" && (
            <p className="border-b border-line bg-bg-sink/50 px-3 py-2 text-[11px] uppercase tracking-wider text-muted">
              Login as
            </p>
          )}
          {ROLES.map((r) => {
            const active = mode === "switch" && r.role === role;
            return (
              <button
                key={r.role}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(r.role)}
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
