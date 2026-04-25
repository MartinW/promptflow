/**
 * Re-exports of Langfuse types under PromptFlow names.
 *
 * Consumers of `@promptflow/core` should import from here rather than
 * `langfuse` directly so we have one place to swap or augment types.
 */

// Langfuse's public types live in `langfuse-core` but it doesn't export named
// schemas directly — types like `PromptMeta` are reachable via the OpenAPI
// `components.schemas`. We declare friendlier aliases below.

export interface PromptMeta {
  name: string;
  versions: number[];
  labels: string[];
  tags: string[];
  /** ISO 8601 datetime. */
  lastUpdatedAt: string;
  /** Config of the most recent matching version. */
  lastConfig: unknown;
}

export interface BasePrompt {
  name: string;
  version: number;
  config: unknown;
  labels: string[];
  tags: string[];
  commitMessage?: string | null;
}

export interface TextPrompt extends BasePrompt {
  type: "text";
  prompt: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatPlaceholder {
  type: "placeholder";
  name: string;
}

export type ChatPromptMessage = ({ type: "chatmessage" } & ChatMessage) | ChatPlaceholder;

export interface ChatPrompt extends BasePrompt {
  type: "chat";
  prompt: ChatPromptMessage[];
}

export type Prompt = TextPrompt | ChatPrompt;

export interface ListPromptsFilter {
  name?: string;
  label?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export interface CreateTextPromptInput {
  type: "text";
  name: string;
  prompt: string;
  config?: unknown;
  labels?: string[];
  tags?: string[];
  commitMessage?: string;
}

export interface CreateChatPromptInput {
  type: "chat";
  name: string;
  prompt: ChatPromptMessage[];
  config?: unknown;
  labels?: string[];
  tags?: string[];
  commitMessage?: string;
}

export type CreatePromptInput = CreateTextPromptInput | CreateChatPromptInput;
