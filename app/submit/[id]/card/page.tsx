"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { ReadinessCardV2 } from "@/components/card/v2/ReadinessCardV2";
import { SiteMatches } from "@/components/registry/SiteMatches";
import { RegistryListing } from "@/components/card/RegistryListing";
import { WIZARD_EXAMPLES } from "@/lib/wizard/examples";
import { getCardBySlug } from "@/lib/mock/api";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";

/**
 * S6 — the Readiness Card.
 *
 * Renders the v2 card. The two downstream vendor actions still take a v1 card
 * (they drive hospital-side flows that read the legacy shape), so the legacy
 * card is fetched alongside purely to feed them. That is the adapter boundary
 * made visible: new surface reads v2, old surface reads v1, and neither pokes
 * at the other's shape.
 */
export default function CardPage() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const router = useRouter();

  const [view, setView] = useState<CardV2View | null>(null);
  const [legacyCard, setLegacyCard] = useState<ToolReadinessCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [v, legacy] = await Promise.all([getCardV2(slug), getCardBySlug(slug)]);
      if (!live) return;
      if (v && slug !== v.tool.slug) router.replace(`/submit/${v.tool.slug}/card`);
      setView(v ?? null);
      setLegacyCard(legacy ?? null);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [slug, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">Card not found</p>
        <p className="mt-2 text-sm text-muted">
          This readiness card doesn’t exist — it may have been reset.
        </p>
        <Link href="/submit" className="mt-4 inline-block text-sm text-teal-deep">
          Start a new assessment →
        </Link>
      </div>
    );
  }

  /**
   * The example buttons on /submit now land HERE, because "one click to a
   * finished card" was the first claim a visitor met and it was false — the
   * buttons dropped you at step 1 of the wizard. The promise was the better
   * behaviour, so the behaviour moved. This is the way back for anyone who
   * wants to see how the card was built.
   */
  const isExample = WIZARD_EXAMPLES.some((e) => e.slug === slug);

  return (
    <div className="mx-auto max-w-3xl">
      {isExample && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-bg-card px-5 py-4">
          <p className="text-sm leading-relaxed text-ink-2">
            This is a worked example. Open it in the wizard to see the context and evidence it was
            built from, and change anything you like.
          </p>
          <Link
            href={`/submit?example=${slug}`}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-line px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink"
          >
            Open in the wizard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <ReadinessCardV2
        card={view.card}
        tool={view.tool}
        evidence={view.evidence}
        contextIsReal={view.contextIsReal}
      />

      {/* Two distinct vendor actions — do either or both */}
      <div className="mt-10 space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Next steps — two options
        </p>
      </div>
      <SiteMatches card={view.card} toolName={view.tool.name} slug={view.tool.slug} />
      {legacyCard && <RegistryListing tool={view.tool} card={legacyCard} />}
    </div>
  );
}
