import { matchesTags, PromptFlowError, type SkillMeta } from "@promptflow/core";
import Link from "next/link";
import { TagBadge } from "@/components/tags/tag-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getActiveProjectId, getServerSkillsClient, isActiveProjectConfigured } from "@/lib/server-client";
import { isSkillsSupported } from "@/lib/projects";
import { SkillsFilterToolbar } from "./filter-toolbar";
import { SkillsSearchInput } from "./search-input";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  tag?: string;
  mode?: string;
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!(await isActiveProjectConfigured())) {
    return <NotConfigured />;
  }

  const activeProjectId = await getActiveProjectId();
  if (!activeProjectId || !isSkillsSupported(activeProjectId)) {
    return <NotSupported />;
  }

  const params = await searchParams;
  const query = params.q?.trim();
  const selectedTags = parseTagsParam(params.tag);
  const mode: "and" | "or" = params.mode === "or" ? "or" : "and";

  let skills: SkillMeta[] = [];
  let error: string | null = null;
  try {
    const client = await getServerSkillsClient();
    // The API's `tag` filter only takes one tag — multi-tag AND/OR matching
    // (same semantics as the prompts list) is done client-side below, over
    // a generous page. `search` (name/description substring) stays server-side.
    skills = await client.listSkills({ search: query || undefined, limit: 100 });
  } catch (err) {
    error =
      err instanceof PromptFlowError
        ? `[${err.kind}] ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
  }

  const filtered = skills.filter((s) => matchesTags(s.tags, selectedTags, mode));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {skills.length} {skills.length === 1 ? "skill" : "skills"} in this project.
          </p>
        </div>
        <Link href="/skills/new" className={buttonVariants()}>
          + New skill
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="min-w-0">
          <div className="mb-4 max-w-xs">
            <SkillsSearchInput initial={query ?? ""} />
          </div>

          {error ? <ErrorBanner message={error} /> : null}

          {filtered.length === 0 ? (
            <EmptyState hasFilter={Boolean(query) || selectedTags.length > 0} />
          ) : (
            <SkillsList skills={filtered} />
          )}
        </section>

        <aside className="md:sticky md:top-4 md:self-start">
          <Card className="p-3">
            <SkillsFilterToolbar tags={selectedTags} mode={mode} />
          </Card>
        </aside>
      </div>
    </main>
  );
}

function parseTagsParam(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function SkillsList({ skills }: { skills: SkillMeta[] }) {
  return (
    <ul className="space-y-2">
      {skills.map((skill) => (
        <li key={skill.name}>
          <Link href={`/skills/${encodeURIComponent(skill.name)}`}>
            <Card className="px-5 py-4 hover:border-foreground/20 transition-colors">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{skill.name}</h3>
                    {skill.productionVersion !== null ? (
                      <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
                        production · v{skill.productionVersion}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{skill.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    v{skill.latestVersion} latest · updated {formatRelative(skill.latestVersionLastUpdatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {skill.tags.slice(0, 6).map((tag) => (
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
        <h1 className="text-xl font-semibold">No project configured</h1>
        <p className="text-sm text-muted-foreground">
          Set credentials for Langfuse in <code className="font-mono">.env.local</code> and restart
          the server. See <code className="font-mono">.env.example</code>.
        </p>
      </Card>
    </main>
  );
}

function NotSupported() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <Card className="p-8 space-y-4">
        <h1 className="text-xl font-semibold">Skills aren&apos;t available on PostHog</h1>
        <p className="text-sm text-muted-foreground">
          Langfuse&apos;s Skills API has no PostHog equivalent yet. Switch the active project to Langfuse
          in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to manage skills.
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
        No skills match these filters.
      </Card>
    );
  }
  return (
    <Card className="p-10 text-center space-y-3">
      <h2 className="font-medium">No skills yet</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Your project is connected but has no skills. Skills are versioned agent instructions —
        separate from prompts.
      </p>
      <Link href="/skills/new" className={`${buttonVariants()} mt-4`}>
        Create your first skill
      </Link>
    </Card>
  );
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
