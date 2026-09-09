"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { ReadinessCardV2 } from "@/components/card/v2/ReadinessCardV2";
import { ListingPanel } from "@/components/registry/ListingPanel";
import { getListing } from "@/lib/mock/api-registry";
import type { Listing } from "@/lib/engine/listing";

/** Registry detail — the full card for a tool (opened from "View details"). */
export default function RegistryDetail() {
  const { toolId } = useParams<{ toolId: string }>();
  const router = useRouter();
  const [view, setView] = useState<CardV2View | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [v, l] = await Promise.all([getCardV2(toolId), getListing(toolId)]);
      if (!live) return;
      setListing(l ?? null);
      if (v && toolId !== v.tool.slug) router.replace(`/registry/${v.tool.slug}`);
      setView(v ?? null); setLoading(false);
    })();
    return () => { live = false; };
  }, [toolId, router]);

  if (loading) return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  if (!view) {
    return <div className="mx-auto max-w-lg py-16 text-center"><p className="font-serif text-xl text-ink">Not found</p><Link href="/registry" className="mt-3 inline-block text-sm text-teal-deep">← Registry</Link></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/registry" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep"><ArrowLeft className="h-4 w-4" /> Registry</Link>
        <Link href={`/workspace/${view.tool.slug}`} className="inline-flex items-center gap-1 text-sm text-teal-deep">Track deployment status <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      {listing && <ListingPanel listing={listing} />}
      {/*
        The SAME card the innovator sees. A hospital opening this route used to
        get the v1 card — a 94/100 disc and percentage dimensions — while the
        vendor saw the v2 one. Two cards for one submission is invisible in a
        linear walkthrough and obvious to anyone who clicks around.

        Read-only: no remediation link, and no discrepancy count, because a
        hospital reading a listing has no declaration step behind it here.
      */}
      <ReadinessCardV2
        card={view.card}
        tool={view.tool}
        evidence={view.evidence}
        contextIsReal={view.contextIsReal}
        showRemediationLink={false}
      />
    </div>
  );
}
