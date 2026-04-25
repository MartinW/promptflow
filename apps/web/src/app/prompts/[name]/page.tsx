import { extractVariables, type Prompt, PromptFlowError } from "@promptflow/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getServerClient, isLangfuseConfigured } from "@/lib/server-client";

export const dynamic = "force-dynamic";

interface PageParams {
  name: string;
}

interface PageSearchParams {
  v?: string;
}

export default async function PromptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  if (!isLangfuseConfigured()) {
    notFound();
  }

  const { name: encodedName } = await params;
  const { v } = await searchParams;
  const name = decodeURIComponent(encodedName);
  const requestedVersion = v ? Number.parseInt(v, 10) : undefined;

  const client = getServerClient();
  let prompt: Prompt;
  try {
    prompt = await client.getPrompt(name, { version: requestedVersion });
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") {
      notFound();
    }
    return <ErrorView name={name} error={err} />;
  }

  const allVersions = await loadAllVersions(name).catch(() => null);
  const versions = allVersions?.versions ?? [prompt.version];
  const variables = prompt.type === "text" ? extractVariables(prompt.prompt) : [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="text-sm mb-3">
        <Link href="/prompts" className="text-muted-foreground hover:text-foreground">
          ← All prompts
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight font-mono">{prompt.name}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Badge variant="secondary">v{prompt.version}</Badge>
          <Badge variant="outline">{prompt.type}</Badge>
          {prompt.labels.map((label) => (
            <Badge key={label} variant="default">
              {label}
            </Badge>
          ))}
          {prompt.tags.map((t) => (
            <Link key={t} href={`/prompts?tag=${encodeURIComponent(t)}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                {t}
              </Badge>
            </Link>
          ))}
        </div>
        {prompt.commitMessage ? (
          <p className="text-sm text-muted-foreground mt-3 italic">"{prompt.commitMessage}"</p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-8">
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Body</h2>
          <Card className="p-5">
            {prompt.type === "text" ? (
              <pre className="text-sm font-mono whitespace-pre-wrap leading-6">{prompt.prompt}</pre>
            ) : (
              <ChatBody prompt={prompt} />
            )}
          </Card>

          {variables.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Variables
              </h2>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <Badge key={v} variant="secondary" className="font-mono">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Version history
          </h2>
          <Card className="divide-y divide-border">
            {versions
              .slice()
              .sort((a, b) => b - a)
              .map((version) => {
                const isActive = version === prompt.version;
                return (
                  <Link
                    key={version}
                    href={`/prompts/${encodeURIComponent(name)}?v=${version}`}
                    className={`block px-4 py-3 text-sm hover:bg-accent ${
                      isActive ? "bg-accent/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">v{version}</span>
                      {isActive && <span className="text-xs text-muted-foreground">viewing</span>}
                    </div>
                  </Link>
                );
              })}
          </Card>
          <Separator className="my-6" />
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Config</h2>
          <Card className="p-3">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-5">
              {JSON.stringify(prompt.config ?? {}, null, 2)}
            </pre>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function ChatBody({ prompt }: { prompt: Extract<Prompt, { type: "chat" }> }) {
  return (
    <div className="space-y-4">
      {prompt.prompt.map((msg, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: chat messages are positional
        <div key={`${i}-${msg.type}`}>
          {msg.type === "chatmessage" ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                {msg.role}
              </div>
              <pre className="text-sm font-mono whitespace-pre-wrap leading-6">{msg.content}</pre>
            </div>
          ) : (
            <Badge variant="outline" className="font-mono">
              {`{{placeholder: ${msg.name}}}`}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function ErrorView({ name, error }: { name: string; error: unknown }) {
  const message =
    error instanceof PromptFlowError
      ? `[${error.kind}] ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <Card className="p-8 space-y-3 border-red-500/30 bg-red-500/5">
        <h1 className="text-lg font-semibold">Couldn't load prompt</h1>
        <p className="text-sm text-muted-foreground font-mono">{name}</p>
        <p className="text-xs text-red-600/80 dark:text-red-400/80 font-mono break-all">
          {message}
        </p>
      </Card>
    </main>
  );
}

/**
 * Langfuse's `getPrompt` only returns one version at a time. We use the
 * `listPrompts` filter by name to get the array of versions.
 */
async function loadAllVersions(name: string): Promise<{ versions: number[] } | null> {
  try {
    const client = getServerClient();
    const list = await client.listPrompts({ name, limit: 1 });
    const match = list.find((p) => p.name === name);
    return match ? { versions: match.versions } : null;
  } catch {
    return null;
  }
}
