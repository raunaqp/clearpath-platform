"use client";

import { useEffect, useState } from "react";
import type { SiteAssessmentInput } from "@/lib/engine/readiness-site";
import { SiteReadinessPanel } from "@/components/site/SiteReadinessPanel";
import { getHospital } from "@/lib/mock/api";

/**
 * Demo for brief §3.2 — the site-readiness view itself.
 *
 * Renders the REAL <SiteReadinessPanel> (the same component `/site-readiness`
 * and the in-trial readiness check both use) in its read-only mode: no
 * `onChange`, so it computes grade and gaps through the real engine but cannot
 * be edited. Scores come from the Northvale fixture exactly as the product
 * page seeds them (`hospital.siteReadiness.domainScores`) — nothing invented.
 */
export function SiteReadinessDemo() {
  const [scores, setScores] = useState<SiteAssessmentInput | null>(null);

  useEffect(() => {
    let live = true;
    void getHospital("hosp-northvale").then((h) => {
      if (live && h) setScores(h.siteReadiness.domainScores as SiteAssessmentInput);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!scores) return <PreviewSpinner />;
  return <SiteReadinessPanel scores={scores} profile="trial" />;
}

export function PreviewSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
    </div>
  );
}
