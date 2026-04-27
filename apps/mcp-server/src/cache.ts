import type { Prompt, PromptFlowClient, PromptMeta } from "@promptflow/core";
import { matchesFilter } from "@promptflow/core";
import type { Logger } from "./logger";

/**
 * In-memory cache for the prompt index and individual prompt resolutions.
 *
 * Strategy:
 *   - List index cached for ttl seconds. Apply tag filter once at fetch time.
 *   - Individual prompts cached per (name, version|label) key for ttl seconds.
 *   - `refresh()` flushes everything (exposed via the `refresh_prompts` tool).
 *
 * Stale-while-revalidate: when an entry is between ttl and 2×ttl, return the
 * stale value and trigger a background refresh; beyond that, refetch blocking.
 */
export class PromptCache {
  private listEntry?: { fetchedAt: number; prompts: PromptMeta[] };
  private promptEntries = new Map<string, { fetchedAt: number; prompt: Prompt }>();

  constructor(
    private client: PromptFlowClient,
    private ttlMs: number,
    private tagFilter: string | undefined,
    private defaultLabel: string,
    private logger: Logger,
  ) {}

  async list(): Promise<PromptMeta[]> {
    const now = Date.now();
    if (this.listEntry && now - this.listEntry.fetchedAt < this.ttlMs) {
      return this.listEntry.prompts;
    }
    if (this.listEntry && now - this.listEntry.fetchedAt < this.ttlMs * 2) {
      // Stale-while-revalidate.
      this.refreshList().catch((err) =>
        this.logger.warn("background list refresh failed", String(err)),
      );
      return this.listEntry.prompts;
    }
    return this.refreshList();
  }

  private async refreshList(): Promise<PromptMeta[]> {
    // 100 is Langfuse's max page size; requesting 200 returns a 4xx.
    const all = await this.client.listPrompts({ limit: 100 });
    const tagFilter = this.tagFilter;
    const filtered = tagFilter ? all.filter((p) => matchesFilter(p.tags, tagFilter)) : all;
    this.listEntry = { fetchedAt: Date.now(), prompts: filtered };
    this.logger.debug("list refreshed", `count=${filtered.length}`);
    return filtered;
  }

  async get(name: string, opts: { version?: number; label?: string } = {}): Promise<Prompt> {
    const key = cacheKey(name, opts.version, opts.label ?? this.defaultLabel);
    const now = Date.now();
    const entry = this.promptEntries.get(key);
    if (entry && now - entry.fetchedAt < this.ttlMs) return entry.prompt;
    if (entry && now - entry.fetchedAt < this.ttlMs * 2) {
      this.refreshPrompt(name, opts, key).catch((err) =>
        this.logger.warn("background prompt refresh failed", String(err)),
      );
      return entry.prompt;
    }
    return this.refreshPrompt(name, opts, key);
  }

  private async refreshPrompt(
    name: string,
    opts: { version?: number; label?: string },
    key: string,
  ): Promise<Prompt> {
    const prompt = await this.client.getPrompt(name, {
      version: opts.version,
      label: opts.label ?? this.defaultLabel,
    });
    this.promptEntries.set(key, { fetchedAt: Date.now(), prompt });
    return prompt;
  }

  refresh(): void {
    this.listEntry = undefined;
    this.promptEntries.clear();
    this.logger.info("cache flushed");
  }
}

function cacheKey(name: string, version?: number, label?: string): string {
  return `${name}@v=${version ?? ""}|l=${label ?? ""}`;
}
