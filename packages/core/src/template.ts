/**
 * Prompt template parsing, validation, and rendering.
 *
 * PromptFlow templates use two constructs:
 *   - `{{variable}}` — runtime-substituted value (mustache-style)
 *   - `@@@langfusePrompt:name=X|version=N@@@` or
 *     `@@@langfusePrompt:name=X|label=Y@@@` — reference to another prompt
 *
 * The reference syntax matches Langfuse's native prompt-composability tag
 * format (see langfuse/packages/shared/src/features/prompts/parsePromptDependencyTags.ts).
 * This module is the single source of truth for tokenisation, variable
 * substitution, and structural validation across the web app, CLI, MCP
 * server, and tests. Reference *resolution* (recursive expansion) lives in
 * `composition.ts` — `renderPrompt` here only handles variables.
 */

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
const VARIABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const REFERENCE_PATTERN = /@@@langfusePrompt:(.*?)@@@/g;
const PROMPT_NAME = /^[a-zA-Z0-9._:/-]+$/;
const LABEL_NAME = /^[a-zA-Z0-9._:/-]+$/;

export type PromptTokenKind = "variable" | "reference";

export interface PromptReference {
  /** The prompt name pointed at by this reference. */
  name: string;
  /** Specific version pinned by the reference, mutually exclusive with `label`. */
  version?: number;
  /** Label pinned by the reference (e.g. "production", "latest"), mutually exclusive with `version`. */
  label?: string;
}

export interface PromptToken {
  kind: PromptTokenKind;
  /** Variable name, or — for references — the referenced prompt name. */
  name: string;
  /** Character offset of the opening delimiter, inclusive. */
  start: number;
  /** Character offset after the closing delimiter, exclusive. */
  end: number;
  /** Only set when `kind === "reference"`. */
  reference?: PromptReference;
}

/**
 * Issue raised by `validatePromptTemplate`. Each issue has a position so the
 * editor can underline the offending span.
 */
export interface ValidationIssue {
  kind:
    | "unclosed_variable"
    | "invalid_variable_name"
    | "invalid_reference"
    | "stray_braces";
  message: string;
  /** Character offset in the source, inclusive. */
  start: number;
  /** Character offset in the source, exclusive. */
  end: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Distinct variable names found in the template, in first-seen order. */
  variables: string[];
  /** Distinct referenced prompt names found, in first-seen order. */
  references: string[];
  /** Structured references (with version/label) in first-seen order. */
  referenceDetails: PromptReference[];
  /** Every token in source order, with positions. */
  tokens: PromptToken[];
}

/**
 * Parse the inner body of an `@@@langfusePrompt:...@@@` tag into a typed
 * reference, or return null if the body is malformed. The Langfuse format
 * requires exactly two pipe-separated parameters: `name=X` and either
 * `version=N` or `label=Y`.
 */
export function parseReferenceBody(body: string): PromptReference | null {
  const parts = body.split("|");
  if (parts.length !== 2) return null;
  const kv = new Map<string, string>();
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) return null;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!key || !value) return null;
    kv.set(key, value);
  }
  const name = kv.get("name");
  if (!name || !PROMPT_NAME.test(name)) return null;
  const versionRaw = kv.get("version");
  const labelRaw = kv.get("label");
  if (versionRaw !== undefined) {
    const version = Number.parseInt(versionRaw, 10);
    if (!Number.isInteger(version) || version < 1) return null;
    return { name, version };
  }
  if (labelRaw !== undefined) {
    if (!LABEL_NAME.test(labelRaw)) return null;
    return { name, label: labelRaw };
  }
  return null;
}

/**
 * Build a Langfuse-compatible reference tag from a structured reference.
 * Used by the extract action and the future "insert reference" UI to write
 * tags that the Langfuse server, the official UI, and our resolver all
 * understand.
 */
export function formatReferenceTag(ref: PromptReference): string {
  const pin = ref.version !== undefined ? `version=${ref.version}` : `label=${ref.label ?? "latest"}`;
  return `@@@langfusePrompt:name=${ref.name}|${pin}@@@`;
}

/**
 * Validate a prompt template, returning detected variables, references, and
 * any issues.
 *
 * The validator is intentionally permissive — it accepts anything Langfuse
 * accepts, but flags common mistakes (unclosed braces, invalid names) so the
 * editor can surface them inline.
 */
export function validatePromptTemplate(template: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const variables: string[] = [];
  const references: string[] = [];
  const referenceDetails: PromptReference[] = [];
  const tokens: PromptToken[] = [];
  const seenVariables = new Set<string>();
  const seenReferences = new Set<string>();

  // First pass: detect Langfuse reference tags. Doing this before mustache
  // detection means a reference can sit inside surrounding mustache-style
  // text without confusing the variable walker.
  for (const match of template.matchAll(REFERENCE_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const body = match[1];
    const parsed = parseReferenceBody(body);
    if (!parsed) {
      issues.push({
        kind: "invalid_reference",
        message: `Malformed prompt reference: "${match[0]}". Expected @@@langfusePrompt:name=X|version=N@@@ or |label=Y@@@.`,
        start,
        end,
      });
      continue;
    }
    tokens.push({ kind: "reference", name: parsed.name, start, end, reference: parsed });
    if (!seenReferences.has(parsed.name)) {
      seenReferences.add(parsed.name);
      references.push(parsed.name);
      referenceDetails.push(parsed);
    }
  }

  // Second pass: walk `{{ ... }}` constructs for variables, skipping any
  // bracket spans that overlap a reference tag we already recorded.
  const referenceSpans = tokens.map((t) => [t.start, t.end] as const);
  let cursor = 0;
  while (cursor < template.length) {
    const open = template.indexOf("{{", cursor);
    if (open === -1) break;
    const close = template.indexOf("}}", open + 2);
    if (close === -1) {
      issues.push({
        kind: "unclosed_variable",
        message: "Unclosed `{{` — expected matching `}}`",
        start: open,
        end: template.length,
      });
      break;
    }
    const tokenEnd = close + 2;
    // Skip if this `{{...}}` overlaps an already-recorded reference span
    // (defensive — Langfuse tags don't contain `{{`, but handle it cleanly).
    const overlapsReference = referenceSpans.some(([s, e]) => open < e && tokenEnd > s);
    if (overlapsReference) {
      cursor = tokenEnd;
      continue;
    }
    const inner = template.slice(open + 2, close).trim();

    if (inner.length === 0) {
      issues.push({
        kind: "invalid_variable_name",
        message: "Empty token between `{{` and `}}`",
        start: open,
        end: tokenEnd,
      });
    } else if (!VARIABLE_NAME.test(inner)) {
      issues.push({
        kind: "invalid_variable_name",
        message: `"${inner}" is not a valid variable name (use letters, digits, underscores; must not start with a digit)`,
        start: open,
        end: tokenEnd,
      });
    } else {
      tokens.push({ kind: "variable", name: inner, start: open, end: tokenEnd });
      if (!seenVariables.has(inner)) {
        seenVariables.add(inner);
        variables.push(inner);
      }
    }

    cursor = tokenEnd;
  }

  // Tokens were appended in two passes; sort by source order for downstream
  // consumers (syntax highlighting, edit-time validation).
  tokens.sort((a, b) => a.start - b.start);

  return { valid: issues.length === 0, issues, variables, references, referenceDetails, tokens };
}

/**
 * Render a template by substituting `{{variable}}` placeholders with values.
 *
 * Reference tags (`@@@langfusePrompt:...@@@`) pass through unchanged —
 * composition resolution happens layered above this in `resolvePrompt`.
 *
 * Missing variables are left as-is by default (`{{name}}` stays literal) so
 * the operator can spot them in playground output. Pass `strict: true` to
 * throw on missing variables instead.
 */
export function renderPrompt(
  template: string,
  variables: Record<string, string>,
  options: { strict?: boolean } = {},
): string {
  return template.replace(VARIABLE_PATTERN, (match, name: string) => {
    if (Object.hasOwn(variables, name)) {
      return variables[name];
    }
    if (options.strict) {
      throw new Error(`renderPrompt: missing variable "${name}"`);
    }
    return match;
  });
}

/**
 * Extract distinct variable names from a template, in first-seen order.
 * Convenience wrapper around `validatePromptTemplate(...).variables`.
 */
export function extractVariables(template: string): string[] {
  return validatePromptTemplate(template).variables;
}

/**
 * Parse a template into structured tokens, returning distinct variables,
 * references, and positional tokens. Convenience wrapper around
 * `validatePromptTemplate` that omits issue reporting.
 */
export function parseTemplateTokens(template: string): {
  variables: string[];
  references: string[];
  referenceDetails: PromptReference[];
  tokens: PromptToken[];
} {
  const result = validatePromptTemplate(template);
  return {
    variables: result.variables,
    references: result.references,
    referenceDetails: result.referenceDetails,
    tokens: result.tokens,
  };
}

/**
 * Distinct prompt-reference names from a template, in first-seen order.
 * Convenience wrapper for callers that only need the dependency list (e.g.
 * the reference-graph builder).
 */
export function parseReferences(template: string): string[] {
  return validatePromptTemplate(template).references;
}

/**
 * Structured references (name + version/label) from a template, in
 * first-seen order. Used by the resolver and the canvas badges.
 */
export function parseReferenceDetails(template: string): PromptReference[] {
  return validatePromptTemplate(template).referenceDetails;
}
