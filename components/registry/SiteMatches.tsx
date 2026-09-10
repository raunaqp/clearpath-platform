"use client";

import { useEffect, useState } from "react";
import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import type { ContextMatch } from "@/lib/match";
import { matchToolToSites } from "@/lib/match";
import { getHospitals } from "@/lib/mock/api";
import { getSiteProfiles, getProblemRegisters } from "@/lib/mock/api-registry";
import { MatchTable } from "./MatchBreakdown";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * S9 — site matching, explained.
 *
 * Matching READS the site's operating profile and problem register; it does not
 * create them. Those are the site's own records, authored on the site's own
 * screens, and the dates they were established are cited on every row — because
 * the ordering is the whole guarantee. A profile written after a tool arrives
 * is a justification.
 */
export function SiteMatches({
  card,
  toolName,
  slug,
}: {
  card: ReadinessCard;
  toolName: string;
  slug: string;
}) {
  const [matches, setMatches] = useState<ContextMatch[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [hospitals, profiles, registers] = await Promise.all([
        getHospitals(),
        getSiteProfiles(),
        getProblemRegisters(),
      ]);
      if (!live) return;
      setMatches(matchToolToSites({ card, toolName, hospitals, profiles, registers }));
    })();
    return () => {
      live = false;
    };
  }, [card, toolName]);

  return (
    <section className="mt-6 rounded-xl border border-line bg-bg-card p-5">
      <h2 className="font-serif text-lg text-ink">Where this fits, and where it does not</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
        Matched on the card&apos;s declared context against each site&apos;s own operating profile
        and problem register. Sites that do not qualify are shown with the reason rather than
        filtered out — a stated exclusion is more useful than a shorter list.
      </p>

      {matches === null ? (
        <div className="mt-4 flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
        </div>
      ) : (
        <div className="mt-4">
          <MatchTable matches={matches} />
        </div>
      )}

      {/*
        The one action here goes to ClearPath, not to a hospital.
        This replaced a per-hospital "Request clinical trial" button that wrote
        straight into that hospital's inbox — which skipped fit validation,
        skipped the innovator's own permission to share, and told a hospital it
        had received a request it had never been asked about.
      */}
      <Link
        href={`/submit/${slug}/interest`}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
      >
        Express interest to ClearPath <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        You are not contacting a hospital. ClearPath validates the fit, confirms what you are willing
        to share, and approaches the site on your behalf.
      </p>
    </section>
  );
}
