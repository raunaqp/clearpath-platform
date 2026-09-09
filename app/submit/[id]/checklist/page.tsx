"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCardV2 } from "@/lib/mock/api";
import type { CardV2View } from "@/lib/mock/cards-v2";
import { IntakeChecklistView } from "@/components/submit/IntakeChecklistView";

/**
 * S2 as a standalone route, for a submission that already exists.
 *
 * The same component renders inside the wizard against the draft. Here it reads
 * the registered submission, so a vendor can come back to the checklist after
 * the card is issued and see what the assessment was and was not given.
 */
export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<CardV2View | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const v = await getCardV2(id);
      if (!live) return;
      setView(v ?? null);
      setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

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
        <p className="font-serif text-xl text-ink">Submission not found</p>
        <Link href="/submit" className="mt-4 inline-block text-sm text-teal-deep">
          Start a new assessment →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/submit/${id}/card`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Readiness card
      </Link>
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Intake checklist
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{view.tool.name}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          What a submission of this kind, in this context, is expected to bring. Generated from the
          tool category and the declared context — so a lab-adjacent tool is asked for NABL and one
          that is not, is not.
        </p>
      </header>
      <IntakeChecklistView
        category={view.tool.category}
        context={view.card.context}
        attached={view.evidence}
      />
    </div>
  );
}
