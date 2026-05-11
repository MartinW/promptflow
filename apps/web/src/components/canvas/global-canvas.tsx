import type { Edge, Node } from "@xyflow/react";
import { layoutGraph } from "@/lib/canvas-layout";
import type { CorpusPrompt } from "@/lib/corpus";
import { PromptCanvas } from "./prompt-canvas";

interface GlobalCanvasProps {
  prompts: CorpusPrompt[];
}

/**
 * Server-rendered shell that turns the corpus into nodes/edges and runs the
 * dagre layout before handing off to the client `<PromptCanvas>`. Doing the
 * layout server-side keeps the canvas position-stable across refreshes and
 * avoids the initial "everything-at-origin" flash that React Flow produces
 * when nodes mount without positions.
 */
export function GlobalCanvas({ prompts }: GlobalCanvasProps) {
  const nodes: Node[] = prompts.map((p) => ({
    id: p.meta.name,
    type: "prompt",
    position: { x: 0, y: 0 },
    data: {
      name: p.meta.name,
      version: Math.max(0, ...p.meta.versions),
      tags: p.meta.tags,
      references: p.references.length,
      referencedBy: 0,
    },
  }));

  // Backfill `referencedBy` by counting incoming edges before building the edge list.
  const inboundCounts = new Map<string, number>();
  for (const p of prompts) {
    for (const ref of p.references) {
      inboundCounts.set(ref, (inboundCounts.get(ref) ?? 0) + 1);
    }
  }
  for (const node of nodes) {
    const inbound = inboundCounts.get(node.id);
    if (inbound) node.data = { ...node.data, referencedBy: inbound };
  }

  const edges: Edge[] = [];
  for (const p of prompts) {
    for (const ref of p.references) {
      edges.push({
        id: `${p.meta.name}→${ref}`,
        source: p.meta.name,
        target: ref,
        animated: false,
      });
    }
  }

  const laidOut = layoutGraph(nodes, edges, "LR");
  return <PromptCanvas initialNodes={laidOut.nodes} initialEdges={laidOut.edges} height="72vh" />;
}
