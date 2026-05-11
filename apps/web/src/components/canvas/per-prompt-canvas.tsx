"use client";

import { parseReferences } from "@promptflow/core";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useMemo } from "react";
import { layoutGraph } from "@/lib/canvas-layout";
import { PromptNode } from "./prompt-node";
import "@xyflow/react/dist/style.css";

export interface NeighbourPrompt {
  name: string;
  version: number;
  tags: string[];
  references: number;
  referencedBy: number;
}

interface PerPromptCanvasProps {
  focusedName: string;
  focusedVersion: number;
  focusedTags: string[];
  /** Current draft body — re-parsed for live edge updates. */
  body: string;
  /** Names that already reference this prompt (reverse-refs). */
  reverseRefs: string[];
  /** Lookup for any other prompt in the corpus we might need to render. */
  corpusByName: Record<string, NeighbourPrompt>;
}

const NODE_TYPES = { prompt: PromptNode };

/**
 * Mini canvas for the edit page. Centres on the focused prompt and branches
 * out to whatever it references (parsed from the live body — typing
 * `{{@foo}}` adds the edge immediately) plus the prompts that already
 * reference it.
 *
 * Renders ReactFlow directly so the node/edge set is fully controlled — the
 * shared `<PromptCanvas>` uses internal state for drag/drop, which doesn't
 * pick up body changes.
 */
export function PerPromptCanvas(props: PerPromptCanvasProps) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({
  focusedName,
  focusedVersion,
  focusedTags,
  body,
  reverseRefs,
  corpusByName,
}: PerPromptCanvasProps) {
  const { nodes, edges } = useMemo(() => {
    const liveRefs = parseReferences(body);
    const neighbourNames = new Set<string>([...liveRefs, ...reverseRefs]);

    const focusNode: Node = {
      id: focusedName,
      type: "prompt",
      position: { x: 0, y: 0 },
      data: {
        name: focusedName,
        version: focusedVersion,
        tags: focusedTags,
        references: liveRefs.length,
        referencedBy: reverseRefs.length,
        isFocused: true,
      },
    };

    const neighbourNodes: Node[] = Array.from(neighbourNames).map((name) => {
      const meta = corpusByName[name];
      return {
        id: name,
        type: "prompt",
        position: { x: 0, y: 0 },
        data: {
          name,
          version: meta?.version ?? 0,
          tags: meta?.tags ?? [],
          references: meta?.references ?? 0,
          referencedBy: meta?.referencedBy ?? 0,
        },
      };
    });

    const edgeList: Edge[] = [];
    for (const ref of liveRefs) {
      edgeList.push({
        id: `${focusedName}→${ref}`,
        source: focusedName,
        target: ref,
        animated: true,
      });
    }
    for (const parent of reverseRefs) {
      edgeList.push({ id: `${parent}→${focusedName}`, source: parent, target: focusedName });
    }

    return layoutGraph([focusNode, ...neighbourNodes], edgeList, "LR");
  }, [focusedName, focusedVersion, focusedTags, body, reverseRefs, corpusByName]);

  const nodeTypes = useMemo(() => NODE_TYPES, []);

  return (
    <div
      style={{ height: "22rem" }}
      className="overflow-hidden rounded-md border bg-muted/20"
      data-component="per-prompt-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
