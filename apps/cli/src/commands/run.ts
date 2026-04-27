import { isPlaceholder, renderPrompt } from "@promptflow/core";
import { Command } from "commander";
import kleur from "kleur";
import { getClientOrExit, getOpenRouterKeyOrExit } from "../client";

interface OpenRouterChunk {
  choices?: Array<{ delta?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}

export const runCommand = new Command("run")
  .description("Render a prompt and stream the response from OpenRouter")
  .argument("<name>", "Prompt name")
  .option("-v, --version <n>", "Specific version (defaults to latest)")
  .option("-l, --label <label>", "Specific label")
  .option("-m, --model <id>", "OpenRouter model id", "openai/gpt-4o-mini")
  .option(
    "--vars <pairs...>",
    "Variable bindings as key=value (repeatable). Example: --vars name=Alice tier=pro",
  )
  .action(
    async (
      name: string,
      opts: { version?: string; label?: string; model: string; vars?: string[] },
    ) => {
      const { client } = getClientOrExit();
      const apiKey = getOpenRouterKeyOrExit();

      const prompt = await client.getPrompt(name, {
        version: opts.version ? Number.parseInt(opts.version, 10) : undefined,
        label: opts.label,
      });

      const variables = parseVars(opts.vars ?? []);

      // Apply config.defaults for any variables we don't have explicit values for.
      const config = (prompt.config ?? {}) as { defaults?: Record<string, string> };
      const defaults = config.defaults ?? {};
      for (const [k, v] of Object.entries(defaults)) {
        if (variables[k] === undefined) variables[k] = v;
      }

      const messages =
        prompt.type === "text"
          ? [{ role: "user", content: renderPrompt(prompt.prompt, variables) }]
          : prompt.prompt
              .filter((m): m is Exclude<typeof m, { type: "placeholder" }> => !isPlaceholder(m))
              .map((m) => ({
                role: m.role,
                content: renderPrompt(m.content, variables),
              }));

      console.error(kleur.dim(`→ ${prompt.name} v${prompt.version} · ${opts.model}`));

      const startedAt = Date.now();
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/MartinW/promptflow",
          "X-Title": "PromptFlow CLI",
        },
        body: JSON.stringify({
          model: opts.model,
          stream: true,
          messages,
          usage: { include: true },
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => res.statusText);
        console.error(kleur.red(`OpenRouter error ${res.status}: ${text}`));
        process.exit(1);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let usage: OpenRouterChunk["usage"];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]" || !data) continue;
          let parsed: OpenRouterChunk;
          try {
            parsed = JSON.parse(data) as OpenRouterChunk;
          } catch {
            continue;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) process.stdout.write(delta);
          if (parsed.usage) usage = parsed.usage;
        }
      }
      process.stdout.write("\n");

      const elapsed = Date.now() - startedAt;
      const summary = [
        `${elapsed}ms`,
        usage?.total_tokens !== undefined ? `${usage.total_tokens} tokens` : null,
        typeof usage?.cost === "number" ? `$${usage.cost.toFixed(5)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      console.error(kleur.dim(summary));
    },
  );

function parseVars(pairs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) {
      throw new Error(`Invalid --vars entry "${pair}" (expected key=value)`);
    }
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}
