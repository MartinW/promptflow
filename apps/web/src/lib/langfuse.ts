import { createClient, PromptFlowError } from "@promptflow/core";

export type LangfuseStatus =
  | { kind: "unconfigured"; missing: string[] }
  | { kind: "ok"; promptCount: number; host: string }
  | { kind: "error"; message: string; host: string };

export async function checkLangfuse(): Promise<LangfuseStatus> {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";

  const missing: string[] = [];
  if (!publicKey) missing.push("LANGFUSE_PUBLIC_KEY");
  if (!secretKey) missing.push("LANGFUSE_SECRET_KEY");
  if (!publicKey || !secretKey) {
    return { kind: "unconfigured", missing };
  }

  try {
    const client = createClient({ publicKey, secretKey, host });
    const prompts = await client.listPrompts({ limit: 100 });
    return { kind: "ok", promptCount: prompts.length, host };
  } catch (err) {
    const message =
      err instanceof PromptFlowError
        ? `[${err.kind}] ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    return { kind: "error", message, host };
  }
}
