import { Langfuse } from "langfuse";

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
    const client = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
    });
    const result = await client.api.promptsList({});
    return {
      kind: "ok",
      promptCount: result.data?.length ?? 0,
      host,
    };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
      host,
    };
  }
}
