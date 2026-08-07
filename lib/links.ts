/**
 * External regulatory product (a separate app). ClearPath only ever LINKS to it
 * — never proxies or absorbs it. Every use opens a new tab with rel=noopener.
 *
 * Single source of truth so the redirect can't silently drift or go missing in
 * one place; browser-verify asserts every rendered instance points here.
 */
export const REGULATORY_URL = "https://clearpath-medtech.vercel.app";
