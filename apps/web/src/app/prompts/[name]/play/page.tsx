import { extractVariables, isPlaceholder, PromptFlowError } from "@promptflow/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  groupModelsByProvider,
  isOpenRouterConfigured,
  listOpenRouterModels,
  type ModelGroup,
} from "@/lib/openrouter";
import { getServerClient, isLangfuseConfigured } from "@/lib/server-client";
import { AIPlay, type PromptShape } from "./aiplay";

export const dynamic = "force-dynamic";

const FALLBACK_GROUPS: ModelGroup[] = [
  {
    provider: "Anthropic",
    models: [
      {
        id: "anthropic/claude-3.5-sonnet",
        shortName: "claude-3.5-sonnet",
        provider: "Anthropic",
        contextLabel: "200k",
        priceLabel: "$3/$15",
      },
      {
        id: "anthropic/claude-3.5-haiku",
        shortName: "claude-3.5-haiku",
        provider: "Anthropic",
        contextLabel: "200k",
        priceLabel: "$0.80/$4",
      },
    ],
  },
  {
    provider: "OpenAI",
    models: [
      {
        id: "openai/gpt-4o",
        shortName: "gpt-4o",
        provider: "OpenAI",
        contextLabel: "128k",
        priceLabel: "$5/$15",
      },
      {
        id: "openai/gpt-4o-mini",
        shortName: "gpt-4o-mini",
        provider: "OpenAI",
        contextLabel: "128k",
        priceLabel: "$0.15/$0.6",
      },
    ],
  },
  {
    provider: "Google",
    models: [
      {
        id: "google/gemini-2.0-flash-exp",
        shortName: "gemini-2.0-flash-exp",
        provider: "Google",
        contextLabel: "1M",
        priceLabel: "Free",
      },
    ],
  },
];

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  if (!isLangfuseConfigured()) {
    notFound();
  }

  const { name: encodedName } = await params;
  const { v } = await searchParams;
  const name = decodeURIComponent(encodedName);
  const requestedVersion = v ? Number.parseInt(v, 10) : undefined;

  const client = getServerClient();
  let shape: PromptShape;
  let version = 0;
  let userContextDefault: string | undefined;
  try {
    const prompt = await client.getPrompt(name, { version: requestedVersion });
    version = prompt.version;
    const config = (prompt.config ?? {}) as { defaults?: { user_context?: string } };
    userContextDefault = config.defaults?.user_context;
    if (prompt.type === "text") {
      shape = { type: "text", body: prompt.prompt };
    } else {
      const messages: { role: string; content: string }[] = [];
      for (const m of prompt.prompt) {
        if (isPlaceholder(m)) continue;
        messages.push({ role: m.role, content: m.content });
      }
      shape = { type: "chat", messages };
    }
  } catch (err) {
    if (err instanceof PromptFlowError && err.kind === "not_found") {
      notFound();
    }
    throw err;
  }

  const variables =
    shape.type === "text" ? extractVariables(shape.body) : aggregateChatVariables(shape.messages);
  const initialValues: Record<string, string> = {};
  for (const v of variables) initialValues[v] = "";
  if (userContextDefault && variables.includes("user_context")) {
    initialValues.user_context = userContextDefault;
  }
  const models = await listOpenRouterModels();
  const modelGroups = models.length > 0 ? groupModelsByProvider(models) : FALLBACK_GROUPS;

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <nav className="text-sm mb-3">
        <Link
          href={`/prompts/${encodedName}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {name} (v{version})
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">AIPlay</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Run this prompt against any OpenRouter model. Iterate variables and inputs live.
        </p>
      </header>

      {!isOpenRouterConfigured() ? (
        <Card className="px-5 py-4 mb-4 border-amber-500/30 bg-amber-500/5 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            OpenRouter not configured
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
            Set <code className="font-mono">OPENROUTER_API_KEY</code> in{" "}
            <code className="font-mono">.env.local</code> to run prompts.
          </p>
        </Card>
      ) : null}

      <AIPlay
        promptName={name}
        version={version}
        shape={shape}
        variables={variables}
        initialValues={initialValues}
        modelGroups={modelGroups}
      />
    </main>
  );
}

function aggregateChatVariables(messages: { role: string; content: string }[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const pattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  for (const m of messages) {
    for (const match of m.content.matchAll(pattern)) {
      const name = match[1];
      if (!seen.has(name)) {
        seen.add(name);
        ordered.push(name);
      }
    }
  }
  return ordered;
}
