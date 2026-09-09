/**
 * Card identifiers — CP-YYYY-MMDD-<TOOLSLUG>-NNN, e.g. CP-2026-0915-CERVIAI-001.
 *
 * Generated deterministically from the tool slug and the FIRST issue date, so a
 * fixture rebuilt on any machine on any day produces the same id, and so a
 * reissue keeps it. The id names the assessment; `version` names the revision.
 * A card whose id changed when its version did would break every reference a
 * hospital had already filed.
 */

/** Strip a slug to the id alphabet: A-Z and digits, nothing else. */
function slugToken(slug: string): string {
  const token = slug.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return token.length > 0 ? token : "TOOL";
}

/**
 * @param sequence Nth card issued for this tool on this date. Defaults to 1.
 *                 Present so a second assessment of the same tool on the same
 *                 day (a different context — a different card) is addressable,
 *                 which is the whole premise of a context-bound card.
 */
export function makeCardId(toolSlug: string, issuedAt: string, sequence = 1): string {
  const d = new Date(issuedAt);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`makeCardId: "${issuedAt}" is not a date.`);
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const nnn = String(sequence).padStart(3, "0");
  return `CP-${yyyy}-${mm}${dd}-${slugToken(toolSlug)}-${nnn}`;
}

const CARD_ID_RE = /^CP-\d{4}-\d{4}-[A-Z0-9]+-\d{3}$/;

export function isCardId(value: string): boolean {
  return CARD_ID_RE.test(value);
}
