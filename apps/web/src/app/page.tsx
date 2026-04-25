import { checkLangfuse } from "@/lib/langfuse";

export const dynamic = "force-dynamic";

export default async function Home() {
  const status = await checkLangfuse();

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-8">
      <div className="w-full max-w-2xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">PromptFlow</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            A better UI for Langfuse prompt management.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
            Langfuse connection
          </h2>
          <StatusPanel status={status} />
        </section>
      </div>
    </main>
  );
}

function StatusPanel({ status }: { status: Awaited<ReturnType<typeof checkLangfuse>> }) {
  if (status.kind === "unconfigured") {
    return (
      <div className="space-y-2">
        <p className="text-amber-600 dark:text-amber-400 font-medium">Not configured</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Set the following environment variables to connect:
        </p>
        <ul className="text-sm font-mono text-zinc-700 dark:text-zinc-300 space-y-1">
          {status.missing.map((key) => (
            <li key={key}>· {key}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (status.kind === "error") {
    return (
      <div className="space-y-2">
        <p className="text-red-600 dark:text-red-400 font-medium">Connection failed</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 break-all">{status.message}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
          Host: <span className="font-mono">{status.host}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-emerald-600 dark:text-emerald-400 font-medium">Connected</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {status.promptCount} {status.promptCount === 1 ? "prompt" : "prompts"} found.
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
        Host: <span className="font-mono">{status.host}</span>
      </p>
    </div>
  );
}
