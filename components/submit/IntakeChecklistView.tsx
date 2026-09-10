import type { EvidenceType } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import type { ToolCategory } from "@/lib/schemas/tool";
import type { ChecklistLine } from "@/lib/engine/intake-checklist";
import { buildIntakeChecklist, computeCoverage } from "@/lib/engine/intake-checklist";
import { Check, Paperclip } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * S2 — the intake checklist.
 *
 * Completion is counted against LINES COVERED and never against a score. The
 * distinction is the whole point of the screen: a vendor can cover every line
 * here and still fail every gate, and a checklist that hinted at quality would
 * make "complete" read as "good". So there is no percentage, no colour scale,
 * no progress bar that fills toward an implied pass.
 *
 * Lines that are not required for THIS submission stay visible and are marked
 * as not required, rather than disappearing. A vendor should be able to see
 * what was considered and set aside — a checklist that silently drops lines
 * looks shorter than the standard actually is.
 */
export function IntakeChecklistView({
  category,
  context,
  attached,
  compact,
  onAttach,
}: {
  category: ToolCategory;
  context: SubmissionContext;
  attached: { type: EvidenceType }[];
  compact?: boolean;
  /**
   * Given, each line gets its own attach control. A file arriving this way
   * already knows which line it answers and what type that line accepts,
   * which one generic picker at the bottom of the screen could never tell.
   */
  onAttach?: (line: ChecklistLine, files: FileList | null) => void;
}) {
  const groups = buildIntakeChecklist({ category, context });
  const coverage = computeCoverage(groups, attached);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-bg-card px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">
          Checklist coverage
        </p>
        <p className="mt-1 font-serif text-lg text-ink">
          {coverage.requiredCovered} of {coverage.requiredTotal} required lines have a document
        </p>
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
            {g.lines.map((line) => {
              const covered = coverage.covered.has(line.id);
              return (
                <li key={line.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      covered ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line"
                    )}
                    aria-hidden
                  >
                    {covered && <Check className="h-3 w-3" />}
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
                    {!compact && (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{line.detail}</p>
                    )}
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                      accepts {line.accepts.map((a) => a.toLowerCase().replace(/_/g, " ")).join(", ")}
                    </p>
                  </div>
                  {onAttach && <LineAttach line={line} covered={covered} onAttach={onAttach} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The per-row attach control. One hidden input per line, so the file that
 *  arrives is typed to the line it was attached against. */
function LineAttach({
  line,
  covered,
  onAttach,
}: {
  line: ChecklistLine;
  covered: boolean;
  onAttach: (line: ChecklistLine, files: FileList | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
          covered
            ? "border-line text-ink-2 hover:bg-bg-sink"
            : "border-teal-deep/40 bg-teal-light/30 text-teal-deep hover:bg-teal-light/60"
        )}
      >
        <Paperclip className="h-3 w-3" />
        {covered ? "Attach another" : "Attach"}
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
  );
}
