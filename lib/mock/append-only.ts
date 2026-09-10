/**
 * The append-only guard, shared by the committee verdict (S18) and the assessor
 * review (S5c).
 *
 * A record that can be edited proves nothing about what was decided at the
 * time, and a reversal leaving no trace of the original is indistinguishable
 * from the decision-maker never having changed their mind. Both records exist
 * to be the evidence six months later, so both are held to the same rule and
 * the rule lives in one place.
 */

export type AppendOnly = { id: string; revision: number; supersedes: string | null };

export type AppendResult = { revision: number; supersedes: string | null };

/**
 * Validate an append and compute the next revision.
 *
 * @throws when a record is in force and the new one does not say which it
 *         replaces, or when it names a predecessor that does not exist.
 */
export function appendOnlyGuard<T extends AppendOnly>(args: {
  /** Every record for this subject, oldest first. */
  existing: T[];
  /** The record this one replaces, if any. */
  supersedes?: string;
  /** For the error message — "verdict", "assessor review". */
  label: string;
  subject: string;
}): AppendResult {
  const { existing, supersedes, label, subject } = args;
  const supersededIds = new Set(existing.map((r) => r.supersedes).filter(Boolean));
  const inForce = [...existing].reverse().find((r) => !supersededIds.has(r.id));

  if (inForce && !supersedes) {
    throw new Error(
      `${label}: ${subject} already has a record in force (${inForce.id}). These are append-only — a reversal is a new record that says which it supersedes, never an edit.`
    );
  }
  if (supersedes && !existing.some((r) => r.id === supersedes)) {
    throw new Error(`${label}: cannot supersede "${supersedes}" — no such record.`);
  }

  return { revision: existing.length + 1, supersedes: supersedes ?? null };
}

/** The record currently in force — the newest not itself superseded. */
export function inForce<T extends AppendOnly>(existing: T[]): T | undefined {
  const supersededIds = new Set(existing.map((r) => r.supersedes).filter(Boolean));
  return [...existing].reverse().find((r) => !supersededIds.has(r.id));
}
