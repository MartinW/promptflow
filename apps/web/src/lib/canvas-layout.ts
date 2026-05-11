import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

export interface LaidOutGraph {
  nodes: Node[];
  edges: Edge[];
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const GROUP_PADDING = 16;
const GROUP_HEADER = 32;
const GROUP_GUTTER = 12;
const GROUP_COLS = 3;
const COLUMN_GAP = 120;
const STACK_GAP = 32;

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

export interface PromptNodeInput {
  /** Globally-unique node id, normally the prompt name. */
  id: string;
  /** Folder path the prompt sits in, or null for the canvas root. */
  folderPath: string | null;
  /** Arbitrary data passed straight through to the rendered node. */
  data: Record<string, unknown>;
}

/**
 * Lay out prompt nodes inside folder group containers, with folders stacked
 * on the **left** column and unfoldered prompts on the **right** column.
 *
 * Two-column hand-packed layout (no dagre at this level) so the user gets a
 * predictable spatial split: everything that lives in a folder is on the
 * left, everything that doesn't is on the right. Edges between prompts
 * still draw freely across columns — React Flow routes them automatically.
 *
 * Within each folder container, prompts use a 3-column grid.
 */
export function layoutFoldered(
  prompts: PromptNodeInput[],
  edges: Edge[],
  _direction: "LR" | "TB" = "LR",
): LaidOutGraph {
  if (prompts.length === 0) return { nodes: [], edges };

  // Bucket prompts by their immediate parent folder. `null` is the canvas root.
  const buckets = new Map<string | null, PromptNodeInput[]>();
  for (const p of prompts) {
    const list = buckets.get(p.folderPath);
    if (list) list.push(p);
    else buckets.set(p.folderPath, [p]);
  }

  interface GroupContainer {
    kind: "group";
    id: string;
    folderPath: string;
    width: number;
    height: number;
    prompts: PromptNodeInput[];
  }

  // Build folder containers, sorted alphabetically for predictable order.
  const folderEntries = Array.from(buckets.entries())
    .filter(([folder]) => folder !== null)
    .sort(([a], [b]) => (a as string).localeCompare(b as string));
  const folderContainers: GroupContainer[] = folderEntries.map(([folder, list]) => {
    const cols = Math.min(GROUP_COLS, list.length);
    const rows = Math.ceil(list.length / cols);
    const width = cols * NODE_WIDTH + (cols - 1) * GROUP_GUTTER + GROUP_PADDING * 2;
    const height = rows * NODE_HEIGHT + (rows - 1) * GROUP_GUTTER + GROUP_PADDING * 2 + GROUP_HEADER;
    return {
      kind: "group",
      id: `folder:${folder}`,
      folderPath: folder as string,
      width,
      height,
      prompts: list,
    };
  });

  // Unfoldered prompts, sorted alphabetically by name for predictable order.
  const bareList = (buckets.get(null) ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));

  // Compute column widths so we know where the right column starts.
  const leftColumnWidth = folderContainers.reduce((max, c) => Math.max(max, c.width), 0);
  const rightColumnX = leftColumnWidth > 0 ? leftColumnWidth + COLUMN_GAP : 0;

  const outNodes: Node[] = [];

  // Left column: folders stacked vertically from y=0 downward.
  let leftY = 0;
  for (const c of folderContainers) {
    outNodes.push({
      id: c.id,
      type: "folderGroup",
      position: { x: 0, y: leftY },
      data: { folderPath: c.folderPath, count: c.prompts.length },
      style: { width: c.width, height: c.height },
      selectable: false,
      draggable: false,
    });
    c.prompts.forEach((p, i) => {
      const col = i % GROUP_COLS;
      const row = Math.floor(i / GROUP_COLS);
      outNodes.push({
        id: p.id,
        type: "prompt",
        position: {
          x: GROUP_PADDING + col * (NODE_WIDTH + GROUP_GUTTER),
          y: GROUP_HEADER + GROUP_PADDING + row * (NODE_HEIGHT + GROUP_GUTTER),
        },
        data: p.data,
        parentId: c.id,
        extent: "parent",
      });
    });
    leftY += c.height + STACK_GAP;
  }

  // Right column: bare prompts stacked vertically from y=0 downward.
  let rightY = 0;
  for (const p of bareList) {
    outNodes.push({
      id: p.id,
      type: "prompt",
      position: { x: rightColumnX, y: rightY },
      data: p.data,
    });
    rightY += NODE_HEIGHT + STACK_GAP;
  }

  return { nodes: outNodes, edges };
}
