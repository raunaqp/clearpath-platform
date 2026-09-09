"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, Link2, AlertTriangle } from "lucide-react";
import type { Evidence, EvidenceType, Independence } from "@/lib/schemas/evidence";
import type { SubmissionContext } from "@/lib/schemas/context";
import { computeGeneralisability, computeExpiry } from "@/lib/engine/evidence";
import { gateItems, getItem } from "@/lib/engine/item-bank";
import { cn } from "@/lib/utils";

/**
 * S3 — evidence, with a working upload.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS REPLACED THE OLD STEP
 * ─────────────────────────────────────────────────────────────────────────
 * The old step listed the seeded documents for a fixture tool and, for anything
 * else, said "No sample documents for a custom tool in this demo". A submission
 * that was not one of four fixtures could not attach anything, so the demo had
 * a dead end exactly where a visitor asks to try their own tool.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FILES NEVER LEAVE MEMORY
 * ─────────────────────────────────────────────────────────────────────────
 * The File is held in component state and, if opened, through an object URL
 * revoked on removal. Nothing is uploaded, nothing is written to storage. What
 * IS kept with the submission is the PROVENANCE the vendor typed, which is the
 * part the assessment actually uses.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BINDING IS NOT OPTIONAL
 * ─────────────────────────────────────────────────────────────────────────
 * Evidence with no itemRefs counts for nothing — that rule lives in the Phase 1
 * engine, and this screen SURFACES it rather than reimplementing it. An unbound
 * document is shown as counting for nothing, in those words, instead of sitting
 * in a list looking like progress.
 *
 * computeGeneralisability runs at ATTACH time, not at scoring time. A vendor
 * finding out at the card that their study does not transfer has already made
 * every decision that mattered.
 */

const TYPES: EvidenceType[] = [
  "VALIDATION_STUDY", "STUDY", "REGULATORY", "AUDIT", "FIELD_LOG",
  "INTEGRATION_SPEC", "CONSENT_ARTEFACT", "SLA", "TRAINING_CURRICULUM",
];

const INDEPENDENCE: { value: Independence; label: string }[] = [
  { value: "VENDOR_GENERATED", label: "Vendor" },
  { value: "PARTNER_GENERATED", label: "Partner" },
  { value: "INDEPENDENT", label: "Independent" },
];

const label = (s: string) => s.toLowerCase().replace(/_/g, " ");
const inputCls = "w-full rounded-md border border-line bg-bg-card px-2.5 py-1.5 text-sm text-ink";

export type DraftDoc = Evidence & {
  /** Present only for a file the vendor picked this session. Never persisted. */
  file?: File;
  objectUrl?: string;
};

export function EvidenceManager({
  docs,
  context,
  submissionId,
  onChange,
}: {
  docs: DraftDoc[];
  context: SubmissionContext;
  submissionId: string;
  onChange: (next: DraftDoc[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  /** Re-run the Phase 1 evidence engine over one document. */
  function evaluate(doc: DraftDoc): DraftDoc {
    return {
      ...doc,
      generalisability: computeGeneralisability(doc, context),
      expired: computeExpiry(doc),
    };
  }

  function update(id: string, patch: Partial<DraftDoc>) {
    onChange(docs.map((d) => (d.id === id ? evaluate({ ...d, ...patch }) : d)));
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: DraftDoc[] = [];
    for (const file of Array.from(files)) {
      const id = `ev-upload-${Date.now()}-${added.length}`;
      added.push(
        evaluate({
          id,
          submissionId,
          itemRefs: [],
          type: "STUDY",
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
        })
      );
    }
    onChange([...docs, ...added]);
    setOpenId(added[0]?.id ?? null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(id: string) {
    const doc = docs.find((d) => d.id === id);
    if (doc?.objectUrl) URL.revokeObjectURL(doc.objectUrl);
    onChange(docs.filter((d) => d.id !== id));
  }

  const unbound = docs.filter((d) => d.itemRefs.length === 0).length;
  const gates = gateItems("PUBLIC");

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="rounded-card border border-dashed border-teal-deep/40 bg-teal-light/20 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink">Attach a document</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Uploaded files are held for this session only. Nothing is sent anywhere and nothing is
              stored — the provenance you enter is what the assessment reads.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-teal-deep px-3 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            <Upload className="h-4 w-4" /> Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            aria-label="Attach a document"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      </div>

      {unbound > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-[#FAEEDA] px-3 py-2 text-xs leading-relaxed text-[#BA7517]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {unbound} {unbound === 1 ? "document is" : "documents are"} not bound to any gate. Evidence
          with no binding counts for nothing — it cannot raise a gate it does not point at.
        </p>
      )}

      {docs.length === 0 ? (
        <p className="rounded-card border border-line bg-bg-card px-4 py-6 text-sm text-muted">
          Nothing attached yet. Attach your own documents above — the checklist opposite says what
          this kind of submission is expected to bring.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => {
            const open = openId === doc.id;
            return (
              <li key={doc.id} className="overflow-hidden rounded-card border border-line bg-bg-card">
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : doc.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm text-ink">{doc.name || "Untitled document"}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{label(doc.type)}</span>
                      <span>·</span>
                      <span>{label(doc.independence)}</span>
                      <span>·</span>
                      <span className={cn(doc.itemRefs.length === 0 && "text-[#BA7517]")}>
                        {doc.itemRefs.length === 0
                          ? "not bound — counts for nothing"
                          : `answers ${doc.itemRefs.map((r) => getItem(r)?.legacyGateId ?? r).join(", ")}`}
                      </span>
                      {doc.file && <><span>·</span><span>held in memory</span></>}
                    </p>
                    {doc.generalisability.limited && doc.generalisability.reason && (
                      <p className="mt-1.5 rounded-md bg-[#FAEEDA] px-2.5 py-1.5 text-xs leading-relaxed text-[#BA7517]">
                        {doc.generalisability.reason}
                      </p>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {doc.objectUrl && (
                      <a href={doc.objectUrl} target="_blank" rel="noopener noreferrer"
                         className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:bg-bg-sink">
                        Open
                      </a>
                    )}
                    <button type="button" onClick={() => remove(doc.id)} aria-label={`Remove ${doc.name}`}
                            className="rounded-md border border-line p-1.5 text-ink-2 hover:bg-bg-sink">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="space-y-4 border-t border-line-soft px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Labelled label="Document name">
                        <input className={inputCls} value={doc.name} onChange={(e) => update(doc.id, { name: e.target.value })} />
                      </Labelled>
                      <Labelled label="Type">
                        <select className={inputCls} value={doc.type} onChange={(e) => update(doc.id, { type: e.target.value as EvidenceType })}>
                          {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
                        </select>
                      </Labelled>
                      <Labelled label="Generated by">
                        <input className={inputCls} value={doc.provenance.generatedBy}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, generatedBy: e.target.value } })}
                               placeholder="Organisation that produced it" />
                      </Labelled>
                      <Labelled label="Funded by">
                        <input className={inputCls} value={doc.provenance.fundedBy}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, fundedBy: e.target.value } })}
                               placeholder="Who paid for it" />
                      </Labelled>
                    </div>

                    <Labelled label="Independence" hint="Vendor-generated evidence is admissible. It is weaker, and the card says so.">
                      <div className="flex flex-wrap gap-2">
                        {INDEPENDENCE.map((i) => (
                          <button key={i.value} type="button" onClick={() => update(doc.id, { independence: i.value })}
                            className={cn("rounded-md border px-3 py-1 text-xs transition-colors",
                              doc.independence === i.value ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink")}>
                            {i.label}
                          </button>
                        ))}
                      </div>
                    </Labelled>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Labelled label="Study setting" hint="Compared against your declared care level.">
                        <input className={inputCls} value={doc.provenance.population.setting}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, population: { ...doc.provenance.population, setting: e.target.value } } })}
                               placeholder="e.g. community health centre" />
                      </Labelled>
                      <Labelled label="Operator cadre" hint="Compared against your declared cadre.">
                        <input className={inputCls} value={doc.provenance.population.cadre}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, population: { ...doc.provenance.population, cadre: e.target.value } } })}
                               placeholder="e.g. staff nurse" />
                      </Labelled>
                      <Labelled label="Sample n">
                        <input className={inputCls} type="number" value={doc.provenance.population.sampleN ?? ""}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, population: { ...doc.provenance.population, sampleN: e.target.value ? Number(e.target.value) : null } } })}
                               placeholder="n" />
                      </Labelled>
                      <Labelled label="Data from">
                        <input className={inputCls} type="date" value={doc.provenance.population.dateFrom}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, population: { ...doc.provenance.population, dateFrom: e.target.value } } })} />
                      </Labelled>
                      <Labelled label="Data to">
                        <input className={inputCls} type="date" value={doc.provenance.population.dateTo}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, population: { ...doc.provenance.population, dateTo: e.target.value } } })} />
                      </Labelled>
                      <Labelled label="Document date">
                        <input className={inputCls} type="date" value={doc.provenance.documentDate}
                               onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, documentDate: e.target.value } })} />
                      </Labelled>
                    </div>

                    <Labelled label="Valid until" hint="Leave blank where the document does not expire.">
                      <input className={inputCls} type="date" value={doc.provenance.validUntil ?? ""}
                             onChange={(e) => update(doc.id, { provenance: { ...doc.provenance, validUntil: e.target.value || null } })} />
                    </Labelled>

                    <Labelled label="One stated limitation" hint="What this document does NOT show. Required — a document with no stated limitation is a claim.">
                      <textarea className={cn(inputCls, "min-h-[56px]")} value={doc.limitation ?? ""}
                                onChange={(e) => update(doc.id, { limitation: e.target.value })}
                                placeholder="e.g. single centre, read by specialists — does not cover a staff nurse in a camp" />
                    </Labelled>

                    {/* Binding */}
                    <Labelled label="Binds to" hint="Evidence with no binding counts for nothing. Pick every gate this document speaks to.">
                      <div className="flex flex-wrap gap-1.5">
                        {gates.map((g) => {
                          const on = doc.itemRefs.includes(g.id);
                          return (
                            <button key={g.id} type="button"
                              onClick={() => update(doc.id, { itemRefs: on ? doc.itemRefs.filter((r) => r !== g.id) : [...doc.itemRefs, g.id] })}
                              title={g.text ?? g.id}
                              className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                                on ? "border-teal-deep bg-teal-light text-teal-deep" : "border-line text-ink-2 hover:bg-bg-sink")}>
                              {on && <Link2 className="h-3 w-3" />}
                              {g.legacyGateId}
                            </button>
                          );
                        })}
                      </div>
                    </Labelled>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Labelled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}
