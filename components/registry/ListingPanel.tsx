import type { Listing } from "@/lib/engine/listing";
import { BLOCKING_SCOPE_LABEL, formatCardDate } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * S8 — the registry listing.
 *
 * The wording carries the whole idea. "Listed" is an EVENT that happened to
 * this tool; "Assessed" is what the tool still IS. Publishing a listing does
 * not move a tool along its journey, and "Published" is reserved for the
 * outcome write-back when a hospital has actually run it. Showing them as two
 * separate rows, with the tool state marked unchanged, is what stops a reader
 * taking a listing for a result.
 *
 * The conditions and the limitations are here because a listing is the whole
 * verdict or nothing. A vendor cannot publish "CONDITIONALLY DEPLOYABLE" and
 * leave out what the conditions are.
 */
export function ListingPanel({ listing }: { listing: Listing }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">
            Registry listing
          </p>
          <p className="mt-1 text-sm text-ink">
            <span className="rounded-pill bg-teal-light px-2 py-0.5 font-medium text-teal-deep">
              Listed
            </span>{" "}
            · Card {listing.cardVersion} · no hospital outcome yet
          </p>
          <p className="mt-1 text-xs text-muted">Listed {formatCardDate(listing.listedAt)}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Tool state</p>
          <p className="font-serif text-lg text-ink">{listing.toolState}</p>
          <p className="text-xs text-muted">unchanged</p>
        </div>
      </div>

      <dl className="divide-y divide-line-soft">
        <Row label="Capability">{listing.capability}</Row>
        <Row label="Requirements">{listing.requirements.join(" · ")}</Row>

        <div className="px-5 py-3.5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Conditions shown
          </dt>
          <dd className="mt-1.5">
            {listing.conditionsShown.length === 0 ? (
              <p className="text-sm text-ink">No open conditions.</p>
            ) : (
              <ul className="space-y-1.5">
                {listing.conditionsShown.map((c) => (
                  <li key={c.itemId} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    <span className="font-mono text-xs text-muted">{c.gateId}</span>
                    <span>{c.label}</span>
                    <span
                      className={cn(
                        "rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        c.blocks === "TRIAL"
                          ? "bg-[#FAECE7] text-[#993C1D]"
                          : "bg-[#FAEEDA] text-[#BA7517]"
                      )}
                    >
                      {c.status} · blocks {BLOCKING_SCOPE_LABEL[c.blocks].toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>

        <Row label="Commercials">
          {listing.commercials.model} · {listing.commercials.consumables}
        </Row>
        <Row label="Support model">
          {listing.supportModel.field} · {listing.supportModel.replacement}
        </Row>
      </dl>

      <p className="border-t border-line-soft bg-bg-sink/50 px-5 py-3 text-xs leading-relaxed text-muted">
        Requirements, commercials and support are supplied by the vendor and were not assessed. The
        verdict, conditions and limitations below were.
      </p>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
