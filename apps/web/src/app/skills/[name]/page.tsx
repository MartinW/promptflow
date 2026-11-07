import { PromptFlowError, type SkillVersion } from "@promptflow/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isSkillsSupported } from "@/lib/projects";
import { getActiveProjectId, getServerSkillsClient, isActiveProjectConfigured } from "@/lib/server-client";
import { TagsForm } from "./tags-form";
import { VersionRow } from "./version-row";

export const dynamic = "force-dynamic";

interface PageParams {
  name: string;
}

interface PageSearchParams {
  v?: string;
}

export default async function SkillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  if (!(await isActiveProjectConfigured())) {
    notFound();
  }
  const activeProjectId = await getActiveProjectId();
  if (!activeProjectId || !isSkillsSupported(activeProjectId)) {
    notFound();
  }

  const { name: encodedName } = await params;
  const { v } = await searchParams;
  const name = decodeURIComponent(encodedName);
  const requestedVersion = v ? Number.parseInt(v, 10) : undefined;

  const client = await getServerSkillsClient();

  // listSkills gives us latestVersion/productionVersion up front, needed to
  // resolve the default version to show and to render the version-history
  // list — the Skills API has no "list versions" endpoint, so the full
  // range is just 1..latestVersion.
  const meta = await client.listSkills({ name }).then((all) => all.find((s) => s.name === name));
  if (!meta) notFound();

  const versionToLoad = requestedVersion ?? meta.productionVersion ?? meta.latestVersion;

  let skill: SkillVersion;
  try {
    skill = await client.getSkill(name, { version: versionToLoad, includeContent: true });
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") notFound();
    return <ErrorView name={name} error={err} />;
  }

  const allVersions = Array.from({ length: meta.latestVersion }, (_, i) => meta.latestVersion - i);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="text-sm mb-3">
        <Link href="/skills" className="text-muted-foreground hover:text-foreground">
          ← All skills
        </Link>
      </nav>

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight font-mono break-all">{skill.name}</h1>
          <Link
            href={`/skills/${encodedName}/edit?from=${skill.version}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Publish new version
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{skill.description}</p>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="text-xs rounded-full bg-muted px-2 py-0.5">v{skill.version}</span>
          {skill.labels.map((label) => (
            <span
              key={label}
              className="text-xs rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5"
            >
              {label}
            </span>
          ))}
        </div>
        {skill.commitMessage ? (
          <p className="text-sm text-muted-foreground mt-3 italic">"{skill.commitMessage}"</p>
        ) : null}
        <div className="mt-4">
          <TagsForm name={skill.name} initialTags={skill.tags} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-8">
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Files ({skill.files.length})
          </h2>
          <div className="space-y-4">
            {skill.files.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <div className="px-4 py-2 border-b border-border text-xs font-mono text-muted-foreground flex items-center justify-between">
                  <span>{file.path}</span>
                  <span>{file.contentLength} bytes</span>
                </div>
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words leading-6 max-h-96 overflow-y-auto">
                  {file.content ?? "(content not loaded)"}
                </pre>
              </Card>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Version history</h2>
          <Card className="divide-y divide-border">
            {allVersions.map((version) => (
              <VersionRow
                key={version}
                name={skill.name}
                version={version}
                isActive={version === skill.version}
                isProduction={version === meta.productionVersion}
              />
            ))}
          </Card>
          <Separator className="my-6" />
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Frontmatter</h2>
          <Card className="p-3">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-5">
              {JSON.stringify(skill.frontmatter ?? {}, null, 2)}
            </pre>
          </Card>
        </aside>
      </div>
    </main>
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
        <h1 className="text-lg font-semibold">Couldn't load skill</h1>
        <p className="text-sm text-muted-foreground font-mono">{name}</p>
        <p className="text-xs text-red-600/80 dark:text-red-400/80 font-mono break-all">{message}</p>
      </Card>
    </main>
  );
}
