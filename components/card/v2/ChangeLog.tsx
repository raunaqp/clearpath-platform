import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import { versionLabel } from "@/lib/schemas/readiness-card";
import { formatCardDateShort } from "@/lib/ui";

/**
 * The card's version history, newest first.
 *
 * `changeLog` holds TRANSITIONS — one entry per reissue — so a v1.0 card has an
 * empty one. The v1.0 row below is rendered from `firstIssuedAt` rather than
 * stored, which keeps `changeLog.length === version - 1` true at every version
 * and means the initial issue can never be edited out of the history.
 */
export function ChangeLog({ card }: { card: ReadinessCard }) {
  const rows = [
    ...[...card.changeLog].reverse().map((e) => ({
      key: `v${e.version}`,
      label: versionLabel(e.version),
      at: e.at,
      summary: e.summary,
    })),
    {
      key: "v1",
      label: versionLabel(1),
      at: card.firstIssuedAt,
      summary: "Initial assessment.",
    },
  ];

  return (
    <section className="rounded-xl border border-[#D9D5C8] bg-white px-5 py-5">
      <h2 className="mb-3 border-b border-[#D9D5C8] pb-1.5 font-serif text-xl text-[#0E1411]">
        Changelog
      </h2>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
            <div className="flex shrink-0 gap-3 sm:w-48">
              <span className="font-mono text-[13px] text-[#0F6E56]">{r.label}</span>
              <span className="font-mono text-[13px] text-[#6B766F]">
                {formatCardDateShort(r.at)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#0E1411]">{r.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
