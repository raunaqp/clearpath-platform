import type { ReadinessCard } from "@/lib/schemas/readiness-card";
import { versionLabel } from "@/lib/schemas/readiness-card";
import {
  AUTONOMY_LABEL,
  CARE_LEVEL_SHORT,
  DEPLOYMENT_MODE_LABEL,
  OPERATOR_CADRE_LABEL,
} from "@/lib/schemas/context";
import { formatCardDate } from "@/lib/ui";

/**
 * The header block — what sits where the 94/100 disc used to.
 *
 * The score was removed rather than demoted, so something has to hold the top
 * of the card. These six identifiers do it, and they are the things a hospital
 * actually needs before reading further: which card is this, which version, is
 * it still valid, and which build of the tool and model was assessed. A
 * readiness card for version 2.3.1 says nothing about 2.4.
 */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B766F]">{label}</p>
      <p className="mt-0.5 break-words font-mono text-[13px] text-[#0E1411]">{value}</p>
    </div>
  );
}

export function CardHeaderBlock({ card }: { card: ReadinessCard }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-b border-[#D9D5C8] pb-5 sm:grid-cols-2">
      <Field label="Card ID" value={card.id} />
      <Field label="Version" value={versionLabel(card.version)} />
      <Field label="Issued" value={formatCardDate(card.issuedAt)} />
      <Field label="Expires" value={formatCardDate(card.expiresAt)} />
      <Field label="Tool" value={card.toolVersion} />
      {/* Omitted rather than printed as "not stated" — the wizard no longer
          asks for it, so its absence is the norm, not a gap in the record. */}
      {card.modelVersion ? <Field label="Model" value={card.modelVersion} /> : null}
    </div>
  );
}

/**
 * The context band.
 *
 * Read from `card.context`, which is a FROZEN COPY taken when the card was
 * issued — never live from the tool record. That is the whole point: the card
 * is a claim about a deployment, not about a product, and a claim about a
 * deployment cannot quietly follow the product around.
 */
export function ContextBlock({
  card,
  contextIsReal,
}: {
  card: ReadinessCard;
  contextIsReal: boolean;
}) {
  const c = card.context;
  const modes = c.deploymentModes.map((m) => DEPLOYMENT_MODE_LABEL[m]);
  const modeText =
    modes.length > 1 ? `${modes.slice(0, -1).join(", ")} and ${modes[modes.length - 1]}` : modes[0];

  const population = [
    c.population.sex === "FEMALE" ? "women" : c.population.sex === "MALE" ? "men" : "all",
    c.population.ageRange,
  ]
    .filter(Boolean)
    .join(" ");

  const line = [
    CARE_LEVEL_SHORT[c.careLevel],
    OPERATOR_CADRE_LABEL[c.operatorCadre],
    modeText,
    c.geography,
    population,
    AUTONOMY_LABEL[c.autonomyLevel],
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-5 rounded-lg border border-[#0F6E56]/30 bg-[#E3F0EB]/50 px-4 py-3.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#0F6E56]">
        Valid only in this context
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[#0E1411]">{line}</p>

      {c.population.pregnancyStatus || c.population.comorbidity ? (
        <p className="mt-1 text-sm leading-relaxed text-[#6B766F]">
          {[c.population.pregnancyStatus, c.population.comorbidity].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <p className="mt-3 border-t border-[#0F6E56]/20 pt-2.5 text-sm leading-relaxed text-[#6B766F]">
        This is not a certification and not a procurement recommendation.
        <br />
        A change of context requires a new assessment.
      </p>

      {!contextIsReal && (
        <p className="mt-2 rounded-md bg-[#FAEEDA] px-2.5 py-1.5 text-xs leading-relaxed text-[#BA7517]">
          Context here is a default derived from the tool&apos;s declared level of care, not an
          assessed deployment. The context step is not built yet, and a frozen copy of a
          placeholder would be false precision.
        </p>
      )}
    </div>
  );
}
