"use client";

import { useMemo } from "react";
import type { SiteDomainId, SiteTier } from "@/lib/schemas/site";
import { SITE_DOMAINS, SITE_DOMAIN_ORDER } from "@/lib/engine/gates";
import { runSiteAssessment, type SiteAssessmentInput } from "@/lib/engine/readiness-site";
import { SITE_GRADE_STYLE, SITE_TIER_STYLE } from "@/lib/ui";
import { hostProfile, type HostProfile } from "@/lib/site-profiles";
import { Segmented } from "@/components/wizard/Segmented";
import { cn } from "@/lib/utils";

/**
 * Shared site-readiness panel — used by BOTH the general self-assessment
 * (Mode A, editable) and the per-trial readiness check inside the workflow
 * (Mode B, read-only). Both compute grade + gaps from the same engine
 * (`runSiteAssessment`); the `profile` only changes which domains are
 * emphasised and how gaps are ordered (presentation).
 */
const TIER_OPTIONS = [
  { value: "TIER_A" as SiteTier, label: "Tier A", tone: "pass" as const },
  { value: "TIER_B" as SiteTier, label: "Tier B", tone: "neutral" as const },
  { value: "NOT_YET" as SiteTier, label: "Not yet", tone: "fail" as const },
];

export function SiteReadinessPanel({
  scores,
  onChange,
  profile,
}: {
  scores: SiteAssessmentInput;
  /** Provide to make it editable (Mode A). Omit for read-only (Mode B). */
  onChange?: (scores: SiteAssessmentInput) => void;
  profile: HostProfile;
}) {
  const p = hostProfile(profile);
  const focus = new Set(p.focus);
  const result = useMemo(() => runSiteAssessment(scores), [scores]);
  const grade = SITE_GRADE_STYLE[result.grade];
  const editable = !!onChange;

  // Focus-domain gaps first (presentation only; engine order preserved otherwise).
  const gaps = [...result.gaps].sort((a, b) => Number(focus.has(b.domain)) - Number(focus.has(a.domain)));

  return (
    <div className="space-y-4">
      {/* Grade */}
      <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl px-5 py-4", grade.surface)}>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest opacity-80">Site grade · to host a {p.label.toLowerCase()}</p>
          <p className="font-serif text-2xl">{grade.label}</p>
        </div>
        <p className="text-sm opacity-90">{result.gaps.length} onboarding gap{result.gaps.length === 1 ? "" : "s"}</p>
      </div>

      {/* Domains */}
      <div className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
        {SITE_DOMAIN_ORDER.map((d: SiteDomainId) => (
          <div key={d} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 pr-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-ink">{SITE_DOMAINS[d].label}</p>
                {focus.has(d) && (
                  <span className="rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] text-[#0F6E56]">Priority for this</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted">{SITE_DOMAINS[d].question}</p>
            </div>
            {editable ? (
              <Segmented
                ariaLabel={SITE_DOMAINS[d].label}
                options={TIER_OPTIONS}
                value={scores[d]}
                onChange={(v) => onChange!({ ...scores, [d]: v })}
              />
            ) : (
              <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs", SITE_TIER_STYLE[scores[d]].tint)}>
                {SITE_TIER_STYLE[scores[d]].label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Gaps = onboarding work order */}
      <section>
        <h2 className="mb-2 border-b border-line pb-1.5 font-serif text-lg text-ink">Onboarding work order</h2>
        {gaps.length === 0 ? (
          <p className="text-sm text-muted">No gaps — the site is ready at this grade.</p>
        ) : (
          <ul className="space-y-2">
            {gaps.map((g) => (
              <li key={g.domain} className="flex items-start gap-3 rounded-card border border-line bg-bg-card px-4 py-3">
                <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px]", SITE_TIER_STYLE[scores[g.domain]].tint)}>
                  {SITE_TIER_STYLE[scores[g.domain]].label}
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    {SITE_DOMAINS[g.domain].label}
                    {focus.has(g.domain) && <span className="rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] text-[#0F6E56]">Priority</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{g.fix}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
