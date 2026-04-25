import "server-only";

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface CacheEntry {
  fetchedAt: number;
  models: OpenRouterModel[];
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: CacheEntry | null = null;

/**
 * Fetch the OpenRouter model catalogue with a process-local 1h cache.
 *
 * Returns an empty list if the request fails — model picker shows a manual
 * input fallback so authors can paste any OpenRouter model id directly.
 */
export async function listOpenRouterModels(): Promise<OpenRouterModel[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.models;
  }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return cache?.models ?? [];
    const json = (await res.json()) as { data: OpenRouterModel[] };
    cache = { fetchedAt: Date.now(), models: json.data ?? [] };
    return cache.models;
  } catch {
    return cache?.models ?? [];
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}
