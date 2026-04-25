import { PromptFlowError, type PromptMeta } from "@promptflow/core";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getServerClient, isLangfuseConfigured } from "@/lib/server-client";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  tag?: string;
}

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isLangfuseConfigured()) {
    return <NotConfigured />;
  }

  const params = await searchParams;
  const query = params.q?.trim().toLowerCase();
  const tag = params.tag?.trim();

  let prompts: PromptMeta[];
  let error: string | null = null;
  try {
    const client = getServerClient();
    prompts = await client.listPrompts({ tag, limit: 100 });
  } catch (err) {
    prompts = [];
    error =
      err instanceof PromptFlowError
        ? `[${err.kind}] ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
  }

  const filtered = query ? prompts.filter((p) => p.name.toLowerCase().includes(query)) : prompts;
  const allTags = collectTags(prompts);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"} in this Langfuse project.
          </p>
        </div>
      </header>

      <form className="flex flex-wrap items-center gap-3 mb-6">
        <Input
          name="q"
          placeholder="Search by name..."
          defaultValue={query ?? ""}
          className="max-w-xs"
        />
        {tag && (
          <Badge variant="secondary" className="gap-2">
            tag: {tag}
            <Link href={buildHref({ q: query })} className="hover:opacity-70">
              ✕
            </Link>
          </Badge>
        )}
      </form>

      {allTags.length > 0 && !tag && (
        <section className="mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Filter by tag
          </p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => (
              <Link key={t} href={buildHref({ q: query, tag: t })}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  {t}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {error ? <ErrorBanner message={error} /> : null}

      {filtered.length === 0 ? (
        <EmptyState hasFilter={Boolean(query || tag)} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((prompt) => (
            <li key={prompt.name}>
              <Link href={`/prompts/${encodeURIComponent(prompt.name)}`}>
                <Card className="px-5 py-4 hover:border-foreground/20 transition-colors">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{prompt.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prompt.versions.length}{" "}
                        {prompt.versions.length === 1 ? "version" : "versions"} · updated{" "}
                        {formatRelative(prompt.lastUpdatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {prompt.tags.slice(0, 6).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NotConfigured() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <Card className="p-8 space-y-4">
        <h1 className="text-xl font-semibold">Langfuse not configured</h1>
        <p className="text-sm text-muted-foreground">
          Set the following environment variables in <code className="font-mono">.env.local</code>{" "}
          and restart the server:
        </p>
        <pre className="text-xs font-mono bg-muted rounded-md p-4 leading-6">
          LANGFUSE_PUBLIC_KEY=pk-lf-...{"\n"}LANGFUSE_SECRET_KEY=sk-lf-...{"\n"}
          LANGFUSE_HOST=https://cloud.langfuse.com
        </pre>
        <p className="text-xs text-muted-foreground">
          Don't have a Langfuse project?{" "}
          <a
            href="https://cloud.langfuse.com"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Create one for free
          </a>
          .
        </p>
      </Card>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <Card className="px-5 py-4 mb-6 border-red-500/30 bg-red-500/5">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">Connection error</p>
      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 font-mono break-all">
        {message}
      </p>
    </Card>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  if (hasFilter) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        No prompts match this filter.
      </Card>
    );
  }
  return (
    <Card className="p-10 text-center space-y-3">
      <h2 className="font-medium">No prompts yet</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Your Langfuse project is connected but empty. Create your first prompt in the Langfuse
        dashboard, or use AIPlay (coming soon) to author one and save it back.
      </p>
    </Card>
  );
}

function collectTags(prompts: PromptMeta[]): string[] {
  const set = new Set<string>();
  for (const p of prompts) {
    for (const t of p.tags) set.add(t);
  }
  return [...set].sort();
}

function buildHref(params: { q?: string; tag?: string }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  const query = search.toString();
  return query ? `/prompts?${query}` : "/prompts";
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  return `${Math.floor(month / 12)}y ago`;
}
