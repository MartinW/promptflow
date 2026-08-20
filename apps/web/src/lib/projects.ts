import "server-only";

/**
 * The set of prompt-storage providers a deployment may have configured.
 * There's no DB-backed multi-tenancy here — a "project" is just whichever
 * provider's env credentials are present, at most one per provider. See
 * `resolveActiveProject` for how the active one is chosen.
 */
export type ProjectId = "langfuse" | "posthog";

export interface ProjectSummary {
  id: ProjectId;
  label: string;
  configured: boolean;
}

export function isLangfuseEnvConfigured(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

export function isPostHogEnvConfigured(): boolean {
  return Boolean(
    process.env.POSTHOG_PERSONAL_API_KEY &&
      process.env.POSTHOG_PROJECT_ID &&
      process.env.POSTHOG_HOST,
  );
}

export function getConfiguredProjects(): ProjectSummary[] {
  return [
    { id: "langfuse", label: "Langfuse", configured: isLangfuseEnvConfigured() },
    { id: "posthog", label: "PostHog", configured: isPostHogEnvConfigured() },
  ];
}

/**
 * Resolve which project is active for this request.
 *
 * The `pf-project` cookie wins if it names a configured project. Otherwise
 * falls back to the first configured project (Langfuse preferred, to match
 * pre-PostHog behavior exactly when only Langfuse is set up). Returns `null`
 * if nothing is configured at all.
 */
export function resolveActiveProject(cookieValue?: string): ProjectId | null {
  const projects = getConfiguredProjects();
  if (cookieValue === "langfuse" || cookieValue === "posthog") {
    const match = projects.find((p) => p.id === cookieValue && p.configured);
    if (match) return match.id;
  }
  return projects.find((p) => p.configured)?.id ?? null;
}
