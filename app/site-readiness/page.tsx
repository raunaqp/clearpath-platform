"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Upload } from "lucide-react";
import type { Hospital } from "@/lib/schemas/hospital";
import type { SiteListing } from "@/lib/schemas/site";
import { runSiteAssessment, type SiteAssessmentInput } from "@/lib/engine/readiness-site";
import { HOST_PROFILES, hostProfile, type HostProfile } from "@/lib/site-profiles";
import { SiteReadinessPanel } from "@/components/site/SiteReadinessPanel";
import { useHospital } from "@/lib/hospital/HospitalContext";
import { getHospital, getSiteListingByHospital, submitSiteToRegistry } from "@/lib/mock/api";
import { cn } from "@/lib/utils";

/**
 * Site-readiness self-assessment — persona-aware (Mode A). It prefills the
 * CURRENT hospital's six-domain scores, computes grade + gap list through the
 * real engine, and lets the site LIST ITS READINESS on the registry so vendors
 * and sponsors can find it (including a still-developing site). Same engine as
 * the per-trial check inside the workflow (Mode B).
 */
const FALLBACK: SiteAssessmentInput = {
  governance: "TIER_B", people: "TIER_B", infrastructure: "NOT_YET",
  data: "TIER_B", regulatory: "NOT_YET", access: "TIER_B",
};

function listingHeadline(grade: string, profileLabel: string, openGaps: number): string {
  const host = profileLabel.toLowerCase();
  if (grade === "NOT_READY")
    return `Developing site — ${openGaps} onboarding gap${openGaps === 1 ? "" : "s"} open; building toward hosting a ${host}.`;
  if (grade === "TIER_A") return `Deployment-ready to host a ${host}.`;
  return `Trial-ready to host a ${host}.`;
}

export default function SiteReadinessPage() {
  const { hospitalId } = useHospital();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [siteName, setSiteName] = useState("");
  const [profile, setProfile] = useState<HostProfile>("trial");
  const [scores, setScores] = useState<SiteAssessmentInput>(FALLBACK);
  const [listing, setListing] = useState<SiteListing | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill from the current persona hospital + load any existing listing.
  useEffect(() => {
    let live = true;
    (async () => {
      const [h, existing] = await Promise.all([
        getHospital(hospitalId),
        getSiteListingByHospital(hospitalId),
      ]);
      if (!live) return;
      setHospital(h ?? null);
      setSiteName(h?.name ?? "");
      setScores((h?.siteReadiness.domainScores as SiteAssessmentInput) ?? FALLBACK);
      setListing(existing ?? null);
    })();
    return () => { live = false; };
  }, [hospitalId]);

  const assessment = useMemo(() => runSiteAssessment(scores), [scores]);
  const p = hostProfile(profile);
  const headline = listingHeadline(assessment.grade, p.label, assessment.gaps.length);

  async function submit() {
    setSubmitting(true);
    const result = await submitSiteToRegistry({
      hospitalId,
      grade: assessment.grade,
      profile,
      headline,
      openGaps: assessment.gaps.length,
    });
    setListing(result);
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/hospital" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Inbox
      </Link>

      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Site-readiness self-assessment
        </p>
        <h1 className="font-serif text-3xl text-ink">Check our site readiness</h1>
        <p className="text-sm text-muted">
          Grade your site's readiness to run an AI pilot across six domains. Pick what you want
          to host — the weighting adapts. This is about the SITE, not any one tool.
        </p>
        {hospital?.specialty && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-teal-light px-2.5 py-0.5 text-xs text-teal-deep">
            Scoped to {hospital.specialty.toLowerCase()} trials
          </p>
        )}
      </header>

      <label className="block space-y-1.5">
        <span className="text-sm text-ink">Site name</span>
        <input
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="e.g. District Hospital — Site B"
          className="w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
      </label>

      {/* What do you want to host? — parameterizes the emphasis */}
      <div className="space-y-2">
        <p className="text-sm text-ink">What do you want to host?</p>
        <div className="flex flex-wrap gap-2">
          {HOST_PROFILES.map((hp) => (
            <button
              key={hp.value}
              onClick={() => setProfile(hp.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                profile === hp.value ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink"
              )}
            >
              {hp.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{p.blurb}</p>
      </div>

      <SiteReadinessPanel scores={scores} onChange={setScores} profile={profile} />

      {/* List this site on the registry */}
      <section className="rounded-card border border-line bg-bg-card p-5">
        <h2 className="font-serif text-lg text-ink">List this site on the registry</h2>
        <p className="mt-1 text-sm text-muted">
          Publish your readiness so vendors and sponsors can find you — even while you&apos;re still
          developing. Your grade and open gaps are shown honestly.
        </p>
        <p className="mt-3 rounded-md bg-bg-sink px-3 py-2 text-sm text-ink">{headline}</p>

        {listing ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-green-dark">
              <CheckCircle2 className="h-4 w-4" /> Listed on the registry as a{" "}
              {listing.grade === "NOT_READY" ? "developing" : "ready"} site
            </span>
            <Link href="/registry" className="inline-flex items-center gap-1 text-sm text-teal-deep">
              View on registry <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button onClick={submit} disabled={submitting} className="text-xs text-muted underline underline-offset-2 hover:text-ink-2 disabled:opacity-60">
              {submitting ? "Updating…" : "Update listing"}
            </button>
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-teal-deep px-3.5 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit readiness to the registry"}
          </button>
        )}
      </section>
    </div>
  );
}
