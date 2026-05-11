/**
 * Tag namespace conventions for PromptFlow.
 *
 * PromptFlow uses Langfuse's native tag system but layers conventions on top
 * to make the prompt registry self-organising across web, CLI, MCP, and mobile
 * consumers. Tags are plain strings in Langfuse; the structure here is a
 * shared agreement between producers and consumers.
 *
 * Format: `<namespace>:<segment>[:<segment>...]`
 *
 * Tags compose: a single prompt may carry several namespaced tags
 * simultaneously (e.g. `voice` + `app:cadence:greeting` + `lang:en-GB`).
 */

export const Namespaces = {
  /** Authored for TTS — short sentences, no markdown, optional SSML hints. */
  voice: "voice",
  /** Authored for image generation models. */
  image: "image",
  /** LLM-as-judge templates used by the eval engine. */
  eval: "eval",
  /** Scoped to a specific consumer app, e.g. `app:cadence:greeting`. */
  app: "app",
  /** Locale modifier, e.g. `lang:en-GB`. */
  lang: "lang",
  /** Deployment scope, e.g. `env:prod`, `env:staging`. */
  env: "env",
} as const;

export type Namespace = (typeof Namespaces)[keyof typeof Namespaces];

const KNOWN_NAMESPACES = new Set<string>(Object.values(Namespaces));

export interface ParsedTag {
  /** Recognised namespace, or `null` if the tag has no `:` or uses an unknown prefix. */
  namespace: Namespace | null;
  /** Segments after the namespace. Always at least one entry when `namespace` is set. */
  segments: string[];
  /** The original tag string. */
  raw: string;
}

/**
 * Parse a Langfuse tag into namespace + segments.
 *
 * Tags without a colon, or with an unrecognised prefix, are returned with
 * `namespace: null` and the whole string as a single segment.
 */
export function parseTag(tag: string): ParsedTag {
  const trimmed = tag.trim();
  const colonIndex = trimmed.indexOf(":");

  if (colonIndex === -1) {
    return { namespace: null, segments: [trimmed], raw: tag };
  }

  const prefix = trimmed.slice(0, colonIndex);
  const rest = trimmed.slice(colonIndex + 1);

  if (!KNOWN_NAMESPACES.has(prefix)) {
    return { namespace: null, segments: [trimmed], raw: tag };
  }

  const segments = rest.split(":").filter((s) => s.length > 0);
  return {
    namespace: prefix as Namespace,
    segments,
    raw: tag,
  };
}

/**
 * Format a namespace + segments into a tag string.
 *
 * Throws if any segment is empty or contains a colon.
 */
export function formatTag(namespace: Namespace, ...segments: string[]): string {
  if (segments.length === 0) {
    throw new Error(`formatTag: namespace "${namespace}" needs at least one segment`);
  }
  for (const segment of segments) {
    if (segment.length === 0) {
      throw new Error(`formatTag: empty segment in [${segments.join(", ")}]`);
    }
    if (segment.includes(":")) {
      throw new Error(`formatTag: segment "${segment}" cannot contain ":"`);
    }
  }
  return [namespace, ...segments].join(":");
}

/**
 * Returns true if a tag's namespace matches the given one.
 *
 * `inNamespace("voice:greeting", "voice")` → true
 * `inNamespace("app:cadence:greeting", "voice")` → false
 * `inNamespace("greeting", "voice")` → false
 */
export function inNamespace(tag: string, namespace: Namespace): boolean {
  return parseTag(tag).namespace === namespace;
}

/**
 * Filter a list of tags down to those in a given namespace.
 */
export function tagsInNamespace(tags: string[], namespace: Namespace): string[] {
  return tags.filter((t) => inNamespace(t, namespace));
}

/**
 * Match a prompt's tags against a comma-separated filter expression.
 *
 * The filter is an AND of comma-separated tags. Returns true if every filter
 * tag is present on the prompt. Used by CLI/MCP for `--tag-filter` flags.
 *
 * matchesFilter(["voice", "env:prod"], "voice,env:prod") → true
 * matchesFilter(["voice"],            "voice,env:prod") → false
 */
export function matchesFilter(promptTags: string[], filter: string): boolean {
  const filterTags = filter
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (filterTags.length === 0) return true;
  const tagSet = new Set(promptTags);
  return filterTags.every((t) => tagSet.has(t));
}

/**
 * Match prompt tags against a multi-tag filter with AND or OR semantics.
 *
 * Equivalent to `matchesFilter` when `mode: "and"` (the default). Used by
 * the new TagFilterBar to support an OR mode where any matching tag passes.
 */
export function matchesTags(
  promptTags: string[],
  tags: string[],
  mode: "and" | "or" = "and",
): boolean {
  if (tags.length === 0) return true;
  const tagSet = new Set(promptTags);
  return mode === "and" ? tags.every((t) => tagSet.has(t)) : tags.some((t) => tagSet.has(t));
}

/**
 * Pre-baked colour palette for tag namespaces. Keys are deterministic so
 * known namespaces always render the same colour across surfaces (web, CLI,
 * mobile). Tags without a known namespace fall through to a hashed slot.
 */
const NAMESPACE_PALETTE: Record<string, NamespaceColor> = {
  voice: { hue: 192, name: "sky" },
  image: { hue: 280, name: "violet" },
  eval: { hue: 340, name: "rose" },
  app: { hue: 145, name: "emerald" },
  lang: { hue: 35, name: "amber" },
  env: { hue: 220, name: "indigo" },
};

const FALLBACK_HUES = [10, 50, 90, 130, 170, 210, 250, 290, 330];

export interface NamespaceColor {
  /** HSL hue 0-360 used to derive a colour at the consumer (badge, canvas). */
  hue: number;
  /** Named palette slot — useful for picking corresponding Tailwind classes. */
  name:
    | "sky"
    | "violet"
    | "rose"
    | "emerald"
    | "amber"
    | "indigo"
    | "slate"
    | "lime"
    | "cyan"
    | "fuchsia"
    | "orange"
    | "teal";
}

const FALLBACK_NAMES: NamespaceColor["name"][] = [
  "slate",
  "lime",
  "cyan",
  "fuchsia",
  "orange",
  "teal",
];

/**
 * Stable colour for a tag namespace. Known namespaces map to a fixed slot;
 * unknown prefixes (or unprefixed tags) hash deterministically into a
 * fallback palette so the same tag always renders the same colour.
 */
export function namespaceColor(namespaceOrTag: string): NamespaceColor {
  const parsed = parseTag(namespaceOrTag);
  const key = parsed.namespace ?? namespaceOrTag;
  const known = NAMESPACE_PALETTE[key];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const hue = FALLBACK_HUES[hash % FALLBACK_HUES.length];
  const name = FALLBACK_NAMES[hash % FALLBACK_NAMES.length];
  return { hue, name };
}
