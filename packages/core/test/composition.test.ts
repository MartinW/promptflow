import { describe, expect, it } from "vitest";
import type { PromptFlowClient } from "../src/client";
import { resolvePrompt } from "../src/composition";
import type { Prompt, TextPrompt } from "../src/types";

type PromptFixture = Record<string, string | Prompt>;

const ref = (name: string, suffix: "version=1" | "label=production" | "label=latest" = "label=latest") =>
  `@@@langfusePrompt:name=${name}|${suffix}@@@`;

/**
 * Build a fake client backed by an in-memory map of name → prompt. Strings
 * are auto-wrapped as text prompts. `getPrompt` for a missing name throws.
 */
function fakeClient(fixtures: PromptFixture): PromptFlowClient {
  const prompts = new Map<string, Prompt>();
  for (const [name, value] of Object.entries(fixtures)) {
    const prompt: Prompt =
      typeof value === "string"
        ? ({
            type: "text",
            name,
            version: 1,
            prompt: value,
            config: null,
            labels: [],
            tags: [],
          } satisfies TextPrompt)
        : value;
    prompts.set(name, prompt);
  }
  return {
    async listPrompts() {
      return [];
    },
    async getPrompt(name) {
      const found = prompts.get(name);
      if (!found) throw new Error(`not found: ${name}`);
      return found;
    },
    async getPromptByTag() {
      return null;
    },
    async listByFilter() {
      return [];
    },
    async createPrompt() {
      throw new Error("not implemented");
    },
    async deletePrompt() {
      throw new Error("not implemented");
    },
  };
}

describe("resolvePrompt", () => {
  it("returns the prompt unchanged when there are no references", async () => {
    const client = fakeClient({ root: "hello world" });
    const result = await resolvePrompt("root", client);
    expect(result.body).toBe("hello world");
    expect(result.resolvedRefs).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.cycles).toEqual([]);
  });

  it("expands a single label-pinned reference inline", async () => {
    const client = fakeClient({
      root: `Header.\n${ref("shared/intro", "label=latest")}\nFooter.`,
      "shared/intro": "Hi from intro!",
    });
    const result = await resolvePrompt("root", client);
    expect(result.body).toBe("Header.\nHi from intro!\nFooter.");
    expect(result.resolvedRefs).toEqual(["shared/intro"]);
  });

  it("expands nested references", async () => {
    const client = fakeClient({
      a: `A(${ref("b")})`,
      b: `B(${ref("c")})`,
      c: "C",
    });
    const result = await resolvePrompt("a", client);
    expect(result.body).toBe("A(B(C))");
    expect(result.resolvedRefs).toEqual(["c", "b"]);
  });

  it("substitutes variables after references are expanded", async () => {
    const client = fakeClient({
      greet: "Hello, {{name}}!",
      root: `${ref("greet")} You are user {{name}}.`,
    });
    const result = await resolvePrompt("root", client, { variables: { name: "Ada" } });
    expect(result.body).toBe("Hello, Ada! You are user Ada.");
  });

  it("records missing references as data by default", async () => {
    const client = fakeClient({ root: `before ${ref("nope")} after` });
    const result = await resolvePrompt("root", client);
    expect(result.body).toBe(`before ${ref("nope")} after`);
    expect(result.missing).toEqual(["nope"]);
    expect(result.resolvedRefs).toEqual([]);
  });

  it("throws on missing references when onMissing=throw", async () => {
    const client = fakeClient({ root: `x ${ref("nope")} y` });
    await expect(resolvePrompt("root", client, { onMissing: "throw" })).rejects.toThrow();
  });

  it("detects a direct cycle and marks it without hanging", async () => {
    const client = fakeClient({
      a: `A says ${ref("b")}`,
      b: `B says ${ref("a")}`,
    });
    const result = await resolvePrompt("a", client);
    expect(result.cycles.length).toBeGreaterThan(0);
    expect(result.body).toContain("[[cycle:a]]");
  });

  it("detects a longer cycle (a → b → c → a)", async () => {
    const client = fakeClient({
      a: `[${ref("b")}]`,
      b: `[${ref("c")}]`,
      c: `[${ref("a")}]`,
    });
    const result = await resolvePrompt("a", client);
    expect(result.cycles.some((cycle) => cycle.includes("a"))).toBe(true);
  });

  it("truncates beyond maxDepth", async () => {
    const client = fakeClient({
      a: ref("b"),
      b: ref("c"),
      c: ref("d"),
      d: "deep",
    });
    const result = await resolvePrompt("a", client, { maxDepth: 2 });
    expect(result.truncated.length).toBeGreaterThan(0);
  });

  it("dedupes the same reference used twice in one body", async () => {
    const client = fakeClient({
      shared: "X",
      root: `${ref("shared")} and ${ref("shared")}`,
    });
    const result = await resolvePrompt("root", client);
    expect(result.body).toBe("X and X");
    expect(result.resolvedRefs).toEqual(["shared"]);
  });

  it("resolves references inside chat prompts message-by-message", async () => {
    const client = fakeClient({
      sysblock: "You are concise.",
      chatroot: {
        type: "chat",
        name: "chatroot",
        version: 1,
        prompt: [
          { role: "system", content: ref("sysblock") },
          { role: "user", content: "Hello." },
        ],
        config: null,
        labels: [],
        tags: [],
      },
    });
    const result = await resolvePrompt("chatroot", client);
    if (result.prompt.type !== "chat") throw new Error("expected chat prompt");
    expect(result.prompt.prompt[0]).toMatchObject({
      role: "system",
      content: "You are concise.",
    });
    expect(result.resolvedRefs).toEqual(["sysblock"]);
  });

  it("preserves chat placeholders unchanged", async () => {
    const client = fakeClient({
      chatroot: {
        type: "chat",
        name: "chatroot",
        version: 1,
        prompt: [{ type: "placeholder", name: "history" }],
        config: null,
        labels: [],
        tags: [],
      },
    });
    const result = await resolvePrompt("chatroot", client);
    if (result.prompt.type !== "chat") throw new Error("expected chat prompt");
    expect(result.prompt.prompt[0]).toEqual({ type: "placeholder", name: "history" });
  });
});
