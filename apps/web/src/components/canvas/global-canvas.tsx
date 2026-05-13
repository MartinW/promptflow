import type { Edge } from "@xyflow/react";
import { layoutFoldered, type PromptNodeInput } from "@/lib/canvas-layout";
import type { CorpusPrompt } from "@/lib/corpus";
import { PromptCanvas } from "./prompt-canvas";

interface GlobalCanvasProps {
  prompts: CorpusPrompt[];
}

/**
 * Server-rendered shell that turns the corpus into folder-grouped nodes and
 * prompt-to-prompt edges, runs the dagre layout, and hands the laid-out
 * graph to the client `<PromptCanvas>`. Doing the layout server-side keeps
 * the canvas position-stable across refreshes.
 */
export function GlobalCanvas({ prompts }: GlobalCanvasProps) {
  const inboundCounts = new Map<string, number>();
  for (const p of prompts) {
    for (const ref of p.references) {
      inboundCounts.set(ref, (inboundCounts.get(ref) ?? 0) + 1);
    }
  }

  const promptInputs: PromptNodeInput[] = prompts.map((p) => ({
    id: p.meta.name,
    folderPath: parentFolderOf(p.meta.name),
    data: {
      name: p.meta.name,
      version: Math.max(0, ...p.meta.versions),
      tags: p.meta.tags,
      references: p.references.length,
      referencedBy: inboundCounts.get(p.meta.name) ?? 0,
    },
  }));

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

  const laidOut = layoutFoldered(promptInputs, edges, "LR");
  return <PromptCanvas initialNodes={laidOut.nodes} initialEdges={laidOut.edges} height="72vh" />;
}

function parentFolderOf(name: string): string | null {
  const idx = name.lastIndexOf("/");
  return idx === -1 ? null : name.slice(0, idx);
}
