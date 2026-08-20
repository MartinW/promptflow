import "server-only";
import { createClient, createPostHogClient, type PromptFlowClient } from "@promptflow/core";
import { cookies } from "next/headers";
import { PROJECT_COOKIE_NAME } from "@/components/project-cookie";
import { type ProjectId, resolveActiveProject } from "./projects";

const cache = new Map<ProjectId, PromptFlowClient>();

/** Resolve the active project for this request from the `pf-project` cookie. */
export async function getActiveProjectId(): Promise<ProjectId | null> {
  const cookieStore = await cookies();
  return resolveActiveProject(cookieStore.get(PROJECT_COOKIE_NAME)?.value);
}

function buildClient(id: ProjectId): PromptFlowClient {
  if (id === "langfuse") {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
    if (!publicKey || !secretKey) {
      throw new Error("Langfuse not configured: set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY");
    }
    return createClient({ publicKey, secretKey, host });
  }
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST;
  if (!personalApiKey || !projectId || !host) {
    throw new Error(
      "PostHog not configured: set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, POSTHOG_HOST",
    );
  }
  return createPostHogClient({ personalApiKey, projectId, host });
}

/**
 * Server-side PromptFlow client for whichever project is active for the
 * current request. Reuses one client instance per project across requests.
 * Throws if the active project (or nothing at all) is configured; callers
 * that may run unconfigured should call `isActiveProjectConfigured()` first.
 */
export async function getServerClient(): Promise<PromptFlowClient> {
  const id = await getActiveProjectId();
  if (!id) throw new Error("No prompt-storage project configured");
  const existing = cache.get(id);
  if (existing) return existing;
  const client = buildClient(id);
  cache.set(id, client);
  return client;
}

export async function isActiveProjectConfigured(): Promise<boolean> {
  return (await getActiveProjectId()) !== null;
}
