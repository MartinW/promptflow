import { PromptFlowError } from "@promptflow/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { parsePromptToShape } from "@/lib/prompt-shape";
import { getServerClient, isLangfuseConfigured } from "@/lib/server-client";
import { EditPromptForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditPromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  if (!isLangfuseConfigured()) {
    notFound();
  }

  const { name: encodedName } = await params;
  const { from } = await searchParams;
  const name = decodeURIComponent(encodedName);
  const baseVersion = from ? Number.parseInt(from, 10) : undefined;

  const client = getServerClient();
  let parsed: ReturnType<typeof parsePromptToShape>;
  let currentVersion = 0;
  let initialTags: string[] = [];
  try {
    const prompt = await client.getPrompt(name, { version: baseVersion });
    parsed = parsePromptToShape(prompt);
    currentVersion = prompt.version;
    initialTags = prompt.tags;
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") {
      notFound();
    }
    throw err;
  }

  if (parsed.kind === "unsupported") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <nav className="text-sm mb-4">
          <Link
            href={`/prompts/${encodedName}`}
            className="text-muted-foreground hover:text-foreground"
          >
            ← {name}
          </Link>
        </nav>
        <Card className="p-6 space-y-3 border-amber-500/30 bg-amber-500/5">
          <h1 className="text-lg font-semibold">Can't edit this prompt here</h1>
          <p className="text-sm text-muted-foreground">{parsed.reason}</p>
          <p className="text-sm text-muted-foreground">
            Edit it in the Langfuse dashboard for now — multi-turn / placeholder support in
            PromptFlow's editor is on the roadmap.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="text-sm mb-3">
        <Link
          href={`/prompts/${encodedName}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {name}
        </Link>
      </nav>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Edit prompt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saving creates a new version (current is v{currentVersion}). Tick "Promote to production"
          to make this version the live one.
        </p>
      </header>
      <EditPromptForm
        name={name}
        initialShape={parsed.shape}
        initialTags={initialTags.join(", ")}
        baseVersion={currentVersion}
      />
    </main>
  );
}
