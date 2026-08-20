/**
 * PromptFlow client — PostHog LLM Prompts backend.
 *
 * Alternative to `client.ts` (Langfuse). Implements the same `PromptFlowClient`
 * interface so callers (currently just the web app) can switch providers
 * without touching call sites. See https://posthog.com/docs/prompt-management
 * and the REST reference at https://posthog.com/docs/api/llm-prompts.
 *
 * Field names/shapes below are confirmed against a real project via
 * `packages/core/scripts/inspect-posthog-prompt.ts` — notably: prompts have
 * no `tags` field (only `labels`), list/get responses carry `version_count`/
 * `latest_version` rather than a version array, and `resolve/name/{name}/`
 * wraps the prompt under a `prompt` key alongside `versions`/`labels` — it is
 * NOT a flat prompt object.
 */

import type { PromptFlowClient } from "./client";
import { PromptFlowError, wrapError } from "./errors";
import { matchesFilter } from "./tags";
import type { CreatePromptInput, ListPromptsFilter, Prompt, PromptMeta } from "./types";

export interface PostHogClientConfig {
  personalApiKey: string;
  projectId: string;
  /** PostHog Cloud is region-split (US/EU) or self-hosted — no safe default. */
  host: string;
}

interface PostHogPrompt {
  name: string;
  version: number;
  /** Present on list/get responses; may be absent on create/update responses. */
  version_count?: number;
  latest_version?: number;
  updated_at?: string;
  prompt: string;
  config: unknown;
  labels: string[];
}

interface PostHogListResponse {
  results: PostHogPrompt[];
}

/** `resolve/name/{name}/` wraps the actual prompt under `prompt`, alongside version history. */
interface PostHogResolveResponse {
  prompt: PostHogPrompt;
}

export function createPostHogClient(config: PostHogClientConfig): PromptFlowClient {
  const baseUrl = `${config.host.replace(/\/$/, "")}/api/projects/${config.projectId}/llm_prompts/`;
  const headers = {
    Authorization: `Bearer ${config.personalApiKey}`,
    "Content-Type": "application/json",
  };

  // PostHog has no tags concept — every PromptMeta/Prompt here carries an
  // empty tags array. Tag-based filtering (listByFilter, the web app's tag
  // picker) is a known parity gap against a PostHog-backed project.
  function toMeta(p: PostHogPrompt): PromptMeta {
    const total = p.version_count ?? p.latest_version ?? p.version;
    return {
      name: p.name,
      versions: Array.from({ length: total }, (_, i) => i + 1),
      labels: p.labels ?? [],
      tags: [],
      lastUpdatedAt: p.updated_at ?? new Date().toISOString(),
      lastConfig: p.config ?? null,
    };
  }

  function toPrompt(p: PostHogPrompt): Prompt {
    return {
      type: "text",
      name: p.name,
      version: p.version,
      prompt: p.prompt ?? "",
      config: p.config ?? null,
      labels: p.labels ?? [],
      tags: [],
    };
  }

  async function request(url: string | URL, init: RequestInit = {}): Promise<Response> {
    const resolved = typeof url === "string" ? new URL(url, baseUrl) : url;
    let response: Response;
    try {
      response = await fetch(resolved, {
        ...init,
        headers: { ...headers, ...init.headers },
      });
    } catch (err) {
      throw wrapError(err);
    }
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw wrapError(response, bodyText);
    }
    return response;
  }

  return {
    async listPrompts(filter?: ListPromptsFilter): Promise<PromptMeta[]> {
      const url = new URL(baseUrl);
      // PostHog's documented list params are search/created_by_id/order_by/
      // content/limit/offset — no tag or label filter, so filter.tag and
      // filter.label are intentionally not sent (known parity gap).
      if (filter?.name) url.searchParams.set("search", filter.name);
      if (filter?.limit) url.searchParams.set("limit", String(filter.limit));
      if (filter?.page && filter.limit) {
        url.searchParams.set("offset", String(filter.page * filter.limit));
      }
      const response = await request(url);
      const body = (await response.json()) as PostHogListResponse;
      return (body.results ?? []).map(toMeta);
    },

    async getPrompt(name, opts = {}): Promise<Prompt> {
      const url = new URL(`resolve/name/${encodeURIComponent(name)}/`, baseUrl);
      if (opts.version !== undefined) url.searchParams.set("version", String(opts.version));
      if (opts.label !== undefined) url.searchParams.set("label", opts.label);
      // `opts.resolve` is intentionally ignored: PostHog has no server-side
      // prompt-composition feature, so this always returns the raw body.
      const response = await request(url);
      const body = (await response.json()) as PostHogResolveResponse;
      return toPrompt(body.prompt);
    },

    // PostHog prompts carry no tags (toMeta/toPrompt always return tags: []),
    // so tag-based lookups can never match anything against this provider —
    // a known parity gap, not a bug.
    async getPromptByTag(tag): Promise<Prompt | null> {
      const matches = await this.listPrompts({ limit: 100 });
      const first = matches.find((m) => m.tags.includes(tag));
      if (!first) return null;
      return this.getPrompt(first.name);
    },

    async listByFilter(filter): Promise<PromptMeta[]> {
      const all = await this.listPrompts({ limit: 100 });
      return all.filter((p) => matchesFilter(p.tags, filter));
    },

    async createPrompt(input: CreatePromptInput): Promise<Prompt> {
      // input.tags is intentionally dropped — PostHog prompts have no tags
      // field (confirmed via inspect-posthog-prompt.ts), so sending it would
      // be silently ignored dead weight.
      const body = input.type === "text" ? input.prompt : JSON.stringify(input.prompt);
      const payload: Record<string, unknown> = {
        name: input.name,
        prompt: body,
        config: input.config ?? null,
        labels: input.labels ?? [],
      };

      // Create-or-new-version, mirroring the Langfuse client's semantics.
      // Pre-check by name (like the web app's own rename pre-flight) rather
      // than try-POST-then-catch-and-retry: PostHog's PATCH endpoint requires
      // a `base_version` field, so guessing "already exists" from a generic
      // 400 risks masking real validation errors on the initial POST.
      const existing = await this.listPrompts({ name: input.name, limit: 1 });
      const current = existing.find((p) => p.name === input.name);

      if (current) {
        const baseVersion = Math.max(...current.versions);
        const response = await request(`name/${encodeURIComponent(input.name)}/`, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, base_version: baseVersion }),
        });
        return toPrompt((await response.json()) as PostHogPrompt);
      }

      const response = await request(baseUrl, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return toPrompt((await response.json()) as PostHogPrompt);
    },

    async deletePrompt(name, opts = {}): Promise<void> {
      // PostHog has no hard-delete endpoint. `opts.version` (delete a single
      // version) has no equivalent — fail loudly rather than silently no-op.
      if (opts.version !== undefined) {
        throw new PromptFlowError(
          "validation",
          `PostHog has no version-scoped delete (requested version ${opts.version} of "${name}"). ` +
            "Use label removal or archive the whole prompt instead.",
        );
      }
      if (opts.label !== undefined) {
        await request(
          `name/${encodeURIComponent(name)}/labels/${encodeURIComponent(opts.label)}/`,
          {
            method: "DELETE",
          },
        );
        return;
      }
      await request(`name/${encodeURIComponent(name)}/archive/`, { method: "POST" });
    },
  };
}
