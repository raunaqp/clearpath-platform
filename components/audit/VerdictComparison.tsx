import type { ToolVerdict } from "@/lib/schemas/readiness-card";
import type { AuditVerdict } from "@/lib/schemas/audit";
import { VERDICT_CARD } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Two-verdict comparison (BUILD_SPEC §4) — the vendor's Readiness Card verdict
 * BESIDE the hospital's own intake-audit verdict, as two visually distinct,
 * independent assessments. This is the neutrality point: the hospital's audit
 * is theirs, not the vendor's marketing.
 */
function VerdictPanel({
  eyebrow,
  sub,
  verdict,
  score,
  scoreLabel,
  ours,
  pending,
}: {
  eyebrow: string;
  sub: string;
  verdict: ToolVerdict | AuditVerdict | null;
  score: number | null;
  scoreLabel: string;
  ours?: boolean;
  pending?: boolean;
}) {
  const v = verdict ? VERDICT_CARD[verdict] : null;
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-white p-4",
        ours ? "border-[#0F6E56]/50 ring-1 ring-[#0F6E56]/20" : "border-[#D9D5C8]"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">
          {eyebrow}
        </p>
        {ours && (
          <span className="rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-medium text-[#0F6E56]">
            Independent
          </span>
        )}
      </div>
      <p className="text-xs text-[#6B766F]">{sub}</p>

      {pending || !v ? (
        <p className="mt-3 font-serif text-xl text-[#6B766F]">Not run yet</p>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <span className={cn("rounded-lg px-3 py-1.5 font-serif text-sm uppercase tracking-wide", v.solid)}>
            {v.bandLabel}
          </span>
          {score !== null && (
            <span className="font-serif text-2xl tabular-nums text-[#0E1411]">
              {score}
              <span className="text-sm text-[#6B766F]">/100</span>
            </span>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] text-[#6B766F]">{scoreLabel}</p>
    </div>
  );
}

export function VerdictComparison({
  vendorVerdict,
  vendorScore,
  auditVerdict,
  auditScore,
  auditor,
  pending,
}: {
  vendorVerdict: ToolVerdict;
  vendorScore: number;
  auditVerdict: AuditVerdict | null;
  auditScore: number | null;
  auditor: string;
  pending?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <VerdictPanel
        eyebrow="Vendor's Readiness Card"
        sub="The vendor's own assessment"
        verdict={vendorVerdict}
        score={vendorScore}
        scoreLabel="17 tool gates · 4 dimensions"
      />
      <div className="flex items-center justify-center">
        <span className="rounded-full border border-[#D9D5C8] bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#6B766F]">
          vs
        </span>
      </div>
      <VerdictPanel
        eyebrow="Our intake audit"
        sub={auditor}
        verdict={auditVerdict}
        score={auditScore}
        scoreLabel="13 intake gates · incl. liability + billing"
        ours
        pending={pending}
      />
    </div>
  );
}
