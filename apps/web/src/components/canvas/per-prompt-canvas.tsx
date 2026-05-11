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
 * Langfuse reference tag adds the edge immediately) plus the prompts that
 * already reference it.
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

    const NODE_W = 200;
    const NODE_H = 60;
    const COL_GAP = 160;
    const ROW_GAP = 24;

    // Focused prompt on the LEFT, all related prompts on the RIGHT.
    // Two groups on the right: prompts this one references (children,
    // outgoing) stacked first, then prompts that reference this one
    // (consumers, incoming) below — separated by a gap.
    const childNames = liveRefs;
    const consumerNames = reverseRefs.filter((n) => !liveRefs.includes(n));
    const rightNames = [...childNames, ...consumerNames];

    const rightX = NODE_W + COL_GAP;

    function stackY(index: number, total: number, centreY: number): number {
      const totalHeight = total * NODE_H + (total - 1) * ROW_GAP;
      return centreY - totalHeight / 2 + index * (NODE_H + ROW_GAP);
    }

    const centreY = Math.max(rightNames.length, 1) * (NODE_H + ROW_GAP) / 2;

    const focusNode: Node = {
      id: focusedName,
      type: "prompt",
      position: { x: 0, y: centreY - NODE_H / 2 },
      data: {
        name: focusedName,
        version: focusedVersion,
        tags: focusedTags,
        references: liveRefs.length,
        referencedBy: reverseRefs.length,
        isFocused: true,
      },
    };

    const rightNodes: Node[] = rightNames.map((name, i) => {
      const meta = corpusByName[name];
      return {
        id: name,
        type: "prompt",
        position: { x: rightX, y: stackY(i, rightNames.length, centreY) },
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

    return { nodes: [focusNode, ...rightNodes], edges: edgeList };
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
