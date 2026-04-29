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

  /**
   * Delete a prompt or a subset of its versions.
   *
   * - No options → deletes every version under that name.
   * - `{ version: N }` → deletes just that version.
   * - `{ label: "foo" }` → deletes every version carrying that label.
   *
   * Calls Langfuse's `DELETE /api/public/v2/prompts/{name}` directly because
   * the langfuse-js SDK doesn't surface this endpoint yet.
   */
  deletePrompt(name: string, opts?: { version?: number; label?: string }): Promise<void>;
}

export function createClient(config: ClientConfig): PromptFlowClient {
  const baseUrl = config.host ?? "https://cloud.langfuse.com";
  const sdk = new Langfuse({
    publicKey: config.publicKey,
    secretKey: config.secretKey,
    baseUrl,
  });
  const basicAuth = `Basic ${btoa(`${config.publicKey}:${config.secretKey}`)}`;

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
      // Bypass `sdk.api.promptsGet` because the SDK doesn't URL-encode the
      // prompt name — folder-style names like `meditation/evening` get split
      // across path segments and routed to Langfuse's web layer instead of the
      // API, returning HTML 404s. Direct fetch with `encodeURIComponent` works.
      const url = new URL(`/api/public/v2/prompts/${encodeURIComponent(name)}`, baseUrl);
      if (opts.version !== undefined) url.searchParams.set("version", String(opts.version));
      if (label !== undefined) url.searchParams.set("label", label);

      let response: Response;
      try {
        response = await fetch(url, { headers: { Authorization: basicAuth } });
      } catch (err) {
        throw wrapError(err);
      }
      if (!response.ok) throw wrapError(response);
      try {
        return (await response.json()) as Prompt;
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

    async deletePrompt(name, opts = {}): Promise<void> {
      // Folder-style names (e.g. `onboarding/welcome-email`) must be URL-encoded
      // so the slashes don't break the path.
      const url = new URL(`/api/public/v2/prompts/${encodeURIComponent(name)}`, baseUrl);
      if (opts.version !== undefined) url.searchParams.set("version", String(opts.version));
      if (opts.label !== undefined) url.searchParams.set("label", opts.label);

      let response: Response;
      try {
        response = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: basicAuth },
        });
      } catch (err) {
        throw wrapError(err);
      }
      if (!response.ok) throw wrapError(response);
    },
  };
}
