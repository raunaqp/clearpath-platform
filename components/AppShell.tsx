"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
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
 *
 * Two headers (brief §1):
 *   PUBLIC  — Home · About · Framework, with Login on the right.
 *   PRODUCT — the existing role-scoped nav, plus a link back to the public site.
 *
 * The product header shows when a persona has been picked OR when the current
 * route is a product route. That second condition is what keeps every existing
 * demo link working untouched: opening /registry or /workspace/... directly,
 * signed out, still renders the product nav rather than stranding the visitor
 * on a public header with no way onward. Nothing is gated either way — there is
 * no redirect, no middleware, no interstitial.
 */

type NavItem = { href: string; label: string; external?: boolean };

const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/framework", label: "Framework" },
];

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

/** The three public pages. Everything else is product. */
function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || pathname === "/about" || pathname.startsWith("/framework");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, signedIn, signOut } = useRole();
  const pathname = usePathname();
  const router = useRouter();

  const showProduct = signedIn || !isPublicRoute(pathname);
  const nav = showProduct ? NAV[role] : PUBLIC_NAV;

  function backToPublicSite() {
    signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-content items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="shrink-0 font-serif text-lg tracking-tight text-ink">
              ClearPath
            </Link>
            {/* nowrap + scroll rather than wrap: a two-line header shifts the
                whole page down and looks broken at mid widths. */}
            <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
              {nav.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-ink-2 transition-colors hover:bg-bg-sink hover:text-teal-deep"
                  >
                    {item.label}
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#BA7517]" />
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors",
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
            {showProduct ? (
              <>
                {/* The way back out of the product, into the public site. */}
                <button
                  onClick={backToPublicSite}
                  className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-bg-sink hover:text-teal-deep md:inline-flex"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Public site
                </button>
                {role === "hospital" && <HospitalPersonaSwitcher />}
                <LoginAsSelector mode="switch" />
              </>
            ) : (
              <LoginAsSelector mode="login" />
            )}
          </div>
        </div>

        {/* Mobile nav — the public header is a marketing surface and has to work
            at 375px, where the desktop nav is hidden. */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-line-soft px-5 py-2 md:hidden">
          {nav.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-sm text-ink-2"
              >
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-[#BA7517]" />
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-sm",
                  (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
                    ? "bg-teal-light text-teal-deep"
                    : "text-ink-2"
                )}
              >
                {item.label}
              </Link>
            )
          )}
          {showProduct && (
            <button
              onClick={backToPublicSite}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-sm text-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Public site
            </button>
          )}
        </nav>
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
