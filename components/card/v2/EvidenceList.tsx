import type { Evidence } from "@/lib/schemas/evidence";
import { getItem } from "@/lib/engine/item-bank";

/**
 * Evidence on file, with what it is bound to.
 *
 * The binding is shown because it is the thing that makes a document count.
 * Evidence with no itemRefs scores nothing — a pile of attached PDFs cannot
 * raise a verdict — and showing which item each document answers is what stops
 * "five documents attached" reading as five answers.
 *
 * Generalisability flags are shown inline rather than in a footnote. A study
 * that does not transfer to this context is still accepted; it is flagged, and
 * a reader who cannot see the flag beside the document has effectively been
 * handed the study without it.
 */
export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return <p className="text-sm text-[#6B766F]">No documents on file.</p>;
  }

  return (
    <ul className="divide-y divide-[#E8E4D6]">
      {evidence.map((e) => {
        const bound = e.itemRefs
          .map((ref) => getItem(ref)?.legacyGateId ?? ref)
          .join(", ");
        return (
          <li key={e.id} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[15px] text-[#0E1411]">{e.name}</p>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#6B766F]">
                {e.type.toLowerCase().replace(/_/g, " ")} · {e.independence.toLowerCase().replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-[#6B766F]">Answers {bound}</p>
            {e.generalisability.limited && e.generalisability.reason && (
              <p className="mt-1.5 rounded-md bg-[#FAEEDA] px-2.5 py-1.5 text-xs leading-relaxed text-[#BA7517]">
                {e.generalisability.reason}
              </p>
            )}
            {e.expired && (
              <p className="mt-1.5 rounded-md bg-[#FAECE7] px-2.5 py-1.5 text-xs leading-relaxed text-[#993C1D]">
                Past its stated validity date.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
