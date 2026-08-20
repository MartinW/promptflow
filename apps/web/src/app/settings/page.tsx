import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PROJECT_COOKIE_NAME } from "@/components/project-cookie";
import { ProjectPicker } from "@/components/project-picker";
import { StylePreview } from "@/components/style-preview";
import { ThemePicker } from "@/components/theme-picker";
import { getConfiguredProjects, resolveActiveProject } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Settings · PromptFlow",
};

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const projects = getConfiguredProjects();
  const activeProject = resolveActiveProject(cookieStore.get(PROJECT_COOKIE_NAME)?.value);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how PromptFlow looks and feels.
        </p>
      </header>

      <section aria-labelledby="project-heading" className="space-y-4 mb-10">
        <div>
          <h2 id="project-heading" className="text-base font-medium">
            Project
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose which prompt-storage backend to work against. Configure credentials via env vars
            — see <code className="font-mono">.env.example</code>.
          </p>
        </div>
        <ProjectPicker projects={projects} current={activeProject} />
      </section>

      <section aria-labelledby="theme-heading" className="space-y-6">
        <div>
          <h2 id="theme-heading" className="text-base font-medium">
            Theme
          </h2>
          <p className="text-sm text-muted-foreground">Choose how the interface should appear.</p>
        </div>
        <ThemePicker />
        <StylePreview />
      </section>
    </main>
  );
}
