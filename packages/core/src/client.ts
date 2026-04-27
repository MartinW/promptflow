/**
 * PromptFlow client — typed wrapper around the Langfuse SDK.
 *
 * One PromptFlowClient per Langfuse credential pair. Used by the web app
 * (server-side), the CLI, and the MCP server. The wrapper:
 *
 *   1. Adapts Langfuse's loose response types to PromptFlow's narrower types.
 *   2. Maps SDK errors to `PromptFlowError` so callers can branch on `kind`.
 *   3. Adds convenience methods Langfuse doesn't ship (e.g. `getPromptByTag`).
 *
 * The wrapper does NOT cache. Callers (Next.js with `unstable_cache`, the MCP
 * server with its in-process cache) own that policy.
 */

import { Langfuse } from "langfuse";
import { wrapError } from "./errors";
import { matchesFilter } from "./tags";
import type { CreatePromptInput, ListPromptsFilter, Prompt, PromptMeta } from "./types";

export interface ClientConfig {
  publicKey: string;
  secretKey: string;
  /** Defaults to `https://cloud.langfuse.com`. */
  host?: string;
}

export interface PromptFlowClient {
  /** List prompts (metadata only — no body, no full version history). */
  listPrompts(filter?: ListPromptsFilter): Promise<PromptMeta[]>;

  /**
   * Get a specific prompt version.
   *
   * Resolution order:
   *   - If `version` is given, fetches that exact version.
   *   - Else if `label` is given, fetches the version carrying that label.
   *   - Else defaults to `label: "latest"` (Langfuse auto-applies "latest" to
   *     the most recent version, so this works even for draft-only prompts).
   *
   * Runtime apps that should only pull live prompts must pass
   * `{ label: "production" }` explicitly.
   */
  getPrompt(name: string, opts?: { version?: number; label?: string }): Promise<Prompt>;

  /**
   * Find the first prompt that carries a given tag, returning the production
   * (or labelled) version. Returns `null` if nothing matches.
   */
  getPromptByTag(tag: string): Promise<Prompt | null>;

  /**
   * List prompts matching a comma-separated tag filter (AND semantics).
   * E.g. `listByFilter("voice,env:prod")`.
   */
  listByFilter(filter: string): Promise<PromptMeta[]>;

  /** Create a new prompt or version of an existing prompt. */
  createPrompt(input: CreatePromptInput): Promise<Prompt>;
}

export function createClient(config: ClientConfig): PromptFlowClient {
  const sdk = new Langfuse({
    publicKey: config.publicKey,
    secretKey: config.secretKey,
    baseUrl: config.host ?? "https://cloud.langfuse.com",
  });

  return {
    async listPrompts(filter?: ListPromptsFilter): Promise<PromptMeta[]> {
      try {
        const result = await sdk.api.promptsList({
          name: filter?.name,
          label: filter?.label,
          tag: filter?.tag,
          page: filter?.page,
          limit: filter?.limit,
        });
        return (result.data ?? []) as PromptMeta[];
      } catch (err) {
        throw wrapError(err);
      }
    },

    async getPrompt(name, opts = {}): Promise<Prompt> {
      // When the caller doesn't pin a version or label, prefer the auto-applied
      // `latest` label over Langfuse's server-side default (`production`). This
      // means draft prompts (no production label) are still resolvable by name
      // — important for the editor UI; the live runtime path should pass
      // `{ label: "production" }` explicitly.
      const label = opts.version === undefined && opts.label === undefined ? "latest" : opts.label;
      try {
        const result = await sdk.api.promptsGet({
          promptName: name,
          version: opts.version,
          label,
        });
        return result as unknown as Prompt;
      } catch (err) {
        throw wrapError(err);
      }
    },

    async getPromptByTag(tag): Promise<Prompt | null> {
      const matches = await this.listPrompts({ tag, limit: 1 });
      const first = matches[0];
      if (!first) return null;
      return this.getPrompt(first.name);
    },

    async listByFilter(filter): Promise<PromptMeta[]> {
      // Langfuse's `tag` filter takes a single tag, not a list. We fetch a
      // generous page and filter in-process. Acceptable for the projects
      // we expect (low hundreds of prompts).
      const all = await this.listPrompts({ limit: 100 });
      return all.filter((p) => matchesFilter(p.tags, filter));
    },

    async createPrompt(input: CreatePromptInput): Promise<Prompt> {
      try {
        // ChatPromptMessage's `type: "chatmessage"` discriminator is optional
        // (Langfuse strips it on read) but required by the SDK on write. We
        // always set it in our save path, so the cast is safe at the boundary.
        const result = await sdk.api.promptsCreate(
          input as unknown as Parameters<typeof sdk.api.promptsCreate>[0],
        );
        return result as unknown as Prompt;
      } catch (err) {
        throw wrapError(err);
      }
    },
  };
}
