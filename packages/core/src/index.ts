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
export type { ResolveOptions, ResolveResult } from "./composition";
export { resolvePrompt } from "./composition";
export type {
  DuplicateGroup,
  DuplicateOccurrence,
  DuplicateScanOptions,
  PromptBodyInput,
} from "./duplicate-scan";
export { findDuplicates, splitParagraphs } from "./duplicate-scan";
export type { FolderNode } from "./folder-tree";
export { buildFolderTree, nodeForPath, walkTree } from "./folder-tree";
export { flattenPromptForAnalysis } from "./prompt-body";
export type { GraphNode, PromptBody, ReferenceGraph } from "./reference-graph";
export { buildReferenceGraph, subgraphFor } from "./reference-graph";
export type { PromptFlowErrorKind } from "./errors";
export { PromptFlowError, wrapError } from "./errors";
export type { SSMLValidationResult } from "./ssml";
export { validateSSML } from "./ssml";
export type { Namespace, NamespaceColor, ParsedTag } from "./tags";
export {
  formatTag,
  inNamespace,
  matchesFilter,
  matchesTags,
  namespaceColor,
  Namespaces,
  parseTag,
  tagsInNamespace,
} from "./tags";
export type {
  PromptReference,
  PromptToken,
  PromptTokenKind,
  ValidationIssue,
  ValidationResult,
} from "./template";
export {
  extractVariables,
  formatReferenceTag,
  parseReferenceBody,
  parseReferenceDetails,
  parseReferences,
  parseTemplateTokens,
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
export { isChatMessage, isPlaceholder } from "./types";
