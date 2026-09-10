"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import type { PlacementRecord } from "@/lib/schemas/governance";
import { getPlacement } from "@/lib/mock/api-governance";

/**
 * S19 — placement and site fit.
 *
 * The step most often skipped in real deployments, and the one that decides
 * whether the trial measures anything real. A tool with excellent evidence,
 * placed at the wrong point in a pathway, measures the pathway.
 *
 * TWO FIELDS CARRY MOST OF THE WEIGHT.
 *
 * `replaces: null` is rendered as a WARNING, not a neutral answer. Additive
 * work at the frontline is the commonest cause of a tool being quietly
 * abandoned once the pilot team stops visiting — nobody refuses it, they just
 * stop doing it. A screen that reported "replaces: nothing" in the same weight
 * as everything else would be hiding the single most predictive fact about
 * whether this survives.
 *
 * `loadDeltaMinutesPerPatient` is a NUMBER because S23 measures observed load
 * against it. "About two minutes" cannot be compared to anything.
 */
export default function PlacementPage() {
  const { id } = useParams<{ id: string }>();
  const [placement, setPlacement] = useState<PlacementRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const p = await getPlacement(id);
      if (!live) return;
      setPlacement(p ?? null); setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }
  if (!placement) {
    return <div className="mx-auto max-w-lg py-16 text-center"><p className="font-serif text-xl text-ink">No placement decision recorded</p></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href={`/hospital/governance/${id}/verdict`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Committee verdict
      </Link>

      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Placement and site fit
        </p>
        <h1 className="font-serif text-3xl leading-tight text-ink">Where this sits in the pathway</h1>
      </header>

      {/* The warning, not a row */}
      {placement.replaces === null && (
        <section className="rounded-card border border-[#BA7517]/40 bg-[#FAEEDA] px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
            <AlertTriangle className="h-3.5 w-3.5" /> Replaces nothing — this is additive
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#0E1411]">
            The tool adds a second read. Nothing is removed from the nurse&apos;s work, and the
            estimated load delta is <strong>+{placement.loadDeltaMinutesPerPatient} minutes per
            patient</strong>.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#8A5610]">
            Additive work at the frontline is the commonest cause of silent abandonment — nobody
            refuses it, they stop doing it once the pilot team stops visiting. The day-45 interim
            should look at this before it looks at accuracy.
          </p>
        </section>
      )}

      <section className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
        <Row label="Pathway position">{placement.pathwayPosition}</Row>
        <Row label="Replaces">
          {placement.replaces ?? (
            <span className="text-[#BA7517]">Nothing is removed — the tool adds a second read.</span>
          )}
        </Row>
        <div className="px-5 py-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Touchpoints</p>
          <ul className="mt-1.5 space-y-1">
            {placement.touchpoints.map((t) => (
              <li key={t.actor} className="text-sm leading-relaxed text-ink">
                <span className="text-ink-2">{t.actor}</span> — {t.action}
              </li>
            ))}
          </ul>
        </div>
        <Row label="Decision authority">
          {placement.decisionAuthority.role}. {placement.decisionAuthority.note}
        </Row>
        <Row label="Integration">
          {placement.integration.emrWriteBack ? "EMR write-back enabled." : placement.integration.note}{" "}
          {placement.integration.exportCadence}.
        </Row>
        <Row label="Consent point">
          {placement.consentPoint.when}, in {placement.consentPoint.language}, on{" "}
          {placement.consentPoint.medium.toLowerCase()}
          {placement.consentPoint.beforeCapture ? ", before image capture" : ""}.
        </Row>
        <Row label="Load delta">
          Estimated +{placement.loadDeltaMinutesPerPatient} minutes per patient for the nurse.
          <span className="mt-1 block text-xs leading-relaxed text-muted">
            Stored as a number, not prose — observed load during the trial is measured against this
            estimate, and &ldquo;about two minutes&rdquo; cannot be compared to anything.
          </span>
        </Row>
        <Row label="Fallback">{placement.fallback}</Row>
      </section>

      <Link
        href={`/hospital/governance/${id}/charter`}
        className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
      >
        Trial charter <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}
