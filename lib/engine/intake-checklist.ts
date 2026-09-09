/**
 * Intake checklist — what a submission is expected to bring.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS IS NOT VALIDATION
 * ─────────────────────────────────────────────────────────────────────────
 * The checklist says what a submission of this kind, in this context, is
 * expected to include. It says nothing about whether what arrives is any good
 * — that is `evidence.ts` (does it transfer to this context?) and the scoring
 * engines (does it establish the item?).
 *
 * Keeping the two apart matters. A vendor who has attached a document against
 * every line has completed the checklist and may still fail every gate, and a
 * checklist that quietly graded the uploads would make "complete" read as
 * "good". Completion is counted against LINES COVERED, never against a score,
 * and this module deliberately has no access to a level or a verdict.
 *
 * Generated from the tool category and the declared context, so a lab-adjacent
 * tool is asked for NABL and a non-lab one is not, and a tool claiming US FDA
 * is asked to produce it.
 */

import type { ToolCategory } from "@/lib/schemas/tool";
import type { EvidenceType } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";

export type ChecklistGroupId =
  | "regulatory"
  | "clinical"
  | "dpdp"
  | "interoperability"
  | "logistics"
  | "training";

export type ChecklistLine = {
  id: string;
  label: string;
  /** What it is for, in the words a submitter would use. */
  detail: string;
  /** Evidence types that satisfy this line. */
  accepts: EvidenceType[];
  /**
   * A line the submission cannot be complete without. `false` marks lines that
   * apply only if the vendor makes the corresponding claim — asked for, but not
   * counted against a submission that never claimed it.
   */
  required: boolean;
};

export type ChecklistGroup = {
  id: ChecklistGroupId;
  title: string;
  /** Why this group exists at all — one line, shown above its items. */
  purpose: string;
  lines: ChecklistLine[];
};

export type ChecklistInput = {
  category: ToolCategory;
  context: SubmissionContext;
  /** Claims that pull optional lines into the list. */
  claims?: { usFda?: boolean; lab?: boolean };
};

export function buildIntakeChecklist(input: ChecklistInput): ChecklistGroup[] {
  const { category, context, claims } = input;
  const isLab = claims?.lab ?? category === "point-of-care";
  const usFda = claims?.usFda ?? false;
  const patientFacing = category === "patient-facing";

  const regulatory: ChecklistLine[] = [
    {
      id: "reg-cdsco",
      label: "CDSCO licence and device class",
      detail:
        "The licence, with its class. Or a reasoned out-of-scope statement — " +
        "saying why the tool falls outside the device rules is an acceptable " +
        "answer; saying nothing is not.",
      accepts: ["REGULATORY"],
      required: true,
    },
    {
      id: "reg-classification",
      label: "Classification certificate",
      detail: "The classification the licence rests on, so the class can be checked rather than taken.",
      accepts: ["REGULATORY"],
      required: true,
    },
    {
      id: "reg-iso",
      label: "ISO certification",
      detail: "Quality-management certification for the manufacturing or software process.",
      accepts: ["REGULATORY", "AUDIT"],
      required: true,
    },
    {
      id: "reg-usfda",
      label: "US FDA clearance",
      detail: "Only if US FDA status is claimed. A claimed clearance has to be produced.",
      accepts: ["REGULATORY"],
      required: usFda,
    },
    {
      id: "reg-nabl",
      label: "NABL accreditation",
      detail: "Only where a laboratory step is involved.",
      accepts: ["REGULATORY", "AUDIT"],
      required: isLab,
    },
  ];

  const clinical: ChecklistLine[] = [
    {
      id: "clin-validation",
      label: "Validation studies",
      detail:
        "With design, comparator, site, n, and who ran them. A study without " +
        "its comparator and its n is a claim about a study.",
      accepts: ["VALIDATION_STUDY", "STUDY"],
      required: true,
    },
    {
      id: "clin-publications",
      label: "Publications",
      detail: "Peer-reviewed output, where any exists.",
      accepts: ["STUDY"],
      required: false,
    },
    {
      id: "clin-pilots",
      label: "Prior pilots",
      detail: "Where the tool has been run before, and what happened.",
      accepts: ["FIELD_LOG", "STUDY", "AUDIT"],
      required: false,
    },
    {
      id: "clin-field",
      label: "Field studies",
      detail:
        `Performance with a ${cadreWord(context)} operating it, in the setting ` +
        "declared — not only in the setting it was developed in.",
      accepts: ["FIELD_LOG", "STUDY"],
      required: true,
    },
  ];

  const dpdp: ChecklistLine[] = [
    { id: "dpdp-policy", label: "Privacy policy", detail: "The current policy as it applies to this deployment.", accepts: ["AUDIT", "REGULATORY"], required: true },
    { id: "dpdp-flow", label: "Data-flow diagram", detail: "Where patient data goes, including anything processed outside India.", accepts: ["INTEGRATION_SPEC", "AUDIT"], required: true },
    { id: "dpdp-consent", label: "Consent templates", detail: `In the languages used in ${context.geography || "the deployment geography"}.`, accepts: ["CONSENT_ARTEFACT"], required: true },
    { id: "dpdp-retention", label: "Retention and erasure", detail: "How long data is kept, and how a patient's erasure request is honoured.", accepts: ["AUDIT", "SLA"], required: true },
    { id: "dpdp-breach", label: "Breach response", detail: "What happens, who is told, and how quickly.", accepts: ["AUDIT", "SLA"], required: true },
    { id: "dpdp-dpo", label: "DPO contact", detail: "A named data-protection officer a hospital can actually reach.", accepts: ["AUDIT"], required: true },
    { id: "dpdp-safeguards", label: "Documented safeguards", detail: "The technical and organisational controls, written down rather than asserted.", accepts: ["AUDIT"], required: true },
  ];

  const interoperability: ChecklistLine[] = [
    {
      id: "interop-abdm",
      label: "ABDM / FHIR posture",
      detail: "What the tool implements today, and what it does not. A roadmap is a posture, and should be stated as one.",
      accepts: ["INTEGRATION_SPEC"],
      required: true,
    },
    {
      id: "interop-cert",
      label: "ABDM compliance certificate",
      detail: "Where ABDM compliance is claimed rather than planned.",
      accepts: ["REGULATORY", "INTEGRATION_SPEC"],
      required: false,
    },
  ];

  const logistics: ChecklistLine[] = [
    {
      id: "log-build",
      label: "Basic build and consumables",
      detail:
        "What has to be in the room for this to run, and what has to be " +
        "restocked. Consumables are where a deployment quietly stops.",
      accepts: ["INTEGRATION_SPEC", "SLA", "FIELD_LOG"],
      required: true,
    },
    { id: "log-sla", label: "SLA formats", detail: "Support terms, uptime, and response times as offered.", accepts: ["SLA"], required: true },
    { id: "log-pricing", label: "Pricing", detail: "Capital and operating cost, in a form a budget cycle can absorb.", accepts: ["SLA", "AUDIT"], required: true },
  ];

  const training: ChecklistLine[] = [
    {
      id: "train-curriculum",
      label: "Curriculum and hours per cadre",
      detail:
        `Hours specifically for a ${cadreWord(context)} — the cadre declared as ` +
        "the operator. Training designed for a different cadre is a different plan.",
      accepts: ["TRAINING_CURRICULUM"],
      required: true,
    },
  ];

  const groups: ChecklistGroup[] = [
    { id: "regulatory", title: "Regulatory", purpose: "The legal basis to deploy this, for this claim.", lines: regulatory },
    { id: "clinical", title: "Clinical", purpose: "What the tool has been shown to do, and by whom.", lines: clinical },
    { id: "dpdp", title: "DPDP and security", purpose: "How patient data is handled, lawfully and in practice.", lines: dpdp },
    { id: "interoperability", title: "Interoperability", purpose: "Whether data can move in and out without lock-in.", lines: interoperability },
    { id: "logistics", title: "Logistics", purpose: "What it takes to actually run it at a site.", lines: logistics },
    { id: "training", title: "Training", purpose: "What the operator needs before they can use it.", lines: training },
  ];

  // Patient-facing tools have no staff operator, so a cadre curriculum is not
  // the right ask. The line stays visible and stops being required, rather than
  // disappearing — a vendor should see what was considered and set aside.
  if (patientFacing) {
    for (const line of training) line.required = false;
  }

  return groups;
}

function cadreWord(context: SubmissionContext): string {
  return context.operatorCadre
    .toLowerCase()
    .replace(/_/g, " ")
    .replace("anm", "ANM")
    .replace("mo", "medical officer");
}

// ─────────────────────────────────────────────────────────────────────────
// Completion — against LINES, never against a score
// ─────────────────────────────────────────────────────────────────────────

export type ChecklistCoverage = {
  /** Line ids a document has been attached against. */
  covered: Set<string>;
  requiredTotal: number;
  requiredCovered: number;
  optionalCovered: number;
};

/**
 * Which lines have something attached.
 *
 * A document covers a line when its evidence TYPE is one the line accepts.
 * That is a coarse match on purpose: a finer one would start judging whether
 * the document is any good, which is the other engine's job and the exact
 * blurring this module exists to avoid.
 */
export function computeCoverage(
  groups: ChecklistGroup[],
  attached: { type: EvidenceType; checklistLineIds?: string[] }[]
): ChecklistCoverage {
  const covered = new Set<string>();

  for (const doc of attached) {
    // An explicit binding always wins over the type match.
    for (const id of doc.checklistLineIds ?? []) covered.add(id);
    for (const group of groups) {
      for (const line of group.lines) {
        if (line.accepts.includes(doc.type)) covered.add(line.id);
      }
    }
  }

  const all = groups.flatMap((g) => g.lines);
  const required = all.filter((l) => l.required);
  return {
    covered,
    requiredTotal: required.length,
    requiredCovered: required.filter((l) => covered.has(l.id)).length,
    optionalCovered: all.filter((l) => !l.required && covered.has(l.id)).length,
  };
}
