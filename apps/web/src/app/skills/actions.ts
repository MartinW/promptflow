"use server";

import { parseSkillFrontmatter, PromptFlowError, type SkillVersionFileInput } from "@promptflow/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSkillsClient } from "@/lib/server-client";

export interface SkillActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Publish a new skill version. Creates the skill if its `SKILL.md`
 * frontmatter names one that doesn't exist yet. `name` is the route's
 * current skill name when editing (absent on `/skills/new`) — used only to
 * guard against silently retargeting a different skill, since the API
 * itself has no name parameter: identity comes entirely from the
 * `SKILL.md` frontmatter.
 */
export async function createSkillVersionAction(formData: FormData): Promise<SkillActionResult> {
  const expectedName = String(formData.get("expectedName") ?? "").trim();
  const skillMd = String(formData.get("skillMd") ?? "");
  const commitMessage = String(formData.get("commitMessage") ?? "").trim();
  const promote = formData.get("promote") === "on";
  const extraFiles = parseExtraFiles(formData.get("extraFiles"));

  const fieldErrors: Record<string, string> = {};
  const frontmatter = parseSkillFrontmatter(skillMd);
  if (!frontmatter) {
    fieldErrors.skillMd =
      "SKILL.md must start with a --- frontmatter block containing name and description";
  } else if (expectedName && frontmatter.name !== expectedName) {
    fieldErrors.skillMd = `Frontmatter name "${frontmatter.name}" doesn't match this skill ("${expectedName}"). Changing it would target a different skill.`;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const files: SkillVersionFileInput[] = [{ path: "SKILL.md", content: skillMd }, ...extraFiles];

  let newVersion: number;
  try {
    const client = await getServerSkillsClient();
    const result = await client.createSkillVersion({
      files,
      commitMessage: commitMessage || undefined,
    });
    newVersion = result.version;
    if (promote) {
      await client.setSkillLabels(result.name, result.version, ["production"]);
    }
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  const name = frontmatter?.name as string;
  revalidatePath("/skills");
  revalidatePath(`/skills/${encodeURIComponent(name)}`);
  redirect(`/skills/${encodeURIComponent(name)}?v=${newVersion}`);
}

export async function promoteSkillVersionAction(formData: FormData): Promise<SkillActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const versionRaw = String(formData.get("version") ?? "");
  const version = Number.parseInt(versionRaw, 10);
  if (!name || Number.isNaN(version)) {
    return { ok: false, error: "Missing skill name or version" };
  }

  try {
    const client = await getServerSkillsClient();
    await client.setSkillLabels(name, version, ["production"]);
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  revalidatePath("/skills");
  revalidatePath(`/skills/${encodeURIComponent(name)}`);
  return { ok: true };
}

export async function updateSkillTagsAction(formData: FormData): Promise<SkillActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  if (!name) return { ok: false, error: "Missing skill name" };

  const tags = parseTagList(tagsRaw);

  try {
    const client = await getServerSkillsClient();
    await client.setSkillTags(name, tags);
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  revalidatePath("/skills");
  revalidatePath(`/skills/${encodeURIComponent(name)}`);
  return { ok: true };
}

export async function deleteSkillVersionAction(formData: FormData): Promise<SkillActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const versionRaw = String(formData.get("version") ?? "");
  const version = Number.parseInt(versionRaw, 10);
  if (!name || Number.isNaN(version)) {
    return { ok: false, error: "Missing skill name or version" };
  }

  try {
    const client = await getServerSkillsClient();
    await client.deleteSkillVersion(name, version);
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }

  revalidatePath("/skills");
  revalidatePath(`/skills/${encodeURIComponent(name)}`);
  return { ok: true };
}

function parseExtraFiles(raw: FormDataEntryValue | null): SkillVersionFileInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw)) as Array<{ path: string; content: string }>;
    return parsed.filter((f) => f.path.trim().length > 0 && f.path.trim() !== "SKILL.md");
  } catch {
    return [];
  }
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
