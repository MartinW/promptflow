import "server-only";
import { gateway, type ModelMessage, streamText } from "ai";
import { langfuseSpanProcessor } from "@/instrumentation";

export type Provider = "vercel" | "openrouter";

export function pickProvider(): Provider | null {
  if (process.env.AI_GATEWAY_API_KEY) return "vercel";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return null;
}

export interface VercelStreamOptions {
  messages: { role: string; content: string }[];
  model: string;
  promptName: string;
  promptVersion?: number;
}

interface DoneUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Stream a completion through the Vercel AI SDK + AI Gateway, emitting the
 * same SSE event shape as the OpenRouter path so the Playground client doesn't
 * need to change. Telemetry is captured via OpenTelemetry (see
 * `instrumentation.ts`) and forwarded to Langfuse.
 */
export function streamViaVercel(opts: VercelStreamOptions): ReadableStream<Uint8Array> {
  const startedAt = Date.now();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const modelMessages: ModelMessage[] = opts.messages.map((m) => {
          const role = m.role === "assistant" || m.role === "system" ? m.role : "user";
          return { role, content: m.content } as ModelMessage;
        });
        const result = streamText({
          model: gateway(opts.model),
          messages: modelMessages,
          experimental_telemetry: {
            isEnabled: true,
            functionId: "playground",
            metadata: {
              promptName: opts.promptName,
              promptVersion: opts.promptVersion ?? "latest",
              tags: ["playground", "vercel-experiment"],
            },
          },
        });

        for await (const chunk of result.textStream) {
          if (chunk) send({ type: "token", content: chunk });
        }

        const usage = await result.usage;
        const done: DoneUsage = {
          prompt_tokens: usage?.inputTokens,
          completion_tokens: usage?.outputTokens,
          total_tokens: usage?.totalTokens,
        };
        send({
          type: "done",
          latencyMs: Date.now() - startedAt,
          usage: done,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
        // Push spans to Langfuse the moment the stream ends instead of waiting
        // on a batch timer. Best-effort — never let flush break the response.
        try {
          await langfuseSpanProcessor.forceFlush();
        } catch {
          // ignore
        }
      }
    },
  });
}
