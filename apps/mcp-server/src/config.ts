/**
 * Env-var configuration for the MCP server.
 *
 * Read once at startup; mistakes surface as a clear stderr message before the
 * stdio transport hands over control to the client.
 */
export interface ServerConfig {
  langfusePublicKey: string;
  langfuseSecretKey: string;
  langfuseHost: string;
  /** Comma-separated AND filter; only prompts matching every tag are exposed. */
  tagFilter: string | undefined;
  /** Default Langfuse label when none is specified by the caller. */
  defaultLabel: string;
  /** Cache TTL in seconds. */
  cacheTtlSec: number;
  /** Optional. Enables the run_prompt tool. */
  openrouterApiKey: string | undefined;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function loadConfig(): ServerConfig {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) {
    process.stderr.write(
      "promptflow-mcp: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are required.\n",
    );
    process.exit(1);
  }
  const ttl = Number.parseInt(process.env.PROMPTFLOW_CACHE_TTL_SECONDS ?? "300", 10);
  return {
    langfusePublicKey: publicKey,
    langfuseSecretKey: secretKey,
    langfuseHost: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
    tagFilter: process.env.PROMPTFLOW_TAG_FILTER || undefined,
    defaultLabel: process.env.PROMPTFLOW_LABEL ?? "latest",
    cacheTtlSec: Number.isFinite(ttl) && ttl > 0 ? ttl : 300,
    openrouterApiKey: process.env.OPENROUTER_API_KEY || undefined,
    logLevel: (process.env.PROMPTFLOW_LOG_LEVEL ?? "warn") as ServerConfig["logLevel"],
  };
}
