"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Store } from "lucide-react";
import type { Deployment, Phase } from "@/lib/schemas/deployment";
import type { Tool } from "@/lib/schemas/tool";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Vendor } from "@/lib/schemas/vendor";
import type { Document } from "@/lib/schemas/document";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import {
  getDeployment,
  getDeploymentBySlug,
  getTool,
  getHospital,
  getVendor,
  getReadinessCardByTool,
  getDocumentsByIds,
  advanceDeployment,
  updateDeployment,
  startPilot,
  publishToRegistry,
} from "@/lib/mock/api";
import { buildScorecard, buildOwnership, buildTrialEndpoints } from "@/lib/engine/deployment-report";
import { phasesFor, phaseIndex } from "@/lib/workspace/phases";
import { VERDICT_STYLE, SITE_GRADE_STYLE, scoreAccent } from "@/lib/ui";
import { PhaseStepper } from "@/components/workspace/PhaseStepper";
import { MetricCard } from "@/components/workspace/MetricCard";
import { CtriRegistration } from "@/components/workspace/CtriRegistration";
import { CommitteeSection } from "@/components/workspace/CommitteeSection";
import { MonitoringDashboard } from "@/components/workspace/MonitoringDashboard";
import { AttachedEvidence } from "@/components/card/AttachedEvidence";
import { SiteReadinessPanel } from "@/components/site/SiteReadinessPanel";
import VendorStatusDashboard from "@/components/workspace/VendorStatusDashboard";
import { useRole } from "@/lib/role/RoleContext";
import { downloadReportPdf } from "@/lib/pdf/report";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The full workspace (stepper + monitoring + docs + report + handover) is a
 * HOSPITAL activity. Vendors get a read-only light status dashboard instead.
 */
export default function WorkspacePage() {
  const { role } = useRole();
  return role === "vendor" ? <VendorStatusDashboard /> : <HospitalWorkspace />;
}

const ROLE_STATUS: Record<string, string> = {
  active: "bg-[#EAF3DE] text-[#3B6D11]",
  complete: "bg-[#EAF3DE] text-[#3B6D11]",
  assigned: "bg-[#E1F5EE] text-[#0F6E56]",
  pending: "bg-[#FAEEDA] text-[#BA7517]",
};
const REC_STYLE: Record<string, string> = {
  SCALE: "bg-[#3B6D11] text-white",
  EXTEND: "bg-[#BA7517] text-white",
  STOP: "bg-[#993C1D] text-white",
};

function HospitalWorkspace() {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const router = useRouter();

  const [dep, setDep] = useState<Deployment | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [card, setCard] = useState<ToolReadinessCard | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [view, setView] = useState<Phase>("setup");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const d = await getDeploymentBySlug(deploymentId);
      if (!d) { if (live) setLoading(false); return; }
      const [t, h, c] = await Promise.all([getTool(d.toolId), getHospital(d.hospitalId), getReadinessCardByTool(d.toolId)]);
      const [v, ds] = await Promise.all([t ? getVendor(t.vendorId) : Promise.resolve(undefined), getDocumentsByIds(d.docIds)]);
      if (!live) return;
      if (t && deploymentId !== t.slug) router.replace(`/workspace/${t.slug}`);
      setDep(d); setTool(t ?? null); setHospital(h ?? null); setVendor(v ?? null); setCard(c ?? null); setDocs(ds); setView(d.phase); setLoading(false);
    })();
    return () => { live = false; };
  }, [deploymentId]);

  async function advance(phase: Phase, patch?: Partial<Deployment>) {
    if (!dep) return;
    setBusy(true);
    if (patch) await updateDeployment(dep.id, patch);
    const updated = await advanceDeployment(dep.id, phase);
    if (updated) { setDep(updated); setView(phase); }
    setBusy(false);
  }
  async function start() {
    if (!dep) return;
    setBusy(true);
    const d = await startPilot(dep.id);
    if (d) { setDep(d); setView(d.phase); }
    setBusy(false);
  }
  async function generateAnalysis() {
    if (!dep) return;
    const { endpoints, recommendation } = buildTrialEndpoints(dep);
    await advance("analysis", { endpoints, recommendation });
  }
  async function generateReview() {
    if (!dep) return;
    const { scorecard, recommendation } = buildScorecard(dep, card);
    await advance("review", { scorecard, recommendation });
  }
  async function prepareFinal() {
    if (!dep) return;
    const ownership = buildOwnership({ hospitalName: hospital?.name ?? "The hospital", vendorName: vendor?.name ?? "The vendor" });
    await advance(dep.kind === "trial" ? "closeout" : "handover", { ownership });
  }
  async function publish() {
    if (!dep) return;
    setBusy(true);
    await publishToRegistry(dep.id);
    const updated = await getDeployment(dep.id);
    if (updated) setDep(updated);
    setBusy(false);
  }
  async function downloadReport() {
    if (dep && tool) await downloadReportPdf(dep, tool, hospital?.name ?? "The hospital");
  }
  const ReportPdfButton = () => (
    <button onClick={downloadReport} className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink">
      <FileDown className="h-4 w-4" /> Download report (PDF)
    </button>
  );

  if (loading) return <div className="flex justify-center py-24"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  if (!dep || !tool) {
    return <div className="mx-auto max-w-lg py-16 text-center"><p className="font-serif text-xl text-ink">Deployment not found</p><Link href="/hospital" className="mt-3 inline-block text-sm text-teal-deep">← Back to inbox</Link></div>;
  }

  const isTrial = dep.kind === "trial";
  const phases = phasesFor(dep.kind);
  const reachedIdx = phaseIndex(dep.kind, dep.phase);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/hospital" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep"><ArrowLeft className="h-4 w-4" /> Inbox</Link>

      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          {isTrial ? "Clinical trial workspace · eTMF + study endpoints" : "Deployment workspace · lighter docs + operational scorecard"}
        </p>
        <h1 className="font-serif text-3xl text-ink">{tool.name}</h1>
        <p className="text-sm text-muted">
          {hospital?.name} · {isTrial ? "clinical trial" : "deployment"} · day {dep.dayOf} of {dep.totalDays}
          {dep.published && <span className="ml-2 rounded-full bg-[#EAF3DE] px-2 py-0.5 text-xs text-[#3B6D11]">Published</span>}
        </p>
      </header>

      <div className="rounded-xl border border-line bg-bg-card p-4">
        <PhaseStepper phases={phases} reachedIndex={reachedIdx} view={view} onSelect={setView} />
      </div>

      {/* ── PRE: setup / ethics_setup ─────────────────────────────────────── */}
      {(view === "setup" || view === "ethics_setup") && (
        <Panel title={isTrial ? "Ethics & CTRI setup" : "Setup · readiness confirmed"}>
          <div className="grid gap-3 sm:grid-cols-3">
            <ConfirmTile label="Site readiness" value={hospital ? SITE_GRADE_STYLE[hospital.siteReadiness.grade].label : "—"} ok />
            <ConfirmTile label="Tool verdict" value={card ? VERDICT_STYLE[card.verdict].label : "—"} ok />
            <ConfirmTile label={isTrial ? "eTMF / ethics docs" : "Signed documents"} value={`${docs.length} on file`} ok />
          </div>

          {/* Mode B — per-trial site readiness (scoped to THIS request; same engine) */}
          {isTrial && hospital && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm text-muted">Site readiness to host this trial · {hospital.name}</h3>
              <SiteReadinessPanel scores={hospital.siteReadiness.domainScores} profile="trial" />
            </div>
          )}

          {isTrial && (
            <div className="mt-5">
              <CtriRegistration deployment={dep} tool={tool} onPrepared={setDep} />
            </div>
          )}

          <h3 className="mt-5 mb-2 text-sm text-muted">{isTrial ? "eTMF / ethics / CTRI documents" : "Deployment documents"}</h3>
          <AttachedEvidence docs={docs} />

          <h3 className="mt-5 mb-2 text-sm text-muted">Roles</h3>
          <RolesList dep={dep} />

          {dep.phase === (isTrial ? "ethics_setup" : "setup") ? (
            <button onClick={start} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">
              {isTrial ? "Start enrolment" : "Start deployment"}
            </button>
          ) : (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-[#3B6D11]"><Check className="h-4 w-4" /> {isTrial ? "Enrolment started." : "Deployment started."}</p>
          )}
        </Panel>
      )}

      {/* ── DURING: enrolment / go_live ───────────────────────────────────── */}
      {(view === "enrolment" || view === "go_live") && (
        <Panel title={isTrial ? "Enrolment" : "Go-live"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dep.metrics.length ? dep.metrics.map((m) => <MetricCard key={m.key} metric={m} />) : <p className="text-sm text-muted">Metrics accrue once {isTrial ? "enrolment" : "go-live"} starts.</p>}
          </div>
          <h3 className="mt-5 mb-2 text-sm text-muted">Committee</h3>
          <CommitteeSection deploymentId={dep.id} onAdded={setDep} />
          <h3 className="mt-5 mb-2 text-sm text-muted">Workflow &amp; roles</h3>
          <RolesList dep={dep} />
        </Panel>
      )}

      {/* ── DURING: monitoring — interactive governance dashboard ─────────── */}
      {view === "monitoring" && (
        <Panel title="Monitoring · governance dashboard">
          <MonitoringDashboard deploymentId={dep.id} alerts={dep.alerts} />
        </Panel>
      )}

      {/* ── POST (trial): analysis · study endpoints ──────────────────────── */}
      {view === "analysis" && (
        <Panel title="Analysis · study endpoints">
          {dep.endpoints.length === 0 ? (
            <div className="text-sm text-muted">
              <p>Study endpoints are computed against the trial's targets.</p>
              <button onClick={generateAnalysis} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">Generate analysis</button>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {dep.endpoints.map((e) => (
                  <li key={e.name} className="rounded-lg border border-line bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-ink"><span className="text-muted">{e.kind}</span> · {e.name}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", e.met ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FAECE7] text-[#993C1D]")}>{e.met ? "met" : "missed"}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">Target {e.target} · Result {e.result}</p>
                  </li>
                ))}
              </ul>
              {dep.recommendation && <RecommendationBand rec={dep.recommendation} />}
              <div className="flex flex-wrap items-center gap-3">
                {dep.phase !== "closeout" && <button onClick={prepareFinal} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">Prepare closeout</button>}
                <ReportPdfButton />
              </div>
            </>
          )}
        </Panel>
      )}

      {/* ── POST (deployment): review · operational scorecard ─────────────── */}
      {view === "review" && (
        <Panel title="Review · operational scorecard">
          {dep.scorecard.length === 0 ? (
            <div className="text-sm text-muted">
              <p>The operational scorecard is generated from the deployment's evidence.</p>
              <button onClick={generateReview} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">Generate scorecard</button>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {dep.scorecard.map((l) => (
                  <div key={l.key} className="rounded-lg border border-line bg-white px-4 py-3">
                    <div className="flex items-baseline justify-between"><span className="text-sm text-ink">{l.label}</span><span className="font-serif text-lg tabular-nums" style={{ color: scoreAccent(l.score) }}>{l.score}</span></div>
                    <div className="my-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE3]"><div className="h-full rounded-full" style={{ width: `${l.score}%`, backgroundColor: scoreAccent(l.score) }} /></div>
                    <p className="text-xs text-muted">{l.note}</p>
                  </div>
                ))}
              </div>
              {dep.recommendation && <RecommendationBand rec={dep.recommendation} />}
              <div className="flex flex-wrap items-center gap-3">
                {dep.phase !== "handover" && <button onClick={prepareFinal} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">Prepare handover</button>}
                <ReportPdfButton />
              </div>
            </>
          )}
        </Panel>
      )}

      {/* ── POST: closeout / handover · ownership + publish ───────────────── */}
      {(view === "closeout" || view === "handover") && (
        <Panel title={isTrial ? "Closeout · ownership + publish" : "Handover · ownership + publish"}>
          {!dep.ownership ? (
            <div className="text-sm text-muted">
              <p>Prepare the ownership plan to {isTrial ? "close the trial out" : "hand the deployment over"}.</p>
              <button onClick={prepareFinal} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">Prepare {isTrial ? "closeout" : "handover"}</button>
            </div>
          ) : (
            <>
              <dl className="divide-y divide-line-soft rounded-lg border border-line bg-white">
                {[["Runs", dep.ownership.runs], ["Maintains", dep.ownership.maintains], ["Pays", dep.ownership.pays], ["Referral backstop", dep.ownership.referralBackstop], ["Monitoring cadence", dep.ownership.monitoringCadence]].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:justify-between"><dt className="text-xs uppercase tracking-wide text-muted">{k}</dt><dd className="text-sm text-ink sm:max-w-md sm:text-right">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {dep.published ? (
                  <p className="flex items-center gap-1.5 text-sm text-[#3B6D11]"><Check className="h-4 w-4" /> Result published to the registry.<Link href="/registry" className="text-teal-deep">View in the registry →</Link></p>
                ) : (
                  <button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"><Store className="h-4 w-4" /> Publish result to marketplace registry</button>
                )}
                <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink"><FileDown className="h-4 w-4" /> Download report (PDF)</button>
              </div>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-line bg-bg-card p-5"><h2 className="mb-4 border-b border-line pb-2 font-serif text-xl text-ink">{title}</h2>{children}</section>;
}
function ConfirmTile({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-[#D9D5C8] bg-white px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">{label}</p>
      <p className={cn("mt-1 flex items-center gap-1.5 text-sm", ok ? "text-ink" : "text-coral-brand")}>{ok && <Check className="h-3.5 w-3.5 text-[#3B6D11]" />}{value}</p>
    </div>
  );
}
function RolesList({ dep }: { dep: Deployment }) {
  if (!dep.roles.length) return <p className="text-sm text-muted">Roles are assigned at setup.</p>;
  return (
    <ul className="divide-y divide-line-soft rounded-lg border border-line bg-white">
      {dep.roles.map((r) => (
        <li key={r.role} className="flex items-center justify-between px-4 py-2.5">
          <div><p className="text-sm text-ink">{r.role}</p><p className="text-xs text-muted">{r.person}</p></div>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", ROLE_STATUS[r.status] ?? "bg-bg-sink text-muted")}>{r.status}</span>
        </li>
      ))}
    </ul>
  );
}
function RecommendationBand({ rec }: { rec: NonNullable<Deployment["recommendation"]> }) {
  return (
    <div className={cn("mt-4 rounded-xl px-5 py-4", REC_STYLE[rec.decision])}>
      <p className="font-mono text-[11px] uppercase tracking-widest opacity-80">Recommendation</p>
      <p className="mt-1 font-serif text-2xl uppercase tracking-wide">{rec.decision}</p>
      <p className="mt-1.5 text-sm opacity-95">{rec.rationale}</p>
    </div>
  );
}
