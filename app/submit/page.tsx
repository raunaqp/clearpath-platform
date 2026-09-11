"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import type { GateStatus } from "@/lib/schemas/gate";
import type { CareLevel, ToolCategory } from "@/lib/schemas/tool";
import type { Document } from "@/lib/schemas/document";
import { type ToolGateId } from "@/lib/engine/gates";
import { DOCUMENTS } from "@/lib/mock/fixtures/documents";
import { createAssessment, registerSubmissionV2 } from "@/lib/mock/api";
import type { SubmissionContext } from "@/lib/schemas/context";
import { canBeAssessed } from "@/lib/schemas/context";
import { ContextPanel } from "@/components/submit/ContextPanel";
import { EvidenceManager, type DraftDoc } from "@/components/submit/EvidenceManager";
import { ChecklistStep } from "@/components/submit/ChecklistStep";
import { DeclarationSummary } from "@/components/submit/DeclarationSummary";
import type { ChecklistLine } from "@/lib/engine/intake-checklist";
import { computeGeneralisability, computeExpiry } from "@/lib/engine/evidence";
import type { Level, SelfDeclaration } from "@/lib/schemas/score";
import { CERVIAI_CONTEXT, CERVIAI_EVIDENCE } from "@/lib/mock/fixtures/cerviai-v2";
import { RETINASCAN_CONTEXT, RETINASCAN_EVIDENCE } from "@/lib/mock/fixtures/retinascan-v2";
import { WIZARD_EXAMPLES, type WizardExample } from "@/lib/wizard/examples";
import { DocViewer } from "@/components/DocViewer";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

/** Docs that belong to a given seed tool (the wizard's candidate evidence). */
function docsForTool(toolId: string): Document[] {
  return DOCUMENTS.filter((d) => d.toolId === toolId);
}

type FormState = {
  toolName: string;
  toolVersion: string;
  modelVersion: string;
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
  toolVersion: "",
  modelVersion: "",
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

/**
 * The six stages a submission passes through.
 *
 * The wizard holds four of them inline — Context, Checklist, Evidence and
 * Declaration. Assessment and Card are their own routes. So the stepper
 * describes the whole journey while `step` only indexes
 * the inline part; STEP_TO_STAGE maps between them.
 */
const STAGE_LABELS = ["Context", "Checklist", "Evidence", "Declaration", "Assessment", "Card"];
const STEP_TO_STAGE: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

/** A neutral starting context for a submission that is not a loaded example. */
const EMPTY_CONTEXT: SubmissionContext = {
  entity: { name: "", verified: false, conflictsDeclared: [] },
  buildStatus: "DEPLOYABLE_BUILD",
  exactClaim: "",
  outOfScope: [],
  path: "PUBLIC_PROCUREMENT",
  careLevel: "CHC",
  operatorCadre: "STAFF_NURSE",
  programmeLine: "",
  geography: "",
  deploymentModes: ["OPD_QUEUE"],
  population: { ageRange: "", sex: "ALL", geography: "" },
  autonomyLevel: "RECOMMENDS",
};

/** GateStatus (the declaration UI) → the 0-2 ladder the engines use. */
const STATUS_TO_LEVEL: Record<GateStatus, Level> = { pass: 2, partial: 1, fail: 0 };

/** Contexts and evidence for the loadable examples. */
const EXAMPLE_CONTEXT: Record<string, SubmissionContext> = {
  "tool-cerviai": CERVIAI_CONTEXT,
  "tool-retinascan": RETINASCAN_CONTEXT,
};
const EXAMPLE_EVIDENCE: Record<string, DraftDoc[]> = {
  "tool-cerviai": CERVIAI_EVIDENCE,
  "tool-retinascan": RETINASCAN_EVIDENCE,
};

/**
 * useSearchParams() opts a route out of static prerendering unless it sits
 * inside a Suspense boundary. The wizard reads ?example= to open a worked
 * example from its card, so the boundary is here rather than the read being
 * given up.
 */
export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-muted">Loading…</div>}>
      <SubmitWizard />
    </Suspense>
  );
}

function SubmitWizard() {
  const router = useRouter();
  const params = useSearchParams();
  /**
   * The start screen is the FIRST thing a visitor touches, on a cold load,
   * before anything has been fetched — so it is the one place in the app where
   * a click can land in the gap between paint and hydration and be silently
   * swallowed. Every control here waits for hydration rather than looking ready
   * and doing nothing.
   */
  const hydrated = useHydrated();
  const [step, setStep] = useState(0); // 0 = start; 1..4 = the numbered steps, 5 = generating
  const [form, setForm] = useState<FormState>(EMPTY);
  const [answers, setAnswers] = useState<Partial<Record<ToolGateId, GateStatus>>>({});
  const [candidateDocs, setCandidateDocs] = useState<Document[]>([]);
  const [attached, setAttached] = useState<string[]>([]);
  const [context, setContext] = useState<SubmissionContext>(EMPTY_CONTEXT);
  const [docs, setDocs] = useState<DraftDoc[]>([]);
  /**
   * Checklist lines the vendor has ticked as not applying. Held separately
   * from `docs` because it is a CLAIM, not an attachment, and the checklist
   * step renders it as one.
   */
  const [notApplicable, setNotApplicable] = useState<string[]>([]);

  /**
   * Attach against ONE checklist line. The line supplies the evidence type, so
   * a file lands already answering something instead of arriving untyped from
   * a generic picker and waiting to be classified by hand.
   */
  function attachToLine(line: ChecklistLine, files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: DraftDoc[] = Array.from(files).map((file, i) => {
      const doc: DraftDoc = {
        id: `ev-${line.id}-${Date.now()}-${i}`,
        submissionId: "draft",
        // Which checklist line this arrived against. The checklist step groups
        // by it; nothing downstream depends on it.
        lineId: line.id,
        itemRefs: [],
        type: line.accepts[0],
        independence: "VENDOR_GENERATED",
        name: file.name.replace(/\.[^.]+$/, ""),
        provenance: {
          generatedBy: "",
          fundedBy: "",
          population: { setting: "", cadre: "", sampleN: null, dateFrom: "", dateTo: "" },
          documentDate: new Date().toISOString().slice(0, 10),
          validUntil: null,
        },
        limitation: "",
        generalisability: { limited: false, reason: null },
        expired: false,
        file,
        objectUrl: URL.createObjectURL(file),
      };
      return { ...doc, generalisability: computeGeneralisability(doc, context), expired: computeExpiry(doc) };
    });
    setDocs((prev) => [...prev, ...added]);
    // A line that now has a document cannot also be "doesn't apply".
    setNotApplicable((prev) => prev.filter((id) => id !== line.id));
  }

  function removeDoc(id: string) {
    setDocs((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.objectUrl) URL.revokeObjectURL(doc.objectUrl);
      return prev.filter((d) => d.id !== id);
    });
  }

  function toggleNotApplicable(lineId: string) {
    setNotApplicable((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
    );
  }
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /**
   * Arriving from a card's "Open in the wizard" — ?example=cerviai. Gated on
   * hydration for the same reason every other first-paint control is: the
   * handler has to exist before the effect can call it.
   */
  const exampleParam = params.get("example");
  useEffect(() => {
    if (!hydrated || !exampleParam) return;
    const ex = WIZARD_EXAMPLES.find((e) => e.slug === exampleParam);
    if (ex) loadExample(ex);
    // Load once, on arrival. Re-running would discard edits on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, exampleParam]);

  /**
   * Load an example INTO the wizard. Reached from the card's "Open in the
   * wizard", not from the landing page — the example buttons go straight to
   * the finished card now, because that is what the strapline promises.
   */
  function loadExample(ex: WizardExample) {
    const { vendor, tool, gateAnswers } = ex.input;
    setForm({
      toolName: tool.name,
      toolVersion: ex.toolVersion ?? "",
      modelVersion: ex.modelVersion ?? "",
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
    const seedDocs = docsForTool(ex.key);
    setCandidateDocs(seedDocs);
    setAttached(seedDocs.filter((d) => d.status !== "missing").map((d) => d.id));
    // The v2 context and fully-provenanced evidence for this example. A tool
    // without a seeded v2 setup starts from the neutral context and an empty
    // evidence list, which is exactly what a real submission does.
    setContext(EXAMPLE_CONTEXT[ex.key] ?? { ...EMPTY_CONTEXT, entity: { name: vendor.name, verified: false, conflictsDeclared: [] }, exactClaim: tool.intendedUse });
    setDocs(EXAMPLE_EVIDENCE[ex.key] ?? []);
    setError(null);
    setStep(1);
  }

  /** Doc ids that flow to the card: attached present/flagged + always the
   *  missing ones, so evidence gaps stay visible (e.g. SymptomBot). */
  function docIdsForCard(): string[] {
    const missing = candidateDocs.filter((d) => d.status === "missing").map((d) => d.id);
    return [...attached, ...missing];
  }

  /**
   * The v2 self-declaration.
   *
   * A FRESH submission declares nothing: the 17-question questionnaire is gone,
   * so `answers` is empty and every gate resolves from the evidence or comes
   * back UNSCORED. That is the point — a card cannot be talked up by answering
   * questions about your own tool.
   *
   * A LOADED EXAMPLE still carries the fixture's answers, because an example
   * stands for a tool that has already been through an assessment. Its history
   * is data, not something the current user is asserting.
   */
  function declaration(submissionId: string): SelfDeclaration {
    const gateAnswers: SelfDeclaration["gateAnswers"] = {};
    for (const [gid, status] of Object.entries(answers)) {
      if (!status) continue;
      gateAnswers[gid as keyof SelfDeclaration["gateAnswers"]] = STATUS_TO_LEVEL[status];
    }
    return { submissionId, gateAnswers, clarificationAnswers: [] };
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

      /**
       * Register the v2 submission so the card reads a DECLARED context and the
       * documents this vendor actually attached — rather than falling back to a
       * derived placeholder, which is what made a fresh submission a dead end.
       *
       * The File objects are dropped here on purpose. Their provenance travels;
       * their bytes do not leave the tab.
       */
      await registerSubmissionV2({
        slug: created.slug,
        context: {
          ...context,
          entity: { ...context.entity, name: context.entity.name || form.company },
          exactClaim: context.exactClaim || form.intendedUse,
        },
        declaration: declaration(`sub-${created.slug}`),
        evidence: docs.map(({ file: _file, objectUrl: _url, ...e }) => ({
          ...e,
          submissionId: `sub-${created.slug}`,
        })),
        toolVersion: form.toolVersion ? `${form.toolName} ${form.toolVersion}` : form.toolName,
        modelVersion: form.modelVersion,
        issuedAt: new Date().toISOString(),
      });

      void card;
      router.push(`/submit/${created.slug}/assess`);
    } catch {
      setError("We hit a hiccup generating your card. Try again.");
      setStep(3);
    }
  }

  /**
   * The attachments in the shape the engine reads: File handles and the
   * UI-only line binding stripped. Derived, never stored — the declaration
   * summary recomputes as documents arrive, which is the most useful
   * behaviour in the wizard and was the one thing worth keeping from the
   * band the questionnaire used to carry.
   */
  const evidenceForEngine = useMemo(
    () => docs.map(({ file: _f, objectUrl: _u, lineId: _l, ...e }) => e),
    [docs]
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
          disabled={!hydrated}
          aria-busy={!hydrated}
          className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {hydrated ? "Begin" : "Loading…"} <ArrowRight className="h-4 w-4" />
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
                onClick={() => router.push(`/submit/${ex.slug}/card`)}
                disabled={!hydrated}
                aria-busy={!hydrated}
                className="rounded-card border border-line bg-bg px-3 py-3 text-left transition-colors hover:border-teal-deep/40 disabled:opacity-60"
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
        <StepShell title="Context" onBack={() => setStep(0)}
          onNext={() => setStep(2)} nextDisabled={!form.toolName || !form.company || !canBeAssessed(context.buildStatus)}>
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

          <ContextPanel context={context} onChange={setContext} locked={false} />
        </StepShell>
      )}

      {/* ── Step 4 · Declaration — a summary, not a questionnaire ─────────── */}
      {step === 4 && (
        <StepShell title="Innovator declaration" onBack={() => setStep(3)}
          onNext={() => { setStep(5); void generate(); }} nextLabel="Submit for assessment"
          subtitle="What you attached, and what it establishes. ClearPath assesses this independently in the next step.">
          {error && <p className="mb-3 text-sm text-coral-brand">{error}</p>}
          <DeclarationSummary evidence={evidenceForEngine} />
        </StepShell>
      )}

      {/* ── Step 2 · Checklist — its own step, seen BEFORE attaching ──────── */}
      {step === 2 && (
        <StepShell title="Checklist" onBack={() => setStep(1)} onNext={() => setStep(3)}
          subtitle="Generated from the context you declared. Attach against a line, or say it does not apply.">
          <ChecklistStep
            category={(form.category || "screening") as ToolCategory}
            context={context}
            docs={docs.map((d) => ({ id: d.id, name: d.name, lineId: d.lineId ?? null }))}
            notApplicable={notApplicable}
            onToggleNotApplicable={toggleNotApplicable}
            onAttach={attachToLine}
            onRemove={removeDoc}
          />
        </StepShell>
      )}

      {/* ── Step 3 · Evidence — the summarised view of what is attached ────── */}
      {step === 3 && (
        <StepShell title="Evidence" onBack={() => setStep(2)} onNext={() => setStep(4)}>
          <div className="space-y-6">
            <EvidenceManager
              docs={docs}
              context={context}
              submissionId="draft"
              onChange={setDocs}
            />

            {candidateDocs.filter((d) => d.status === "missing").length > 0 && (
              <div className="rounded-card border border-line bg-bg-card px-4 py-3">
                <p className="text-xs leading-relaxed text-muted">
                  {candidateDocs.filter((d) => d.status === "missing").length} expected document(s)
                  for this example are recorded as not provided. They stay on the card as gaps.
                </p>
              </div>
            )}
          </div>
          <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
        </StepShell>
      )}

      {/* ── Step 5 · Generating ─────────────────────────────────────────────── */}
      {step === 5 && (
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

/**
 * The six-stage progress rail.
 *
 * `step` indexes the four INLINE wizard steps; the rail shows all six stages
 * of the journey, including the two that are their own routes. The mapping is
 * 1:1 now that the checklist is a step of its own rather than a panel folded
 * into Evidence.
 */
function WizardProgress({ step }: { step: number }) {
  const stage = STEP_TO_STAGE[step] ?? 1;
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-y-2 text-xs">
      {STAGE_LABELS.map((label, i) => {
        const n = i + 1;
        const active = stage === n;
        const done = stage > n;
        return (
          /*
            data-wizard-stage / data-state make the rail the ADDRESSABLE
            description of where the wizard is. Suites navigate by asking which
            stage is active rather than counting "Continue" clicks — counting
            clicks means adding a step silently lands a suite on the wrong
            screen, which has constrained this wizard four times.
          */
          <li
            key={label}
            data-wizard-stage={label}
            data-state={active ? "active" : done ? "done" : "todo"}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                active ? "bg-teal-deep text-white" : done ? "bg-teal-light text-teal-deep" : "bg-bg-sink text-muted"
              )}
            >
              {n}
            </span>
            <span className={cn(active ? "text-ink" : "text-muted")}>{label}</span>
            {i < STAGE_LABELS.length - 1 && <span className="mx-1 h-px w-4 bg-line" />}
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
