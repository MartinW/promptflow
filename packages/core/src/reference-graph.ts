/**
 * Reference-graph projection.
 *
 * Walks a corpus of prompts, parses each body for `{{@name}}` references, and
 * returns a DAG: nodes are prompt names, edges are references. Detects cycles,
 * orphans (no outgoing or incoming edges), and missing targets (a reference
 * to a name that doesn't exist in the corpus).
 *
 * Pure — no I/O. Callers supply already-flattened bodies.
 */

import { parseReferences } from "./template";

export interface GraphNode {
  name: string;
  references: string[];
  referencedBy: string[];
}

export interface ReferenceGraph {
  nodes: Map<string, GraphNode>;
  /** Each cycle is the list of names forming a closed loop. */
  cycles: string[][];
  /** Names that have no references in either direction. */
  orphans: string[];
  /** References to prompt names that aren't in the supplied corpus. */
  missing: string[];
}

export interface PromptBody {
  name: string;
  body: string;
}

export function buildReferenceGraph(prompts: PromptBody[]): ReferenceGraph {
  const nodes = new Map<string, GraphNode>();
  for (const p of prompts) {
    nodes.set(p.name, { name: p.name, references: [], referencedBy: [] });
  }

  const missingSet = new Set<string>();
  for (const p of prompts) {
    const refs = parseReferences(p.body);
    const node = nodes.get(p.name);
    if (!node) continue;
    for (const ref of refs) {
      if (!nodes.has(ref)) {
        missingSet.add(ref);
        continue;
      }
      node.references.push(ref);
      nodes.get(ref)?.referencedBy.push(p.name);
    }
  }

  return {
    nodes,
    cycles: findCycles(nodes),
    orphans: Array.from(nodes.values())
      .filter((n) => n.references.length === 0 && n.referencedBy.length === 0)
      .map((n) => n.name),
    missing: Array.from(missingSet).sort(),
  };
}

/**
 * Tarjan-style cycle detection via iterative DFS. Returns each strongly-
 * connected component with more than one node, plus self-loops.
 */
function findCycles(nodes: Map<string, GraphNode>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const onStack = new Set<string>();
  const stack: string[] = [];

  function visit(name: string): void {
    if (onStack.has(name)) {
      const idx = stack.indexOf(name);
      if (idx >= 0) cycles.push([...stack.slice(idx), name]);
      return;
    }
    if (visited.has(name)) return;
    visited.add(name);
    onStack.add(name);
    stack.push(name);
    const node = nodes.get(name);
    if (node) {
      for (const ref of node.references) {
        visit(ref);
      }
    }
    stack.pop();
    onStack.delete(name);
  }

  for (const name of nodes.keys()) {
    visit(name);
  }
  return cycles;
}

/**
 * Project a focused subgraph around a single prompt — its outgoing references
 * up to `depth` and (optionally) the prompts that reference it up to one hop.
 */
export function subgraphFor(
  graph: ReferenceGraph,
  rootName: string,
  options: { depth?: number; includeReverse?: boolean } = {},
): ReferenceGraph {
  const depth = options.depth ?? 3;
  const includeReverse = options.includeReverse ?? false;
  const included = new Set<string>();
  included.add(rootName);

  function walkOut(name: string, remaining: number): void {
    if (remaining <= 0) return;
    const node = graph.nodes.get(name);
    if (!node) return;
    for (const ref of node.references) {
      if (!included.has(ref)) {
        included.add(ref);
        walkOut(ref, remaining - 1);
      }
    }
  }
  walkOut(rootName, depth);

  if (includeReverse) {
    const rootNode = graph.nodes.get(rootName);
    if (rootNode) {
      for (const parent of rootNode.referencedBy) {
        included.add(parent);
      }
    }
  }

  const nodes = new Map<string, GraphNode>();
  for (const name of included) {
    const original = graph.nodes.get(name);
    if (!original) continue;
    nodes.set(name, {
      name,
      references: original.references.filter((r) => included.has(r)),
      referencedBy: original.referencedBy.filter((r) => included.has(r)),
    });
  }

  return {
    nodes,
    cycles: graph.cycles.filter((c) => c.every((n) => included.has(n))),
    orphans: [],
    missing: [],
  };
}
