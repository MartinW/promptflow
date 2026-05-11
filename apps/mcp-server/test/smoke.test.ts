import type { Prompt, PromptMeta } from "@promptflow/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PromptCache } from "../src/cache";
import { loadConfig, type ServerConfig } from "../src/config";
import { buildTools } from "../src/handlers/tools";

function makeCache(prompts: PromptMeta[] = [], get?: (name: string) => Prompt): PromptCache {
  return {
    async list() {
      return prompts;
    },
    async get(name: string) {
      if (!get) throw new Error(`No fake get() provided for ${name}`);
      return get(name);
    },
    refresh() {},
  } as unknown as PromptCache;
}

function makeConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    langfusePublicKey: "pk-test",
    langfuseSecretKey: "sk-test",
    langfuseHost: "https://cloud.langfuse.com",
    tagFilter: undefined,
    defaultLabel: "latest",
    cacheTtlSec: 300,
    openrouterApiKey: undefined,
    logLevel: "warn",
    ...overrides,
  };
}

describe("MCP smoke", () => {
  describe("tool registration", () => {
    it("exposes the five base tools when OpenRouter is not configured", () => {
      const tools = buildTools(makeCache(), makeConfig());
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual([
        "get_prompt_metadata",
        "list_prompts",
        "refresh_prompts",
        "render_prompt",
        "search_prompts",
      ]);
    });

    it("adds run_prompt only when OPENROUTER_API_KEY is set", () => {
      const without = buildTools(makeCache(), makeConfig());
      expect(without.map((t) => t.name)).not.toContain("run_prompt");

      const withKey = buildTools(makeCache(), makeConfig({ openrouterApiKey: "sk-or-test" }));
      expect(withKey.map((t) => t.name)).toContain("run_prompt");
    });

    it("declares an MCP-compliant inputSchema on every tool", () => {
      const tools = buildTools(makeCache(), makeConfig({ openrouterApiKey: "sk-or-test" }));
      for (const tool of tools) {
        expect(tool.inputSchema, `tool "${tool.name}" inputSchema`).toMatchObject({
          type: "object",
        });
        // properties is optional on refresh_prompts (no inputs), but when
        // present it must be an object map.
        const schema = tool.inputSchema as { properties?: unknown };
        if (schema.properties !== undefined) {
          expect(typeof schema.properties).toBe("object");
        }
      }
    });
  });

  describe("list_prompts handler", () => {
    const prompts: PromptMeta[] = [
      {
        name: "alpha",
        versions: [1],
        tags: ["voice:greeting", "env:prod"],
        labels: ["production"],
        lastUpdatedAt: "2025-01-01T00:00:00Z",
      },
      {
        name: "beta",
        versions: [1],
        tags: ["image:hero"],
        labels: [],
        lastUpdatedAt: "2025-01-02T00:00:00Z",
      },
    ];

    it("returns the full list with no filter", async () => {
      const [listPrompts] = buildTools(makeCache(prompts), makeConfig());
      const result = await listPrompts.handler({});
      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text) as { data: { name: string }[] };
      expect(payload.data.map((p) => p.name).sort()).toEqual(["alpha", "beta"]);
    });

    it("applies a comma-separated AND tag filter via @promptflow/core", async () => {
      const [listPrompts] = buildTools(makeCache(prompts), makeConfig());
      const result = await listPrompts.handler({
        tag_filter: "voice:greeting,env:prod",
      });
      const text = (result.content[0] as { text: string }).text;
      const payload = JSON.parse(text) as { data: { name: string }[] };
      expect(payload.data.map((p) => p.name)).toEqual(["alpha"]);
    });
  });

  describe("config resolution", () => {
    const ORIGINAL_ENV = { ...process.env };

    beforeEach(() => {
      for (const key of Object.keys(process.env)) {
        if (
          key.startsWith("LANGFUSE_") ||
          key === "OPENROUTER_API_KEY" ||
          key.startsWith("PROMPTFLOW_")
        ) {
          delete process.env[key];
        }
      }
    });

    afterEach(() => {
      for (const key of Object.keys(process.env)) {
        if (
          key.startsWith("LANGFUSE_") ||
          key === "OPENROUTER_API_KEY" ||
          key.startsWith("PROMPTFLOW_")
        ) {
          delete process.env[key];
        }
      }
      Object.assign(process.env, ORIGINAL_ENV);
    });

    it("reads LANGFUSE_HOST (not LANGFUSE_BASE_URL)", () => {
      process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      process.env.LANGFUSE_HOST = "https://example.test";
      process.env.LANGFUSE_BASE_URL = "https://wrong.test";

      const cfg = loadConfig();
      expect(cfg.langfuseHost).toBe("https://example.test");
    });

    it("defaults host to cloud.langfuse.com when nothing is set", () => {
      process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
      process.env.LANGFUSE_SECRET_KEY = "sk-test";
      const cfg = loadConfig();
      expect(cfg.langfuseHost).toBe("https://cloud.langfuse.com");
    });
  });
});
