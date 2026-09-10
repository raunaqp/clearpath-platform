/**
 * The three hospital PERSONAS the demo switches between (BUILD_SPEC — persona
 * layer). One platform, three institutions, three different jobs:
 *   - Northvale IMS → full-service tertiary; the sophisticated buyer.
 *   - Site B     → aspiring district site; not ready yet.
 *   - Lakeview      → specialty fertility centre; trial-ready, scoped.
 *
 * This is a persona/seed lens only — it does NOT change the engine or workflow.
 */
export type HospitalPersona = {
  id: string;
  name: string;
  /** One-line role, shown in the switcher menu. */
  role: string;
  /**
   * Which demonstration this persona belongs to.
   *
   * The reviewed journey opened on CerviAI at Northvale and, a few clicks
   * later, the workspace was OvaReserve at a fertility centre. Nobody
   * evaluating a platform looks past a tool changing halfway through — it reads
   * as a stitched-together demo whatever the rest shows.
   *
   * The fixtures were always coherent; the problem was that Lakeview sat as a
   * peer of Northvale in one flat list, so wandering into it looked like part
   * of the main path rather than a separate example. Grouping makes the switch
   * deliberate.
   */
  scenario: "main" | "other";
};

export const HOSPITAL_PERSONAS: HospitalPersona[] = [
  // The main demonstration: CerviAI at Northvale, start to finish.
  { id: "hosp-northvale", name: "Northvale Institute of Medical Sciences", role: "Full-service tertiary — the sophisticated buyer", scenario: "main" },
  { id: "hosp-site-b", name: "District Hospital — Site B", role: "Aspiring district site — building readiness", scenario: "main" },
  // Separate examples. Switching here changes the tool as well as the site,
  // which is the whole reason they are labelled rather than listed alongside.
  { id: "hosp-kaveri", name: "Kaveri District Hospital", role: "Match with gaps — one closable constraint", scenario: "other" },
  { id: "hosp-lakeview", name: "Lakeview Fertility Centre", role: "Separate example — OvaReserve at a fertility centre", scenario: "other" },
  { id: "hosp-perambur", name: "Perambur Municipal Hospital", role: "Separate example — profiled, no problem register yet", scenario: "other" },
];

/** Personas grouped for the switcher, so a scenario change is deliberate. */
export const PERSONA_GROUPS: { label: string; personas: HospitalPersona[] }[] = [
  { label: "Main demonstration · CerviAI", personas: HOSPITAL_PERSONAS.filter((p) => p.scenario === "main") },
  { label: "Other examples · different tools", personas: HOSPITAL_PERSONAS.filter((p) => p.scenario === "other") },
];

export const DEFAULT_PERSONA = "hosp-northvale";

export function personaById(id: string): HospitalPersona {
  return HOSPITAL_PERSONAS.find((p) => p.id === id) ?? HOSPITAL_PERSONAS[0];
}
