"use server";

import { PromptFlowError } from "@promptflow/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildSaveInput, type ComposeShape } from "@/lib/prompt-shape";
import { getServerClient } from "@/lib/server-client";

export interface CreatePromptResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
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
