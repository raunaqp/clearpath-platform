import { z } from "zod";

/**
 * Document — a piece of attached evidence (BUILD_SPEC §5), now per-tool with a
 * status so the doc list visibly explains the verdict:
 *   - present → on file, opens in the viewer
 *   - flagged → on file and openable, but with a caveat that drives a firm-up
 *     (e.g. CerviAI's single-centre, non-Indian validation → G1)
 *   - missing → not provided; shown as a gap, not openable (e.g. SymptomBot's
 *     absent independent validation → G1 fails)
 *
 * Light mode: no upload. `path` points at a static asset under
 * /public/sample-docs/ and is absent for missing docs.
 */
export const DocKindEnum = z.enum([
  "validation", // validation / clinical study
  "cdsco", // CDSCO certificate / licence
  "dpdp", // DPDP privacy policy
  "eval", // clinical evaluation report
  "manual", // user manual
  "ethics", // ethics / consent approval
]);
export type DocKind = z.infer<typeof DocKindEnum>;

export const DocStatusEnum = z.enum(["present", "flagged", "missing"]);
export type DocStatus = z.infer<typeof DocStatusEnum>;

export const DocumentSchema = z.object({
  id: z.string(),
  toolId: z.string(),
  name: z.string(),
  type: z.enum(["pdf", "image"]),
  kind: DocKindEnum,
  status: DocStatusEnum,
  /** Present/flagged docs point at a static asset; missing docs have none. */
  path: z.string().optional(),
  /** Why a doc is flagged or missing — surfaced on the card. */
  statusNote: z.string().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;
