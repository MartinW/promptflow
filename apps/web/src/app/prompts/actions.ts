"use server";

import {
  type CreatePromptInput,
  isPlaceholder,
  type Prompt,
  PromptFlowError,
} from "@promptflow/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildSaveInput, type ComposeShape } from "@/lib/prompt-shape";
import { getServerClient } from "@/lib/server-client";

export interface CreatePromptResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface DeletePromptResult {
  ok: boolean;
  error?: string;
}

export interface RenamePromptResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /**
   * When true, the source prompt was kept (because it carried the `production`
   * label). The caller should prompt the user to update consumers and delete
   * the old prompt as a separate explicit step.
   */
  oldKept?: boolean;
  /** The new prompt's URL-safe path, set on success so the client can navigate. */
  newName?: string;
}

const NAME_PATTERN = /^[a-zA-Z0-9._:/-]+$/;

export async function createPromptAction(formData: FormData): Promise<CreatePromptResult> {
  const name = String(formData.get("name") ?? "").trim();
  const shape = readShape(formData);
  const tagsRaw = String(formData.get("tags") ?? "");
  const commitMessage = String(formData.get("commitMessage") ?? "").trim();
  const promote = formData.get("promote") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!name) {
    fieldErrors.name = "Name is required";
  } else if (!NAME_PATTERN.test(name)) {
    fieldErrors.name = "Use letters, digits, dots, hyphens, underscores, slashes, or colons";
  }
  if (!shape.main.trim()) {
    fieldErrors.body = "Prompt is required";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const tags = parseTagList(tagsRaw);

  try {
    const client = getServerClient();
    const input = buildSaveInput(shape, {
      name,
      tags,
      labels: promote ? ["production"] : undefined,
      commitMessage: commitMessage || undefined,
    });
    await client.createPrompt(input);
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(name)}`);
  redirect(`/prompts/${encodeURIComponent(name)}`);
}

export async function updatePromptAction(formData: FormData): Promise<CreatePromptResult> {
  const name = String(formData.get("name") ?? "").trim();
  const shape = readShape(formData);
  const tagsRaw = String(formData.get("tags") ?? "");
  const commitMessage = String(formData.get("commitMessage") ?? "").trim();
  const promote = formData.get("promote") === "on";

  if (!name) {
    return { ok: false, error: "Missing prompt name" };
  }
  if (!shape.main.trim()) {
    return { ok: false, fieldErrors: { body: "Prompt is required" } };
  }

  const tags = parseTagList(tagsRaw);

  try {
    const client = getServerClient();
    const input = buildSaveInput(shape, {
      name,
      tags,
      labels: promote ? ["production"] : undefined,
      commitMessage: commitMessage || undefined,
    });
    await client.createPrompt(input);
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(name)}`);
  redirect(`/prompts/${encodeURIComponent(name)}`);
}

/**
 * Delete every version of a prompt. Destructive — used by the detail page's
 * danger-zone affordance. The dialog enforces stricter confirmation when the
 * prompt carries the `production` label; this action just executes the delete.
 */
export async function deletePromptAction(formData: FormData): Promise<DeletePromptResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Missing prompt name" };

  try {
    const client = getServerClient();
    await client.deletePrompt(name);
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(name)}`);
  redirect("/prompts");
}

/**
 * Rename a prompt by creating a copy under the new name.
 *
 * Behaviour depends on whether the source has a `production` label anywhere:
 *   - No production label → fork + delete the old prompt (treats it like a
 *     true rename; the source has no live consumers by definition).
 *   - Has production label → fork only; leaves the old prompt in place so
 *     consumers keep resolving until they're cut over. The caller is expected
 *     to surface a follow-up "delete old prompt" affordance.
 *
 * The new prompt is created as v1 with all source labels except `production`
 * and `latest` (Langfuse manages `latest` itself). The user must explicitly
 * re-promote the new prompt — consistent with PromptFlow's promotion semantics.
 */
export async function renamePromptAction(formData: FormData): Promise<RenamePromptResult> {
  const oldName = String(formData.get("oldName") ?? "").trim();
  const newName = String(formData.get("newName") ?? "").trim();
  const convertToChatRaw = formData.get("convertToChat") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!oldName) return { ok: false, error: "Missing source prompt name" };
  if (!newName) {
    fieldErrors.newName = "New name is required";
  } else if (!NAME_PATTERN.test(newName)) {
    fieldErrors.newName = "Use letters, digits, dots, hyphens, underscores, slashes, or colons";
  } else if (newName === oldName) {
    fieldErrors.newName = "New name must differ from the current name";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const client = getServerClient();

  // Pre-flight: refuse if the new name already exists. Langfuse would happily
  // create a new version under it instead, which is not what the user expects.
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

  // Read source + aggregate label set across all versions to decide whether
  // it's safe to delete the old prompt automatically.
  let source: Prompt;
  let aggregateLabels: string[] = [];
  try {
    source = await client.getPrompt(oldName);
    const meta = await client.listPrompts({ name: oldName, limit: 1 });
    aggregateLabels = meta.find((p) => p.name === oldName)?.labels ?? source.labels;
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") {
      return { ok: false, error: `Source prompt "${oldName}" not found` };
    }
    return { ok: false, error: formatError(err) };
  }

  const hasProduction = aggregateLabels.includes("production");
  const labelsToCarry = source.labels.filter((l) => l !== "production" && l !== "latest");
  // Conversion only makes sense one way: text → chat. Silently ignore the flag
  // when the source is already chat — the modal won't surface the toggle in
  // that case, so this is just a safety net.
  const convertToChat = convertToChatRaw && source.type === "text";

  const input = buildRenameInput(source, {
    newName,
    oldName,
    labels: labelsToCarry,
    convertToChat,
  });

  try {
    await client.createPrompt(input);
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  let oldKept = hasProduction;
  if (!hasProduction) {
    try {
      await client.deletePrompt(oldName);
    } catch {
      // Don't fail the whole operation — the new prompt exists and the user
      // can clean up the old one manually. Surface the kept flag so the UI
      // can warn.
      oldKept = true;
    }
  }

  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(oldName)}`);
  revalidatePath(`/prompts/${encodeURIComponent(newName)}`);

  return { ok: true, oldKept, newName };
}

function buildRenameInput(
  source: Prompt,
  meta: { newName: string; oldName: string; labels: string[]; convertToChat: boolean },
): CreatePromptInput {
  const commitMessage = meta.convertToChat
    ? `Renamed from ${meta.oldName} (text → chat)`
    : `Renamed from ${meta.oldName}`;
  const labels = meta.labels.length > 0 ? meta.labels : undefined;

  if (source.type === "text" && meta.convertToChat) {
    // Promote the text body to a single user message so the prompt is valid
    // chat shape. The user can split it into system + user via the edit form
    // afterwards — we don't try to guess the split here.
    return {
      type: "chat",
      name: meta.newName,
      prompt: [{ type: "chatmessage", role: "user", content: source.prompt }],
      tags: source.tags,
      labels,
      commitMessage,
      config: source.config,
    };
  }

  if (source.type === "text") {
    return {
      type: "text",
      name: meta.newName,
      prompt: source.prompt,
      tags: source.tags,
      labels,
      commitMessage,
      config: source.config,
    };
  }

  return {
    type: "chat",
    name: meta.newName,
    prompt: source.prompt.map((m) =>
      isPlaceholder(m) ? m : { type: "chatmessage", role: m.role, content: m.content },
    ),
    tags: source.tags,
    labels,
    commitMessage,
    config: source.config,
  };
}

function readShape(formData: FormData): ComposeShape {
  return {
    system: String(formData.get("system") ?? ""),
    userContext: String(formData.get("userContext") ?? ""),
    main: String(formData.get("main") ?? ""),
  };
}

function parseTagList(raw: string): string[] {
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
