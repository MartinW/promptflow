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
 * Lay out prompt nodes inside folder group containers.
 *
 * Builds React Flow group nodes (one per non-empty folder path) and places
 * each prompt as a child of its folder group with `parentNode` + `extent:
 * "parent"`. Prompts inside a group are arranged in a 3-column grid; folders
 * themselves (plus any unfoldered prompts) are arranged by dagre using
 * aggregated cross-folder references so related folders sit near each other.
 */
export function layoutFoldered(
  prompts: PromptNodeInput[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
): LaidOutGraph {
  if (prompts.length === 0) return { nodes: [], edges };

  // Bucket prompts by their immediate parent folder. `null` is the canvas root.
  const buckets = new Map<string | null, PromptNodeInput[]>();
  for (const p of prompts) {
    const list = buckets.get(p.folderPath);
    if (list) list.push(p);
    else buckets.set(p.folderPath, [p]);
  }

  // Each bucket becomes one container in the outer dagre pass. For folder
  // buckets the container is a group node sized to fit its grid; for the
  // null bucket each prompt is its own bare container (no group wrapper).
  type Container =
    | { kind: "group"; id: string; folderPath: string; width: number; height: number; prompts: PromptNodeInput[] }
    | { kind: "bare"; id: string; promptId: string; prompt: PromptNodeInput };

  const containers: Container[] = [];
  for (const [folder, list] of buckets) {
    if (folder === null) {
      for (const p of list) {
        containers.push({ kind: "bare", id: p.id, promptId: p.id, prompt: p });
      }
      continue;
    }
    const cols = Math.min(GROUP_COLS, list.length);
    const rows = Math.ceil(list.length / cols);
    const width = cols * NODE_WIDTH + (cols - 1) * GROUP_GUTTER + GROUP_PADDING * 2;
    const height = rows * NODE_HEIGHT + (rows - 1) * GROUP_GUTTER + GROUP_PADDING * 2 + GROUP_HEADER;
    containers.push({
      kind: "group",
      id: `folder:${folder}`,
      folderPath: folder,
      width,
      height,
      prompts: list,
    });
  }

  // Aggregate edges between containers (used purely to bias outer layout).
  // The actual rendered edges stay prompt → prompt; React Flow routes them
  // across group boundaries automatically.
  const containerOf = new Map<string, string>();
  for (const c of containers) {
    if (c.kind === "group") for (const p of c.prompts) containerOf.set(p.id, c.id);
    else containerOf.set(c.promptId, c.id);
  }
  const aggregated = new Map<string, { source: string; target: string }>();
  for (const e of edges) {
    const s = containerOf.get(e.source);
    const t = containerOf.get(e.target);
    if (!s || !t || s === t) continue;
    aggregated.set(`${s}→${t}`, { source: s, target: t });
  }

  // Outer dagre pass on the containers.
  const outer = new dagre.graphlib.Graph();
  outer.setGraph({ rankdir: direction, nodesep: 48, ranksep: 80 });
  outer.setDefaultEdgeLabel(() => ({}));
  for (const c of containers) {
    const w = c.kind === "group" ? c.width : NODE_WIDTH;
    const h = c.kind === "group" ? c.height : NODE_HEIGHT;
    outer.setNode(c.id, { width: w, height: h });
  }
  for (const e of aggregated.values()) outer.setEdge(e.source, e.target);
  dagre.layout(outer);

  const outNodes: Node[] = [];

  for (const c of containers) {
    const pos = outer.node(c.id);
    if (c.kind === "bare") {
      outNodes.push({
        id: c.prompt.id,
        type: "prompt",
        position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
        data: c.prompt.data,
      });
      continue;
    }
    const groupX = pos.x - c.width / 2;
    const groupY = pos.y - c.height / 2;
    outNodes.push({
      id: c.id,
      type: "folderGroup",
      position: { x: groupX, y: groupY },
      data: { folderPath: c.folderPath, count: c.prompts.length },
      style: { width: c.width, height: c.height },
      // Selectable/draggable disabled so the user can't accidentally pull
      // a group off the canvas while panning.
      selectable: false,
      draggable: false,
    });
    // Children with positions RELATIVE to the parent group.
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
  }

  return { nodes: outNodes, edges };
}
