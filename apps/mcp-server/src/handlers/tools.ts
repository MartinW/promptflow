import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { extractVariables, isPlaceholder, renderPrompt } from "@promptflow/core";
import Fuse from "fuse.js";
import type { PromptCache } from "../cache";
import type { ServerConfig } from "../config";
import type { Logger } from "../logger";

interface ToolDef {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

/**
 * Tool surface — the MCP "tools" primitive lets clients invoke arbitrary
 * server actions. We expose listing/searching/inspecting prompts and (when
 * OPENROUTER_API_KEY is set) running them end-to-end.
 *
 * `run_prompt` is registered conditionally so that clients don't see a
 * "feature missing" error when the server isn't configured for execution.
 */
export function registerToolHandlers(
  server: Server,
  cache: PromptCache,
  config: ServerConfig,
  logger: Logger,
): void {
  const tools: ToolDef[] = [
    listPromptsTool(cache),
    searchPromptsTool(cache),
    getPromptMetadataTool(cache),
    renderPromptTool(cache),
    refreshPromptsTool(cache),
  ];
  if (config.openrouterApiKey) {
    tools.push(runPromptTool(cache, config.openrouterApiKey));
  }
  const byName = new Map(tools.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = byName.get(req.params.name);
    if (!tool) {
      return errorResult(`Unknown tool: ${req.params.name}`);
    }
    logger.debug("tools/call", req.params.name, JSON.stringify(req.params.arguments ?? {}));
    try {
      return await tool.handler((req.params.arguments ?? {}) as Record<string, unknown>);
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  });
}

function listPromptsTool(cache: PromptCache): ToolDef {
  return {
    name: "list_prompts",
    description:
      "List Langfuse prompts visible to this MCP server. Optionally filter by a comma-separated tag list (AND semantics).",
    inputSchema: {
      type: "object",
      properties: {
        tag_filter: {
          type: "string",
          description: 'Comma-separated tag filter, e.g. "voice,env:prod".',
        },
        limit: { type: "integer", default: 50 },
      },
    },
    handler: async (args) => {
      const all = await cache.list();
      const filter = typeof args.tag_filter === "string" ? args.tag_filter : undefined;
      const limit = typeof args.limit === "number" ? args.limit : 50;
      const filtered = filter
        ? all.filter((p) =>
            filter
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .every((t) => p.tags.includes(t)),
          )
        : all;
      const data = filtered.slice(0, limit).map((p) => ({
        name: p.name,
        versions: p.versions,
        tags: p.tags,
        labels: p.labels,
        lastUpdatedAt: p.lastUpdatedAt,
      }));
      return jsonResult({ data });
    },
  };
}

function searchPromptsTool(cache: PromptCache): ToolDef {
  return {
    name: "search_prompts",
    description: "Fuzzy-search prompts by name, tags, or labels. Returns the top N matches.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", default: 10 },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const all = await cache.list();
      const query = String(args.query ?? "");
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const fuse = new Fuse(all, {
        keys: ["name", "tags", "labels"],
        threshold: 0.4,
      });
      const matches = fuse
        .search(query)
        .slice(0, limit)
        .map((m) => ({
          name: m.item.name,
          tags: m.item.tags,
          labels: m.item.labels,
          score: Math.round((1 - (m.score ?? 0)) * 100) / 100,
        }));
      return jsonResult({ matches });
    },
  };
}

function getPromptMetadataTool(cache: PromptCache): ToolDef {
  return {
    name: "get_prompt_metadata",
    description:
      "Return metadata for a specific prompt: type, version, labels, tags, detected variables.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        version: { type: "integer" },
        label: { type: "string" },
      },
      required: ["name"],
    },
    handler: async (args) => {
      const prompt = await cache.get(String(args.name), {
        version: typeof args.version === "number" ? args.version : undefined,
        label: typeof args.label === "string" ? args.label : undefined,
      });
      const variables =
        prompt.type === "text" ? extractVariables(prompt.prompt) : aggregateChatVars(prompt.prompt);
      return jsonResult({
        name: prompt.name,
        type: prompt.type,
        version: prompt.version,
        labels: prompt.labels,
        tags: prompt.tags,
        commitMessage: prompt.commitMessage ?? null,
        variables,
        config: prompt.config ?? null,
      });
    },
  };
}

function renderPromptTool(cache: PromptCache): ToolDef {
  return {
    name: "render_prompt",
    description:
      "Render a Langfuse prompt with variable substitution. Returns rendered messages without executing them.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        version: { type: "integer" },
        label: { type: "string" },
        variables: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      },
      required: ["name"],
    },
    handler: async (args) => {
      const prompt = await cache.get(String(args.name), {
        version: typeof args.version === "number" ? args.version : undefined,
        label: typeof args.label === "string" ? args.label : undefined,
      });
      const callerVars = (args.variables ?? {}) as Record<string, string>;
      const config = (prompt.config ?? {}) as { defaults?: Record<string, string> };
      const variables = { ...(config.defaults ?? {}), ...callerVars };

      if (prompt.type === "text") {
        return jsonResult({
          messages: [{ role: "user", content: renderPrompt(prompt.prompt, variables) }],
        });
      }
      return jsonResult({
        messages: prompt.prompt
          .filter((m) => !isPlaceholder(m))
          .map((m) => ({
            role: m.role,
            content: renderPrompt(m.content, variables),
          })),
      });
    },
  };
}

function refreshPromptsTool(cache: PromptCache): ToolDef {
  return {
    name: "refresh_prompts",
    description: "Flush the prompt cache so the next request hits Langfuse.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      cache.refresh();
      return jsonResult({ refreshed: true });
    },
  };
}

function runPromptTool(cache: PromptCache, openrouterKey: string): ToolDef {
  return {
    name: "run_prompt",
    description:
      "Render and execute a Langfuse prompt against OpenRouter. Returns the LLM response.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        version: { type: "integer" },
        label: { type: "string" },
        variables: { type: "object", additionalProperties: { type: "string" } },
        model: { type: "string", default: "openai/gpt-4o-mini" },
      },
      required: ["name"],
    },
    handler: async (args) => {
      const prompt = await cache.get(String(args.name), {
        version: typeof args.version === "number" ? args.version : undefined,
        label: typeof args.label === "string" ? args.label : undefined,
      });
      const model = String(args.model ?? "openai/gpt-4o-mini");
      const callerVars = (args.variables ?? {}) as Record<string, string>;
      const config = (prompt.config ?? {}) as { defaults?: Record<string, string> };
      const variables = { ...(config.defaults ?? {}), ...callerVars };

      const messages =
        prompt.type === "text"
          ? [{ role: "user", content: renderPrompt(prompt.prompt, variables) }]
          : prompt.prompt
              .filter((m) => !isPlaceholder(m))
              .map((m) => ({ role: m.role, content: renderPrompt(m.content, variables) }));

      const startedAt = Date.now();
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/MartinW/promptflow",
          "X-Title": "PromptFlow MCP",
        },
        body: JSON.stringify({ model, messages, usage: { include: true } }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        return errorResult(`OpenRouter ${res.status}: ${text}`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number; cost?: number };
      };
      const elapsed = Date.now() - startedAt;
      return jsonResult({
        content: json.choices?.[0]?.message?.content ?? "",
        latencyMs: elapsed,
        usage: json.usage ?? null,
      });
    },
  };
}

function aggregateChatVars(messages: Array<{ content?: string; name?: string }>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of messages) {
    if (typeof m.content !== "string") continue;
    for (const v of extractVariables(m.content)) {
      if (!seen.has(v)) {
        seen.add(v);
        ordered.push(v);
      }
    }
  }
  return ordered;
}

function jsonResult(payload: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}
