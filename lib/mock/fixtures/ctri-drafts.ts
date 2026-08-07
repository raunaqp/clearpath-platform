/**
 * CTRI registration drafts (mocked). CTRI (ctri.nic.in) is India's mandatory
 * government trial registry — a ~40-field public form requiring PROSPECTIVE
 * registration before first enrolment. We do NOT rebuild or submit to it; this
 * fixture is the auto-drafted dataset the trial workflow's CTRI step shows.
 *
 * The single source of the drafted text — `getCtriDraft(toolId)` reads it, so
 * it can later be swapped for a real model call over the protocol + ethics
 * approval with no UI change. The PI submits and signs on the official CTRI.
 */
export type CtriSuggestion = { field: string; value: string; note: string };

export type CtriDraft = {
  publicTitle: string;
  scientificTitle: string;
  acronym: string;
  primarySponsor: string;
  sites: string[];
  ethicsCommittee: string;
  ethicsApprovalStatus: string;
  /** For the 1-year validity compliance check. */
  ethicsApprovalDate: string;
  dcgiApplicable: boolean;
  dcgiClearance: string | null;
  healthCondition: string;
  studyType: string;
  studyDesign: string;
  intervention: string;
  comparator: string;
  inclusion: string;
  exclusion: string;
  primaryOutcomes: string;
  secondaryOutcomes: string;
  targetSampleSize: string;
  phase: string;
  firstEnrolmentDate: string;
  /** For the prospective-registration compliance check. */
  recruitmentStatus: string;
  briefSummary: string;
  /** AI-suggested structured values (ICD-10 up to 4 levels · design · phase). */
  suggestions: {
    icd10: CtriSuggestion;
    studyDesign: CtriSuggestion;
    phase: CtriSuggestion;
  };
};

const CERVIAI_DRAFT: CtriDraft = {
  publicTitle: "AI-assisted visual screening for cervical pre-cancer in community camps",
  scientificTitle:
    "A prospective diagnostic-accuracy study of AI-assisted VIA/colposcopy interpretation for detection of cervical intraepithelial neoplasia in community screening",
  acronym: "CERVI-AI",
  primarySponsor: "CerviAI Health Pvt. Ltd.",
  sites: ["Northvale Institute of Medical Sciences", "Community screening camps, Tamil Nadu"],
  ethicsCommittee: "Northvale IMS Institutional Review Board",
  ethicsApprovalStatus: "Approved",
  ethicsApprovalDate: "2026-02-10",
  dcgiApplicable: false,
  dcgiClearance: null,
  healthCondition: "Cervical intraepithelial neoplasia / cervical pre-cancer",
  studyType: "Interventional (diagnostic)",
  studyDesign: "Prospective, single-arm, blinded reference-standard comparison",
  intervention: "AI-assisted VIA/colposcopy image interpretation used by screening nurses",
  comparator: "Expert colposcopy with histopathology reference standard",
  inclusion: "Women 30–65 attending community cervical screening; able to consent",
  exclusion: "Prior hysterectomy; known cervical cancer; pregnancy",
  primaryOutcomes: "Sensitivity and specificity for referable lesions vs the reference standard",
  secondaryOutcomes: "Colposcopy referral-completion rate; time from screen to referral",
  targetSampleSize: "1,000",
  phase: "Not applicable (diagnostic device)",
  firstEnrolmentDate: "2026-08-01",
  recruitmentStatus: "Not yet recruiting",
  briefSummary:
    "A prospective study evaluating whether AI-assisted interpretation of cervical screening images helps community screening nurses flag referable pre-cancer, against an expert reference standard, across camp and hospital sites.",
  suggestions: {
    icd10: { field: "ICD-10 (health condition)", value: "N87.9", note: "Cervical dysplasia, unspecified — up to 4 levels (N87 → N87.9)" },
    studyDesign: { field: "Study design", value: "Prospective single-arm diagnostic accuracy", note: "Mapped from protocol design" },
    phase: { field: "Phase", value: "Not applicable (diagnostic device)", note: "Phase applies to drug trials; diagnostic device → N/A" },
  },
};

function genericDraft(toolName: string): CtriDraft {
  return {
    ...CERVIAI_DRAFT,
    publicTitle: `Prospective evaluation of ${toolName} in an Indian clinical setting`,
    scientificTitle: `A prospective study of ${toolName}`,
    acronym: toolName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6),
    primarySponsor: `${toolName} (vendor)`,
    briefSummary: `A prospective study evaluating ${toolName} against a reference standard.`,
  };
}

const DRAFTS: Record<string, CtriDraft> = {
  "tool-cerviai": CERVIAI_DRAFT,
};

export function getCtriDraft(toolId: string, toolName = "the tool"): CtriDraft {
  return DRAFTS[toolId] ?? genericDraft(toolName);
}
