/**
 * Prompt template parsing, validation, and rendering.
 *
 * PromptFlow templates use two `{{ ... }}` constructs:
 *   - `{{variable}}` — runtime-substituted value (mustache-style)
 *   - `{{@prompt-name}}` — reference to another prompt (composition)
 *
 * Both share the same brace syntax; the leading `@` is what distinguishes a
 * reference. This module is the single source of truth for tokenisation,
 * variable substitution, and structural validation across the web app, CLI,
 * MCP server, and tests. Reference *resolution* (recursive expansion) lives
 * in `composition.ts` — `renderPrompt` here only handles variables.
 */

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
const VARIABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const REFERENCE_NAME = /^[a-zA-Z0-9._:/-]+$/;

export type PromptTokenKind = "variable" | "reference";

export interface PromptToken {
  kind: PromptTokenKind;
  /** The name without surrounding braces or `@` prefix. */
  name: string;
  /** Character offset of the opening `{{`, inclusive. */
  start: number;
  /** Character offset after the closing `}}`, exclusive. */
  end: number;
}

/**
 * Issue raised by `validatePromptTemplate`. Each issue has a position so the
 * editor can underline the offending span.
 */
export interface ValidationIssue {
  kind:
    | "unclosed_variable"
    | "invalid_variable_name"
    | "invalid_reference_name"
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
  /** Every `{{ ... }}` token in source order, with positions. */
  tokens: PromptToken[];
}

/**
 * Validate a prompt template, returning detected variables, references, and
 * any issues.
 *
 * The validator is intentionally permissive — it accepts anything Langfuse
 * accepts, but flags common mistakes (unclosed braces, invalid names) so the
 * editor can surface them inline. It does NOT reject prose that happens to
 * contain a single `{` or `}`; only paired `{{ }}` constructs are parsed.
 *
 * A `{{ ... }}` whose body starts with `@` is treated as a prompt reference;
 * otherwise it's a variable.
 */
export function validatePromptTemplate(template: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const variables: string[] = [];
  const references: string[] = [];
  const tokens: PromptToken[] = [];
  const seenVariables = new Set<string>();
  const seenReferences = new Set<string>();

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
    const inner = template.slice(open + 2, close).trim();

    if (inner.length === 0) {
      issues.push({
        kind: "invalid_variable_name",
        message: "Empty token between `{{` and `}}`",
        start: open,
        end: tokenEnd,
      });
    } else if (inner.startsWith("@")) {
      const name = inner.slice(1);
      if (name.length === 0 || !REFERENCE_NAME.test(name)) {
        issues.push({
          kind: "invalid_reference_name",
          message: `"${inner}" is not a valid prompt reference (use letters, digits, dots, hyphens, underscores, slashes, or colons after \`@\`)`,
          start: open,
          end: tokenEnd,
        });
      } else {
        tokens.push({ kind: "reference", name, start: open, end: tokenEnd });
        if (!seenReferences.has(name)) {
          seenReferences.add(name);
          references.push(name);
        }
      }
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

  return { valid: issues.length === 0, issues, variables, references, tokens };
}

/**
 * Render a template by substituting `{{variable}}` placeholders with values.
 *
 * Missing variables are left as-is by default (`{{name}}` stays literal) so
 * the operator can spot them in playground output. Pass `strict: true` to
 * throw on missing variables instead.
 *
 * Whitespace inside the braces is tolerated: `{{ name }}` and `{{name}}` both
 * work and resolve to the `name` key.
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
  tokens: PromptToken[];
} {
  const result = validatePromptTemplate(template);
  return {
    variables: result.variables,
    references: result.references,
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
