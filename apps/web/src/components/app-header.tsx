import Link from "next/link";
import { pickProvider } from "@/lib/aiprovider";
import { checkLangfuse } from "@/lib/langfuse";

export async function AppHeader() {
  const status = await checkLangfuse();
  const langfuse = langfuseIndicator(status);
  const provider = providerIndicator(pickProvider());

  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight text-base">
            PromptFlow
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/prompts" className="hover:text-foreground transition-colors">
              Prompts
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <kbd className="hidden md:inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[0.7rem]">
            ⌘K
          </kbd>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${langfuse.dot}`} />
              <span>{langfuse.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${provider.dot}`} />
              <span>{provider.label}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function langfuseIndicator(status: Awaited<ReturnType<typeof checkLangfuse>>) {
  if (status.kind === "ok") {
    return { dot: "bg-emerald-500", label: "Langfuse connected" };
  }
  if (status.kind === "unconfigured") {
    return { dot: "bg-amber-500", label: "Langfuse not configured" };
  }
  return { dot: "bg-red-500", label: "Langfuse error" };
}

function providerIndicator(provider: ReturnType<typeof pickProvider>) {
  if (provider === "vercel") {
    return { dot: "bg-emerald-500", label: "Vercel AI Gateway connected" };
  }
  if (provider === "openrouter") {
    return { dot: "bg-emerald-500", label: "OpenRouter connected" };
  }
  return { dot: "bg-amber-500", label: "No model provider" };
}
