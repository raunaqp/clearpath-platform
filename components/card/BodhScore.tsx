import type { BodhScore as BodhScoreType } from "@/lib/mock/fixtures/bodh-scores";
import { scoreAccent } from "@/lib/ui";

/**
 * BODH validation score block (BODH hook) — accuracy / fairness / safety from
 * the BODH platform (mocked). Shown on the Readiness Card; the same axes
 * pre-fill the clinical + fairness gates in the wizard.
 */
export function BodhScore({ score }: { score: BodhScoreType }) {
  const axes = [
    { label: "Accuracy", value: score.accuracy },
    { label: "Fairness", value: score.fairness },
    { label: "Safety", value: score.safety },
  ];
  return (
    <div className="rounded-lg border border-[#D9D5C8] bg-white px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">
        BODH validation score
      </p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {axes.map((a) => (
          <div key={a.label}>
            <p className="font-serif text-2xl tabular-nums" style={{ color: scoreAccent(a.value) }}>{a.value}</p>
            <p className="text-xs text-[#6B766F]">{a.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
