import { findDuplicates, matchesTags, PromptFlowError } from "@promptflow/core";
import { cookies } from "next/headers";
import Link from "next/link";
import { GlobalCanvas } from "@/components/canvas/global-canvas";
import { DuplicatesResults } from "@/components/duplicates/duplicates-results";
import { FolderTree } from "@/components/folder-tree/folder-tree";
import {
  FOLDER_OPEN_COOKIE_NAME,
  parseOpenPathsCookie,
} from "@/components/folder-tree/persistence";
import { FilterToolbar } from "@/components/prompts/filter-toolbar";
import { SearchInput } from "@/components/prompts/search-input";
import { TagBadge } from "@/components/tags/tag-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VIEW_COOKIE_NAME } from "@/components/view-cookie";
import { ViewToggle, type PromptsView } from "@/components/view-toggle";
import { getCorpus, type CorpusPrompt } from "@/lib/corpus";
import { isLangfuseConfigured } from "@/lib/server-client";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  tag?: string;
  mode?: string;
  view?: string;
  folder?: string;
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
  const selectedTags = parseTagsParam(params.tag);
  const mode: "and" | "or" = params.mode === "or" ? "or" : "and";
  // URL param wins; otherwise fall back to the `pf-view` cookie set by the
  // ViewToggle so the user's last choice persists across navigation back to
  // /prompts. List is the final default.
  const cookieStore = await cookies();
  const cookieView = cookieStore.get(VIEW_COOKIE_NAME)?.value;
  const view: PromptsView = parseView(params.view ?? cookieView);
  const folderPath = params.folder?.trim() ?? "";
  // Last-known FolderTree expansion state (set by the tree itself on each
  // toggle). Merged with the active prompt's ancestors inside the tree so the
  // current selection is always reachable.
  const initialOpenPaths = parseOpenPathsCookie(cookieStore.get(FOLDER_OPEN_COOKIE_NAME)?.value);

  let prompts: CorpusPrompt[];
  let folderTree;
  let productionNames: Set<string> = new Set();
  let error: string | null = null;
  try {
    const corpus = await getCorpus();
    prompts = corpus.prompts;
    folderTree = corpus.folderTree;
    productionNames = new Set(
      corpus.prompts
        .filter((p) => p.meta.labels.includes("production"))
        .map((p) => p.meta.name),
    );
  } catch (err) {
    prompts = [];
    folderTree = { path: "", name: "", children: new Map(), prompts: [] };
    error =
      err instanceof PromptFlowError
        ? `[${err.kind}] ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
  }

  const filtered = prompts.filter((p) => {
    if (query && !p.meta.name.toLowerCase().includes(query)) return false;
    if (!matchesTags(p.meta.tags, selectedTags, mode)) return false;
    if (folderPath && !p.meta.name.startsWith(`${folderPath}/`)) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"} in this Langfuse project.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle current={view} />
          <Link href="/prompts/new" className={buttonVariants()}>
            + New prompt
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[14rem_minmax(0,1fr)_18rem]">
        <aside className="md:sticky md:top-4 md:self-start">
          <FolderTree
            root={folderTree}
            selectedPath={folderPath || undefined}
            enableDnd
            productionNames={productionNames}
            initialOpenPaths={initialOpenPaths}
            className="max-h-[70vh] overflow-y-auto rounded-md border p-2"
          />
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SearchInput initial={query ?? ""} className="max-w-xs" />
            {folderPath ? (
              <span className="text-xs text-muted-foreground">
                in <span className="font-mono">{folderPath}/</span>
                <Link href={removeParam(params, "folder")} className="ml-2 underline">
                  clear
                </Link>
              </span>
            ) : null}
          </div>

          {error ? <ErrorBanner message={error} /> : null}

          {view === "list" ? (
            <PromptsList filtered={filtered} hasFilter={hasAnyFilter(query, selectedTags, folderPath)} />
          ) : view === "canvas" ? (
            <GlobalCanvas prompts={filtered} />
          ) : (
            <DuplicatesResults
              groups={findDuplicates(
                prompts.map((p) => ({ name: p.meta.name, body: p.body })),
              )}
            />
          )}
        </section>

        <aside className="md:sticky md:top-4 md:self-start">
          <Card className="p-3">
            <FilterToolbar tags={selectedTags} mode={mode} />
          </Card>
        </aside>
      </div>
    </main>
  );
}

interface PromptsListProps {
  filtered: CorpusPrompt[];
  hasFilter: boolean;
}

function PromptsList({ filtered, hasFilter }: PromptsListProps) {
  if (filtered.length === 0) {
    return <EmptyState hasFilter={hasFilter} />;
  }
  return (
    <ul className="space-y-2">
      {filtered.map((entry) => (
        <li key={entry.meta.name}>
          <Link href={`/prompts/${encodeURIComponent(entry.meta.name)}`}>
            <Card className="px-5 py-4 hover:border-foreground/20 transition-colors">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{entry.meta.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.meta.versions.length}{" "}
                    {entry.meta.versions.length === 1 ? "version" : "versions"} · updated{" "}
                    {formatRelative(entry.meta.lastUpdatedAt)}
                    {entry.references.length > 0
                      ? ` · refs ${entry.references.length}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {entry.meta.tags.slice(0, 6).map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
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
        No prompts match these filters.
      </Card>
    );
  }
  return (
    <Card className="p-10 text-center space-y-3">
      <h2 className="font-medium">No prompts yet</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Your Langfuse project is connected but empty.
      </p>
      <Link href="/prompts/new" className={`${buttonVariants()} mt-4`}>
        Create your first prompt
      </Link>
    </Card>
  );
}

function parseTagsParam(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseView(raw: string | undefined): PromptsView {
  if (raw === "canvas" || raw === "duplicates") return raw;
  return "list";
}

function hasAnyFilter(query: string | undefined, tags: string[], folder: string): boolean {
  return Boolean(query) || tags.length > 0 || folder.length > 0;
}

function removeParam(params: SearchParams, key: keyof SearchParams): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === key || !v) continue;
    next.set(k, String(v));
  }
  return next.toString() ? `/prompts?${next}` : "/prompts";
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
