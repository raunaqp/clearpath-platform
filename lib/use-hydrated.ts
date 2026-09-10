"use client";

import { useEffect, useState } from "react";

/**
 * Whether React has hydrated on the client.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE RACE THIS CLOSES
 * ─────────────────────────────────────────────────────────────────────────
 * A button in a client component is present in the server-rendered HTML before
 * its onClick handler is attached. Between first paint and hydration it looks
 * completely ready and does nothing when pressed. The click is not queued or
 * replayed — it is simply swallowed.
 *
 * This is invisible in development on a warm machine, where hydration lands in
 * a few milliseconds. It bites on a cold load over a real connection, on the
 * FIRST interaction a visitor has — which in a live demonstration is the worst
 * possible moment, because the person clicking concludes the product is broken
 * and there is nothing on screen to tell them otherwise.
 *
 * Returns false on the server and on the first client render, true afterwards.
 * `useState(false)` + `useEffect` is deliberate: the initial value must match
 * what the server rendered, or React reports a hydration mismatch.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
