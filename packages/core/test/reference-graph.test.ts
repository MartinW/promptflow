import { describe, expect, it } from "vitest";
import { buildReferenceGraph, subgraphFor } from "../src/reference-graph";

describe("buildReferenceGraph", () => {
  it("returns empty for an empty corpus", () => {
    const graph = buildReferenceGraph([]);
    expect(graph.nodes.size).toBe(0);
    expect(graph.cycles).toEqual([]);
    expect(graph.orphans).toEqual([]);
    expect(graph.missing).toEqual([]);
  });

  it("records outgoing and incoming edges", () => {
    const graph = buildReferenceGraph([
      { name: "root", body: "Use {{@shared/intro}} please" },
      { name: "shared/intro", body: "Hi" },
    ]);
    expect(graph.nodes.get("root")?.references).toEqual(["shared/intro"]);
    expect(graph.nodes.get("shared/intro")?.referencedBy).toEqual(["root"]);
  });

  it("flags missing references", () => {
    const graph = buildReferenceGraph([{ name: "root", body: "{{@nope}}" }]);
    expect(graph.missing).toEqual(["nope"]);
    expect(graph.nodes.get("root")?.references).toEqual([]);
  });

  it("detects a 2-cycle (a → b → a)", () => {
    const graph = buildReferenceGraph([
      { name: "a", body: "{{@b}}" },
      { name: "b", body: "{{@a}}" },
    ]);
    expect(graph.cycles.length).toBeGreaterThan(0);
  });

  it("detects a self-loop", () => {
    const graph = buildReferenceGraph([{ name: "a", body: "{{@a}}" }]);
    expect(graph.cycles).toEqual([["a", "a"]]);
  });

  it("identifies orphans (no edges in or out)", () => {
    const graph = buildReferenceGraph([
      { name: "alone", body: "no refs here" },
      { name: "a", body: "{{@b}}" },
      { name: "b", body: "leaf" },
    ]);
    expect(graph.orphans).toEqual(["alone"]);
  });
});

describe("subgraphFor", () => {
  it("returns a focused subgraph from a root", () => {
    const graph = buildReferenceGraph([
      { name: "root", body: "{{@a}} {{@b}}" },
      { name: "a", body: "{{@c}}" },
      { name: "b", body: "leaf b" },
      { name: "c", body: "leaf c" },
      { name: "unrelated", body: "ignore" },
    ]);
    const sub = subgraphFor(graph, "root", { depth: 5 });
    expect(Array.from(sub.nodes.keys()).sort()).toEqual(["a", "b", "c", "root"]);
  });

  it("respects depth", () => {
    const graph = buildReferenceGraph([
      { name: "root", body: "{{@a}}" },
      { name: "a", body: "{{@b}}" },
      { name: "b", body: "{{@c}}" },
      { name: "c", body: "leaf" },
    ]);
    const sub = subgraphFor(graph, "root", { depth: 1 });
    expect(sub.nodes.has("a")).toBe(true);
    expect(sub.nodes.has("b")).toBe(false);
  });

  it("includes reverse-references when asked", () => {
    const graph = buildReferenceGraph([
      { name: "parent", body: "{{@target}}" },
      { name: "target", body: "leaf" },
    ]);
    const sub = subgraphFor(graph, "target", { depth: 0, includeReverse: true });
    expect(sub.nodes.has("parent")).toBe(true);
  });
});
