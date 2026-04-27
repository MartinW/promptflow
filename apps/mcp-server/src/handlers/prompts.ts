import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  GetPromptRequestSchema,
  type GetPromptResult,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { extractVariables, isPlaceholder, renderPrompt } from "@promptflow/core";
import type { PromptCache } from "../cache";
import type { Logger } from "../logger";

/**
 * Wire MCP `prompts/list` and `prompts/get` to the cached PromptFlow client.
 *
 * MCP's "Prompts" primitive is the right home for parameterised Langfuse
 * prompts: the client gets a list of templates with named arguments, then
 * invokes a specific one with arguments to receive ready-to-send messages.
 *
 * Naming: `prompt@v3` selects v3 of `prompt`. `prompt#staging` selects the
 * `staging` label. Bare `prompt` resolves to the configured default label
 * (typically `latest`).
 */
export function registerPromptHandlers(server: Server, cache: PromptCache, logger: Logger): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = await cache.list();
    logger.debug("prompts/list", `count=${prompts.length}`);
    return {
      prompts: prompts.map((meta) => {
        // Variables come from the latest version's lastConfig surface isn't
        // populated for templates, so we don't have the body here. The MCP
        // Prompt schema requires `arguments` to be a static list, so we omit
        // it for the index and let the client discover args via prompts/get
        // (Langfuse-aware) or via the `get_prompt_metadata` tool.
        return {
          name: meta.name,
          description: describeMeta(meta),
        };
      }),
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const rawName = req.params.name;
    const args = (req.params.arguments ?? {}) as Record<string, string>;
    const target = parseName(rawName);
    logger.debug("prompts/get", JSON.stringify({ rawName, args }));

    const prompt = await cache.get(target.name, {
      version: target.version,
      label: target.label,
    });

    const variables: Record<string, string> = {};
    // Pre-populate from `config.defaults` if present (PromptFlow convention).
    const config = (prompt.config ?? {}) as { defaults?: Record<string, string> };
    for (const [k, v] of Object.entries(config.defaults ?? {})) {
      variables[k] = v;
    }
    // Caller-supplied arguments override defaults.
    for (const [k, v] of Object.entries(args)) {
      variables[k] = v;
    }

    const description = `${prompt.name} v${prompt.version}${
      prompt.commitMessage ? ` — ${prompt.commitMessage}` : ""
    }`;

    if (prompt.type === "text") {
      const result: GetPromptResult = {
        description,
        messages: [
          {
            role: "user",
            content: { type: "text", text: renderPrompt(prompt.prompt, variables) },
          },
        ],
      };
      return result;
    }

    const result: GetPromptResult = {
      description,
      messages: prompt.prompt
        .filter((m) => !isPlaceholder(m))
        .map((m) => ({
          // MCP only accepts "user" or "assistant" roles. Coerce "system"
          // into the user message body since OpenAI-style "system" doesn't
          // exist in the MCP prompt schema.
          role: roleFor(m.role),
          content: {
            type: "text",
            text: prefixSystem(m.role, renderPrompt(m.content, variables)),
          },
        })),
    };
    return result;
  });
}

interface ParsedName {
  name: string;
  version?: number;
  label?: string;
}

function parseName(raw: string): ParsedName {
  // `name@v3` — explicit version pin.
  const versionIdx = raw.lastIndexOf("@v");
  if (versionIdx >= 0) {
    const versionStr = raw.slice(versionIdx + 2);
    const v = Number.parseInt(versionStr, 10);
    if (Number.isFinite(v) && versionStr === String(v)) {
      return { name: raw.slice(0, versionIdx), version: v };
    }
  }
  // `name#staging` — label pin.
  const hashIdx = raw.lastIndexOf("#");
  if (hashIdx > 0) {
    return { name: raw.slice(0, hashIdx), label: raw.slice(hashIdx + 1) };
  }
  return { name: raw };
}

function roleFor(role: string): "user" | "assistant" {
  if (role === "assistant") return "assistant";
  // system, user, anything else → fold into user
  return "user";
}

function prefixSystem(originalRole: string, content: string): string {
  if (originalRole === "system") return `[system] ${content}`;
  return content;
}

function describeMeta(meta: { tags: string[]; versions: number[] }): string {
  const parts: string[] = [];
  parts.push(`${meta.versions.length} ${meta.versions.length === 1 ? "version" : "versions"}`);
  if (meta.tags.length > 0) parts.push(`tags: ${meta.tags.join(", ")}`);
  return parts.join(" · ");
}

/**
 * Used by prompts/list so callers know what variables a prompt accepts. We
 * resolve via the cache to keep bursts cheap.
 */
export async function describePromptArgs(
  cache: PromptCache,
  name: string,
): Promise<{ name: string; required: boolean }[]> {
  try {
    const prompt = await cache.get(name);
    if (prompt.type === "text") {
      return extractVariables(prompt.prompt).map((v) => ({ name: v, required: true }));
    }
    const seen = new Set<string>();
    const args: { name: string; required: boolean }[] = [];
    for (const m of prompt.prompt) {
      if (isPlaceholder(m)) continue;
      for (const v of extractVariables(m.content)) {
        if (!seen.has(v)) {
          seen.add(v);
          args.push({ name: v, required: true });
        }
      }
    }
    return args;
  } catch {
    return [];
  }
}
