/**
 * @promptflow/core
 *
 * Shared logic for every PromptFlow consumer: web app, CLI, MCP server.
 * Keeps Langfuse-flavoured concerns in one place so behaviour stays consistent
 * across surfaces.
 */

export const PROMPTFLOW_CORE_VERSION = "0.0.0";

export type { ClientConfig, PromptFlowClient } from "./client";
export { createClient } from "./client";
export type { PromptFlowErrorKind } from "./errors";
export { PromptFlowError, wrapError } from "./errors";
export type { SSMLValidationResult } from "./ssml";
export { validateSSML } from "./ssml";
export type { Namespace, ParsedTag } from "./tags";
export {
  formatTag,
  inNamespace,
  matchesFilter,
  Namespaces,
  parseTag,
  tagsInNamespace,
} from "./tags";
export type { ValidationIssue, ValidationResult } from "./template";
export {
  extractVariables,
  renderPrompt,
  validatePromptTemplate,
} from "./template";

export type {
  BasePrompt,
  ChatMessage,
  ChatPlaceholder,
  ChatPrompt,
  ChatPromptMessage,
  CreateChatPromptInput,
  CreatePromptInput,
  CreateTextPromptInput,
  ListPromptsFilter,
  Prompt,
  PromptMeta,
  TextPrompt,
} from "./types";
