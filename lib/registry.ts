import type { Tool } from "@/lib/schemas/tool";
import type { Vendor } from "@/lib/schemas/vendor";
import type { Hospital } from "@/lib/schemas/hospital";
import type { Deployment, RegistryEntry } from "@/lib/schemas/deployment";
import type { ToolReadinessCard, ToolVerdict } from "@/lib/schemas/readiness-card";

/**
 * Registry view (BUILD_SPEC — rebuilt registry). Per tool, the real categories:
 * clinical TRIALS and DEPLOYMENTS, each ongoing|completed with the hospitals it
 * ran at and the outcome. Derived from deployments (single source), so it can
 * never drift from the workspace.
 */
export type RegistryActivity = {
  hospitalId: string;
  hospitalName: string;
  status: "ongoing" | "completed";
  outcome: string | null;
  /** A believable count (enrolment / throughput) from the pilot metrics. */
  detail: string | null;
};

export type RegistryToolView = {
  toolId: string;
  slug: string;
  toolName: string;
  vendorName: string;
  verdict: ToolVerdict | null;
  deviceClass?: string;
  /** Overall current status for the dedicated column. */
  currentStatus: "ongoing" | "completed" | "assessed";
  trials: RegistryActivity[];
  deployments: RegistryActivity[];
  /** Listed as assessed but no trial/deployment activity yet. */
  assessedOnly: boolean;
};

function activityOf(d: Deployment, hospitals: Hospital[]): RegistryActivity {
  const hospitalName = hospitals.find((h) => h.id === d.hospitalId)?.name ?? d.hospitalId;
  const status: RegistryActivity["status"] = d.published ? "completed" : "ongoing";
  let outcome: string | null = null;
  if (status === "completed") {
    if (d.kind === "trial" && d.endpoints.length > 0) {
      outcome = `${d.endpoints.filter((e) => e.met).length}/${d.endpoints.length} endpoints met`;
    } else if (d.recommendation) {
      outcome = d.recommendation.decision;
    } else {
      outcome = "completed";
    }
  }
  const enrol = d.metrics.find((m) => m.key === "enrolment");
  const detail = enrol ? `${enrol.value}${enrol.hint ? ` ${enrol.hint}` : ""}` : null;
  return { hospitalId: d.hospitalId, hospitalName, status, outcome, detail };
}

export function buildRegistryView(args: {
  tools: Tool[];
  vendors: Vendor[];
  hospitals: Hospital[];
  deployments: Deployment[];
  cards: ToolReadinessCard[];
  listed: RegistryEntry[];
}): RegistryToolView[] {
  const { tools, vendors, hospitals, deployments, cards, listed } = args;

  const toolIds = new Set<string>();
  deployments.forEach((d) => toolIds.add(d.toolId));
  listed.forEach((r) => toolIds.add(r.toolId));

  const views: RegistryToolView[] = [];
  for (const toolId of toolIds) {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) continue;
    const vendor = vendors.find((v) => v.id === tool.vendorId);
    const card = cards.find((c) => c.toolId === toolId);
    const deps = deployments.filter((d) => d.toolId === toolId);
    const trials = deps.filter((d) => d.kind === "trial").map((d) => activityOf(d, hospitals));
    const deploys = deps.filter((d) => d.kind === "deployment").map((d) => activityOf(d, hospitals));
    const all = [...trials, ...deploys];
    const currentStatus: RegistryToolView["currentStatus"] =
      all.some((a) => a.status === "ongoing") ? "ongoing" : all.length > 0 ? "completed" : "assessed";
    views.push({
      toolId,
      slug: tool.slug,
      toolName: tool.name,
      vendorName: vendor?.name ?? "—",
      verdict: card?.verdict ?? null,
      deviceClass: tool.deviceClass,
      currentStatus,
      trials,
      deployments: deploys,
      assessedOnly: trials.length === 0 && deploys.length === 0,
    });
  }

  // Tools with activity first, then assessed-only.
  return views.sort((a, b) => Number(a.assessedOnly) - Number(b.assessedOnly));
}
