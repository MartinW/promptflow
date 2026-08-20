import { getCorpus } from "@/lib/corpus";
import { isActiveProjectConfigured } from "@/lib/server-client";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!(await isActiveProjectConfigured())) {
    return Response.json({ data: [] });
  }
  try {
    const corpus = await getCorpus();
    return Response.json({
      data: corpus.prompts.map((p) => ({
        name: p.meta.name,
        tags: p.meta.tags,
        latestVersion: Math.max(0, ...p.meta.versions),
        references: p.references,
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
