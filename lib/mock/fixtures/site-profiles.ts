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
    },
  },
  {
    hospitalId: "hosp-site-b",
    baselinedAt: SITE_PROFILE_BASELINED_AT,
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
        rank: 1,
        name: "Tuberculosis case finding",
        volumePerYear: 5200,
        currentPathway: "Symptom screening then sputum, with confirmatory X-ray at the centre.",
        currentMetric: "9-day mean time to confirmation",
      },
      {
        rank: 2,
        name: "Cervical screening",
        volumePerYear: 3400,
        currentPathway: "VIA at outreach camps, colposcopy referral to the centre.",
        currentMetric: "11-day mean colposcopy turnaround",
      },
      {
        rank: 3,
        name: "Diabetic retinopathy screening",
        volumePerYear: 2100,
        currentPathway: "Opportunistic fundus imaging in the diabetes clinic.",
        currentMetric: "22-day mean ophthalmology referral",
      },
      {
        rank: 4,
        name: "Antenatal anaemia",
        volumePerYear: 4800,
        currentPathway: "Venous haemoglobin sent to the district lab.",
        currentMetric: "3-day mean result turnaround",
      },
    ],
  },
  {
    hospitalId: "hosp-site-b",
    publishedAt: PROBLEM_REGISTER_PUBLISHED_AT,
    entries: [
      {
        rank: 1,
        name: "Tuberculosis case finding",
        volumePerYear: 1900,
        currentPathway: "Symptom screening, sputum sent out of district.",
        currentMetric: "14-day mean time to confirmation",
      },
      {
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
        rank: 1,
        name: "Embryo selection consistency",
        volumePerYear: 900,
        currentPathway: "Manual morphology grading by two embryologists.",
      },
      {
        rank: 2,
        name: "Ovarian reserve prediction",
        volumePerYear: 1400,
        currentPathway: "AMH and antral follicle count, clinician judgement.",
      },
    ],
  },
];

export function getSiteProfile(hospitalId: string): SiteOperatingProfile | undefined {
  return SITE_PROFILES.find((p) => p.hospitalId === hospitalId);
}

export function getProblemRegister(hospitalId: string): ProblemRegister | undefined {
  return PROBLEM_REGISTERS.find((r) => r.hospitalId === hospitalId);
}
