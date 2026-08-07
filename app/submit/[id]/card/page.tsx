"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { Tool } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import {
  getCardBySlug,
  getTool,
  getDocumentsByIds,
} from "@/lib/mock/api";
import { ReadinessCard } from "@/components/card/ReadinessCard";
import { ApplicableHospitals } from "@/components/card/ApplicableHospitals";
import { RegistryListing } from "@/components/card/RegistryListing";
import { AddSupportingDocument } from "@/components/card/AddSupportingDocument";

export default function CardPage() {
  const params = useParams<{ id: string }>();
  const cardId = params.id;
  const router = useRouter();

  const [card, setCard] = useState<ToolReadinessCard | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const c = await getCardBySlug(cardId);
      if (!c) {
        if (live) setLoading(false);
        return;
      }
      const [t, d] = await Promise.all([
        getTool(c.toolId),
        getDocumentsByIds(c.docIds),
      ]);
      if (!live) return;
      if (t && cardId !== t.slug) router.replace(`/submit/${t.slug}/card`);
      setCard(c);
      setTool(t ?? null);
      setDocs(d);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [cardId]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  if (!card || !tool) {
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

  return (
    <div className="mx-auto max-w-3xl">
      <ReadinessCard card={card} tool={tool} docs={docs} />

      {/* Vendor · add one more supporting document (appears in evidence above) */}
      <AddSupportingDocument
        tool={tool}
        card={card}
        onAdded={(doc) => setDocs((d) => [...d, doc])}
      />

      {/* Two distinct vendor actions — do either or both */}
      <div className="mt-10 space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Next steps — two options
        </p>
      </div>
      <ApplicableHospitals tool={tool} card={card} />
      <RegistryListing tool={tool} card={card} />
    </div>
  );
}
