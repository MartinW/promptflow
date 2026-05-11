import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

export interface LaidOutGraph {
  nodes: Node[];
  edges: Edge[];
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

/**
 * Run dagre auto-layout over a set of nodes/edges and return them with
 * absolute `position` set. The canvas renders nodes server-side at these
 * positions to avoid the hydration flash you get when React Flow re-lays
 * out client-side on mount.
 *
 * Direction defaults to left-to-right which reads naturally for "this prompt
 * references those prompts". Pass `"TB"` for top-down trees.
 */
export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
): LaidOutGraph {
  if (nodes.length === 0) return { nodes: [], edges };
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 32, ranksep: 64 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    } satisfies Node;
  });
  return { nodes: laidOut, edges };
}
