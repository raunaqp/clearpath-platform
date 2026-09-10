"use client";

import type {
  Autonomy,
  BuildStatus,
  ContextCareLevel,
  DeploymentMode,
  OperatorCadre,
  SubmissionContext,
  SubmissionPath,
} from "@/lib/schemas/context";
import {
  AUTONOMY_LABEL,
  BUILD_STATUS_LABEL,
  CARE_LEVEL_LABEL,
  DEPLOYMENT_MODE_LABEL,
  OPERATOR_CADRE_LABEL,
  canBeAssessed,
} from "@/lib/schemas/context";
import { cn } from "@/lib/utils";

/**
 * S1 — the context declaration.
 *
 * This panel is the reason the card can say "valid only in this context". It
 * produces the object the card later freezes a copy of, so the wizard declares
 * the context rather than the card synthesising one afterwards from whatever
 * happens to be on the tool record.
 *
 * BUILD STATUS IS A GATE ON THE WHOLE FLOW. Prototype and concept stop here and
 * are told why, plainly. Producing a thin card for a prototype would be worse
 * than refusing: the vendor reads it as a hard assessment rather than a
 * category error, and the card outlives the caveat attached to it.
 */

const PATHS: { value: SubmissionPath; label: string }[] = [
  { value: "PUBLIC_PROCUREMENT", label: "Public procurement" },
  { value: "PRIVATE_INVESTMENT", label: "Private investment" },
];

const CARE_LEVELS: ContextCareLevel[] = [
  "SUB_CENTRE", "PHC", "CHC", "DISTRICT_HOSPITAL",
  "PRIVATE_CLINIC", "PRIVATE_SECONDARY", "PRIVATE_TERTIARY",
];

const CADRES: OperatorCadre[] = [
  "NO_OPERATOR", "SELF_PROVIDED", "ANM", "MO", "STAFF_NURSE",
  "LAB_TECHNICIAN", "CLINICIAN", "SPECIALIST", "PATIENT",
];

const MODES: DeploymentMode[] = ["CAMP", "OPD_QUEUE", "WARD", "HOME_VISIT"];
const AUTONOMIES: Autonomy[] = ["INFORMS", "RECOMMENDS", "DECIDES"];
const BUILD_STATUSES: BuildStatus[] = ["DEPLOYABLE_BUILD", "PROTOTYPE", "CONCEPT"];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-line bg-bg-card px-3 py-2 text-sm text-ink";

export function ContextPanel({
  context,
  onChange,
  locked,
}: {
  context: SubmissionContext;
  onChange: (next: SubmissionContext) => void;
  locked: boolean;
}) {
  const set = <K extends keyof SubmissionContext>(k: K, v: SubmissionContext[K]) =>
    onChange({ ...context, [k]: v });

  const blocked = !canBeAssessed(context.buildStatus);

  if (locked) {
    return (
      <section className="rounded-card border border-teal-deep/30 bg-teal-light/30 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal-deep">
          Context — locked
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {CARE_LEVEL_LABEL[context.careLevel]} · {OPERATOR_CADRE_LABEL[context.operatorCadre]} ·{" "}
          {context.deploymentModes.map((m) => DEPLOYMENT_MODE_LABEL[m]).join(" and ")} ·{" "}
          {context.geography} · {AUTONOMY_LABEL[context.autonomyLevel]}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Context is fixed once submitted. Assessing a different setting creates a new assessment,
          not an edit.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-card border border-line bg-bg-card p-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#BA7517]">
          Context declaration
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Everything below scopes the assessment. The card is valid only inside what you declare
          here — a different setting is a different assessment, not an edit.
        </p>
      </div>

      {/* Entity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Submitting entity">
          <input
            className={inputCls}
            value={context.entity.name}
            onChange={(e) => set("entity", { ...context.entity, name: e.target.value })}
            placeholder="Legal entity name"
          />
        </Row>
        <Row label="Declared conflicts of interest" hint="Leave blank if none. Blank is a declaration, not a gap.">
          <input
            className={inputCls}
            value={context.entity.conflictsDeclared.join(", ")}
            onChange={(e) =>
              set("entity", {
                ...context.entity,
                conflictsDeclared: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="e.g. co-authored the validation study"
          />
        </Row>
      </div>

      {/* Build status — the gate */}
      <Row label="Build status" hint="Only a deployable build can be assessed.">
        <div className="flex flex-wrap gap-2">
          {BUILD_STATUSES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => set("buildStatus", b)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                context.buildStatus === b
                  ? "border-teal-deep bg-teal-light text-teal-deep"
                  : "border-line text-ink-2 hover:bg-bg-sink"
              )}
            >
              {BUILD_STATUS_LABEL[b]}
            </button>
          ))}
        </div>
      </Row>

      {blocked && (
        <div className="rounded-card border border-[#BA7517]/40 bg-[#FAEEDA] px-4 py-3">
          <p className="text-sm font-semibold text-[#BA7517]">
            A {BUILD_STATUS_LABEL[context.buildStatus].toLowerCase()} is out of scope for this
            assessment.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[#8A5610]">
            The framework asks whether the tool fails safe under real caseload, whether operators
            keep using it once support tapers, whether data moves without lock-in. Those questions
            have no answers yet at this stage. We would rather say so than hand you a card that
            looks like an assessment and outlives the caveat attached to it. Come back when there is
            a build in field use.
          </p>
        </div>
      )}

      {/* Setting */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Procurement path">
          <select className={inputCls} value={context.path} onChange={(e) => set("path", e.target.value as SubmissionPath)}>
            {PATHS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Row>
        <Row label="Care level">
          <select className={inputCls} value={context.careLevel} onChange={(e) => set("careLevel", e.target.value as ContextCareLevel)}>
            {CARE_LEVELS.map((c) => <option key={c} value={c}>{CARE_LEVEL_LABEL[c]}</option>)}
          </select>
        </Row>
        <Row label="Operator cadre" hint="Who physically uses it. Evidence generated with a different cadre gets flagged.">
          <select className={inputCls} value={context.operatorCadre} onChange={(e) => set("operatorCadre", e.target.value as OperatorCadre)}>
            {CADRES.map((c) => <option key={c} value={c}>{OPERATOR_CADRE_LABEL[c]}</option>)}
          </select>
        </Row>
        <Row label="Programme line">
          <input className={inputCls} value={context.programmeLine ?? ""} onChange={(e) => set("programmeLine", e.target.value)} placeholder="e.g. NP-NCD cervical cancer screening" />
        </Row>
        <Row label="Geography">
          <input className={inputCls} value={context.geography} onChange={(e) => set("geography", e.target.value)} placeholder="District, state" />
        </Row>
        <Row label="Autonomy">
          <select className={inputCls} value={context.autonomyLevel} onChange={(e) => set("autonomyLevel", e.target.value as Autonomy)}>
            {AUTONOMIES.map((a) => <option key={a} value={a}>{AUTONOMY_LABEL[a]}</option>)}
          </select>
        </Row>
      </div>

      <Row label="Deployment modes">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => {
            const on = context.deploymentModes.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() =>
                  set(
                    "deploymentModes",
                    on
                      ? (context.deploymentModes.filter((x) => x !== m).length > 0
                          ? context.deploymentModes.filter((x) => x !== m)
                          : context.deploymentModes)
                      : [...context.deploymentModes, m]
                  )
                }
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  on ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink"
                )}
              >
                {DEPLOYMENT_MODE_LABEL[m]}
              </button>
            );
          })}
        </div>
      </Row>

      {/* Population */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Age range">
          <input className={inputCls} value={context.population.ageRange} onChange={(e) => set("population", { ...context.population, ageRange: e.target.value })} placeholder="30-65" />
        </Row>
        <Row label="Sex">
          <select className={inputCls} value={context.population.sex} onChange={(e) => set("population", { ...context.population, sex: e.target.value as "ALL" | "FEMALE" | "MALE" })}>
            <option value="ALL">All</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
        </Row>
        <Row label="Pregnancy status">
          <input className={inputCls} value={context.population.pregnancyStatus ?? ""} onChange={(e) => set("population", { ...context.population, pregnancyStatus: e.target.value })} placeholder="e.g. non-pregnant" />
        </Row>
      </div>
      <Row label="Comorbidity / prior treatment">
        <input className={inputCls} value={context.population.comorbidity ?? ""} onChange={(e) => set("population", { ...context.population, comorbidity: e.target.value })} placeholder="e.g. no prior cervical treatment" />
      </Row>

      <p className="rounded-md bg-bg-sink px-3 py-2 text-xs leading-relaxed text-muted">
        Context is fixed once submitted. Assessing a different setting creates a new assessment, not
        an edit.
      </p>
    </section>
  );
}
