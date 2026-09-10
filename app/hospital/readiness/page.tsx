"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import type { SiteOperatingProfile } from "@/lib/schemas/site-profile";
import type { Hospital } from "@/lib/schemas/hospital";
import { getSiteProfile } from "@/lib/mock/api-registry";
import { getHospital } from "@/lib/mock/api";
import { CARE_LEVEL_LABEL, DEPLOYMENT_MODE_LABEL, OPERATOR_CADRE_LABEL } from "@/lib/schemas/context";
import { SITE_GRADE_STYLE, formatCardDate } from "@/lib/ui";
import { SiteArchetype } from "@/components/hospital/SiteArchetype";
import { cn } from "@/lib/utils";

/**
 * S13 — the site readiness baseline.
 *
 * This screen AUTHORS the record that matching (S9), facilitation (S11) and
 * triage (S16) already read. One shape, one record — a second one would let the
 * screen that writes it disagree with the screens that cite it.
 *
 * THE BASELINE DATE IS DISPLAYED, not merely stored. A site profile written
 * after a tool arrives is a justification rather than a baseline, and the
 * chronology is the only thing that distinguishes them. It is trivially easy to
 * describe your own infrastructure in whatever terms make the tool in front of
 * you look like a fit; the date is what makes that checkable.
 */
const HOSPITAL_ID = "hosp-northvale";
/** The date CerviAI was submitted — what the baseline is measured against. */
const SUBMITTED_AT = "2026-09-15T00:00:00.000Z";

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export default function SiteReadinessPage() {
  const [profile, setProfile] = useState<SiteOperatingProfile | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [p, h] = await Promise.all([getSiteProfile(HOSPITAL_ID), getHospital(HOSPITAL_ID)]);
      if (!live) return;
      setProfile(p ?? null);
      setHospital(h ?? null);
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!profile || !hospital) {
    return <div className="mx-auto max-w-lg py-16 text-center"><p className="font-serif text-xl text-ink">No baselined profile</p></div>;
  }

  const grade = SITE_GRADE_STYLE[hospital.siteReadiness.grade];
  const lead = daysBetween(profile.baselinedAt, SUBMITTED_AT);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href="/hospital" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Inbox
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Site readiness baseline
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">{hospital.name}</h1>
        <SiteArchetype profile={profile} />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-sm", grade.tint)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", grade.dot)} />
            {grade.label}
          </span>
        </div>
      </header>

      {/* The chronology, stated */}
      <section className="rounded-card border border-teal-deep/30 bg-teal-light/30 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal-deep">Baselined</p>
        <p className="mt-1 font-serif text-xl text-ink">{formatCardDate(profile.baselinedAt)}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {lead} days before CerviAI was submitted on {formatCardDate(SUBMITTED_AT)}. A profile
          written after a tool arrives is a justification, not a baseline — the dates are the only
          thing that tells them apart.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Block title="Facility">
          <Line label={profile.facility.type} />
          <Line label={profile.facility.catchment} />
          <Line label={`Operates at ${profile.careLevels.map((c) => CARE_LEVEL_LABEL[c]).join(", ")}`} />
          <Line label={`Delivers via ${profile.deploymentModes.map((m) => DEPLOYMENT_MODE_LABEL[m]).join(", ")}`} />
        </Block>

        <Block title="Power">
          <Line label={`${profile.infrastructure.powerBackupHours}h backup`} />
          {profile.infrastructure.powerNote && <Line label={profile.infrastructure.powerNote} muted />}
        </Block>

        <Block title="Connectivity">
          <Line label={`${profile.infrastructure.connectivity} at camp sites`} />
          <Flag on={profile.infrastructure.offlineCaptureSupported} label="Offline capture required and supported" />
        </Block>

        <Block title="Digital">
          <Flag on={profile.digital.emrPresent} label="EMR present" />
          <Flag on={profile.digital.fhirSurfaceAvailable} label="FHIR surface available" />
          <Flag on={profile.digital.abdmParticipating} label="ABDM participating" />
        </Block>

        <Block title="People">
          <Line label={`${profile.staffing.releasableOperators} ${OPERATOR_CADRE_LABEL[profile.staffing.operatorCadre]}s releasable`} />
          <Line label={`${profile.staffing.trainingCapacityHours}h training capacity`} />
          <Flag on={profile.staffing.clinicianSupervisionOnSite} label="Clinician supervision on site" />
        </Block>

        <Block title="Governance">
          <Flag on={profile.governance.dpoAppointed} label="DPO appointed" />
          <Flag on={profile.governance.dpiaProcessInPlace} label="DPIA process in place" />
          <Flag on={profile.governance.incidentRouteDefined} label="Incident route defined" />
        </Block>
      </div>

      <section className="rounded-card border border-line bg-bg-card px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Referral pathways</p>
        <p className="mt-1 text-sm text-ink">{profile.infrastructure.referralPathways.join(" · ")}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          A screening tool whose positive flag lands in a pathway this site does not have has raised
          an alarm, not made a referral. Triage checks the request against this list.
        </p>
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-bg-card px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{title}</p>
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </section>
  );
}
function Line({ label, muted }: { label: string; muted?: boolean }) {
  return <li className={cn("text-sm leading-relaxed", muted ? "text-muted" : "text-ink")}>{label}</li>;
}
function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed text-ink">
      {on ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B6D11]" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#993C1D]" />}
      <span className={on ? "" : "text-muted"}>{label}</span>
    </li>
  );
}
