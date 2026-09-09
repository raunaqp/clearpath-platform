"use client";

import { useEffect, useState } from "react";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { ReadinessCardV2 } from "@/components/card/v2/ReadinessCardV2";

/**
 * Preview route — the v2 Readiness Card for three demo tools, side by side, so
 * the card can be reviewed in one place.
 *
 * Client-rendered because `getCardV2` reads the mock store, which hydrates from
 * localStorage in the browser. It previously server-rendered a v1 card from the
 * fixtures directly; that was the fourth surface still showing the old card.
 */
const DEMO_SLUGS = ["cerviai", "chestxr", "symptombot"];

export default function DemoCardsPage() {
  const [views, setViews] = useState<CardV2View[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const found = await Promise.all(DEMO_SLUGS.map((s) => getCardV2(s)));
      if (!live) return;
      setViews(found.filter((v): v is CardV2View => Boolean(v)));
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  return (
    <div className="space-y-14 py-4">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl text-ink">Card preview — three tools</h1>
        <p className="text-sm text-muted">
          The v2 Readiness Card. Context-bound, conditions with their blocking scope, the 0–2
          ladder, and what the assessment could not establish.
        </p>
      </header>
      {views.map((v) => (
        <ReadinessCardV2
          key={v.tool.id}
          card={v.card}
          tool={v.tool}
          evidence={v.evidence}
          contextIsReal={v.contextIsReal}
          showRemediationLink={false}
        />
      ))}
    </div>
  );
}
