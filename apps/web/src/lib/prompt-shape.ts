/**
 * Authoring shape ↔ Langfuse prompt translation.
 *
 * The compose form has three fields: System prompt, User context, Main prompt.
 * Langfuse stores either a `text` prompt (single string) or a `chat` prompt
 * (array of messages). This module is the single place where we cross between
 * those two representations so the new + edit forms stay symmetric.
 *
 * Design rules:
 *   - System prompt filled  → save as `chat` with a system + user message.
 *   - System prompt empty   → save as `text`.
 *   - User context filled   → user message body is prepended with the literal
 *                             `{{user_context}}\n\n` placeholder so callers
 *                             must (or may) provide a value for `user_context`
 *                             at runtime. The author's typed text becomes the
 *                             default value, stored in `config.defaults.user_context`.
 *   - Round-trip            → opening the edit form on a prompt we previously
 *                             saved restores all three fields exactly.
 */

import type { ChatPromptMessage, CreatePromptInput, Prompt } from "@promptflow/core";
import { isPlaceholder } from "@promptflow/core";

const USER_CONTEXT_PREFIX = "{{user_context}}\n\n";

export interface ComposeShape {
  system: string;
  userContext: string;
  main: string;
}

export interface PromptConfigDefaults {
  defaults?: { user_context?: string };
}

/**
 * Build a Langfuse `CreatePromptInput` from the compose form's three fields.
 *
 * `meta` carries the saved-prompt fields that aren't shape-specific (name,
 * tags, commit message, labels) so this helper can return a complete payload.
 */
export function buildSaveInput(
  shape: ComposeShape,
  meta: {
    name: string;
    tags?: string[];
    labels?: string[];
    commitMessage?: string;
  },
): CreatePromptInput {
  const system = shape.system.trim();
  const userContext = shape.userContext.trim();
  const userContextEnabled = userContext.length > 0;

  const userBody = userContextEnabled ? `${USER_CONTEXT_PREFIX}${shape.main}` : shape.main;
  const config: PromptConfigDefaults | undefined = userContextEnabled
    ? { defaults: { user_context: userContext } }
    : undefined;

  if (system.length > 0) {
    const messages: ChatPromptMessage[] = [
      { type: "chatmessage", role: "system", content: system },
      { type: "chatmessage", role: "user", content: userBody },
    ];
    return {
      type: "chat",
      name: meta.name,
      prompt: messages,
      tags: meta.tags,
      labels: meta.labels,
      commitMessage: meta.commitMessage,
      config,
    };
  }

  return {
    type: "text",
    name: meta.name,
    prompt: userBody,
    tags: meta.tags,
    labels: meta.labels,
    commitMessage: meta.commitMessage,
    config,
  };
}

/**
 * Result of parsing an existing Langfuse prompt back into compose-form shape.
 *
 * `unsupported` covers chat structures we can't faithfully round-trip yet:
 * multi-turn conversations, assistant priming messages, placeholder messages.
 * The edit page surfaces a refusal so the user knows to author elsewhere.
 */
export type ParsedShape =
  | { kind: "ok"; shape: ComposeShape }
  | { kind: "unsupported"; reason: string };

export function parsePromptToShape(prompt: Prompt): ParsedShape {
  const config = (prompt.config ?? {}) as PromptConfigDefaults;
  const userContextDefault = config.defaults?.user_context ?? "";

  if (prompt.type === "text") {
    return {
      kind: "ok",
      shape: extractUserContext(prompt.prompt, "", userContextDefault),
    };
  }

  if (prompt.type === "chat") {
    const messages = prompt.prompt;
    if (messages.length === 0) {
      return { kind: "unsupported", reason: "Chat prompt has no messages." };
    }
    if (messages.length > 2) {
      return {
        kind: "unsupported",
        reason: "Chat prompts with more than two messages aren't editable here yet.",
      };
    }
    for (const m of messages) {
      if (isPlaceholder(m)) {
        return {
          kind: "unsupported",
          reason: "Chat prompts containing placeholder messages aren't editable here yet.",
        };
      }
    }
    const allowed = ["system", "user"];
    for (const m of messages) {
      if (!isPlaceholder(m) && !allowed.includes(m.role)) {
        return {
          kind: "unsupported",
          reason: `Chat prompts with a ${m.role} message aren't editable here yet.`,
        };
      }
    }

    let system = "";
    let userBody = "";
    for (const m of messages) {
      if (isPlaceholder(m)) continue;
      if (m.role === "system") system = m.content;
      else if (m.role === "user") userBody = m.content;
    }
    if (!userBody && messages.length === 1) {
      return { kind: "unsupported", reason: "Chat prompt has no user message." };
    }
    return {
      kind: "ok",
      shape: extractUserContext(userBody, system, userContextDefault),
    };
  }

  return { kind: "unsupported", reason: "Unknown prompt type." };
}

function extractUserContext(
  userBody: string,
  system: string,
  userContextDefault: string,
): ComposeShape {
  if (userBody.startsWith(USER_CONTEXT_PREFIX)) {
    return {
      system,
      userContext: userContextDefault,
      main: userBody.slice(USER_CONTEXT_PREFIX.length),
    };
  }
  return { system, userContext: "", main: userBody };
}

/**
 * Aggregate variables across all three compose fields, plus the implicit
 * `user_context` slot when the user-context field is non-empty.
 *
 * Returns variables in first-seen order across (system → userContext → main).
 */
export function aggregateVariables(shape: ComposeShape): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const pattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

  function consume(text: string) {
    for (const m of text.matchAll(pattern)) {
      const name = m[1];
      if (!seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    }
  }

  consume(shape.system);
  consume(shape.userContext);
  consume(shape.main);

  if (shape.userContext.trim().length > 0 && !seen.has("user_context")) {
    seen.add("user_context");
    ordered.push("user_context");
  }

  return ordered;
}
