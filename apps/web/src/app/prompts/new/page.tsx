import Link from "next/link";
import { isLangfuseConfigured } from "@/lib/server-client";
import { NewPromptForm } from "./form";

export const dynamic = "force-dynamic";

export default function NewPromptPage() {
  if (!isLangfuseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Configure Langfuse first.{" "}
          <Link href="/prompts" className="underline">
            Go back
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="text-sm mb-3">
        <Link href="/prompts" className="text-muted-foreground hover:text-foreground">
          ← All prompts
        </Link>
      </nav>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">New prompt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A text prompt with mustache-style variables. Saved as v1 with the production label.
        </p>
      </header>
      <NewPromptForm />
    </main>
  );
}
