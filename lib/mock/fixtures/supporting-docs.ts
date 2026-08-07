import type { DocKind } from "@/lib/schemas/document";

/**
 * Add-supporting-document flow (BUILD_SPEC — vendor evidence). No real upload:
 * the vendor picks ONE document from this demo list and assigns a type. Each
 * option reuses a standard sample PDF so it opens in the DocViewer.
 */
export type SupportingDocType =
  | "validation"
  | "regulatory"
  | "privacy"
  | "clinical"
  | "other";

export const SUPPORTING_DOC_TYPES: { value: SupportingDocType; label: string }[] = [
  { value: "validation", label: "Validation" },
  { value: "regulatory", label: "Regulatory" },
  { value: "privacy", label: "Privacy" },
  { value: "clinical", label: "Clinical" },
  { value: "other", label: "Other" },
];

/** Map the vendor-chosen type onto the internal DocKind used by the chip/viewer. */
export const SUPPORTING_TYPE_TO_KIND: Record<SupportingDocType, DocKind> = {
  validation: "validation",
  regulatory: "cdsco",
  privacy: "dpdp",
  clinical: "eval",
  other: "manual",
};

export type DemoSupportingDoc = { id: string; label: string; path: string };

export const DEMO_SUPPORTING_DOCS: DemoSupportingDoc[] = [
  { id: "supp-validation", label: "External validation study (sample)", path: "/sample-docs/chestxr-validation-study.pdf" },
  { id: "supp-regulatory", label: "Regulatory licence (sample)", path: "/sample-docs/chestxr-cdsco-licence.pdf" },
  { id: "supp-privacy", label: "Privacy policy (sample)", path: "/sample-docs/chestxr-dpdp-policy.pdf" },
  { id: "supp-clinical", label: "Clinical evaluation (sample)", path: "/sample-docs/chestxr-clinical-eval-report.pdf" },
];
