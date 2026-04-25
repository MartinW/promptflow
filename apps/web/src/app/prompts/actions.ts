"use server";

import { PromptFlowError } from "@promptflow/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/server-client";

export interface CreatePromptResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const NAME_PATTERN = /^[a-zA-Z0-9._:/-]+$/;

export async function createPromptAction(formData: FormData): Promise<CreatePromptResult> {
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const commitMessage = String(formData.get("commitMessage") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) {
    fieldErrors.name = "Name is required";
  } else if (!NAME_PATTERN.test(name)) {
    fieldErrors.name = "Use letters, digits, dots, hyphens, underscores, slashes, or colons";
  }
  if (!body.trim()) {
    fieldErrors.body = "Body is required";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const tags = parseTagList(tagsRaw);

  try {
    const client = getServerClient();
    await client.createPrompt({
      type: "text",
      name,
      prompt: body,
      tags,
      labels: ["production"],
      commitMessage: commitMessage || undefined,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof PromptFlowError
          ? `[${err.kind}] ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err),
    };
  }

  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(name)}`);
  redirect(`/prompts/${encodeURIComponent(name)}`);
}

export async function updatePromptAction(formData: FormData): Promise<CreatePromptResult> {
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const commitMessage = String(formData.get("commitMessage") ?? "").trim();

  if (!name) {
    return { ok: false, error: "Missing prompt name" };
  }
  if (!body.trim()) {
    return { ok: false, fieldErrors: { body: "Body is required" } };
  }

  const tags = parseTagList(tagsRaw);

  try {
    const client = getServerClient();
    await client.createPrompt({
      type: "text",
      name,
      prompt: body,
      tags,
      labels: ["production"],
      commitMessage: commitMessage || undefined,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof PromptFlowError
          ? `[${err.kind}] ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err),
    };
  }

  revalidatePath("/prompts");
  revalidatePath(`/prompts/${encodeURIComponent(name)}`);
  redirect(`/prompts/${encodeURIComponent(name)}`);
}

function parseTagList(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
