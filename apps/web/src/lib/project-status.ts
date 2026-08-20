import { createClient, createPostHogClient, PromptFlowError } from "@promptflow/core";
import type { ProjectId } from "./projects";
import { getActiveProjectId } from "./server-client";

export type ProjectStatus =
  | { kind: "unconfigured" }
  | { kind: "ok"; promptCount: number; host: string; project: ProjectId }
  | { kind: "error"; message: string; host: string; project: ProjectId };

/** Live connectivity check for whichever project is active, for the header status dot. */
export async function checkActiveProject(): Promise<ProjectStatus> {
  const id = await getActiveProjectId();
  if (!id) return { kind: "unconfigured" };

  if (id === "langfuse") {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY as string;
    const secretKey = process.env.LANGFUSE_SECRET_KEY as string;
    const host = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
    try {
      const client = createClient({ publicKey, secretKey, host });
      const prompts = await client.listPrompts({ limit: 100 });
      return { kind: "ok", promptCount: prompts.length, host, project: id };
    } catch (err) {
      return { kind: "error", message: errorMessage(err), host, project: id };
    }
  }

  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY as string;
  const projectId = process.env.POSTHOG_PROJECT_ID as string;
  const host = process.env.POSTHOG_HOST as string;
  try {
    const client = createPostHogClient({ personalApiKey, projectId, host });
    const prompts = await client.listPrompts({ limit: 100 });
    return { kind: "ok", promptCount: prompts.length, host, project: id };
  } catch (err) {
    return { kind: "error", message: errorMessage(err), host, project: id };
  }
}

function errorMessage(err: unknown): string {
  return err instanceof PromptFlowError
    ? `[${err.kind}] ${err.message}`
    : err instanceof Error
      ? err.message
      : String(err);
}
