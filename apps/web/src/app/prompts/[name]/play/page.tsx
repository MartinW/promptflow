import { extractVariables, PromptFlowError } from "@promptflow/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { isOpenRouterConfigured, listOpenRouterModels } from "@/lib/openrouter";
import { getServerClient, isLangfuseConfigured } from "@/lib/server-client";
import { AIPlay } from "./aiplay";

export const dynamic = "force-dynamic";

const DEFAULT_MODELS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash-exp",
  "meta-llama/llama-3.3-70b-instruct",
];

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  if (!isLangfuseConfigured()) {
    notFound();
  }

  const { name: encodedName } = await params;
  const { v } = await searchParams;
  const name = decodeURIComponent(encodedName);
  const requestedVersion = v ? Number.parseInt(v, 10) : undefined;

  const client = getServerClient();
  let body = "";
  let version = 0;
  try {
    const prompt = await client.getPrompt(name, { version: requestedVersion });
    if (prompt.type !== "text") {
      return (
        <main className="mx-auto max-w-2xl px-6 py-20 text-center text-sm text-muted-foreground">
          AIPlay only supports text prompts in v1.{" "}
          <Link href={`/prompts/${encodedName}`} className="underline">
            Go back
          </Link>
        </main>
      );
    }
    body = prompt.prompt;
    version = prompt.version;
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") {
      notFound();
    }
    throw err;
  }

  const variables = extractVariables(body);
  const models = await listOpenRouterModels();
  const modelOptions = models.length > 0 ? models.map((m) => m.id) : DEFAULT_MODELS;

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <nav className="text-sm mb-3">
        <Link
          href={`/prompts/${encodedName}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {name} (v{version})
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">AIPlay</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Run this prompt against any OpenRouter model. Iterate variables and inputs live.
        </p>
      </header>

      {!isOpenRouterConfigured() ? (
        <Card className="px-5 py-4 mb-4 border-amber-500/30 bg-amber-500/5 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            OpenRouter not configured
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
            Set <code className="font-mono">OPENROUTER_API_KEY</code> in{" "}
            <code className="font-mono">.env.local</code> to run prompts.
          </p>
        </Card>
      ) : null}

      <AIPlay
        promptName={name}
        version={version}
        body={body}
        variables={variables}
        modelOptions={modelOptions}
      />
    </main>
  );
}
