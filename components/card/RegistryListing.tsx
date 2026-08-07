"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Store } from "lucide-react";
import type { Tool } from "@/lib/schemas/tool";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import { listOnRegistry, isListedOnRegistry } from "@/lib/mock/api";

/**
 * Vendor journey 2 (separate from finding a hospital) — list the solution on
 * the marketplace registry as "assessed", with no specific hospital. A vendor
 * can do this, send a hospital request, or both.
 */
export function RegistryListing({
  tool,
  card,
}: {
  tool: Tool;
  card: ToolReadinessCard;
}) {
  const [listed, setListed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void isListedOnRegistry(tool.id).then(setListed);
  }, [tool.id]);

  async function list() {
    setBusy(true);
    await listOnRegistry({ toolId: tool.id, verdict: card.verdict });
    setListed(true);
    setBusy(false);
  }

  return (
    <section className="mt-6 rounded-xl border border-line bg-bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-lg text-ink">List on the registry</h2>
          <p className="mt-1 max-w-lg text-sm text-muted">
            List {tool.name} as “assessed” so any hospital can discover it — no
            specific hospital attached. This is separate from sending a pilot
            request; you can do either or both.
          </p>
        </div>
        <button
          onClick={list}
          disabled={busy || listed}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink disabled:opacity-60"
        >
          {listed ? <Check className="h-4 w-4" /> : <Store className="h-4 w-4" />}
          {listed ? "Listed as assessed" : "List my solution as assessed"}
        </button>
      </div>
      {listed && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-line-soft pt-3 text-sm text-ink-2">
          Listed on the registry as “assessed.”
          <Link href="/registry" className="inline-flex items-center gap-1 text-teal-deep">
            View in the registry <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      )}
    </section>
  );
}
