"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Document } from "@/lib/schemas/document";
import { DOC_KIND_LABEL } from "@/lib/ui";

/**
 * Document viewer (BUILD_SPEC §4, §5) — a right-side drawer that renders the
 * PDF via <iframe> (or an image inline), with title, type, and a close control.
 * View-only, no upload. Shared by Journey A (attached evidence) and Journey B.
 */
export function DocViewer({
  doc,
  onClose,
}: {
  doc: Document | null;
  onClose: () => void;
}) {
  // Close on Escape.
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={doc.name}>
      <button
        aria-label="Close document viewer"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[1px]"
      />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-line bg-bg-card shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-serif text-lg text-ink">{doc.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {DOC_KIND_LABEL[doc.kind]} · {doc.type.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-2 transition-colors hover:bg-bg-sink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-hidden bg-bg-sink">
          {!doc.path ? (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
              This document was not provided.
            </div>
          ) : doc.type === "pdf" ? (
            <iframe title={doc.name} src={doc.path} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.path} alt={doc.name} className="max-h-full max-w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
