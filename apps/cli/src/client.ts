import { createClient, type PromptFlowClient } from "@promptflow/core";
import kleur from "kleur";
import { resolveCreds } from "./config";

/**
 * Get a configured client or print a friendly error and exit.
 *
 * Centralised so every command gets the same not-configured guidance instead
 * of each one re-implementing the check.
 */
export function getClientOrExit(): { client: PromptFlowClient; host: string } {
  const result = resolveCreds();
  if (!result.ok) {
    console.error(kleur.red("Langfuse not configured."));
    console.error("Missing:", result.missing.join(", "));
    console.error("");
    console.error("Set env vars, or run:");
    console.error(kleur.cyan("  promptflow auth"));
    process.exit(1);
  }
  return {
    client: createClient({
      publicKey: result.creds.publicKey,
      secretKey: result.creds.secretKey,
      host: result.creds.host,
    }),
    host: result.creds.host,
  };
}

export function getOpenRouterKeyOrExit(): string {
  const result = resolveCreds();
  if (!result.ok) {
    console.error(kleur.red("Langfuse not configured. Run `promptflow auth` first."));
    process.exit(1);
  }
  if (!result.creds.openrouterApiKey) {
    console.error(kleur.red("OpenRouter not configured."));
    console.error("Set OPENROUTER_API_KEY, or add it via `promptflow auth`.");
    process.exit(1);
  }
  return result.creds.openrouterApiKey;
}
