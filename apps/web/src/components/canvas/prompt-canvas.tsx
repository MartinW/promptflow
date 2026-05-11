"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useMemo } from "react";
import { FolderGroupNode } from "./folder-group-node";
import { PromptNode } from "./prompt-node";
import "@xyflow/react/dist/style.css";

interface PromptCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  /** Bias height for the embedded variant; defaults to 70vh for full pages. */
  height?: string;
  showMiniMap?: boolean;
}

const NODE_TYPES = { prompt: PromptNode, folderGroup: FolderGroupNode };

/**
 * React Flow wrapper for the prompt graph. Receives pre-laid-out nodes from
 * the server (via dagre) so there's no hydration jump. Internal state lets
 * the user pan/drag, but the layout starts deterministic.
 */
export function PromptCanvas({
  initialNodes,
  initialEdges,
  height = "70vh",
  showMiniMap = true,
}: PromptCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        height={height}
        showMiniMap={showMiniMap}
      />
    </ReactFlowProvider>
  );
}

function CanvasInner({ initialNodes, initialEdges, height, showMiniMap }: PromptCanvasProps) {
  const nodeTypes = useMemo(() => NODE_TYPES, []);
  const [nodes, , onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState<Edge>(initialEdges);

  return (
    <div
      style={{ height }}
      className="overflow-hidden rounded-md border bg-muted/20"
      data-component="prompt-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
        {showMiniMap ? <MiniMap pannable zoomable className="!bg-background" /> : null}
      </ReactFlow>
    </div>
  );
}
