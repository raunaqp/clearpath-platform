"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useRole } from "@/lib/role/RoleContext";
import { LoginAsSelector } from "./LoginAsSelector";
import { HospitalPersonaSwitcher } from "./HospitalPersonaSwitcher";
import { HOSPITAL_STORAGE_KEY } from "@/lib/hospital/HospitalContext";
import { REGULATORY_URL } from "@/lib/links";
import { resetDemoData } from "@/lib/mock/api";
import { cn } from "@/lib/utils";

/**
 * App shell (BUILD_SPEC §1) — header with the "Login as" selector and role-scoped
 * nav, plus a footer carrying the "Reset demo data" control (§2).
 */

type NavItem = { href: string; label: string; external?: boolean };

const NAV: Record<"vendor" | "hospital", NavItem[]> = {
  vendor: [
    { href: "/", label: "Home" },
    { href: "/applications", label: "My applications" },
    { href: "/submit", label: "Submit a tool" },
    { href: REGULATORY_URL, label: "Explore regulatory", external: true },
    { href: "/registry", label: "Registry" },
    { href: "/framework", label: "Framework" },
  ],
  hospital: [
    { href: "/", label: "Home" },
    { href: "/hospital", label: "Inbox" },
    { href: "/site-readiness", label: "Site readiness" },
    { href: "/registry", label: "Registry" },
    { href: "/framework", label: "Framework" },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useRole();
  const pathname = usePathname();
  const nav = NAV[role];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-content items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-serif text-lg tracking-tight text-ink">
              ClearPath
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-bg-sink hover:text-teal-deep"
                  >
                    {item.label}
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#BA7517]" />
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
                        ? "bg-teal-light text-teal-deep"
                        : "text-ink-2 hover:bg-bg-sink"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {role === "hospital" && <HospitalPersonaSwitcher />}
            <LoginAsSelector />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-content flex-1 px-5 py-8">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    await resetDemoData();
    // Persona is a UI lens (like role); reset returns it to the default hospital.
    window.localStorage.removeItem(HOSPITAL_STORAGE_KEY);
    window.location.reload();
  }

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-content flex-col items-start justify-between gap-3 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center">
        <p>
          ClearPath — pre-deployment evaluation, placement &amp; deployment for
          clinical AI. Fully mocked demo; no data leaves your browser.
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="rounded-md border border-line px-3 py-1.5 text-ink-2 transition-colors hover:bg-bg-sink disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset demo data"}
        </button>
      </div>
    </footer>
  );
}
