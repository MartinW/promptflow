import type { Prompt } from "./types";
import { isChatMessage } from "./types";

/**
 * Flatten any prompt to a single string for analysis (reference parsing,
 * duplicate detection, full-text search). Chat messages are joined with a
 * blank line; placeholders surface as `{{placeholder:name}}` so they're
 * visible to readers but don't pollute reference detection.
 */
export function flattenPromptForAnalysis(prompt: Prompt): string {
  if (prompt.type === "text") return prompt.prompt;
  return prompt.prompt
    .map((msg) => {
      if (isChatMessage(msg)) return msg.content;
      return `{{placeholder:${msg.name}}}`;
    })
    .join("\n\n");
}
