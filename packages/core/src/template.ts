/**
 * Prompt template parsing, validation, and rendering.
 *
 * PromptFlow templates use Langfuse's `{{variable}}` mustache-style syntax.
 * This module is the single source of truth for how variables are detected
 * and substituted across the web app, CLI, MCP server, and tests.
 */

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Issue raised by `validatePromptTemplate`. Each issue has a position so the
 * editor can underline the offending span.
 */
export interface ValidationIssue {
  kind: "unclosed_variable" | "invalid_variable_name" | "stray_braces";
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
}

/**
 * Validate a prompt template, returning detected variables and any issues.
 *
 * The validator is intentionally permissive — it accepts anything Langfuse
 * accepts, but flags common mistakes (unclosed braces, invalid var names) so
 * the editor can surface them inline. It does NOT reject prose that happens
 * to contain a single `{` or `}`; only paired `{{ }}` constructs are parsed.
 */
export function validatePromptTemplate(template: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const variables: string[] = [];
  const seen = new Set<string>();

  // Find all matched variables.
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      variables.push(name);
    }
  }

  // Scan for `{{` without a matching `}}`. We walk the string and track
  // open/close pairs.
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
    const inner = template.slice(open + 2, close).trim();
    if (inner.length === 0) {
      issues.push({
        kind: "invalid_variable_name",
        message: "Empty variable name between `{{` and `}}`",
        start: open,
        end: close + 2,
      });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(inner)) {
      issues.push({
        kind: "invalid_variable_name",
        message: `"${inner}" is not a valid variable name (use letters, digits, underscores; must not start with a digit)`,
        start: open,
        end: close + 2,
      });
    }
    cursor = close + 2;
  }

  return { valid: issues.length === 0, issues, variables };
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
