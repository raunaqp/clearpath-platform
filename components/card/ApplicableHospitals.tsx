"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, LayoutGrid, Table2 } from "lucide-react";
import type { Tool, ToolCategory } from "@/lib/schemas/tool";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { Hospital } from "@/lib/schemas/hospital";
import type { SiteGrade } from "@/lib/schemas/site";
import type { RequestType } from "@/lib/schemas/submission";
import { applicableHospitals, requestTypeForGrade, type HospitalMatch } from "@/lib/match";
import { getHospitals } from "@/lib/mock/api";
import { SITE_GRADE_STYLE } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Applicable hospitals — the vendor sees the sites that fit this tool. The
 * action is keyed off the site's readiness tier (BUILD_SPEC — change 1):
 *   Tier B (trial-ready)      → a trial is the shape of engagement
 *   Tier A (deployment-ready) → a deployment is
 *
 * The ACTION on every row is the same regardless: express interest to
 * ClearPath. The tier decides what would eventually be requested, not who the
 * innovator gets to contact.
 *   Not ready                 → no action ("Not applicable")
 * Shown as cards or a table; the request lands in that hospital's inbox
 * labelled with the request type.
 */
const CATEGORY_LABEL: Record<ToolCategory, string> = {
  screening: "Screening",
  samd: "SaMD",
  "point-of-care": "Point-of-care",
  cds: "CDS",
  "patient-facing": "Patient-facing",
  platform: "Platform",
};

type TierAction = { label: string; requestType: RequestType } | null;

function tierAction(grade: SiteGrade): TierAction {
  const requestType = requestTypeForGrade(grade);
  if (!requestType) return null; // NOT_READY → not applicable
  return { label: requestType === "trial" ? "Request clinical trial" : "Request deployment", requestType };
}

export function ApplicableHospitals({
  tool,
  card,
}: {
  tool: Tool;
  card: ToolReadinessCard;
}) {
  const router = useRouter();
  const [matches, setMatches] = useState<HospitalMatch[] | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");

  useEffect(() => {
    let live = true;
    void getHospitals().then((hospitals: Hospital[]) => {
      if (live) setMatches(applicableHospitals(tool, hospitals));
    });
    return () => {
      live = false;
    };
  }, [tool]);

  /**
   * DELIBERATELY NOT A HOSPITAL WRITE ANY MORE.
   *
   * This used to call `submitToHospital`, putting the tool straight into that
   * hospital's inbox. That skipped every part of ClearPath's actual job — fit
   * validation against records the site published before this tool existed, the
   * innovator's own permission to share, and asking the hospital rather than
   * notifying it. Interest now goes to ClearPath and the request form only
   * opens once both sides are willing.
   */
  function goToInterest() {
    router.push(`/submit/${tool.slug}/interest`);
  }

  function seekingLabel(h: Hospital): string {
    return h.seeking.map((c) => CATEGORY_LABEL[c]).join(", ");
  }

  return (
    <section className="mt-4 rounded-xl border border-line bg-bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-ink">Find a best-fit hospital</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Sites that fit {tool.name}. The action follows each site's readiness
            tier — trial-ready sites take a clinical trial; deployment-ready
            sites take a deployment.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-line bg-bg p-0.5">
          {(["cards", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors",
                view === v ? "bg-teal-deep text-white" : "text-ink-2 hover:bg-bg-sink"
              )}
            >
              {v === "cards" ? <LayoutGrid className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
              {v === "cards" ? "Cards" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {matches === null ? (
        <div className="mt-4 flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
        </div>
      ) : matches.length === 0 ? (
        <p className="mt-4 rounded-card border border-line bg-bg px-4 py-6 text-sm text-muted">
          No hospitals in the network currently match this tool's level of care
          and category.
        </p>
      ) : view === "cards" ? (
        <ul className="mt-4 space-y-3">
          {matches.map(({ hospital, reason }) => {
            const grade = SITE_GRADE_STYLE[hospital.siteReadiness.grade];
            const action = tierAction(hospital.siteReadiness.grade);
            return (
              <li key={hospital.id} className="rounded-card border border-line bg-bg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-ink">{hospital.name}</p>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs", grade.tint)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", grade.dot)} />
                        {grade.label}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" /> {hospital.location}
                    </p>
                    <p className="mt-1.5 text-sm text-ink-2">{reason}</p>
                  </div>
                  {action ? (
                    <button
                      onClick={goToInterest}
                      className="inline-flex shrink-0 items-center gap-2 rounded-md bg-teal-deep px-3.5 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <Building2 className="h-4 w-4" />
                      Express interest to ClearPath
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-md border border-line px-3 py-2 text-sm text-muted">
                      Not applicable
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-bg text-left text-[11px] font-mono uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 font-normal">Hospital</th>
                <th className="px-3 py-2.5 font-normal">Location</th>
                <th className="px-3 py-2.5 font-normal">Tier</th>
                <th className="px-3 py-2.5 font-normal">Seeking</th>
                <th className="px-3 py-2.5 font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(({ hospital }) => {
                const grade = SITE_GRADE_STYLE[hospital.siteReadiness.grade];
                const action = tierAction(hospital.siteReadiness.grade);
                    return (
                  <tr key={hospital.id} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-3 text-ink">{hospital.name}</td>
                    <td className="px-3 py-3 text-ink-2">{hospital.location}</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs", grade.tint)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", grade.dot)} />
                        {grade.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{seekingLabel(hospital)}</td>
                    <td className="px-3 py-3">
                      {action ? (
                        <button
                          onClick={goToInterest}
                              className="inline-flex items-center gap-1.5 rounded-md bg-teal-deep px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          Express interest to ClearPath
                        </button>
                      ) : (
                        <span className="text-xs text-muted">Not applicable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
