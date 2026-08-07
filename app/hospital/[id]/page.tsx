"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCheck, Check, X } from "lucide-react";
import type { Submission } from "@/lib/schemas/submission";
import type { Tool } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import type { ToolReadinessCard } from "@/lib/schemas/readiness-card";
import type { AuditResult } from "@/lib/schemas/audit";
import type { Hospital } from "@/lib/schemas/hospital";
import {
  getSubmission,
  getSubmissionBySlug,
  getTool,
  getReadinessCard,
  getDocumentsByIds,
  getAuditBySubmission,
  getHospital,
  getDeploymentBySubmission,
  startPilot,
} from "@/lib/mock/api";
import { ReadinessCard } from "@/components/card/ReadinessCard";
import { VerdictComparison } from "@/components/audit/VerdictComparison";
import { StagePathway } from "@/components/hospital/StagePathway";
import { submissionStage } from "@/lib/stages";

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [card, setCard] = useState<ToolReadinessCard | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  async function handleStartPilot() {
    if (!deploymentId || !submission) return;
    setStarting(true);
    await startPilot(deploymentId);
    const fresh = await getSubmission(submission.id);
    if (fresh) setSubmission(fresh);
    setStarting(false);
  }

  useEffect(() => {
    let live = true;
    (async () => {
      const sub = await getSubmissionBySlug(id);
      if (!sub) {
        if (live) setLoading(false);
        return;
      }
      const [t, c, existingAudit, h, dep] = await Promise.all([
        getTool(sub.toolId),
        getReadinessCard(sub.readinessCardId),
        getAuditBySubmission(sub.id),
        getHospital(sub.hospitalId),
        getDeploymentBySubmission(sub.id),
      ]);
      const d = c ? await getDocumentsByIds(c.docIds) : [];
      if (!live) return;
      // Redirect a legacy id URL to the clean slug.
      if (t && id !== t.slug) router.replace(`/hospital/${t.slug}`);
      setSubmission(sub);
      setTool(t ?? null);
      setCard(c ?? null);
      setDocs(d);
      setAudit(existingAudit ?? null);
      setHospital(h ?? null);
      setDeploymentId(dep?.id ?? null);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
      </div>
    );
  }

  if (!submission || !tool || !card) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-xl text-ink">Submission not found</p>
        <Link href="/hospital" className="mt-3 inline-block text-sm text-teal-deep">
          ← Back to inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/hospital" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-teal-deep">
          <ArrowLeft className="h-4 w-4" /> Inbox
        </Link>
        <span className="text-xs text-muted">{hospital?.name}</span>
      </div>

      {/* Where this item is in the pathway */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-ink">{tool.name}</h1>
        <StagePathway
          index={submissionStage(submission, tool.slug).index}
          decisionOutcome={submissionStage(submission, tool.slug).decisionOutcome}
          pilotOutcome={submissionStage(submission, tool.slug).pilotOutcome}
        />
      </div>

      {/* Run-our-audit CTA + two-verdict comparison */}
      <section className="rounded-xl border border-line bg-bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-ink">Two independent assessments</h2>
            <p className="text-sm text-muted">
              The vendor's card is theirs. Run your own intake audit for a neutral verdict.
            </p>
          </div>
          <Link
            href={`/hospital/${tool.slug}/audit`}
            className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            <ClipboardCheck className="h-4 w-4" />
            {submission.audit === "complete" ? "Re-run audit" : "Run our own audit"}
          </Link>
        </div>
        <VerdictComparison
          vendorVerdict={card.verdict}
          vendorScore={card.overallScore}
          auditVerdict={audit?.verdict ?? null}
          auditScore={audit?.score ?? null}
          auditor={hospital?.name ?? "Our hospital"}
          pending={!audit}
        />
        {audit && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-2">
            Audited by {audit.auditor}.
            <Link href={`/hospital/${tool.slug}/audit`} className="inline-flex items-center gap-1 text-teal-deep">
              View the audit <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        )}
      </section>

      {/* Decision — derived from the three fields; the decision is made in the audit */}
      <section className="rounded-xl border border-line bg-bg-card p-5">
        <h2 className="font-serif text-lg text-ink">Decision</h2>

        {submission.audit === "not_run" && (
          <p className="mt-1 text-sm text-muted">
            Run your intake audit to evaluate {tool.name} before deciding.
          </p>
        )}

        {submission.audit === "complete" && submission.decision === "pending" && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            Evaluated. Approve or reject with a reason at the bottom of the audit.
            <Link href={`/hospital/${tool.slug}/audit`} className="inline-flex items-center gap-1 text-teal-deep">
              Go to the audit <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        )}

        {submission.decision === "rejected" && (
          <div className="mt-1">
            <p className="flex items-center gap-1.5 text-sm text-ink-2">
              <X className="h-4 w-4 text-coral-brand" /> Declined.
            </p>
            {submission.decisionReason && (
              <p className="mt-1 text-sm text-muted">Reason: {submission.decisionReason}</p>
            )}
          </div>
        )}

        {submission.decision === "approved" && (
          <div className="mt-1">
            {submission.pilot === "not_started" ? (
              <>
                <p className="flex items-center gap-1.5 text-sm text-ink-2">
                  <Check className="h-4 w-4 text-green-dark" /> Approved — deployment
                  created, pilot not started yet.
                </p>
                {submission.decisionReason && (
                  <p className="mt-1 text-sm text-muted">Reason: {submission.decisionReason}</p>
                )}
                <button
                  onClick={handleStartPilot}
                  disabled={starting || !deploymentId}
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {starting ? "Starting…" : "Start pilot"}
                </button>
              </>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-sm text-ink-2">
                  <Check className="h-4 w-4 text-green-dark" />{" "}
                  {submission.pilot === "ongoing" ? "Pilot ongoing." : "Pilot complete."}
                </p>
                {submission.decisionReason && (
                  <p className="mt-1 text-sm text-muted">Reason: {submission.decisionReason}</p>
                )}
                {deploymentId && (
                  <Link
                    href={`/workspace/${tool.slug}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
                  >
                    Open deployment workspace <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* The vendor's Readiness Card — read-only (card + docs + gate grid) */}
      <ReadinessCard card={card} tool={tool} docs={docs} />
    </div>
  );
}
