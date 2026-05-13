"use server";

import {
  formatReferenceTag,
  isPlaceholder,
  PromptFlowError,
  type Prompt,
} from "@promptflow/core";
import { revalidatePath } from "next/cache";
import { getCorpus, invalidateCorpus } from "@/lib/corpus";
import { buildSaveInput, type ComposeShape } from "@/lib/prompt-shape";
import { getServerClient } from "@/lib/server-client";

export type ExtractPromptResult =
  | {
      ok: true;
      newName: string;
      rewrittenShape: ComposeShape;
      sourceNewVersion: number;
      /** Successful bulk-apply targets, in the order requested. */
      appliedTargets: string[];
      /** Targets that failed during bulk-apply (e.g. write error). */
      failedTargets: Array<{ name: string; error: string }>;
    }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Record<string, string>;
    };

export interface OccurrenceMatch {
  promptName: string;
  matchCount: number;
  /** ~80-char snippet around the first occurrence, with the match marked. */
  sampleContext: string;
}

export interface ScanOccurrencesResult {
  ok: boolean;
  error?: string;
  matches?: OccurrenceMatch[];
}

const CONTEXT_RADIUS = 40;

/**
 * Walk every prompt in the corpus and count occurrences of `snippet` in its
 * flattened body. Skips the source prompt. Used by the extract dialog's
 * REVIEW step to offer cross-corpus refactor.
 *
 * Match is exact substring (case-sensitive). Whole-word boundaries aren't
 * enforced — the caller's UI shows the surrounding context so the user can
 * eyeball whether a match is a real duplicate or a partial-word collision.
 */
export async function scanOccurrencesAction(
  snippet: string,
  sourceName: string,
): Promise<ScanOccurrencesResult> {
  if (!snippet) return { ok: false, error: "Empty snippet" };
  try {
    const corpus = await getCorpus();
    const matches: OccurrenceMatch[] = [];
    for (const p of corpus.prompts) {
      if (p.meta.name === sourceName) continue;
      const body = p.body;
      let from = 0;
      let count = 0;
      let firstAt = -1;
      while (true) {
        const idx = body.indexOf(snippet, from);
        if (idx === -1) break;
        count += 1;
        if (firstAt === -1) firstAt = idx;
        from = idx + snippet.length;
      }
      if (count === 0) continue;
      matches.push({
        promptName: p.meta.name,
        matchCount: count,
        sampleContext: contextAround(body, firstAt, snippet.length),
      });
    }
    matches.sort((a, b) => a.promptName.localeCompare(b.promptName));
    return { ok: true, matches };
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }
}

function contextAround(body: string, offset: number, length: number): string {
  const start = Math.max(0, offset - CONTEXT_RADIUS);
  const end = Math.min(body.length, offset + length + CONTEXT_RADIUS);
  const prefix = start === 0 ? "" : "…";
  const suffix = end === body.length ? "" : "…";
  return prefix + body.slice(start, end) + suffix;
}

const NAME_PATTERN = /^[a-zA-Z0-9._:/-]+$/;
const FIELD_VALUES = ["system", "userContext", "main"] as const;
type Field = (typeof FIELD_VALUES)[number];

function isField(value: string): value is Field {
  return (FIELD_VALUES as readonly string[]).includes(value);
}

/**
 * Extract the selected substring from a source prompt into a new prompt.
 *
 * Two writes happen atomically from the user's perspective (Langfuse has no
 * transactions, so the new prompt is created first and the source rewrite is
 * a best-effort follow-up):
 *
 *   1. Create the new prompt as a text prompt at v1 with the selected text.
 *   2. Save a new version of the source with the rewritten field, where the
 *      selection is replaced by `{{@newName}}`.
 *
 * Returns the rewritten shape so the form can update its local state without
 * a round-trip. Caller is responsible for keeping selection state consistent
 * after the rewrite (e.g. clearing it).
 */
export async function extractPromptAction(formData: FormData): Promise<ExtractPromptResult> {
  const sourceName = String(formData.get("sourceName") ?? "").trim();
  const sourceShape: ComposeShape = {
    system: String(formData.get("sourceSystem") ?? ""),
    userContext: String(formData.get("sourceUserContext") ?? ""),
    main: String(formData.get("sourceMain") ?? ""),
  };
  const sourceTags = parseList(String(formData.get("sourceTags") ?? ""));
  const fieldRaw = String(formData.get("field") ?? "");
  const selectionStart = Number.parseInt(String(formData.get("selectionStart") ?? ""), 10);
  const selectionEnd = Number.parseInt(String(formData.get("selectionEnd") ?? ""), 10);
  const newName = String(formData.get("newName") ?? "").trim();
  const newTags = parseList(String(formData.get("newTags") ?? ""));
  const commitMessage = String(formData.get("commitMessage") ?? "").trim();
  const applyToNames = parseList(String(formData.get("applyToNames") ?? ""));

  const fieldErrors: Record<string, string> = {};
  if (!sourceName) return { ok: false, error: "Missing source prompt name" };
  if (!isField(fieldRaw)) return { ok: false, error: `Unknown field: ${fieldRaw}` };
  if (!newName) {
    fieldErrors.newName = "Name is required";
  } else if (!NAME_PATTERN.test(newName)) {
    fieldErrors.newName = "Use letters, digits, dots, hyphens, underscores, slashes, or colons";
  } else if (newName === sourceName) {
    fieldErrors.newName = "New name must differ from the source";
  }
  if (Number.isNaN(selectionStart) || Number.isNaN(selectionEnd) || selectionEnd <= selectionStart) {
    return { ok: false, error: "Invalid selection range" };
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const fieldKey = fieldRaw as Field;
  const fieldText = sourceShape[fieldKey];
  const snippet = fieldText.slice(selectionStart, selectionEnd);
  if (snippet.length === 0) {
    return { ok: false, error: "Selection is empty" };
  }

  // Use Langfuse's native composability syntax pinned to `latest` — that way
  // edits to the just-created extracted prompt propagate to all callers
  // without re-pinning. Users can switch to version pins later via the
  // Langfuse UI.
  const referenceToken = formatReferenceTag({ name: newName, label: "latest" });
  const rewrittenField = fieldText.slice(0, selectionStart) + referenceToken + fieldText.slice(selectionEnd);
  const rewrittenShape: ComposeShape = { ...sourceShape, [fieldKey]: rewrittenField };

  const client = getServerClient();

  // Pre-flight: refuse if the new name already exists. Creating "v2" of an
  // unrelated prompt would silently scribble on it.
  try {
    const existing = await client.listPrompts({ name: newName, limit: 1 });
    if (existing.some((p) => p.name === newName)) {
      return {
        ok: false,
        fieldErrors: { newName: `A prompt named "${newName}" already exists` },
      };
    }
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  // 1. Create the new (extracted) prompt as a plain text prompt at v1.
  try {
    await client.createPrompt({
      type: "text",
      name: newName,
      prompt: snippet,
      tags: newTags,
      commitMessage: commitMessage || `Extracted from ${sourceName}`,
    });
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  // 2. Save a new version of the source with the rewritten field.
  let sourceNewVersion = 0;
  try {
    const sourceInput = buildSaveInput(rewrittenShape, {
      name: sourceName,
      tags: sourceTags,
      commitMessage: commitMessage || `Extracted shared block to @${newName}`,
    });
    const saved = await client.createPrompt(sourceInput);
    sourceNewVersion = saved.version;
  } catch (err) {
    // The new prompt exists but the source rewrite failed. Surface the error;
    // the user can re-attempt the source save manually. Don't roll back the
    // new prompt — they might want to keep it and apply the rewrite themselves.
    return {
      ok: false,
      error: `Created ${newName}, but couldn't rewrite ${sourceName}: ${formatError(err)}`,
    };
  }

  // 3. Bulk-apply: for each selected target, replace every occurrence of the
  //    extracted snippet with the new reference and save a new version. Each
  //    target is independent — a write failure on one does not abort the rest;
  //    failures are surfaced in `failedTargets` so the UI can report per-row.
  const appliedTargets: string[] = [];
  const failedTargets: Array<{ name: string; error: string }> = [];
  if (applyToNames.length > 0) {
    for (const target of applyToNames) {
      if (target === sourceName || target === newName) continue;
      try {
        const targetPrompt = await client.getPrompt(target);
        const rewrittenInput = rewritePromptOccurrences(
          targetPrompt,
          snippet,
          referenceToken,
          commitMessage || `Extracted shared block to @${newName}`,
        );
        if (!rewrittenInput) {
          failedTargets.push({ name: target, error: "Snippet not found at apply time" });
          continue;
        }
        await client.createPrompt(rewrittenInput);
        appliedTargets.push(target);
      } catch (err) {
        failedTargets.push({ name: target, error: formatError(err) });
      }
    }
  }

  invalidateCorpus();
  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(sourceName)}`);
  revalidatePath(`/prompts/${encodeURIComponent(newName)}`);
  for (const t of appliedTargets) revalidatePath(`/prompts/${encodeURIComponent(t)}`);

  return {
    ok: true,
    newName,
    rewrittenShape,
    sourceNewVersion,
    appliedTargets,
    failedTargets,
  };
}

/**
 * Replace every occurrence of `snippet` in a target prompt with `replacement`
 * and produce a `createPrompt` input for the new version. Returns null when
 * the snippet doesn't appear (avoids a no-op write).
 *
 * For chat prompts the replacement applies to each `chatmessage` content
 * independently; placeholders are passed through unchanged.
 */
export interface BulkExtractDuplicateResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  newName?: string;
  appliedTargets?: string[];
  failedTargets?: Array<{ name: string; error: string }>;
}

/**
 * Extract a duplicate snippet (sourced from the duplicate scanner) into a new
 * prompt and rewrite every selected target. Unlike `extractPromptAction`, no
 * single prompt is treated as the "source" — all selected names are rewritten
 * the same way.
 */
export async function bulkExtractDuplicateAction(
  formData: FormData,
): Promise<BulkExtractDuplicateResult> {
  const snippet = String(formData.get("snippet") ?? "");
  const newName = String(formData.get("newName") ?? "").trim();
  const newTags = parseList(String(formData.get("newTags") ?? ""));
  const commitMessage = String(formData.get("commitMessage") ?? "").trim();
  const targetNames = parseList(String(formData.get("targetNames") ?? ""));

  const fieldErrors: Record<string, string> = {};
  if (!snippet) return { ok: false, error: "Missing snippet" };
  if (!newName) {
    fieldErrors.newName = "Name is required";
  } else if (!NAME_PATTERN.test(newName)) {
    fieldErrors.newName = "Use letters, digits, dots, hyphens, underscores, slashes, or colons";
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  if (targetNames.length === 0) return { ok: false, error: "Pick at least one target prompt" };

  const client = getServerClient();
  const referenceToken = formatReferenceTag({ name: newName, label: "latest" });

  try {
    const existing = await client.listPrompts({ name: newName, limit: 1 });
    if (existing.some((p) => p.name === newName)) {
      return { ok: false, fieldErrors: { newName: `A prompt named "${newName}" already exists` } };
    }
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  try {
    await client.createPrompt({
      type: "text",
      name: newName,
      prompt: snippet,
      tags: newTags,
      commitMessage: commitMessage || "Extracted duplicate block",
    });
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  const appliedTargets: string[] = [];
  const failedTargets: Array<{ name: string; error: string }> = [];
  for (const target of targetNames) {
    if (target === newName) continue;
    try {
      const targetPrompt = await client.getPrompt(target);
      const rewrittenInput = rewritePromptOccurrences(
        targetPrompt,
        snippet,
        referenceToken,
        commitMessage || `Replaced shared block with @${newName}`,
      );
      if (!rewrittenInput) {
        failedTargets.push({ name: target, error: "Snippet not found at apply time" });
        continue;
      }
      await client.createPrompt(rewrittenInput);
      appliedTargets.push(target);
    } catch (err) {
      failedTargets.push({ name: target, error: formatError(err) });
    }
  }

  invalidateCorpus();
  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(newName)}`);
  for (const t of appliedTargets) revalidatePath(`/prompts/${encodeURIComponent(t)}`);

  return { ok: true, newName, appliedTargets, failedTargets };
}

function rewritePromptOccurrences(
  target: Prompt,
  snippet: string,
  replacement: string,
  commitMessage: string,
): import("@promptflow/core").CreatePromptInput | null {
  if (target.type === "text") {
    if (!target.prompt.includes(snippet)) return null;
    const rewritten = target.prompt.split(snippet).join(replacement);
    return {
      type: "text",
      name: target.name,
      prompt: rewritten,
      tags: target.tags,
      commitMessage,
      config: target.config,
    };
  }
  let touched = false;
  const messages = target.prompt.map((msg) => {
    if (isPlaceholder(msg)) return msg;
    if (!msg.content.includes(snippet)) {
      return { type: "chatmessage" as const, role: msg.role, content: msg.content };
    }
    touched = true;
    return {
      type: "chatmessage" as const,
      role: msg.role,
      content: msg.content.split(snippet).join(replacement),
    };
  });
  if (!touched) return null;
  return {
    type: "chat",
    name: target.name,
    prompt: messages,
    tags: target.tags,
    commitMessage,
    config: target.config,
  };
}

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function formatError(err: unknown): string {
  return err instanceof PromptFlowError
    ? `[${err.kind}] ${err.message}`
    : err instanceof Error
      ? err.message
      : String(err);
}
