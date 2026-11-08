import Link from "next/link";
import { notFound } from "next/navigation";
import { isSkillsSupported } from "@/lib/projects";
import { getActiveProjectId, isActiveProjectConfigured } from "@/lib/server-client";
import { NewSkillForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewSkillPage() {
  if (!(await isActiveProjectConfigured())) {
    notFound();
  }
  const activeProjectId = await getActiveProjectId();
  if (!activeProjectId || !isSkillsSupported(activeProjectId)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <nav className="text-sm mb-3">
        <Link href="/skills" className="text-muted-foreground hover:text-foreground">
          ← All skills
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New skill</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A skill is a versioned <code className="font-mono">SKILL.md</code> plus any supporting
          files — separate from prompts.
        </p>
      </header>
      <NewSkillForm />
    </main>
  );
}
