import type { ProblemRegister, SiteOperatingProfile } from "@/lib/schemas/site-profile";

/**
 * Site operating profiles and problem registers.
 *
 * SEEDED AHEAD OF THE SCREENS THAT WILL AUTHOR THEM (S13, S14), and seeded with
 * their REAL recorded dates rather than a build timestamp. Both predate
 * CerviAI's submission on 15 September 2026:
 *
 *   12 Aug 2026   Northvale site profile baselined
 *   20 Aug 2026   Northvale problem register published
 *   15 Sep 2026   CerviAI submitted
 *
 * That ordering is asserted by the matching engine and shown in the UI. A site
 * profile written after a tool arrives is a justification rather than a
 * baseline — it is trivially easy to describe your own infrastructure in
 * whatever terms make the tool in front of you look like a fit — so the demo
 * has to be able to show the dates, not just claim the discipline.
 */

export const SITE_PROFILE_BASELINED_AT = "2026-08-12T00:00:00.000Z";
export const PROBLEM_REGISTER_PUBLISHED_AT = "2026-08-20T00:00:00.000Z";

export const SITE_PROFILES: SiteOperatingProfile[] = [
  {
    hospitalId: "hosp-northvale",
    baselinedAt: SITE_PROFILE_BASELINED_AT,
    archetype:
      "A tertiary teaching hospital with district screening outreach across 4 CHCs. " +
      "Representative of a Tier B public-linked institution in western Tamil Nadu.",
    facility: { type: "Tertiary teaching hospital", catchment: "4 CHCs in the screening catchment" },
    digital: { emrPresent: true, fhirSurfaceAvailable: true, abdmParticipating: true },
    staffing: {
      releasableOperators: 12,
      operatorCadre: "STAFF_NURSE",
      trainingCapacityHours: 6,
      clinicianSupervisionOnSite: true,
    },
    governance: { dpoAppointed: true, dpiaProcessInPlace: true, incidentRouteDefined: true },
    // A tertiary centre that also RUNS community outreach — which is why a
    // CHC-context tool can be contained by it. The card's context is CHC /
    // staff nurse / camp, and this site does exactly that as outreach.
    careLevels: ["DISTRICT_HOSPITAL", "CHC", "PHC"],
    cadres: ["STAFF_NURSE", "ANM", "MO", "CLINICIAN", "SPECIALIST", "LAB_TECHNICIAN"],
    deploymentModes: ["CAMP", "OPD_QUEUE", "WARD"],
    infrastructure: {
      powerBackupHours: 8,
      connectivity: "intermittent",
      offlineCaptureSupported: true,
      referralPathways: ["colposcopy", "oncology", "ophthalmology", "TB confirmatory"],
      devices: ["colposcope", "fundus camera", "digital X-ray", "tablets"],
      powerNote: "8h backup at the base hospital; camp sites are generator-dependent.",
    },
  },
  {
    hospitalId: "hosp-site-b",
    baselinedAt: SITE_PROFILE_BASELINED_AT,
    archetype:
      "A district hospital building toward hosting AI screening for its own catchment. " +
      "Representative of a site still closing its readiness gaps.",
    facility: { type: "District hospital", catchment: "Own catchment only" },
    digital: { emrPresent: true, fhirSurfaceAvailable: false, abdmParticipating: false },
    staffing: {
      releasableOperators: 4,
      operatorCadre: "STAFF_NURSE",
      trainingCapacityHours: 3,
      clinicianSupervisionOnSite: false,
    },
    governance: { dpoAppointed: false, dpiaProcessInPlace: false, incidentRouteDefined: true },
    careLevels: ["DISTRICT_HOSPITAL", "PHC"],
    cadres: ["STAFF_NURSE", "MO", "ANM"],
    deploymentModes: ["CAMP", "OPD_QUEUE"],
    infrastructure: {
      powerBackupHours: 4,
      connectivity: "intermittent",
      // The two facts that make Site B ineligible for CerviAI, and both are
      // properties of the SITE rather than faults of the tool.
      offlineCaptureSupported: false,
      referralPathways: ["TB confirmatory"],
      devices: ["tablets"],
    },
  },
  {
    hospitalId: "hosp-lakeview",
    baselinedAt: SITE_PROFILE_BASELINED_AT,
    archetype:
      "A private fertility and IVF centre hosting reproductive-health AI trials. " +
      "Representative of a specialty private institution.",
    facility: { type: "Private fertility centre", catchment: "Self-referred and referred couples" },
    digital: { emrPresent: true, fhirSurfaceAvailable: true, abdmParticipating: false },
    staffing: {
      releasableOperators: 6,
      operatorCadre: "SPECIALIST",
      trainingCapacityHours: 8,
      clinicianSupervisionOnSite: true,
    },
    governance: { dpoAppointed: true, dpiaProcessInPlace: true, incidentRouteDefined: true },
    careLevels: ["PRIVATE_SECONDARY", "PRIVATE_TERTIARY"],
    cadres: ["SPECIALIST", "CLINICIAN", "LAB_TECHNICIAN"],
    deploymentModes: ["OPD_QUEUE", "WARD"],
    infrastructure: {
      powerBackupHours: 24,
      connectivity: "reliable",
      offlineCaptureSupported: true,
      referralPathways: ["reproductive endocrinology", "embryology"],
      devices: ["time-lapse incubator", "ultrasound"],
    },
  },
];

export const PROBLEM_REGISTERS: ProblemRegister[] = [
  {
    hospitalId: "hosp-northvale",
    publishedAt: PROBLEM_REGISTER_PUBLISHED_AT,
    entries: [
      {
        id: "pr-northvale-tb-case-finding",
        rank: 1,
        name: "Tuberculosis case finding",
        volumePerYear: 5200,
        currentPathway: "Symptom screening then sputum, with confirmatory X-ray at the centre.",
        currentMetric: "9-day mean time to confirmation",
      },
      {
        // The one entry authored in full. Its successDefinition is what the
        // S20 charter's endpoints will derive from, and it was written before
        // the site had seen any tool — which is the whole point of dating the
        // register.
        id: "pr-northvale-cervical-screening",
        rank: 2,
        name: "Cervical screening",
        description:
          "Cervical abnormalities detected late, camp screening yield low, referral loss high.",
        serviceLine: "Community screening outreach",
        volumePerYear: 3400,
        currentPathway:
          "VIA by staff nurse, abnormal cases referred to colposcopy.",
        currentMetric: "11-day mean colposcopy turnaround",
        constraint:
          "No additional nurse time per patient. Must fit the existing camp rota.",
        successDefinition:
          "Improved detection of referable abnormalities without increasing nurse workload, with referral completion at or above 80%.",
      },
      {
        id: "pr-northvale-diabetic-retinopathy",
        rank: 3,
        name: "Diabetic retinopathy screening",
        volumePerYear: 2100,
        currentPathway: "Opportunistic fundus imaging in the diabetes clinic.",
        currentMetric: "22-day mean ophthalmology referral",
      },
      {
        id: "pr-northvale-antenatal-anaemia",
        rank: 4,
        name: "Antenatal anaemia",
        volumePerYear: 4800,
        currentPathway: "Venous haemoglobin sent to the district lab.",
        currentMetric: "3-day mean result turnaround",
      },
      // Ranks 5-9 are named and sized but not yet authored in full. A register
      // in progress is the honest state — and "#2 of 9" needs a real
      // denominator, not a number asserted beside four entries.
      {
        id: "pr-northvale-hypertension",
        rank: 5,
        name: "Hypertension follow-up",
        volumePerYear: 7600,
        currentPathway: "Opportunistic measurement at OPD, paper follow-up register.",
      },
      {
        id: "pr-northvale-diabetes-control",
        rank: 6,
        name: "Diabetes control",
        volumePerYear: 5100,
        currentPathway: "HbA1c at the base hospital, quarterly review.",
      },
      {
        id: "pr-northvale-oral-cancer",
        rank: 7,
        name: "Oral cancer screening",
        volumePerYear: 2800,
        currentPathway: "Visual examination at camps, biopsy referral to the centre.",
      },
      {
        id: "pr-northvale-newborn-hearing",
        rank: 8,
        name: "Newborn hearing screening",
        volumePerYear: 1600,
        currentPathway: "OAE at the base hospital before discharge.",
      },
      {
        id: "pr-northvale-breast-screening",
        rank: 9,
        name: "Breast screening",
        volumePerYear: 1900,
        currentPathway: "Clinical breast examination at camps, imaging referral.",
      },
    ],
  },
  {
    hospitalId: "hosp-site-b",
    publishedAt: PROBLEM_REGISTER_PUBLISHED_AT,
    entries: [
      {
        id: "pr-site-b-tb-case-finding",
        rank: 1,
        name: "Tuberculosis case finding",
        volumePerYear: 1900,
        currentPathway: "Symptom screening, sputum sent out of district.",
        currentMetric: "14-day mean time to confirmation",
      },
      {
        id: "pr-site-b-hypertension-follow-up",
        rank: 2,
        name: "Hypertension follow-up",
        volumePerYear: 3100,
        currentPathway: "Opportunistic measurement at OPD.",
      },
      // Cervical screening is NOT on Site B's register. That alone would make
      // it a poor fit; the infrastructure findings make it ineligible.
    ],
  },
  {
    hospitalId: "hosp-lakeview",
    publishedAt: PROBLEM_REGISTER_PUBLISHED_AT,
    entries: [
      {
        id: "pr-lakeview-embryo-selection",
        rank: 1,
        name: "Embryo selection consistency",
        volumePerYear: 900,
        currentPathway: "Manual morphology grading by two embryologists.",
      },
      {
        id: "pr-lakeview-ovarian-reserve",
        rank: 2,
        name: "Ovarian reserve prediction",
        volumePerYear: 1400,
        currentPathway: "AMH and antral follicle count, clinician judgement.",
      },
    ],
  },
];

/**
 * Kaveri — the middle band. Everything the card needs is present EXCEPT power:
 * 4h of backup against the 8h a camp day requires. Offline capture works and
 * the colposcopy pathway exists, so nothing here is a blocking failure — it is
 * a gap with a purchase order attached.
 */
SITE_PROFILES.push({
  hospitalId: "hosp-kaveri",
  baselinedAt: SITE_PROFILE_BASELINED_AT,
  archetype:
    "A district hospital running cervical screening camps across its own block. " +
    "Representative of a site that fits on everything but one closable constraint.",
  facility: { type: "District hospital", catchment: "6 camp sites across the block" },
  digital: { emrPresent: true, fhirSurfaceAvailable: false, abdmParticipating: true },
  staffing: {
    releasableOperators: 8,
    operatorCadre: "STAFF_NURSE",
    trainingCapacityHours: 6,
    clinicianSupervisionOnSite: true,
  },
  governance: { dpoAppointed: true, dpiaProcessInPlace: true, incidentRouteDefined: true },
  careLevels: ["DISTRICT_HOSPITAL", "CHC", "PHC"],
  cadres: ["STAFF_NURSE", "ANM", "MO"],
  deploymentModes: ["CAMP", "OPD_QUEUE"],
  infrastructure: {
    // THE GAP. Everything else clears.
    powerBackupHours: 4,
    connectivity: "intermittent",
    offlineCaptureSupported: true,
    referralPathways: ["colposcopy", "TB confirmatory"],
    devices: ["colposcope", "tablets"],
    powerNote: "4h backup at the base hospital; camp sites run on a shared generator.",
  },
});

/**
 * Kaveri's register. Cervical screening is ranked #3 — lower than Northvale's
 * #2, which is itself a real signal to a vendor choosing where to start.
 */
PROBLEM_REGISTERS.push({
  hospitalId: "hosp-kaveri",
  publishedAt: PROBLEM_REGISTER_PUBLISHED_AT,
  entries: [
    { id: "pr-kaveri-tb", rank: 1, name: "Tuberculosis case finding", volumePerYear: 2400, currentPathway: "Symptom screening then sputum." },
    { id: "pr-kaveri-anaemia", rank: 2, name: "Antenatal anaemia", volumePerYear: 3100, currentPathway: "Venous haemoglobin sent to the district lab." },
    {
      id: "pr-kaveri-cervical-screening",
      rank: 3,
      name: "Cervical screening",
      description: "Camp screening yield low, colposcopy referral slow across the block.",
      serviceLine: "Block screening camps",
      volumePerYear: 1800,
      currentPathway: "VIA by staff nurse, colposcopy referral to the district hospital.",
      currentMetric: "16-day mean colposcopy turnaround",
      constraint: "Camps run on a shared generator; no additional nurse time per patient.",
      successDefinition:
        "Improved detection of referable abnormalities without increasing nurse workload, with referral completion at or above 75%.",
    },
  ],
});

export function getSiteProfile(hospitalId: string): SiteOperatingProfile | undefined {
  return SITE_PROFILES.find((p) => p.hospitalId === hospitalId);
}

export function getProblemRegister(hospitalId: string): ProblemRegister | undefined {
  return PROBLEM_REGISTERS.find((r) => r.hospitalId === hospitalId);
}
