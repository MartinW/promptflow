import { getServerClient, isLangfuseConfigured } from "@/lib/server-client";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authResult = await requireAuth(req.headers.get("host"));
  if (authResult instanceof Response) return authResult;
  if (!isLangfuseConfigured()) {
    return Response.json({ data: [] });
  }
  try {
    const client = getServerClient();
    const prompts = await client.listPrompts({ limit: 100 });
    return Response.json({
      data: prompts.map((p) => ({
        name: p.name,
        tags: p.tags,
        latestVersion: Math.max(...p.versions),
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
