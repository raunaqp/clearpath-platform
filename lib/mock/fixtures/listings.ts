import type { ListingInput } from "@/lib/engine/listing";

/**
 * Commercial and operational terms a vendor supplies when they list.
 *
 * These are NOT assessment output and are deliberately kept apart from the
 * card: nothing here was checked by anyone. They are what the vendor says it
 * costs and what support they say they provide, and the listing presents them
 * as such, beside a card that was assessed.
 */
export type ListingTerms = Pick<
  ListingInput,
  "requirements" | "commercials" | "supportModel"
> & { listedAt: string };

export const LISTING_TERMS: Record<string, ListingTerms> = {
  cerviai: {
    listedAt: "2026-09-23T00:00:00.000Z",
    requirements: [
      "4 tablets",
      "Offline capture",
      "8h power",
      "Colposcopy referral pathway",
    ],
    commercials: {
      model: "Per-site licence",
      consumables: "Consumables included",
    },
    supportModel: {
      field: "Field support with taper",
      replacement: "72h device replacement",
    },
  },
  retinascan: {
    listedAt: "2026-09-23T00:00:00.000Z",
    requirements: ["Fundus camera", "2 tablets", "Ophthalmology referral pathway"],
    commercials: { model: "Per-scan pricing", consumables: "Consumables billed separately" },
    supportModel: { field: "Remote support", replacement: "5-day device replacement" },
  },
};

export function getListingTerms(slug: string): ListingTerms | undefined {
  return LISTING_TERMS[slug];
}
