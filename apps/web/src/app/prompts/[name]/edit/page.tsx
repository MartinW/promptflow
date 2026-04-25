import { PromptFlowError } from "@promptflow/core";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  let body = "";
  let tags: string[] = [];
  let currentVersion = 0;
  try {
    const prompt = await client.getPrompt(name, { version: baseVersion });
    if (prompt.type !== "text") {
      return (
        <main className="mx-auto max-w-2xl px-6 py-20 text-center text-sm text-muted-foreground">
          Editing chat prompts isn't supported yet.{" "}
          <Link href={`/prompts/${encodedName}`} className="underline">
            Go back
          </Link>
        </main>
      );
    }
    body = prompt.prompt;
    tags = prompt.tags;
    currentVersion = prompt.version;
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") {
      notFound();
    }
    throw err;
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
          Saving creates a new version (current is v{currentVersion}). The new version becomes the
          production label.
        </p>
      </header>
      <EditPromptForm
        name={name}
        initialBody={body}
        initialTags={tags.join(", ")}
        baseVersion={currentVersion}
      />
    </main>
  );
}
