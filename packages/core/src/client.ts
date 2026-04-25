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

  /** Get a specific prompt + version. Defaults to the `production` label. */
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
      try {
        const result = await sdk.api.promptsGet({
          promptName: name,
          version: opts.version,
          label: opts.label,
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
        const result = await sdk.api.promptsCreate(input);
        return result as unknown as Prompt;
      } catch (err) {
        throw wrapError(err);
      }
    },
  };
}
