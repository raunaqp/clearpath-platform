/**
 * External regulatory product (a separate app). ClearPath only ever LINKS to it
 * — never proxies or absorbs it. Every use opens a new tab with rel=noopener.
 *
 * Single source of truth so the redirect can't silently drift or go missing in
 * one place; browser-verify asserts every rendered instance points here.
 */
export const REGULATORY_URL = "https://clearpath-medtech.vercel.app";

/**
 * The public pages (brief §0). Everything else is product — reached through
 * Login, but never gated: direct URLs keep working unchanged.
 *
 * /research is public but is NOT a nav item: the approved IA stays three items
 * (Home · About · Framework) and /research hangs off home §4 and /framework.
 * Public-page and public-nav membership are separate on purpose — see
 * `isPublicRoute` / `PUBLIC_NAV` in components/AppShell.tsx.
 */
export const PUBLIC_ROUTES = ["/", "/about", "/framework", "/research"] as const;

/**
 * Where Login lands each persona — the working surface of that persona's
 * product, not its marketing door (`/hospitals`, `/vendors` stay reachable but
 * are no longer the entry point).
 */
export const PRODUCT_HOME: Record<"vendor" | "hospital", string> = {
  hospital: "/hospital",
  vendor: "/applications",
};
