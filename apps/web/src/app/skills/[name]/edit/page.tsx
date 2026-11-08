import { PromptFlowError } from "@promptflow/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { isSkillsSupported } from "@/lib/projects";
import { getActiveProjectId, getServerSkillsClient, isActiveProjectConfigured } from "@/lib/server-client";
import { EditSkillForm } from "./form";

export const dynamic = "force-dynamic";

interface PageParams {
  name: string;
}

interface PageSearchParams {
  from?: string;
}

export default async function EditSkillPage({
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
  const { from } = await searchParams;
  const name = decodeURIComponent(encodedName);
  const fromVersion = from ? Number.parseInt(from, 10) : undefined;

  const client = await getServerSkillsClient();

  let skillMd: string | null = null;
  let loadError: unknown = null;
  try {
    const skill = await client.getSkill(name, { version: fromVersion, includeContent: true });
    const file = skill.files.find((f) => f.path === "SKILL.md");
    skillMd = file?.content ?? null;
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") notFound();
    loadError = err;
  }

  if (loadError) {
    return <ErrorView name={name} error={loadError} />;
  }
  if (skillMd === null) {
    return <ErrorView name={name} error="SKILL.md not found on this version" />;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <nav className="text-sm mb-3">
        <Link href={`/skills/${encodedName}`} className="text-muted-foreground hover:text-foreground">
          ← {name}
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Publish new version</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{name}</p>
      </header>
      <EditSkillForm name={name} initialSkillMd={skillMd} />
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
        <h1 className="text-lg font-semibold">Couldn&apos;t load skill</h1>
        <p className="text-sm text-muted-foreground font-mono">{name}</p>
        <p className="text-xs text-red-600/80 dark:text-red-400/80 font-mono break-all">{message}</p>
      </Card>
    </main>
  );
}
