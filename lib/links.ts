/**
 * External regulatory product (a separate app). ClearPath only ever LINKS to it
 * — never proxies or absorbs it. Every use opens a new tab with rel=noopener.
 *
 * Single source of truth so the redirect can't silently drift or go missing in
 * one place; browser-verify asserts every rendered instance points here.
 */
export const REGULATORY_URL = "https://clearpath-medtech.vercel.app";

/**
 * The three public pages (brief §0). Everything else is product — reached
 * through Login, but never gated: direct URLs keep working unchanged.
 */
export const PUBLIC_ROUTES = ["/", "/about", "/framework"] as const;

/**
 * Where Login lands each persona — the working surface of that persona's
 * product, not its marketing door (`/hospitals`, `/vendors` stay reachable but
 * are no longer the entry point).
 */
export const PRODUCT_HOME: Record<"vendor" | "hospital", string> = {
  hospital: "/hospital",
  vendor: "/applications",
};
