/**
 * Hospital fit matching (FIX 4). Given a tool and the hospital fixtures, return
 * the APPLICABLE hospitals — those whose care levels cover the tool's intended
 * level AND who are seeking the tool's category — each with a one-line reason.
 *
 * Pure logic; no store/api dependency so it's easy to test and reuse.
 */

import type { Tool, CareLevel, ToolCategory } from "@/lib/schemas/tool";
import type { Hospital } from "@/lib/schemas/hospital";
import type { SiteGrade } from "@/lib/schemas/site";
import type { RequestType } from "@/lib/schemas/submission";

/**
 * The action offered at each hospital keys off its site readiness tier:
 *   Tier B (trial-ready)      → request a clinical trial
 *   Tier A (deployment-ready) → request a deployment
 *   Not ready                 → no action
 */
export function requestTypeForGrade(grade: SiteGrade): RequestType | null {
  if (grade === "TIER_A") return "deployment";
  if (grade === "TIER_B") return "trial";
  return null;
}

const CARE_LEVEL_LABEL: Record<CareLevel, string> = {
  tertiary: "tertiary",
  secondary: "district / secondary",
  primary: "primary (PHC)",
  community: "community (CHC)",
  home: "home / patient-facing",
};

const CATEGORY_LABEL: Record<ToolCategory, string> = {
  screening: "screening",
  samd: "SaMD",
  "point-of-care": "point-of-care",
  cds: "clinical decision support",
  "patient-facing": "patient-facing",
  platform: "platform",
};

export type HospitalMatch = {
  hospital: Hospital;
  reason: string;
};

export function applicableHospitals(
  tool: Tool,
  hospitals: Hospital[]
): HospitalMatch[] {
  return hospitals
    .filter(
      (h) =>
        h.acceptsCareLevels.includes(tool.careLevel) &&
        h.seeking.includes(tool.category)
    )
    .map((h) => ({
      hospital: h,
      reason: `${h.focus} Seeking ${CATEGORY_LABEL[tool.category]} tools at ${CARE_LEVEL_LABEL[tool.careLevel]} level.`,
    }));
}

// ═════════════════════════════════════════════════════════════════════════
// S9 · Capability × site readiness × problem register
// ═════════════════════════════════════════════════════════════════════════

/**
 * The old `applicableHospitals` filters on care level and category. It answers
 * "could this go here?" and cannot answer "why would it?" — which is the
 * question a hospital and a vendor both actually have.
 *
 * This matches the CARD'S DECLARED CONTEXT against the site's own operating
 * profile and its own problem register, and reports four findings rather than
 * one score. The four stay separate for the same reason the routing numbers
 * do: a single fit percentage hides which part failed, and the part that failed
 * is the entire actionable content.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE EXCLUDED SITE MATTERS MORE THAN THE INCLUDED ONE
 * ─────────────────────────────────────────────────────────────────────────
 * A hospital that is Not eligible gets a stated reason naming the two facts
 * that make it so. An empty list, or a site quietly filtered out, teaches a
 * vendor nothing and reads as a broken screen. A filtered result with a reason
 * is the product working.
 */

import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import type { ProblemEntry, ProblemRegister, SiteOperatingProfile } from "@/lib/schemas/site-profile";
import { CARE_LEVEL_SHORT, DEPLOYMENT_MODE_LABEL, OPERATOR_CADRE_LABEL } from "@/lib/schemas/context";
import { getItem } from "@/lib/engine/item-bank";
import { softenCertainty } from "@/lib/engine/soften-certainty";

export type MatchBand = "STRONG" | "GAPS" | "NOT_ELIGIBLE";

export const MATCH_BAND_LABEL: Record<MatchBand, string> = {
  STRONG: "Strong match",
  GAPS: "Match with gaps",
  NOT_ELIGIBLE: "Not eligible",
};

export type MatchFinding = {
  /** Whether this part of the match holds. */
  ok: boolean;
  /** Whether failing this part alone makes the site ineligible. */
  blocking: boolean;
  detail: string;
};

export type MatchBreakdown = {
  problemFit: MatchFinding;
  contextValidity: MatchFinding;
  infrastructure: MatchFinding;
  conditionsSatisfiable: MatchFinding;
};

/**
 * The dates behind the match, and whether they are in the right order.
 *
 * Surfaced rather than merely checked: the UI has to be able to show that the
 * site described itself BEFORE the tool arrived.
 */
export type MatchChronology = {
  siteProfileBaselinedAt: string;
  problemRegisterPublishedAt: string;
  submittedAt: string;
  /** True when both site records predate the submission. */
  siteRecordsPredateSubmission: boolean;
  note: string;
};

export type ContextMatch = {
  hospital: Hospital;
  band: MatchBand;
  breakdown: MatchBreakdown;
  chronology: MatchChronology;
  /** One line, for a list row. */
  summary: string;
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Which register entry, if any, this tool's claim speaks to.
 *
 * EXPORTED because three surfaces need the same answer: the matching screen
 * ("ranked #2 on the problem register"), the facilitation introduction pack
 * ("the problem-register entry it addresses"), and the deployment request,
 * which names the entry id so hospital intake can look it up. Deriving it three
 * ways would let those three disagree about what the tool claims to address.
 */
export function findProblem(register: ProblemRegister | undefined, claim: string, toolName: string): ProblemEntry | undefined {
  if (!register) return undefined;
  const haystack = `${claim} ${toolName}`.toLowerCase();
  return register.entries.find((e) =>
    e.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .some((w) => haystack.includes(w))
  );
}

export function matchToolToSite(args: {
  card: ReadinessCard;
  toolName: string;
  hospital: Hospital;
  profile: SiteOperatingProfile | undefined;
  register: ProblemRegister | undefined;
}): ContextMatch {
  const { card, toolName, hospital, profile, register } = args;
  const ctx = card.context;

  // ── chronology ─────────────────────────────────────────────────────────
  const baselinedAt = profile?.baselinedAt ?? "";
  const publishedAt = register?.publishedAt ?? "";
  const submittedAt = card.firstIssuedAt;
  const ordered =
    !!baselinedAt && !!publishedAt &&
    new Date(baselinedAt) < new Date(submittedAt) &&
    new Date(publishedAt) < new Date(submittedAt);
  const chronology: MatchChronology = {
    siteProfileBaselinedAt: baselinedAt,
    problemRegisterPublishedAt: publishedAt,
    submittedAt,
    siteRecordsPredateSubmission: ordered,
    note: softenCertainty(
      ordered
        ? `Site profile baselined ${fmt(baselinedAt)} and problem register published ${fmt(publishedAt)} — both before ${toolName} was submitted on ${fmt(submittedAt)}. The site described itself before the tool arrived.`
        : `Site records were not established before ${toolName} was submitted on ${fmt(submittedAt)}. A profile written after a tool arrives is a justification, not a baseline.`
    ),
  };

  // ── 1 · problem fit ────────────────────────────────────────────────────
  const problem = findProblem(register, ctx.exactClaim, toolName);
  const problemFit: MatchFinding = problem
    ? {
        ok: true,
        blocking: false,
        detail: softenCertainty(
          `${problem.name} ranked #${problem.rank} on the problem register, ${problem.volumePerYear.toLocaleString("en-IN")} per year${problem.currentMetric ? `, ${problem.currentMetric}` : ""}.`
        ),
      }
    : {
        ok: false,
        blocking: false,
        detail: register
          ? softenCertainty(`Nothing on this site's problem register matches the claim. The register runs to ${register.entries.length} entries and none of them is what this tool addresses.`)
          : softenCertainty("This site has not published a problem register, so there is nothing to match a claim against."),
      };

  // ── 2 · context validity ───────────────────────────────────────────────
  // Does the site CONTAIN the context the card was issued for? A tertiary
  // centre that runs CHC outreach contains a CHC context; one that does not,
  // does not — the card is not valid there whatever its verdict says.
  const levelOk = profile?.careLevels.includes(ctx.careLevel) ?? false;
  const cadreOk = profile?.cadres.includes(ctx.operatorCadre) ?? false;
  const modesOk = ctx.deploymentModes.every((m) => profile?.deploymentModes.includes(m));
  const contextValidity: MatchFinding = {
    ok: levelOk && cadreOk && modesOk,
    blocking: true,
    detail: softenCertainty(
      levelOk && cadreOk && modesOk
        ? `Card context is ${CARE_LEVEL_SHORT[ctx.careLevel]} / ${OPERATOR_CADRE_LABEL[ctx.operatorCadre]} / ${ctx.deploymentModes.map((m) => DEPLOYMENT_MODE_LABEL[m]).join(" and ")}; ${hospital.name} runs that — contained.`
        : [
            !levelOk ? `the site does not operate at ${CARE_LEVEL_SHORT[ctx.careLevel]} level` : null,
            !cadreOk ? `it does not staff a ${OPERATOR_CADRE_LABEL[ctx.operatorCadre]} for this` : null,
            !modesOk ? `it does not run ${ctx.deploymentModes.map((m) => DEPLOYMENT_MODE_LABEL[m]).join(" or ")}` : null,
          ]
            .filter(Boolean)
            .join("; ")
            .replace(/^./, (c) => c.toUpperCase()) + ". The card is not valid here."
    ),
  };

  // ── 3 · infrastructure ─────────────────────────────────────────────────
  const infra = profile?.infrastructure;
  const needsOffline = ctx.deploymentModes.includes("CAMP") && infra?.connectivity !== "reliable";
  const offlineOk = !needsOffline || (infra?.offlineCaptureSupported ?? false);
  // The referral pathway the claim implies. A screening tool whose flag has
  // nowhere to go has produced an alarm, not a referral.
  const referralNeeded = referralPathwayFor(ctx.exactClaim);
  const referralOk = !referralNeeded || (infra?.referralPathways.includes(referralNeeded) ?? false);
  const powerOk = (infra?.powerBackupHours ?? 0) >= 8;

  const infraBits: string[] = [];
  if (infra) {
    infraBits.push(`power backup ${infra.powerBackupHours}h ${powerOk ? "supported" : "below the 8h a camp day needs"}`);
    if (needsOffline) {
      infraBits.push(
        `camp connectivity ${infra.connectivity} with offline capture required and ${infra.offlineCaptureSupported ? "supported" : "no offline path"}`
      );
    }
    if (referralNeeded) {
      infraBits.push(`${referralNeeded} referral pathway ${referralOk ? "present" : "absent from the catchment"}`);
    }
  }

  // The consequence, said plainly. A screening tool whose positive flag has
  // nowhere to go has not screened anyone — it has raised an alarm.
  const referralConsequence =
    !referralOk && referralNeeded ? " A positive flag would have nowhere to go." : "";
  const infrastructure: MatchFinding = {
    ok: offlineOk && referralOk && powerOk,
    blocking: !offlineOk || !referralOk,
    detail: softenCertainty(
      infra
        ? `${infraBits.join(", ")}.${referralConsequence}`
        : "This site has not baselined an operating profile, so there is nothing to check against."
    ),
  };

  // ── 4 · conditions satisfiable ─────────────────────────────────────────
  // Can the open conditions be cleared here? A condition that blocks a trial
  // has to be closed before anything starts; one that blocks routine
  // deployment does not stand in the way of a supervised trial.
  const trialBlocking = card.conditions.filter((c) => c.blocks === "TRIAL");
  const routineBlocking = card.conditions.filter((c) => c.blocks === "ROUTINE_DEPLOYMENT");
  const conditionsSatisfiable: MatchFinding = {
    ok: trialBlocking.length === 0,
    blocking: false,
    detail: softenCertainty(
      card.conditions.length === 0
        ? "No open conditions."
        : trialBlocking.length === 0
          ? `Yes — ${routineBlocking.map((c) => gateLabel(c.itemId)).join(", ")} ${routineBlocking.length === 1 ? "does" : "do"} not block a supervised trial, and nothing is required from the site.`
          : `${trialBlocking.map((c) => gateLabel(c.itemId)).join(", ")} ${trialBlocking.length === 1 ? "blocks" : "block"} a trial and would have to be cleared by the vendor before anything starts here.`
    ),
  };

  const breakdown: MatchBreakdown = { problemFit, contextValidity, infrastructure, conditionsSatisfiable };

  // ── band ───────────────────────────────────────────────────────────────
  const blockingFailure =
    (!contextValidity.ok && contextValidity.blocking) || (!infrastructure.ok && infrastructure.blocking);
  const band: MatchBand = blockingFailure
    ? "NOT_ELIGIBLE"
    : problemFit.ok && contextValidity.ok && infrastructure.ok && conditionsSatisfiable.ok
      ? "STRONG"
      : "GAPS";

  return {
    hospital,
    band,
    breakdown,
    chronology,
    summary: summarise(band, breakdown),
  };
}

function summarise(band: MatchBand, b: MatchBreakdown): string {
  if (band === "NOT_ELIGIBLE") {
    const reasons = [
      !b.contextValidity.ok ? b.contextValidity.detail : null,
      !b.infrastructure.ok ? b.infrastructure.detail : null,
    ].filter(Boolean);
    return softenCertainty(reasons.join(" "));
  }
  if (band === "STRONG") return softenCertainty(b.problemFit.detail);
  const gaps = Object.values(b).filter((f) => !f.ok);
  return softenCertainty(`${gaps.length} of four checks did not hold. ${gaps[0]?.detail ?? ""}`);
}

/** The gate id behind a condition, for a readable line. */
function gateLabel(itemId: string): string {
  return getItem(itemId)?.legacyGateId ?? itemId;
}

/**
 * Which referral pathway a claim implies. Keyword-based on purpose: the item
 * bank has no field for it yet — D1.A patient outcomes, where it would live, is
 * still four unauthored stubs — so this reads the claim rather than pretending
 * to a structure that does not exist.
 */
function referralPathwayFor(claim: string): string | null {
  const c = claim.toLowerCase();
  if (c.includes("colposcopy")) return "colposcopy";
  if (c.includes("ophthalmology") || c.includes("retinopathy")) return "ophthalmology";
  if (c.includes("tuberculosis") || c.includes(" tb ")) return "TB confirmatory";
  return null;
}

/** Rank sites for a tool: strongest first, ineligible last but never hidden. */
export function matchToolToSites(args: {
  card: ReadinessCard;
  toolName: string;
  hospitals: Hospital[];
  profiles: SiteOperatingProfile[];
  registers: ProblemRegister[];
}): ContextMatch[] {
  const order: Record<MatchBand, number> = { STRONG: 0, GAPS: 1, NOT_ELIGIBLE: 2 };
  return args.hospitals
    .map((hospital) =>
      matchToolToSite({
        card: args.card,
        toolName: args.toolName,
        hospital,
        profile: args.profiles.find((p) => p.hospitalId === hospital.id),
        register: args.registers.find((r) => r.hospitalId === hospital.id),
      })
    )
    .sort((a, b) => order[a.band] - order[b.band]);
}
