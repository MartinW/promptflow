import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * On-disk CLI config — credentials and the default Langfuse host.
 *
 * Stored at ~/.promptflow/config.json. Env vars (LANGFUSE_PUBLIC_KEY etc.)
 * take precedence over file values; the file is the fallback for "I'm just
 * working from this laptop" usage.
 */
export interface CliConfig {
  langfusePublicKey?: string;
  langfuseSecretKey?: string;
  langfuseHost?: string;
  openrouterApiKey?: string;
}

export function configPath(): string {
  return join(homedir(), ".promptflow", "config.json");
}

export function readConfig(): CliConfig {
  const path = configPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CliConfig;
  } catch {
    return {};
  }
}

export function writeConfig(next: CliConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2), { mode: 0o600 });
}

/**
 * Resolve effective credentials, env-var-first.
 *
 * Returns missing-keys list when something required is absent so callers can
 * print a clear "run promptflow auth" message instead of a generic 401.
 */
export interface ResolvedCreds {
  publicKey: string;
  secretKey: string;
  host: string;
  openrouterApiKey?: string;
}

export type ResolveResult = { ok: true; creds: ResolvedCreds } | { ok: false; missing: string[] };

export function resolveCreds(): ResolveResult {
  const file = readConfig();
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY ?? file.langfusePublicKey;
  const secretKey = process.env.LANGFUSE_SECRET_KEY ?? file.langfuseSecretKey;
  const host = process.env.LANGFUSE_HOST ?? file.langfuseHost ?? "https://cloud.langfuse.com";
  const openrouterApiKey = process.env.OPENROUTER_API_KEY ?? file.openrouterApiKey;

  const missing: string[] = [];
  if (!publicKey) missing.push("LANGFUSE_PUBLIC_KEY");
  if (!secretKey) missing.push("LANGFUSE_SECRET_KEY");
  if (!publicKey || !secretKey) {
    return { ok: false, missing };
  }
  return {
    ok: true,
    creds: { publicKey, secretKey, host, openrouterApiKey },
  };
}
