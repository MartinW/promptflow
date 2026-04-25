import "server-only";
import { createClient, type PromptFlowClient } from "@promptflow/core";

let cached: PromptFlowClient | null = null;

/**
 * Server-side PromptFlow client.
 *
 * Reads Langfuse credentials from env vars and reuses a single client across
 * requests. Throws if env is incomplete; pages that may run without
 * configuration should call `checkLangfuse()` first to render a setup state.
 */
export function getServerClient(): PromptFlowClient {
  if (cached) return cached;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
  if (!publicKey || !secretKey) {
    throw new Error("Langfuse not configured: set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY");
  }
  cached = createClient({ publicKey, secretKey, host });
  return cached;
}

export function isLangfuseConfigured(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}
