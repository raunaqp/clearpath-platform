"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, Sparkles } from "lucide-react";
import type { GateStatus } from "@/lib/schemas/gate";
import type { Tool } from "@/lib/schemas/tool";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Submission } from "@/lib/schemas/submission";
import type { Document } from "@/lib/schemas/document";
import type { AuditGroupId } from "@/lib/schemas/audit";
import { HOSPITAL_GROUPS, HOSPITAL_GATES, type HospitalGateId } from "@/lib/engine/gates";
import { runHospitalAudit, prefillFromToolCard } from "@/lib/engine/hospital-audit";
import {
  getSubmission,
  getSubmissionBySlug,
  getTool,
  getReadinessCard,
  getHospital,
  getDocumentsByIds,
  getAiSuggestion,
  runAudit,
  setDecision,
} from "@/lib/mock/api";
import { Segmented } from "@/components/wizard/Segmented";
import { VerdictComparison } from "@/components/audit/VerdictComparison";
import { AttachedEvidence } from "@/components/card/AttachedEvidence";
import { StagePathway } from "@/components/hospital/StagePathway";
import { submissionStage } from "@/lib/stages";
import { cn } from "@/lib/utils";

const GATE_OPTIONS = [
  { value: "pass" as GateStatus, label: "Yes", tone: "pass" as const },
  { value: "partial" as GateStatus, label: "Partial", tone: "partial" as const },
  { value: "fail" as GateStatus, label: "No", tone: "fail" as const },
];

const GROUP_ORDER: AuditGroupId[] = ["should_pilot", "can_run", "who_owns"];

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [card, setCard] = useState<ToolReadinessCard | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<HospitalGateId, GateStatus>>>({});
  const [prefilled, setPrefilled] = useState<Set<HospitalGateId>>(new Set());
  const [loading, setLoading] = useState(true);

  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<null | "save" | "approved" | "rejected">(null);
  const [decisionMsg, setDecisionMsg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const sub = await getSubmissionBySlug(id);
      if (!sub) {
        if (live) setLoading(false);
        return;
      }
      const [t, c, h] = await Promise.all([
        getTool(sub.toolId),
        getReadinessCard(sub.readinessCardId),
        getHospital(sub.hospitalId),
      ]);
      const d = c ? await getDocumentsByIds(c.docIds) : [];
      const s = await getAiSuggestion(sub.toolId);
      if (!live) return;
      if (t && id !== t.slug) router.replace(`/hospital/${t.slug}/audit`);
      setSubmission(sub);
      setTool(t ?? null);
      setCard(c ?? null);
      setHospital(h ?? null);
      setDocs(d);
      setSuggestion(s);
      if (c) {
        const seed = prefillFromToolCard(c);
        setAnswers(seed);
        setPrefilled(new Set(Object.keys(seed) as HospitalGateId[]));
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [id]);

  const subId = submission?.id ?? id;
  const auditor = hospital?.name ?? "Our hospital";

  // Live hospital verdict — recomputed by the real engine from current answers.
  const live = useMemo(
    () => runHospitalAudit({ id: "preview", submissionId: subId, auditor, gateAnswers: answers, createdAt: "" }),
    [answers, subId, auditor]
  );

  async function saveAudit() {
    setBusy("save");
    await runAudit({ submissionId: subId, auditor, gateAnswers: answers });
    const s = await getSubmission(subId); // audit is now "complete"
    if (s) setSubmission(s);
    setBusy(null);
    setDecisionMsg("Audit saved — stage is now Evaluated. You can approve or reject.");
  }

  async function decide(kind: "approved" | "rejected") {
    if (!reason.trim()) return;
    setBusy(kind);
    // Persist the current answers first so the recorded audit matches, then decide.
    await runAudit({ submissionId: subId, auditor, gateAnswers: answers });
    const s = await setDecision({ submissionId: subId, decision: kind, reason: reason.trim() });
    if (s) setSubmission(s);
    setBusy(null);
    setDecisionMsg(kind === "approved" ? "Approved — a deployment has been created (pilot not started yet)." : "Rejected with reason recorded.");
  }

  const auditComplete = submission?.audit === "complete";

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  if (!tool || !card || !submission) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">Submission not found</p>
        <Link href="/hospital" className="mt-3 inline-block text-sm text-teal-deep">← Back to inbox</Link>
      </div>
    );
  }

  const stage = submissionStage(submission);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/hospital/${id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
        <ArrowLeft className="h-4 w-4" /> Submission
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
            Our intake audit
          </p>
          {/* Status chip / pathway — updates after save + decision */}
          <StagePathway index={stage.index} decisionOutcome={stage.decisionOutcome} pilotOutcome={stage.pilotOutcome} />
        </div>
        <h1 className="font-serif text-3xl text-ink">{tool.name}</h1>
        <p className="text-sm text-muted">
          The private-hospital intake checklist — 13 gates including the
          liability and billing gates the vendor card doesn't cover. Overlapping
          gates are pre-filled from the vendor card; change any of them.
        </p>
      </header>

      {/* AI suggestion (mock TL;DR over the submitted documents) */}
      <section className="rounded-xl border border-[#0F6E56]/30 bg-[#E1F5EE]/50 p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#0F6E56]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#0F6E56]">
            AI suggestion
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#6B766F]">
            Generated from the submitted documents
          </span>
        </div>
        <p className="text-sm leading-relaxed text-ink">{suggestion}</p>
        <p className="mt-2 text-[11px] text-muted">
          AI-generated summary — verify against the documents before deciding.
        </p>
      </section>

      {/* Two independent assessments — vendor vs our audit (updates live) */}
      <VerdictComparison
        vendorVerdict={card.verdict}
        vendorScore={card.overallScore}
        auditVerdict={live.verdict}
        auditScore={live.score}
        auditor={auditor}
      />

      {/* Vendor documents — open while scoring */}
      <section>
        <h2 className="mb-2 border-b border-line pb-1.5 font-serif text-lg text-ink">
          Vendor documents
        </h2>
        <AttachedEvidence docs={docs} />
      </section>

      {/* The 13 gates, grouped */}
      <div className="space-y-6">
        {GROUP_ORDER.map((groupId) => {
          const group = HOSPITAL_GROUPS[groupId];
          return (
            <section key={groupId}>
              <h2 className="mb-2 border-b border-line pb-1.5 font-serif text-lg text-ink">
                {group.title}
              </h2>
              <div className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
                {group.gates.map((gid: HospitalGateId) => {
                  const gate = HOSPITAL_GATES[gid];
                  const fromVendor = prefilled.has(gid);
                  return (
                    <div key={gid} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-ink">
                            <span className="text-muted">{gid}</span> · {gate.title}
                          </p>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", fromVendor ? "bg-[#E1F5EE] text-[#0F6E56]" : "bg-[#FAEEDA] text-[#BA7517]")}>
                            {fromVendor ? `Pre-filled from vendor (${gate.vendorGate})` : "Hospital-only"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{gate.question}</p>
                      </div>
                      <Segmented
                        ariaLabel={gate.title}
                        options={GATE_OPTIONS}
                        value={answers[gid]}
                        onChange={(v) => setAnswers((a) => ({ ...a, [gid]: v }))}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Decision — Save / Approve / Reject with a reason */}
      <section className="rounded-xl border border-line bg-bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-lg text-ink">Decision</h2>
          <p className="text-sm text-muted">
            Our verdict:{" "}
            <span className="text-ink">
              {live.verdict === "NOTYET" ? "Not yet" : live.verdict === "CONDITIONS" ? "Deploy with conditions" : "Deploy"}
            </span>{" "}
            · {live.score}/100
          </p>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required to approve or reject)"
          rows={2}
          className="mt-3 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={saveAudit}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink disabled:opacity-60"
          >
            {busy === "save" ? "Saving…" : "Save audit"}
          </button>
          <button
            onClick={() => decide("approved")}
            disabled={busy !== null || !reason.trim() || !auditComplete}
            className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Approve
          </button>
          <button
            onClick={() => decide("rejected")}
            disabled={busy !== null || !reason.trim() || !auditComplete}
            className="inline-flex items-center gap-2 rounded-md border border-coral-brand px-4 py-2 text-sm text-coral-brand transition-colors hover:bg-coral-light disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Reject
          </button>
          {decisionMsg && (
            <Link href={`/hospital/${id}`} className="ml-auto text-sm text-teal-deep">
              Back to submission →
            </Link>
          )}
        </div>
        {!auditComplete && (
          <p className="mt-2 text-xs text-muted">
            Save the audit first — approve / reject unlock once the audit is complete.
          </p>
        )}
        {decisionMsg && (
          <p className="mt-3 flex items-center gap-1.5 border-t border-line-soft pt-3 text-sm text-ink-2">
            <Check className="h-4 w-4 text-green-dark" /> {decisionMsg}
          </p>
        )}
      </section>
    </div>
  );
}
