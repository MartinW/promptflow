import Link from "next/link";
import { checkLangfuse } from "@/lib/langfuse";

export async function AppHeader() {
  const status = await checkLangfuse();
  const indicator = statusIndicator(status);

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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`size-2 rounded-full ${indicator.dot}`} />
          <span>{indicator.label}</span>
        </div>
      </div>
    </header>
  );
}

function statusIndicator(status: Awaited<ReturnType<typeof checkLangfuse>>) {
  if (status.kind === "ok") {
    return { dot: "bg-emerald-500", label: "Langfuse connected" };
  }
  if (status.kind === "unconfigured") {
    return { dot: "bg-amber-500", label: "Langfuse not configured" };
  }
  return { dot: "bg-red-500", label: "Langfuse error" };
}
