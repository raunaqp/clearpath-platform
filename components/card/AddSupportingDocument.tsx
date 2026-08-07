"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import type { Tool } from "@/lib/schemas/tool";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { Document } from "@/lib/schemas/document";
import { addSupportingDocument } from "@/lib/mock/api";
import {
  DEMO_SUPPORTING_DOCS,
  SUPPORTING_DOC_TYPES,
  SUPPORTING_TYPE_TO_KIND,
  type SupportingDocType,
} from "@/lib/mock/fixtures/supporting-docs";
import { cn } from "@/lib/utils";

/**
 * Vendor · add a supporting document (BUILD_SPEC — change 4). No real upload:
 * pick ONE document from the demo list and assign a type. It's added to the
 * tool's attached evidence (the card's evidence list re-renders via `onAdded`).
 */
export function AddSupportingDocument({
  tool,
  card,
  onAdded,
}: {
  tool: Tool;
  card: ToolReadinessCard;
  onAdded: (doc: Document) => void;
}) {
  const [open, setOpen] = useState(false);
  const [docId, setDocId] = useState(DEMO_SUPPORTING_DOCS[0].id);
  const [type, setType] = useState<SupportingDocType>("validation");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  async function add() {
    const demo = DEMO_SUPPORTING_DOCS.find((d) => d.id === docId);
    if (!demo) return;
    setBusy(true);
    const doc = await addSupportingDocument({
      toolId: tool.id,
      cardId: card.id,
      name: demo.label,
      kind: SUPPORTING_TYPE_TO_KIND[type],
      path: demo.path,
    });
    onAdded(doc);
    setBusy(false);
    setAdded(true);
    setOpen(false);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-ink">Add a supporting document</h2>
          <p className="mt-1 text-sm text-muted">
            Attach one more piece of evidence from the demo set and give it a type.
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {added ? "Added to evidence" : "Add supporting document"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Document</span>
            <select
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {DEMO_SUPPORTING_DOCS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SupportingDocType)}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {SUPPORTING_DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              onClick={add}
              disabled={busy}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              )}
            >
              {busy ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-line px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
