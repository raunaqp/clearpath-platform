import type { ReadinessCard } from "@/lib/schemas/readiness-card";

/**
 * What this assessment could not establish.
 *
 * NEVER COLLAPSIBLE, never behind a toggle, never below a fold that a reader
 * can skip. This is the honest counterweight to a verdict, and a verdict that
 * can be read without its limitations is a verdict that will be. A disclosure
 * triangle is a way of shipping a caveat while ensuring nobody reads it.
 *
 * Rendered plainly, as a list, in the same weight as everything else on the
 * card.
 */
export function Limitations({ card }: { card: ReadinessCard }) {
  return (
    <section className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-4">
      <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
        What this assessment could not establish
      </h2>
      {card.couldNotEstablish.length === 0 ? (
        <p className="text-sm leading-relaxed text-[#6B766F]">
          Every item screened was established either way. That covers the 17 gates only — see the
          scope note above for what the demo does not reach.
        </p>
      ) : (
        <>
        <p className="mb-3 text-sm leading-relaxed text-[#6B766F]">
          No evidence in this submission establishes these either way. The card is silent on them.
        </p>
        <ul className="space-y-2.5">
          {card.couldNotEstablish.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-[#0E1411]">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#6B766F]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        </>
      )}
    </section>
  );
}
