"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Tool } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import { getToolBySlug, getReadinessCardByTool, getDocumentsByIds } from "@/lib/mock/api";
import { ReadinessCard } from "@/components/card/ReadinessCard";

/** Registry detail — the full card for a tool (opened from "View details"). */
export default function RegistryDetail() {
  const { toolId } = useParams<{ toolId: string }>();
  const router = useRouter();
  const [tool, setTool] = useState<Tool | null>(null);
  const [card, setCard] = useState<ToolReadinessCard | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const t = await getToolBySlug(toolId);
      const c = t ? await getReadinessCardByTool(t.id) : undefined;
      const d = c ? await getDocumentsByIds(c.docIds) : [];
      if (!live) return;
      if (t && toolId !== t.slug) router.replace(`/registry/${t.slug}`);
      setTool(t ?? null); setCard(c ?? null); setDocs(d); setLoading(false);
    })();
    return () => { live = false; };
  }, [toolId]);

  if (loading) return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  if (!tool || !card) {
    return <div className="mx-auto max-w-lg py-16 text-center"><p className="font-serif text-xl text-ink">Not found</p><Link href="/registry" className="mt-3 inline-block text-sm text-teal-deep">← Registry</Link></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/registry" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep"><ArrowLeft className="h-4 w-4" /> Registry</Link>
        <Link href={`/workspace/${tool.slug}`} className="inline-flex items-center gap-1 text-sm text-teal-deep">Track deployment status <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <ReadinessCard card={card} tool={tool} docs={docs} />
    </div>
  );
}
