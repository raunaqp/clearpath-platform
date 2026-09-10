import type { CardCondition } from "@/lib/schemas/readiness-card";
import { getItem } from "@/lib/engine/item-bank";
import { BLOCKING_SCOPE_LABEL, BLOCKING_SCOPE_STYLE } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Conditions as a three-column block, not a bullet list.
 *
 * A bullet list of conditions reads as a to-do list of equal items. The middle
 * column is what stops that: a reader scanning for "can we start?" needs to see
 * that one of these blocks a trial outright and the other is the thing a trial
 * would resolve. Those two facts do not survive being flattened into prose.
 *
 * Trial-blocking rows sort first — the ordering is the answer to "what do I do
 * about this first?".
 */
export function ConditionsTable({ conditions }: { conditions: CardCondition[] }) {
  if (conditions.length === 0) {
    return (
      <p className="text-sm text-[#6B766F]">
        No open conditions, based on the evidence submitted for the 17 gates screened.
      </p>
    );
  }

  const ordered = [...conditions].sort((a, b) =>
    a.blocks === b.blocks ? 0 : a.blocks === "TRIAL" ? -1 : 1
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#D9D5C8]">
            {["Condition", "Blocks", "What clears it"].map((h) => (
              <th
                key={h}
                className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[#6B766F]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E4D6]">
          {ordered.map((c) => {
            const item = getItem(c.itemId);
            const label = item?.legacyGateId ?? c.itemId;
            return (
              <tr key={c.itemId} className="align-top">
                <td className="w-[38%] py-3 pr-4">
                  <p className="text-[15px] font-semibold leading-snug text-[#0E1411]">
                    <span className="font-mono text-xs text-[#6B766F]">{label}</span>{" "}
                    <span className="font-mono text-xs text-[#6B766F]">· {c.itemId}</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#6B766F]">
                    {item?.text ?? "Item pending definition"}
                  </p>
                </td>
                <td className="w-[22%] py-3 pr-4">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                      BLOCKING_SCOPE_STYLE[c.blocks]
                    )}
                  >
                    {BLOCKING_SCOPE_LABEL[c.blocks]}
                  </span>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#6B766F]">
                    {c.blocks === "TRIAL"
                      ? "A trial cannot establish this."
                      : "A supervised trial is a route through this."}
                  </p>
                </td>
                <td className="w-[40%] py-3 text-sm leading-relaxed text-[#0E1411]">{c.fix}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
