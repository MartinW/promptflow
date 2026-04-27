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

/** Cleaned-up model row sent to the picker UI. */
export interface ModelOption {
  id: string;
  shortName: string;
  provider: string;
  contextLabel: string;
  priceLabel: string;
}

/** Models grouped by provider, ready for `<optgroup>` rendering. */
export interface ModelGroup {
  provider: string;
  models: ModelOption[];
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

/** Provider display names — slug → human-friendly. Falls through to slug if unmapped. */
const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  "meta-llama": "Meta",
  mistralai: "Mistral",
  "x-ai": "xAI",
  cohere: "Cohere",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  amazon: "Amazon",
  perplexity: "Perplexity",
  nvidia: "NVIDIA",
  microsoft: "Microsoft",
  "01-ai": "01.AI",
};

/** Provider slugs we want to surface above the others, in order. */
const PROVIDER_PRIORITY = [
  "anthropic",
  "openai",
  "google",
  "meta-llama",
  "mistralai",
  "deepseek",
  "x-ai",
];

/**
 * Convert OpenRouter's raw catalogue into provider-grouped, label-formatted
 * options for the picker. Empty-providers and clearly-unhealthy entries are
 * dropped; otherwise we show everything OpenRouter advertises.
 */
export function groupModelsByProvider(models: OpenRouterModel[]): ModelGroup[] {
  const groups = new Map<string, ModelOption[]>();
  for (const m of models) {
    const slashIndex = m.id.indexOf("/");
    if (slashIndex < 1) continue; // ill-formed id
    const providerSlug = m.id.slice(0, slashIndex);
    const shortName = m.id.slice(slashIndex + 1);
    const list = groups.get(providerSlug) ?? [];
    list.push({
      id: m.id,
      shortName,
      provider: PROVIDER_LABELS[providerSlug] ?? providerSlug,
      contextLabel: formatContextLength(m.context_length),
      priceLabel: formatPricing(m.pricing),
    });
    groups.set(providerSlug, list);
  }

  const orderedSlugs = [
    ...PROVIDER_PRIORITY.filter((slug) => groups.has(slug)),
    ...Array.from(groups.keys())
      .filter((slug) => !PROVIDER_PRIORITY.includes(slug))
      .sort((a, b) => (PROVIDER_LABELS[a] ?? a).localeCompare(PROVIDER_LABELS[b] ?? b)),
  ];

  return orderedSlugs.map((slug) => {
    const list = groups.get(slug) ?? [];
    list.sort((a, b) => a.shortName.localeCompare(b.shortName));
    return {
      provider: PROVIDER_LABELS[slug] ?? slug,
      models: list,
    };
  });
}

function formatContextLength(tokens: number | undefined): string {
  if (!tokens || tokens <= 0) return "—";
  if (tokens >= 1_000_000)
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return `${tokens}`;
}

function formatPricing(pricing: OpenRouterModel["pricing"]): string {
  // OpenRouter pricing is dollars per token as a string. Convert to $/M tokens.
  const promptPerM = parseFloat(pricing?.prompt ?? "0") * 1_000_000;
  const completionPerM = parseFloat(pricing?.completion ?? "0") * 1_000_000;
  if (promptPerM === 0 && completionPerM === 0) return "Free";
  const fmt = (n: number) =>
    n >= 1
      ? `$${n.toFixed(0)}`
      : n >= 0.1
        ? `$${n.toFixed(2)}`
        : `$${n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}`;
  return `${fmt(promptPerM)}/${fmt(completionPerM)}`;
}
