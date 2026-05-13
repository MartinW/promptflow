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

    // Three-column data-flow layout — all arrows go left to right:
    //
    //   [dependencies]  →  [focused prompt]  →  [consumers]
    //   (left)              (centre)              (right)
    //
    // Dependencies = prompts the focused one references (their content
    //   flows INTO the focused prompt).
    // Consumers = prompts that reference the focused one (focused content
    //   flows INTO them).
    //
    // When there are no dependencies, the focused prompt moves to x=0
    // (leftmost) so it reads naturally as "this prompt → its consumers".
    const depNames = liveRefs;
    const consumerNames = reverseRefs.filter((n) => !liveRefs.includes(n));

    const hasDeps = depNames.length > 0;
    const focusX = hasDeps ? NODE_W + COL_GAP : 0;
    const consumerX = focusX + NODE_W + COL_GAP;

    function stackY(index: number, total: number, centreY: number): number {
      const totalHeight = total * NODE_H + (total - 1) * ROW_GAP;
      return centreY - totalHeight / 2 + index * (NODE_H + ROW_GAP);
    }

    const tallestColumn = Math.max(depNames.length, consumerNames.length, 1);
    const centreY = tallestColumn * (NODE_H + ROW_GAP) / 2;

    const focusNode: Node = {
      id: focusedName,
      type: "prompt",
      position: { x: focusX, y: centreY - NODE_H / 2 },
      data: {
        name: focusedName,
        version: focusedVersion,
        tags: focusedTags,
        references: liveRefs.length,
        referencedBy: reverseRefs.length,
        isFocused: true,
      },
    };

    const depNodes: Node[] = depNames.map((name, i) => {
      const meta = corpusByName[name];
      return {
        id: name,
        type: "prompt",
        position: { x: 0, y: stackY(i, depNames.length, centreY) },
        data: {
          name,
          version: meta?.version ?? 0,
          tags: meta?.tags ?? [],
          references: meta?.references ?? 0,
          referencedBy: meta?.referencedBy ?? 0,
        },
      };
    });

    const consumerNodes: Node[] = consumerNames.map((name, i) => {
      const meta = corpusByName[name];
      return {
        id: name,
        type: "prompt",
        position: { x: consumerX, y: stackY(i, consumerNames.length, centreY) },
        data: {
          name,
          version: meta?.version ?? 0,
          tags: meta?.tags ?? [],
          references: meta?.references ?? 0,
          referencedBy: meta?.referencedBy ?? 0,
        },
      };
    });

    // Edges follow DATA FLOW (left to right):
    //   dependency → focused   (dep's content feeds into this prompt)
    //   focused → consumer     (this prompt's content feeds into consumer)
    const edgeList: Edge[] = [];
    for (const dep of depNames) {
      edgeList.push({
        id: `${dep}→${focusedName}`,
        source: dep,
        target: focusedName,
        animated: true,
      });
    }
    for (const consumer of consumerNames) {
      edgeList.push({
        id: `${focusedName}→${consumer}`,
        source: focusedName,
        target: consumer,
      });
    }

    return { nodes: [focusNode, ...depNodes, ...consumerNodes], edges: edgeList };
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
