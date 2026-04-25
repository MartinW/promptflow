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
