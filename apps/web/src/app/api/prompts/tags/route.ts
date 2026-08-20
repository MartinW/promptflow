import { getCorpus } from "@/lib/corpus";
import { isActiveProjectConfigured } from "@/lib/server-client";

export const dynamic = "force-dynamic";

/**
 * Tag autocomplete source. Returns every tag in the corpus with its usage
 * count, sorted by count desc then alphabetically. Consumed by `<TagPicker>`.
 */
export async function GET(): Promise<Response> {
  if (!(await isActiveProjectConfigured())) {
    return Response.json({ tags: [] });
  }
  try {
    const corpus = await getCorpus();
    const tags = Array.from(corpus.tagIndex.entries())
      .map(([value, names]) => ({ value, count: names.length }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    return Response.json({ tags });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
