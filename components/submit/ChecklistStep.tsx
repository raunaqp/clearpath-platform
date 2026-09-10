"use client";

import { useRef } from "react";
import { Check, Paperclip, Trash2, MinusCircle } from "lucide-react";
import type { EvidenceType } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type { ToolCategory } from "@/lib/schemas/tool";
import type { ChecklistLine } from "@/lib/engine/intake-checklist";
import { buildIntakeChecklist } from "@/lib/engine/intake-checklist";
import { cn } from "@/lib/utils";

/**
 * S2 — the intake checklist, as a REAL STEP.
 *
 * It used to be a collapsed panel on top of the Evidence screen, which meant
 * the flow ran 1 → 3 and a vendor met the list of expected documents at the
 * same moment as the upload control. Seeing what a submission of this kind is
 * expected to bring, BEFORE attaching anything, is the reason the list is
 * generated from context in the first place.
 *
 * Completion is counted against LINES COVERED and never against a score. A
 * vendor can cover every line here and still fail every gate; a checklist that
 * hinted at quality would make "complete" read as "good". So there is no
 * percentage, no colour scale, no progress bar filling toward an implied pass.
 *
 * Lines that are not required for THIS submission stay visible and are marked
 * as not required rather than disappearing — a checklist that silently drops
 * lines looks shorter than the standard actually is.
 *
 * THREE STATES PER ROW, and the middle one is the point:
 *
 *   attached     one or more documents on the line. Covered.
 *   marked N/A   ticked with nothing attached. This is a CLAIM that the line
 *                does not apply, and the row says so in those words. A tick
 *                that looked identical to an attachment would let a submission
 *                appear complete on the strength of seventeen assertions.
 *   open         neither. Nothing is claimed either way.
 */

export type LineDoc = { id: string; name: string; lineId: string | null };

export function ChecklistStep({
  category,
  context,
  docs,
  notApplicable,
  onToggleNotApplicable,
  onAttach,
  onRemove,
}: {
  category: ToolCategory;
  context: SubmissionContext;
  /** Every attached document, each carrying the line it was attached against. */
  docs: LineDoc[];
  /** Line ids the vendor has ticked as not applying. */
  notApplicable: string[];
  onToggleNotApplicable: (lineId: string) => void;
  onAttach: (line: ChecklistLine, files: FileList | null) => void;
  onRemove: (docId: string) => void;
}) {
  const groups = buildIntakeChecklist({ category, context });
  const lines = groups.flatMap((g) => g.lines);
  const required = lines.filter((l) => l.required);
  const docsFor = (lineId: string) => docs.filter((d) => d.lineId === lineId);
  const covered = required.filter((l) => docsFor(l.id).length > 0).length;
  const declaredNa = required.filter(
    (l) => docsFor(l.id).length === 0 && notApplicable.includes(l.id)
  ).length;

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-bg-card px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">
          Checklist coverage
        </p>
        <p className="mt-1 font-serif text-lg text-ink">
          {covered} of {required.length} required lines have a document
        </p>
        {declaredNa > 0 && (
          <p className="mt-1 text-sm text-[#BA7517]">
            {declaredNa} more {declaredNa === 1 ? "is" : "are"} marked as not applying — that is a
            claim you are making, not a document on file.
          </p>
        )}
        <p className="mt-1 text-xs leading-relaxed text-muted">
          This counts documents against lines. It is not a score, and covering every line here says
          nothing about whether any gate passes — that is assessed separately, against the evidence
          itself.
        </p>
      </div>

      {groups.map((g) => (
        <section key={g.id} className="rounded-card border border-line bg-bg-card">
          <div className="border-b border-line-soft px-4 py-3">
            <h3 className="font-serif text-lg text-ink">{g.title}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{g.purpose}</p>
          </div>
          <ul className="divide-y divide-line-soft">
            {g.lines.map((line) => (
              <Row
                key={line.id}
                line={line}
                docs={docsFor(line.id)}
                na={notApplicable.includes(line.id)}
                onToggleNotApplicable={onToggleNotApplicable}
                onAttach={onAttach}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({
  line,
  docs,
  na,
  onToggleNotApplicable,
  onAttach,
  onRemove,
}: {
  line: ChecklistLine;
  docs: LineDoc[];
  na: boolean;
  onToggleNotApplicable: (lineId: string) => void;
  onAttach: (line: ChecklistLine, files: FileList | null) => void;
  onRemove: (docId: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const attached = docs.length > 0;
  // A tick with nothing attached never renders as "done". It renders as the
  // claim it is.
  const state: "attached" | "na" | "open" = attached ? "attached" : na ? "na" : "open";

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
            state === "attached" && "border-teal-deep bg-teal-light text-teal-deep",
            state === "na" && "border-[#BA7517] text-[#BA7517]",
            state === "open" && "border-line"
          )}
          aria-hidden
        >
          {state === "attached" && <Check className="h-3 w-3" />}
          {state === "na" && <MinusCircle className="h-3 w-3" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
            {line.label}
            {!line.required && (
              <span className="rounded-pill bg-bg-sink px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                Not required here
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{line.detail}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            accepts {line.accepts.map((a: EvidenceType) => a.toLowerCase().replace(/_/g, " ")).join(", ")}
          </p>

          {state === "na" && (
            <p className="mt-2 rounded-md bg-[#FAEEDA] px-2.5 py-1.5 text-xs leading-relaxed text-[#BA7517]">
              Marked as not applying to this submission. Nothing is attached — this is a claim you
              are making, and an assessor will see it as one.
            </p>
          )}

          {docs.length > 0 && (
            <ul className="mt-2 space-y-1">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-md bg-bg-sink px-2.5 py-1.5">
                  <span className="min-w-0 truncate text-xs text-ink">{d.name || "Untitled document"}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(d.id)}
                    aria-label={`Remove ${d.name}`}
                    className="shrink-0 rounded-md border border-line p-1 text-ink-2 transition-colors hover:bg-bg-card"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors",
              attached
                ? "border-line text-ink-2 hover:bg-bg-sink"
                : "border-teal-deep/40 bg-teal-light/30 text-teal-deep hover:bg-teal-light/60"
            )}
          >
            <Paperclip className="h-3 w-3" />
            {attached ? "Attach another" : "Attach"}
          </button>
          <button
            type="button"
            onClick={() => onToggleNotApplicable(line.id)}
            disabled={attached}
            className={cn(
              "whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40",
              na ? "border-[#BA7517] bg-[#FAEEDA] text-[#BA7517]" : "border-line text-ink-2 hover:bg-bg-sink"
            )}
          >
            {na ? "Applies after all" : "Doesn't apply"}
          </button>
          <input
            ref={ref}
            type="file"
            multiple
            className="hidden"
            aria-label={`Attach a document for ${line.label}`}
            onChange={(e) => {
              onAttach(line, e.target.files);
              if (ref.current) ref.current.value = "";
            }}
          />
        </div>
      </div>
    </li>
  );
}
