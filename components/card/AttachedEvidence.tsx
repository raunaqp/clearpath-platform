"use client";

import { useState } from "react";
import { FileText, Eye, AlertTriangle, Ban } from "lucide-react";
import type { Document } from "@/lib/schemas/document";
import { DOC_KIND_LABEL, DOC_STATUS_STYLE } from "@/lib/ui";
import { DocViewer } from "@/components/DocViewer";
import { cn } from "@/lib/utils";

/**
 * Attached evidence (BUILD_SPEC §3, §5) — the tool's documents with per-doc
 * status. Present/flagged docs open in the shared DocViewer; missing docs are
 * shown as gaps (not openable). Flagged/missing notes explain the verdict.
 */
export function AttachedEvidence({ docs }: { docs: Document[] }) {
  const [open, setOpen] = useState<Document | null>(null);

  if (docs.length === 0) {
    return <p className="text-sm text-muted">No documents attached.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
        {docs.map((doc) => {
          // Guard: a doc persisted under an older schema (stale localStorage)
          // can arrive with an undefined/unknown status — fall back to a
          // neutral style rather than throw.
          const s = DOC_STATUS_STYLE[doc.status] ?? DOC_STATUS_STYLE.present;
          const openable = doc.status !== "missing" && !!doc.path;
          return (
            <li key={doc.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                {doc.status === "missing" ? (
                  <Ban className="mt-0.5 h-4 w-4 shrink-0 text-coral-brand" />
                ) : doc.status === "flagged" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-brand" />
                ) : (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm", doc.status === "missing" ? "text-muted" : "text-ink")}>
                      {doc.name}
                    </p>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs", s.tint)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{DOC_KIND_LABEL[doc.kind]}</p>
                  {doc.statusNote && (
                    <p className="mt-1 text-xs text-ink-2">{doc.statusNote}</p>
                  )}
                </div>
              </div>
              {openable ? (
                <button
                  onClick={() => setOpen(doc)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors hover:bg-bg-sink"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
              ) : (
                <span className="shrink-0 text-xs text-muted">Not provided</span>
              )}
            </li>
          );
        })}
      </ul>
      <DocViewer doc={open} onClose={() => setOpen(null)} />
    </>
  );
}
