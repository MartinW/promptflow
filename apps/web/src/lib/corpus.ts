import "server-only";
import {
  buildFolderTree,
  buildReferenceGraph,
  flattenPromptForAnalysis,
  type FolderNode,
  type Prompt,
  type PromptMeta,
  type ReferenceGraph,
} from "@promptflow/core";
import { getServerClient, isLangfuseConfigured } from "./server-client";

/**
 * Single server-side projection of the Langfuse prompt corpus.
 *
 * Every new feature (folder tree, tag picker, canvas, duplicate scan) reads
 * from the same projection so they share cache + invalidation. Without this,
 * `listPrompts()` ends up scattered across surfaces and stale data leaks.
 *
 * Cache strategy: module-level Map keyed by Langfuse public key, 30s TTL.
 * Every write action calls `invalidateCorpus()` to drop the entry. A plain
 * Map is preferred over Next's `unstable_cache` because the interaction with
 * `revalidatePath` in dev is fiddly and we control all writers here.
 */

export interface CorpusPrompt {
  meta: PromptMeta;
  /** Latest version's full prompt object. */
  prompt: Prompt;
  /** Flattened body for analysis (references, duplicates, search). */
  body: string;
  /** Distinct references found in the body, in first-seen order. */
  references: string[];
}

export interface PromptCorpus {
  prompts: CorpusPrompt[];
  byName: Map<string, CorpusPrompt>;
  folderTree: FolderNode;
  /** Tag → prompt names. AND-filter queries intersect these sets. */
  tagIndex: Map<string, string[]>;
  referenceGraph: ReferenceGraph;
  fetchedAt: number;
}

const TTL_MS = 30_000;
const cache = new Map<string, { value: PromptCorpus; expiresAt: number }>();

function cacheKey(): string {
  return process.env.LANGFUSE_PUBLIC_KEY ?? "anon";
}

/**
 * Return the cached corpus or fetch a fresh one. Returns an empty corpus if
 * Langfuse isn't configured so pages can render a setup state without
 * crashing.
 */
export async function getCorpus(): Promise<PromptCorpus> {
  if (!isLangfuseConfigured()) {
    return emptyCorpus();
  }
  const key = cacheKey();
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const client = getServerClient();
  const metas = await client.listPrompts({ limit: 100 });

  const prompts: CorpusPrompt[] = await Promise.all(
    metas.map(async (meta) => {
      try {
        // Fetch unresolved so the corpus body preserves @@@langfusePrompt:...@@@
        // reference tags — required for the reference graph, duplicate scanner,
        // and the editor / detail UIs that highlight references.
        const prompt = await client.getPrompt(meta.name, { resolve: false });
        const body = flattenPromptForAnalysis(prompt);
        return {
          meta,
          prompt,
          body,
          references: [],
        } satisfies CorpusPrompt;
      } catch {
        // A prompt with only deleted versions can race the list endpoint —
        // treat as empty rather than failing the whole corpus.
        const placeholder: Prompt = {
          type: "text",
          name: meta.name,
          version: 0,
          prompt: "",
          config: null,
          labels: meta.labels,
          tags: meta.tags,
        };
        return {
          meta,
          prompt: placeholder,
          body: "",
          references: [],
        } satisfies CorpusPrompt;
      }
    }),
  );

  const byName = new Map<string, CorpusPrompt>();
  for (const p of prompts) byName.set(p.meta.name, p);

  const referenceGraph = buildReferenceGraph(
    prompts.map((p) => ({ name: p.meta.name, body: p.body })),
  );
  // Backfill the per-prompt `references` from the graph for convenience.
  for (const p of prompts) {
    p.references = referenceGraph.nodes.get(p.meta.name)?.references ?? [];
  }

  const tagIndex = new Map<string, string[]>();
  for (const p of prompts) {
    for (const tag of p.meta.tags) {
      const list = tagIndex.get(tag);
      if (list) list.push(p.meta.name);
      else tagIndex.set(tag, [p.meta.name]);
    }
  }

  const folderTree = buildFolderTree(metas.map((m) => m.name));

  const value: PromptCorpus = {
    prompts,
    byName,
    folderTree,
    tagIndex,
    referenceGraph,
    fetchedAt: now,
  };
  cache.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

/** Drop the cached corpus. Call from every write action. */
export function invalidateCorpus(): void {
  cache.delete(cacheKey());
}

function emptyCorpus(): PromptCorpus {
  return {
    prompts: [],
    byName: new Map(),
    folderTree: { path: "", name: "", children: new Map(), prompts: [] },
    tagIndex: new Map(),
    referenceGraph: { nodes: new Map(), cycles: [], orphans: [], missing: [] },
    fetchedAt: 0,
  };
}
