"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import type { GateStatus } from "@/lib/schemas/gate";
import type { CareLevel, ToolCategory } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import {
  DIMENSIONS,
  TOOL_GATES,
  type ToolGateId,
} from "@/lib/engine/gates";
import { runToolAssessment } from "@/lib/engine/readiness-tool";
import { DOCUMENTS } from "@/lib/mock/fixtures/documents";
import { DOC_KIND_LABEL, DOC_STATUS_STYLE, VERDICT_STYLE } from "@/lib/ui";
import { createAssessment } from "@/lib/mock/api";
import { WIZARD_EXAMPLES, type WizardExample } from "@/lib/wizard/examples";
import { getBodhScore, bodhToGateAnswers, type BodhScore } from "@/lib/mock/fixtures/bodh-scores";
import { Segmented } from "@/components/wizard/Segmented";
import { DocViewer } from "@/components/DocViewer";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/** Docs that belong to a given seed tool (the wizard's candidate evidence). */
function docsForTool(toolId: string): Document[] {
  return DOCUMENTS.filter((d) => d.toolId === toolId);
}

type FormState = {
  toolName: string;
  company: string;
  founder: string;
  website: string;
  category: ToolCategory | "";
  scopedFeature: string;
  description: string;
  intendedUse: string;
  careLevel: CareLevel;
};

const EMPTY: FormState = {
  toolName: "",
  company: "",
  founder: "",
  website: "",
  category: "",
  scopedFeature: "",
  description: "",
  intendedUse: "",
  careLevel: "primary",
};

const CATEGORY_OPTIONS: { value: ToolCategory; label: string }[] = [
  { value: "screening", label: "Screening" },
  { value: "samd", label: "SaMD" },
  { value: "point-of-care", label: "Point-of-care" },
  { value: "cds", label: "Clinical decision support" },
  { value: "patient-facing", label: "Patient-facing" },
  { value: "platform", label: "Platform" },
];

const CARE_LEVEL_OPTIONS: { value: CareLevel; label: string }[] = [
  { value: "tertiary", label: "Tertiary / referral centre" },
  { value: "secondary", label: "District / secondary hospital" },
  { value: "primary", label: "Primary health centre (PHC)" },
  { value: "community", label: "Community health centre (CHC)" },
  { value: "home", label: "Patient-facing / home" },
];

const GATE_OPTIONS = [
  { value: "pass" as GateStatus, label: "Yes", tone: "pass" as const },
  { value: "partial" as GateStatus, label: "Partial", tone: "partial" as const },
  { value: "fail" as GateStatus, label: "No", tone: "fail" as const },
];

// Evidence-first order (FIX 1): describe → attach reports → answer → generate.
const STEP_LABELS = ["Company & tool", "Reports", "Questions", "Generate"];

export default function SubmitWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = start; 1..4 = the numbered steps
  const [form, setForm] = useState<FormState>(EMPTY);
  const [answers, setAnswers] = useState<Partial<Record<ToolGateId, GateStatus>>>({});
  const [candidateDocs, setCandidateDocs] = useState<Document[]>([]);
  const [attached, setAttached] = useState<string[]>([]);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [bodh, setBodh] = useState<BodhScore>(() => getBodhScore("default"));
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /**
   * Load an example → prefill the description and STARTING answers, then drop
   * the user into the editable wizard. It does NOT auto-generate: the user can
   * change any answer and the verdict recomputes live (see the preview band in
   * step 2 and the final engine run in `generate`).
   */
  function loadExample(ex: WizardExample) {
    const { vendor, tool, gateAnswers } = ex.input;
    setForm({
      toolName: tool.name,
      company: vendor.name,
      founder: vendor.founder,
      website: vendor.website,
      category: tool.category,
      scopedFeature: tool.scopedFeature ?? "",
      description: tool.description,
      intendedUse: tool.intendedUse,
      careLevel: tool.careLevel,
    });
    setAnswers({ ...gateAnswers });
    setBodh(getBodhScore(ex.key));
    const docs = docsForTool(ex.key);
    setCandidateDocs(docs);
    setAttached(docs.filter((d) => d.status !== "missing").map((d) => d.id));
    setError(null);
    setStep(1);
  }

  /** Doc ids that flow to the card: attached present/flagged + always the
   *  missing ones, so evidence gaps stay visible (e.g. SymptomBot). */
  function docIdsForCard(): string[] {
    const missing = candidateDocs.filter((d) => d.status === "missing").map((d) => d.id);
    return [...attached, ...missing];
  }

  async function generate() {
    setError(null);
    try {
      const { card, tool: created } = await createAssessment({
        vendor: {
          name: form.company,
          founder: form.founder,
          description: form.description,
          website: form.website || `${form.company.toLowerCase().replace(/\s+/g, "")}.example.in`,
        },
        tool: {
          name: form.toolName,
          category: (form.category || "screening") as ToolCategory,
          scopedFeature: form.category === "platform" ? form.scopedFeature : undefined,
          description: form.description,
          intendedUse: form.intendedUse,
          careLevel: form.careLevel,
          docIds: docIdsForCard(),
        },
        gateAnswers: answers,
      });
      router.push(`/submit/${created.slug}/card`);
    } catch {
      setError("We hit a hiccup generating your card. Try again.");
      setStep(3);
    }
  }

  // Live verdict — recomputed by the real engine from the current answers.
  const preview = useMemo(
    () =>
      runToolAssessment({
        id: "preview",
        toolId: "preview",
        toolName: form.toolName || "This tool",
        careLevel: form.careLevel,
        gateAnswers: answers,
        docIds: [],
        createdAt: "",
      }),
    [answers, form.toolName, form.careLevel]
  );
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );

  // ── Step 0 · Start ─────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-8 py-8">
        <div className="space-y-3">
          <h1 className="font-serif text-3xl text-ink">
            Submit your tool for a readiness assessment.
          </h1>
          <p className="text-ink-2">
            Answer a short set of questions and attach your reports. You’ll get a
            calibrated Readiness Card across four dimensions — verdict, gate
            results, conditions, and where it belongs in the system.
          </p>
        </div>
        <button
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        >
          Begin <ArrowRight className="h-4 w-4" />
        </button>

        <div className="rounded-card border border-line bg-bg-card p-5">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Sparkles className="h-4 w-4 text-teal-deep" /> Or load an example —
            one click to a finished card
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {WIZARD_EXAMPLES.map((ex) => (
              <button
                key={ex.key}
                onClick={() => loadExample(ex)}
                className="rounded-card border border-line bg-bg px-3 py-3 text-left transition-colors hover:border-teal-deep/40"
              >
                <p className="text-sm text-ink">{ex.label}</p>
                <p className="mt-0.5 text-xs text-muted">{ex.hint}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-4">
      <WizardProgress step={step} />

      {/* ── Step 1 · Company & tool ─────────────────────────────────────────── */}
      {step === 1 && (
        <StepShell title="Company & tool" onBack={() => setStep(0)}
          onNext={() => setStep(2)} nextDisabled={!form.toolName || !form.company}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tool name">
              <TextInput value={form.toolName} onChange={(v) => set("toolName", v)} placeholder="e.g. CerviAI" />
            </Field>
            <Field label="Company">
              <TextInput value={form.company} onChange={(v) => set("company", v)} placeholder="e.g. CerviAI Health" />
            </Field>
            <Field label="Founder">
              <TextInput value={form.founder} onChange={(v) => set("founder", v)} placeholder="Name" />
            </Field>
            <Field label="Website">
              <TextInput value={form.website} onChange={(v) => set("website", v)} placeholder="example.in" />
            </Field>
          </div>

          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value as ToolCategory)}
              className="w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink"
            >
              <option value="">Select a category…</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          {form.category === "platform" && (
            <Field label="Which feature are we assessing?" hint="A platform isn’t assessed whole — scope to one feature.">
              <TextInput value={form.scopedFeature} onChange={(v) => set("scopedFeature", v)} placeholder="e.g. the cervical-screening module" />
            </Field>
          )}

          <Field label="One-line description">
            <TextInput value={form.description} onChange={(v) => set("description", v)} placeholder="What the tool does, in a sentence" />
          </Field>
          <Field label="Intended use">
            <TextInput value={form.intendedUse} onChange={(v) => set("intendedUse", v)} placeholder="Who uses it, for what, where" />
          </Field>
          <Field label="Intended level of care">
            <select
              value={form.careLevel}
              onChange={(e) => set("careLevel", e.target.value as CareLevel)}
              className="w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink"
            >
              {CARE_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </StepShell>
      )}

      {/* ── Step 3 · Basic questions (17 gates) — answer against the evidence ── */}
      {step === 3 && (
        <StepShell title="Basic questions" onBack={() => setStep(2)}
          onNext={() => { setStep(4); void generate(); }} nextLabel="Generate card"
          subtitle="Answer against the evidence you attached. Yes / Partial / No — these map directly to the 17 gates. Skip any you can’t answer; they’ll show as “not answered.”">
          {error && <p className="mb-3 text-sm text-coral-brand">{error}</p>}
          {/* Live verdict — updates as answers change */}
          <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-card px-4 py-3", VERDICT_STYLE[preview.verdict].tint)}>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-80">Live verdict</p>
              <p className="font-serif text-lg">{VERDICT_STYLE[preview.verdict].label}</p>
            </div>
            <p className="text-xs opacity-90">
              {answeredCount}/17 answered · D1 {preview.dimensionScores.D1}% · D2 {preview.dimensionScores.D2}% · D3 {preview.dimensionScores.D3}% · D4 {preview.dimensionScores.D4}%
            </p>
          </div>

          {/* BODH validation score — pre-fills clinical (G1), fairness (G17), safety (G2) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-teal-deep/30 bg-teal-light/40 px-4 py-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">BODH validation score</p>
              <p className="mt-0.5 text-sm text-ink">
                Accuracy {bodh.accuracy} · Fairness {bodh.fairness} · Safety {bodh.safety}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAnswers((a) => ({ ...a, ...bodhToGateAnswers(bodh) }))}
              className="rounded-md bg-teal-deep px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-90"
            >
              Pre-fill clinical + fairness gates
            </button>
          </div>

          <div className="space-y-6">
            {(["D1", "D2", "D3", "D4"] as const).map((dim) => (
              <div key={dim}>
                <h3 className="mb-2 text-sm text-muted">{DIMENSIONS[dim].title}</h3>
                <div className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
                  {DIMENSIONS[dim].gates.map((gid: ToolGateId) => (
                    <div key={gid} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="pr-4 text-sm text-ink">
                        <span className="text-muted">{gid}</span> · {TOOL_GATES[gid].question}
                      </p>
                      <Segmented
                        ariaLabel={TOOL_GATES[gid].title}
                        options={GATE_OPTIONS}
                        value={answers[gid]}
                        onChange={(v) => setAnswers((a) => ({ ...a, [gid]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </StepShell>
      )}

      {/* ── Step 2 · Attach reports (evidence-first, before the questions) ───── */}
      {step === 2 && (
        <StepShell title="Attach reports" onBack={() => setStep(1)} onNext={() => setStep(3)}
          subtitle="Attach your evidence first — then you’ll answer the gate questions against it. Open any document to review it. Missing documents stay on the card as gaps.">
          {candidateDocs.length === 0 ? (
            <p className="rounded-card border border-line bg-bg-card px-4 py-6 text-sm text-muted">
              No sample documents for a custom tool in this demo. Load an example
              on the start screen to see the per-tool evidence set.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft rounded-card border border-line bg-bg-card">
              {candidateDocs.map((doc) => {
                const on = attached.includes(doc.id);
                const missing = doc.status === "missing";
                const st = DOC_STATUS_STYLE[doc.status] ?? DOC_STATUS_STYLE.present;
                return (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-sm", missing ? "text-muted" : "text-ink")}>{doc.name}</p>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs", st.tint)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted">{DOC_KIND_LABEL[doc.kind]}</p>
                    </div>
                    {missing ? (
                      <span className="text-xs text-muted">Not provided</span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors hover:bg-bg-sink"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          onClick={() =>
                            setAttached((a) => (on ? a.filter((id) => id !== doc.id) : [...a, doc.id]))
                          }
                          className={cn(
                            "rounded-md border px-3 py-1 text-xs transition-colors",
                            on ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink"
                          )}
                        >
                          {on ? "Attached" : "Attach"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
        </StepShell>
      )}

      {/* ── Step 4 · Generating ─────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-teal-deep" />
          <p className="font-serif text-lg text-ink">Assessing across 4 dimensions…</p>
          <p className="text-sm text-muted">Clinical &amp; regulatory · System fit · UX &amp; workflow · Tech &amp; data governance</p>
        </div>
      )}
    </div>
  );
}

// ── small building blocks ─────────────────────────────────────────────────────

function WizardProgress({ step }: { step: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                active ? "bg-teal-deep text-white" : done ? "bg-teal-light text-teal-deep" : "bg-bg-sink text-muted"
              )}
            >
              {n}
            </span>
            <span className={cn(active ? "text-ink" : "text-muted")}>{label}</span>
            {i < STEP_LABELS.length - 1 && <span className="mx-1 h-px w-4 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepShell({
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-bg-sink"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-ink">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink placeholder:text-muted"
    />
  );
}
