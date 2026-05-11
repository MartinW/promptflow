/**
 * Prompt composition — recursively expand `{{@prompt-name}}` references.
 *
 * `template.ts` handles single-template tokenisation; this module sits on top
 * and walks the reference graph, fetching each referenced prompt via the
 * client and substituting it back in. Cycle detection, depth limits, and
 * missing-reference handling are surfaced as data so callers (AIPlay, the
 * canvas, the CLI) can render warnings inline rather than crashing.
 */

import type { PromptFlowClient } from "./client";
import { renderPrompt } from "./template";
import { parseReferences } from "./template";
import type { ChatPrompt, ChatPromptMessage, Prompt, TextPrompt } from "./types";
import { isChatMessage } from "./types";

const DEFAULT_MAX_DEPTH = 8;

export interface ResolveOptions {
  /** Values to substitute into `{{variable}}` placeholders after references are expanded. */
  variables?: Record<string, string>;
  /** Maximum reference depth before truncation. Default 8. */
  maxDepth?: number;
  /**
   * Label to fetch for each referenced prompt. Defaults to `latest` for
   * draft-friendly editor previews. Runtime callers should pass `production`.
   */
  label?: string;
  /**
   * What to do when a referenced prompt doesn't exist.
   *   - `leave` (default): record in `missing[]`, leave the `{{@name}}` token literal.
   *   - `throw`: throw immediately on first missing reference.
   */
  onMissing?: "leave" | "throw";
}

export interface ResolveResult {
  /** The fully-resolved prompt with references expanded inline. */
  prompt: Prompt;
  /**
   * Flat string view useful for preview UIs. For chat prompts, message
   * contents are joined with a blank line; placeholders render as
   * `{{placeholder:name}}`.
   */
  body: string;
  /** Distinct reference names successfully expanded, in resolution order. */
  resolvedRefs: string[];
  /** References whose target prompt could not be fetched. */
  missing: string[];
  /** References cut off because `maxDepth` was reached. */
  truncated: string[];
  /** Cycles detected — each entry is the sequence of names forming the cycle. */
  cycles: string[][];
}

interface ResolutionState {
  client: PromptFlowClient;
  maxDepth: number;
  label: string | undefined;
  onMissing: "leave" | "throw";
  resolvedRefs: string[];
  missing: string[];
  truncated: string[];
  cycles: string[][];
  resolvedSet: Set<string>;
  missingSet: Set<string>;
  truncatedSet: Set<string>;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}

/**
 * Replace every `{{@name}}` occurrence (with optional whitespace inside the
 * braces) in `body` with `replacement`. Reference names can contain regex
 * metacharacters (`.`, `/`, `-`), so we escape them first.
 */
function replaceReference(body: string, name: string, replacement: string): string {
  const pattern = new RegExp(`\\{\\{\\s*@${escapeForRegExp(name)}\\s*\\}\\}`, "g");
  return body.replace(pattern, () => replacement);
}

function markCycle(body: string, name: string): string {
  const pattern = new RegExp(`\\{\\{\\s*@${escapeForRegExp(name)}\\s*\\}\\}`, "g");
  return body.replace(pattern, `{{@${name}:cycle}}`);
}

function recordOnce(list: string[], seen: Set<string>, value: string): void {
  if (!seen.has(value)) {
    seen.add(value);
    list.push(value);
  }
}

/**
 * Resolve a single template body. Called recursively for each reference.
 * `path` is the chain of names currently on the resolution stack — used for
 * cycle detection (a name is "visiting" if it appears in `path`).
 */
async function resolveBody(
  body: string,
  state: ResolutionState,
  path: string[],
  depth: number,
): Promise<string> {
  const refs = parseReferences(body);
  if (refs.length === 0) return body;

  let result = body;
  for (const refName of refs) {
    if (path.includes(refName)) {
      state.cycles.push([...path, refName]);
      result = markCycle(result, refName);
      continue;
    }
    if (depth >= state.maxDepth) {
      recordOnce(state.truncated, state.truncatedSet, refName);
      continue;
    }

    let subPrompt: Prompt;
    try {
      subPrompt = await state.client.getPrompt(refName, { label: state.label });
    } catch (err) {
      recordOnce(state.missing, state.missingSet, refName);
      if (state.onMissing === "throw") throw err;
      continue;
    }

    const subBody = flattenPromptBody(subPrompt);
    const expanded = await resolveBody(subBody, state, [...path, refName], depth + 1);
    result = replaceReference(result, refName, expanded);
    recordOnce(state.resolvedRefs, state.resolvedSet, refName);
  }

  return result;
}

/**
 * Flatten any prompt to a single string. For chat prompts, messages join with
 * `\n\n`; placeholders surface as `{{placeholder:name}}` so they remain
 * visible (callers can substitute them separately if needed).
 */
function flattenPromptBody(prompt: Prompt): string {
  if (prompt.type === "text") return prompt.prompt;
  return prompt.prompt
    .map((msg) => {
      if (isChatMessage(msg)) {
        return msg.role ? `${msg.role}: ${msg.content}` : msg.content;
      }
      return `{{placeholder:${msg.name}}}`;
    })
    .join("\n\n");
}

/**
 * Apply reference resolution to every message in a chat prompt, preserving
 * structure.
 */
async function resolveChatMessages(
  messages: ChatPromptMessage[],
  state: ResolutionState,
  path: string[],
  depth: number,
): Promise<ChatPromptMessage[]> {
  const resolved: ChatPromptMessage[] = [];
  for (const msg of messages) {
    if (isChatMessage(msg)) {
      const content = await resolveBody(msg.content, state, path, depth);
      resolved.push({ ...msg, content });
    } else {
      resolved.push(msg);
    }
  }
  return resolved;
}

/**
 * Resolve a prompt and all its `{{@name}}` references, returning the fully
 * expanded prompt plus structured diagnostics. Errors during reference
 * resolution surface as data (`missing`, `cycles`, `truncated`) rather than
 * throws, unless `onMissing: "throw"` is set.
 *
 * Resolution order:
 *   1. Fetch the root prompt.
 *   2. Walk references depth-first, fetching each via the client.
 *   3. Substitute resolved bodies back into the parent.
 *   4. Apply `variables` to the fully-expanded result (if provided).
 *
 * Cycle handling: when a reference would re-enter the current path, the token
 * is rewritten to `{{@name:cycle}}` (visible, not expanded) and the cycle is
 * recorded in `result.cycles`. The resolver never hangs.
 */
export async function resolvePrompt(
  name: string,
  client: PromptFlowClient,
  opts: ResolveOptions = {},
): Promise<ResolveResult> {
  const state: ResolutionState = {
    client,
    maxDepth: opts.maxDepth ?? DEFAULT_MAX_DEPTH,
    label: opts.label,
    onMissing: opts.onMissing ?? "leave",
    resolvedRefs: [],
    missing: [],
    truncated: [],
    cycles: [],
    resolvedSet: new Set(),
    missingSet: new Set(),
    truncatedSet: new Set(),
  };

  const root = await client.getPrompt(name, { label: state.label });

  let resolved: Prompt;
  if (root.type === "text") {
    const expanded = await resolveBody(root.prompt, state, [name], 0);
    const rendered = opts.variables ? renderPrompt(expanded, opts.variables) : expanded;
    resolved = { ...root, prompt: rendered } satisfies TextPrompt;
  } else {
    const expandedMessages = await resolveChatMessages(root.prompt, state, [name], 0);
    const renderedMessages: ChatPromptMessage[] = opts.variables
      ? expandedMessages.map((msg) =>
          isChatMessage(msg)
            ? { ...msg, content: renderPrompt(msg.content, opts.variables ?? {}) }
            : msg,
        )
      : expandedMessages;
    resolved = { ...root, prompt: renderedMessages } satisfies ChatPrompt;
  }

  return {
    prompt: resolved,
    body: flattenPromptBody(resolved),
    resolvedRefs: state.resolvedRefs,
    missing: state.missing,
    truncated: state.truncated,
    cycles: state.cycles,
  };
}
