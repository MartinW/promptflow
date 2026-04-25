import { renderPrompt } from "@promptflow/core";
import { getServerClient } from "@/lib/server-client";

export const dynamic = "force-dynamic";

interface RunBody {
  promptName: string;
  version?: number;
  variables?: Record<string, string>;
  model: string;
}

interface OpenRouterChunk {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}

/**
 * Stream a Langfuse prompt's rendered output through OpenRouter.
 *
 * Wire format: Server-Sent Events. Two event types:
 *   { type: "token", content: string }       — each delta chunk
 *   { type: "done", latencyMs, usage? }      — final summary
 *   { type: "error", message: string }       — fatal error mid-stream
 */
export async function POST(req: Request): Promise<Response> {
  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  if (!body.promptName || typeof body.promptName !== "string") {
    return jsonError(400, "Missing promptName");
  }
  if (!body.model || typeof body.model !== "string") {
    return jsonError(400, "Missing model");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonError(500, "OPENROUTER_API_KEY is not configured");
  }

  let renderedSystem: string;
  try {
    const client = getServerClient();
    const prompt = await client.getPrompt(body.promptName, { version: body.version });
    if (prompt.type !== "text") {
      return jsonError(400, "Chat prompts aren't supported in AIPlay v1");
    }
    renderedSystem = renderPrompt(prompt.prompt, body.variables ?? {});
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : String(err));
  }

  const startedAt = Date.now();

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/MartinW/promptflow",
      "X-Title": "PromptFlow",
    },
    body: JSON.stringify({
      model: body.model,
      stream: true,
      messages: [{ role: "user", content: renderedSystem }],
      usage: { include: true },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return jsonError(upstream.status || 502, text || "OpenRouter request failed");
  }

  const upstreamBody = upstream.body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let lastUsage: OpenRouterChunk["usage"] | undefined;

      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
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
            if (data === "[DONE]") continue;
            if (!data) continue;
            let parsed: OpenRouterChunk;
            try {
              parsed = JSON.parse(data) as OpenRouterChunk;
            } catch {
              continue;
            }
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) send({ type: "token", content: delta });
            if (parsed.usage) lastUsage = parsed.usage;
          }
        }
        send({
          type: "done",
          latencyMs: Date.now() - startedAt,
          usage: lastUsage,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
