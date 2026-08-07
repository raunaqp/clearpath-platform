"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Check, X, AlertTriangle, FileDown, ClipboardCheck } from "lucide-react";
import type { Deployment } from "@/lib/schemas/deployment";
import type { Tool } from "@/lib/schemas/tool";
import type { CtriDraft } from "@/lib/mock/fixtures/ctri-drafts";
import { getCtriDraft, prepareCtri } from "@/lib/mock/api";
import { cn } from "@/lib/utils";

/**
 * CTRI registration helper (trial workflow only). CTRI (ctri.nic.in) is India's
 * mandatory registry — prospective registration is required before first
 * enrolment. This helper DRAFTS and CHECKS; the PI submits and signs on the
 * official CTRI. It does not submit.
 */
type CodeKey = "icd10" | "studyDesign" | "phase";

export function CtriRegistration({
  deployment,
  tool,
  onPrepared,
}: {
  deployment: Deployment;
  tool: Tool;
  onPrepared: (d: Deployment) => void;
}) {
  const [draft, setDraft] = useState<CtriDraft | null>(null);
  const [values, setValues] = useState<Record<CodeKey, string>>({ icd10: "", studyDesign: "", phase: "" });
  const [accepted, setAccepted] = useState<Record<CodeKey, boolean>>({ icd10: false, studyDesign: false, phase: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getCtriDraft(tool.id, tool.name).then((d) => {
      setDraft(d);
      setValues({ icd10: d.suggestions.icd10.value, studyDesign: d.suggestions.studyDesign.value, phase: d.suggestions.phase.value });
    });
  }, [tool.id, tool.name]);

  // Compliance — computed from the draft (client-side date for validity checks).
  const compliance = useMemo(() => {
    if (!draft) return { items: [], allPass: false };
    const requiredPresent =
      !!draft.publicTitle && !!draft.scientificTitle && !!draft.primarySponsor &&
      !!draft.healthCondition && !!draft.primaryOutcomes && !!draft.targetSampleSize &&
      !!draft.ethicsCommittee && !!values.icd10;

    const approval = new Date(draft.ethicsApprovalDate).getTime();
    const now = new Date().getTime();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const ethicsValid = draft.ethicsApprovalStatus === "Approved" && now - approval < oneYear && now - approval >= 0;

    const dcgiOk = !draft.dcgiApplicable || !!draft.dcgiClearance;

    // Prospective: registration must precede first enrolment (no enrolment yet).
    const prospectiveOk = /not yet recruiting/i.test(draft.recruitmentStatus);

    const items = [
      { key: "required", label: "All required fields present", pass: requiredPresent, detail: requiredPresent ? "Public/scientific title, sponsor, condition, outcomes, sample size, ethics, ICD-10 all set." : "Some required fields are still blank." },
      { key: "ethics", label: "Ethics approval within 1-year validity", pass: ethicsValid, detail: `${draft.ethicsApprovalStatus} on ${draft.ethicsApprovalDate}${ethicsValid ? " — within validity" : " — expired or not approved"}.` },
      { key: "dcgi", label: "DCGI clearance attached (if applicable)", pass: dcgiOk, detail: draft.dcgiApplicable ? (draft.dcgiClearance ? "Clearance attached." : "Applicable but not attached.") : "Not applicable to this study." },
      { key: "prospective", label: "Prospective registration — no enrolment before registration", pass: prospectiveOk, detail: prospectiveOk ? `Recruitment status: ${draft.recruitmentStatus}. First enrolment ${draft.firstEnrolmentDate}.` : "Enrolment appears to have started — retrospective registration is a serious breach.", prominent: true as const },
    ];
    return { items, allPass: items.every((i) => i.pass) };
  }, [draft, values.icd10]);

  async function prepare() {
    setBusy(true);
    const d = await prepareCtri(deployment.id);
    setBusy(false);
    if (d) onPrepared(d);
  }

  function downloadDraft() {
    if (!draft) return;
    const lines = [
      "CTRI DATASET — DRAFT (prepared by ClearPath; not submitted)",
      "",
      ...datasetRows(draft, values).map(([k, v]) => `${k}: ${v}`),
      "",
      "Submit and sign on the official CTRI (ctri.nic.in). ClearPath is not the registry.",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctri-draft-${tool.name.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!draft) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-teal-deep" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#0F6E56]/30 bg-[#E1F5EE]/50 p-4 text-sm text-ink">
        <p className="flex items-center gap-2 font-medium">
          <ClipboardCheck className="h-4 w-4 text-[#0F6E56]" /> CTRI registration helper
        </p>
        <p className="mt-1 text-ink-2">
          CTRI is India's mandatory government trial registry — prospective registration is required
          before first enrolment. This step <strong>drafts and checks</strong> your submission; the
          principal investigator submits and signs on the official CTRI (ctri.nic.in). ClearPath is
          not the registry and does not submit for you.
        </p>
      </div>

      {/* 1 · Auto-drafted dataset */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm text-muted">
          <Sparkles className="h-3.5 w-3.5 text-[#0F6E56]" /> Auto-drafted dataset
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-muted">from protocol + ethics approval</span>
        </h3>
        <dl className="divide-y divide-line-soft rounded-lg border border-line bg-white">
          {datasetRows(draft, values).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 px-4 py-2 sm:flex-row sm:justify-between">
              <dt className="text-xs uppercase tracking-wide text-muted sm:w-52 sm:shrink-0">{k}</dt>
              <dd className="text-sm text-ink sm:text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 2 · AI-suggested structured codes */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm text-muted">
          <Sparkles className="h-3.5 w-3.5 text-[#0F6E56]" /> AI-suggested codes — accept or edit
        </h3>
        <div className="space-y-2">
          {(["icd10", "studyDesign", "phase"] as CodeKey[]).map((key) => {
            const s = draft.suggestions[key];
            const isAccepted = accepted[key];
            return (
              <div key={key} className="flex flex-col gap-2 rounded-lg border border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-ink">{s.field}</p>
                    <span className="rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] text-[#0F6E56]">AI-suggested</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{s.note}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    value={values[key]}
                    onChange={(e) => { setValues((v) => ({ ...v, [key]: e.target.value })); setAccepted((a) => ({ ...a, [key]: false })); }}
                    className="w-52 rounded-md border border-line bg-white px-2.5 py-1 text-sm text-ink"
                  />
                  <button
                    onClick={() => setAccepted((a) => ({ ...a, [key]: !a[key] }))}
                    className={cn("inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors", isAccepted ? "border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]" : "border-line text-ink-2 hover:bg-bg-sink")}
                  >
                    <Check className="h-3.5 w-3.5" /> {isAccepted ? "Accepted" : "Accept"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3 · Compliance checklist */}
      <section>
        <h3 className="mb-2 text-sm text-muted">Compliance check</h3>
        <ul className="space-y-2">
          {compliance.items.map((it) => (
            <li key={it.key} className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", "prominent" in it && it.prominent ? "border-[#BA7517]/40 bg-[#FAEEDA]/40" : "border-line bg-white")}>
              <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", it.pass ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FAECE7] text-[#993C1D]")}>
                {it.pass ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm text-ink">
                  {"prominent" in it && it.prominent && <AlertTriangle className="h-3.5 w-3.5 text-[#BA7517]" />}
                  {it.label}
                </p>
                <p className="mt-0.5 text-xs text-muted">{it.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 4 · Prepare (mock export) */}
      <section className="rounded-xl border border-line bg-bg-card p-4">
        {deployment.ctriPrepared ? (
          <div className="text-sm text-ink-2">
            <p className="flex items-center gap-1.5 text-[#3B6D11]">
              <Check className="h-4 w-4" /> CTRI dataset prepared and checked.
            </p>
            <p className="mt-1 text-muted">
              Hand this to the PI to submit and sign on the official CTRI (ctri.nic.in).
              ClearPath drafted and checked it — it did not submit.
            </p>
            <button onClick={downloadDraft} className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 hover:bg-bg-sink">
              <FileDown className="h-4 w-4" /> Download drafted dataset
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={prepare}
              disabled={busy || !compliance.allPass}
              className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Preparing…" : "Prepare for CTRI registration"}
            </button>
            {!compliance.allPass && (
              <p className="mt-2 text-xs text-muted">Resolve the failing compliance checks to unlock.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function datasetRows(d: CtriDraft, values: Record<CodeKey, string>): [string, string][] {
  return [
    ["Public title", d.publicTitle],
    ["Scientific title", d.scientificTitle],
    ["Acronym", d.acronym],
    ["Primary sponsor", d.primarySponsor],
    ["Sites", d.sites.join("; ")],
    ["Ethics committee", d.ethicsCommittee],
    ["Ethics approval", `${d.ethicsApprovalStatus} (${d.ethicsApprovalDate})`],
    ["DCGI clearance", d.dcgiApplicable ? (d.dcgiClearance ?? "Applicable — pending") : "Not applicable"],
    ["Health condition", d.healthCondition],
    ["ICD-10", values.icd10],
    ["Study type", d.studyType],
    ["Study design", values.studyDesign],
    ["Intervention", d.intervention],
    ["Comparator", d.comparator],
    ["Inclusion", d.inclusion],
    ["Exclusion", d.exclusion],
    ["Primary outcomes", d.primaryOutcomes],
    ["Secondary outcomes", d.secondaryOutcomes],
    ["Target sample size", d.targetSampleSize],
    ["Phase", values.phase],
    ["First enrolment date", d.firstEnrolmentDate],
    ["Recruitment status", d.recruitmentStatus],
    ["Brief summary", d.briefSummary],
  ];
}
