import type { RegistryEntry } from "@/lib/schemas/deployment";

/**
 * Seed registry (BUILD_SPEC §6, §8) — the marketplace record per tool. ChestXR
 * is already deployed with a published result so /registry isn't empty; the
 * others sit at "assessed" or "piloting". Publishing a deployment in Journey C
 * updates the matching entry (status → deployed, publishedResult filled).
 */
export const REGISTRY: RegistryEntry[] = [
  {
    toolId: "tool-chestxr",
    verdict: "DEPLOY",
    status: "deployed",
    deployedAt: "2026-06-18T00:00:00.000Z",
    publishedResult: {
      hospitalId: "hosp-northvale",
      recommendation: "SCALE",
      headline:
        "Met clinical and referral targets over a 90-day pilot at Northvale IMS; recommended to scale.",
    },
  },
  {
    toolId: "tool-cerviai",
    verdict: "CONDITIONS",
    status: "piloting",
    deployedAt: null,
    publishedResult: null,
  },
  {
    toolId: "tool-retinascan",
    verdict: "CONDITIONS",
    status: "assessed",
    deployedAt: null,
    publishedResult: null,
  },
  {
    toolId: "tool-symptombot",
    verdict: "NOTYET",
    status: "assessed",
    deployedAt: null,
    publishedResult: null,
  },
];
