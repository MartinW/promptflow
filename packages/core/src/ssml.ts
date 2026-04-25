/**
 * Lightweight SSML validation for `voice:*` prompts.
 *
 * Full SSML is a large W3C spec; this validator does what the editor needs:
 * checks that tags are balanced, warns on unknown tags, and surfaces issues
 * with character positions so the editor can underline them.
 */

import type { ValidationIssue } from "./template";

export interface SSMLValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Tags from the SSML 1.1 spec that are commonly accepted by TTS engines
 * (ElevenLabs, OpenAI TTS, Azure, Google). Self-closing where noted.
 */
const KNOWN_TAGS = new Set([
  "speak",
  "voice",
  "p",
  "s",
  "break", // self-closing
  "emphasis",
  "prosody",
  "say-as",
  "sub",
  "phoneme",
  "lang",
  "audio",
  "mark", // self-closing
  "lexicon", // self-closing
  "desc",
  "w",
]);

const SELF_CLOSING_TAGS = new Set(["break", "mark", "lexicon"]);

const TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9_-]*)(\s[^>]*)?\/?>/g;

/**
 * Validate SSML markup in a prompt template.
 *
 * Designed to be permissive: free text is fine, only `<...>` constructs are
 * inspected. Returns issues for unbalanced tags and unknown tag names, with
 * character offsets so callers can render inline editor warnings.
 */
export function validateSSML(content: string): SSMLValidationResult {
  const issues: ValidationIssue[] = [];
  const stack: { name: string; start: number }[] = [];

  for (const match of content.matchAll(TAG_PATTERN)) {
    const fullMatch = match[0];
    const name = match[1].toLowerCase();
    const start = match.index ?? 0;
    const end = start + fullMatch.length;

    const isClosing = fullMatch.startsWith("</");
    const isSelfClosing = fullMatch.endsWith("/>") || (!isClosing && SELF_CLOSING_TAGS.has(name));

    if (!KNOWN_TAGS.has(name)) {
      issues.push({
        kind: "stray_braces",
        message: `Unknown SSML tag <${name}>; TTS engines may ignore or reject it`,
        start,
        end,
      });
      continue;
    }

    if (isSelfClosing && !isClosing) {
      // self-closing: nothing to push
      continue;
    }

    if (isClosing) {
      const top = stack.pop();
      if (!top || top.name !== name) {
        issues.push({
          kind: "stray_braces",
          message: top
            ? `Mismatched closing tag </${name}>: expected </${top.name}>`
            : `Closing tag </${name}> with no matching opener`,
          start,
          end,
        });
      }
    } else {
      stack.push({ name, start });
    }
  }

  // Anything left on the stack is unclosed.
  for (const open of stack) {
    issues.push({
      kind: "stray_braces",
      message: `Unclosed SSML tag <${open.name}>`,
      start: open.start,
      end: open.start + open.name.length + 2,
    });
  }

  return { valid: issues.length === 0, issues };
}
