import { isSkillsSupported } from "@/lib/projects";
import { getActiveProjectId, getServerSkillsClient } from "@/lib/server-client";

export const dynamic = "force-dynamic";

/**
 * Tag autocomplete source for skills. Returns every tag across the project's
 * skills with its usage count, sorted by count desc then alphabetically.
 * Consumed by `<TagPicker>` via `fetchUrl="/api/skills/tags"`.
 *
 * No corpus-style cache here (unlike `/api/prompts/tags`) — skills don't
 * have the cross-referencing features (folder tree, duplicate scan) that
 * motivated building one for prompts, so a direct `listSkills` call is
 * simple enough.
 */
export async function GET(): Promise<Response> {
  const activeProjectId = await getActiveProjectId();
  if (!activeProjectId || !isSkillsSupported(activeProjectId)) {
    return Response.json({ tags: [] });
  }
  try {
    const client = await getServerSkillsClient();
    const skills = await client.listSkills({ limit: 100 });
    const counts = new Map<string, number>();
    for (const skill of skills) {
      for (const tag of skill.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    const tags = Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    return Response.json({ tags });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
