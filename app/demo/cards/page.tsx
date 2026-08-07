import { TOOLS } from "@/lib/mock/fixtures/tools";
import { TOOL_GATE_ANSWERS } from "@/lib/mock/fixtures/gate-answers";
import { DOCUMENTS } from "@/lib/mock/fixtures/documents";
import { runToolAssessment } from "@/lib/engine/readiness-tool";
import { ReadinessCard } from "@/components/card/ReadinessCard";
import type { Document } from "@/lib/schemas/document";

/**
 * Preview route — server-renders the redesigned Readiness Card for all three
 * demo tools so the new ClearPath-style card + doc viewer can be reviewed in
 * one place. Cards are computed by the real engine from the seed answers.
 */
const DEMO_TOOL_IDS = ["tool-cerviai", "tool-chestxr", "tool-symptombot"];

export default function DemoCardsPage() {
  const previews = DEMO_TOOL_IDS.map((id) => {
    const tool = TOOLS.find((t) => t.id === id)!;
    const card = runToolAssessment({
      id: `card-${id}`,
      toolId: id,
      toolName: tool.name,
      careLevel: tool.careLevel,
      gateAnswers: TOOL_GATE_ANSWERS[id],
      docIds: tool.docIds,
      createdAt: "2026-01-15T00:00:00.000Z",
    });
    const docs = tool.docIds
      .map((did) => DOCUMENTS.find((d) => d.id === did))
      .filter((d): d is Document => Boolean(d));
    return { tool, card, docs };
  });

  return (
    <div className="space-y-14 py-4">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl text-ink">Card preview — three tools</h1>
        <p className="text-sm text-muted">
          The redesigned Readiness Card (ClearPath card language). Click a
          document’s “View” to open it in the DocViewer.
        </p>
      </header>
      {previews.map(({ tool, card, docs }) => (
        <ReadinessCard key={tool.id} card={card} tool={tool} docs={docs} />
      ))}
    </div>
  );
}
