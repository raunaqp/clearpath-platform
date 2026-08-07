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
};

export const HOSPITAL_PERSONAS: HospitalPersona[] = [
  { id: "hosp-northvale", name: "Northvale Institute of Medical Sciences", role: "Full-service tertiary — the sophisticated buyer" },
  { id: "hosp-site-b", name: "District Hospital — Site B", role: "Aspiring district site — building readiness" },
  { id: "hosp-lakeview", name: "Lakeview Fertility Centre", role: "Specialty fertility centre — trial-ready" },
];

export const DEFAULT_PERSONA = "hosp-northvale";

export function personaById(id: string): HospitalPersona {
  return HOSPITAL_PERSONAS.find((p) => p.id === id) ?? HOSPITAL_PERSONAS[0];
}
