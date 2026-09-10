import { z } from "zod";

/**
 * Evidence — a document BOUND TO SPECIFIC ITEMS.
 *
 * The binding is the whole point. `itemRefs` has a minimum of 1 because
 * unbound evidence does not count, ever: a vendor cannot raise a score by
 * attaching a pile of PDFs to the submission at large. A document scores the
 * items it is pointed at and nothing else.
 *
 * Evidence is never silently discounted. Where it does not match the
 * submission context it is FLAGGED (`generalisability.limited`) with a reason
 * naming the mismatch, and an assessor decides what that is worth. Discounting
 * it invisibly would hide the judgement inside the arithmetic.
 */

export const EvidenceTypeEnum = z.enum([
  "STUDY",
  "REGULATORY",
  "AUDIT",
  "FIELD_LOG",
  "VALIDATION_STUDY",
  "INTEGRATION_SPEC",
  "CONSENT_ARTEFACT",
  "SLA",
  "TRAINING_CURRICULUM",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeEnum>;

/** Who produced it. Vendor-generated evidence is admissible but weaker. */
export const IndependenceEnum = z.enum([
  "VENDOR_GENERATED",
  "PARTNER_GENERATED",
  "INDEPENDENT",
]);
export type Independence = z.infer<typeof IndependenceEnum>;

/** The population and setting the evidence was actually generated in. */
export const EvidencePopulationSchema = z.object({
  /** Setting string, compared against the submission's careLevel. */
  setting: z.string(),
  /** Operator cadre in the study, compared against the submission's cadre. */
  cadre: z.string(),
  /** null where the document does not state an N (a licence, an SLA). */
  sampleN: z.number().nullable(),
  dateFrom: z.string(),
  dateTo: z.string(),
});
export type EvidencePopulation = z.infer<typeof EvidencePopulationSchema>;

export const ProvenanceSchema = z.object({
  generatedBy: z.string(),
  fundedBy: z.string(),
  population: EvidencePopulationSchema,
  documentDate: z.string(),
  /** null = no stated expiry (a study does not expire; a licence does). */
  validUntil: z.string().nullable(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * Whether the evidence transfers to THIS context. Computed by
 * `computeGeneralisability` — never authored by the vendor.
 */
export const GeneralisabilitySchema = z.object({
  limited: z.boolean(),
  reason: z.string().nullable(),
});
export type Generalisability = z.infer<typeof GeneralisabilitySchema>;

export const EvidenceSchema = z.object({
  id: z.string(),
  submissionId: z.string(),
  /**
   * Which assessment items this document is offered against.
   *
   * EMPTY IS ALLOWED, and it means "filed but bound to nothing" — which counts
   * for nothing, everywhere. The schema used to forbid it with `.min(1)`, but
   * the evidence upload has always been able to produce one (it warns "counts
   * for nothing" the moment you attach without binding), so the constraint
   * described a state the product could reach and the type said could not
   * exist. Worse, it made the rule undemonstrable: the clearest way to show
   * that binding is what makes a document count is to put an unbound one on
   * screen and watch it change nothing.
   *
   * Nothing downstream needs a guard for it. `itemsWithEvidence` simply never
   * sees an unbound document, so it is absent from every denominator by
   * construction rather than by exclusion.
   */
  itemRefs: z.array(z.string()),
  type: EvidenceTypeEnum,
  independence: IndependenceEnum,
  name: z.string(),
  /** Static asset path in the mock layer; absent where nothing is on file. */
  path: z.string().optional(),
  provenance: ProvenanceSchema,
  /**
   * One limitation, stated by the submitter.
   *
   * Required of every document, seeded or uploaded. A vendor who has to name
   * what their own study does not show writes a more useful sentence than any
   * reviewer could infer, and a document with no stated limitation is a claim
   * rather than evidence. `null` only where a document type genuinely has none
   * to state (a licence is a fact, not a finding).
   */
  limitation: z.string().nullable(),
  generalisability: GeneralisabilitySchema,
  expired: z.boolean(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;
