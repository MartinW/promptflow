import { redirect } from "next/navigation";
import { authEnabled, signIn } from "@/auth";
import { sanitizeRedirect } from "@/lib/auth-guard";

type SignInPageProps = {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, redirectTo } = await searchParams;
  const safeRedirect = sanitizeRedirect(redirectTo, "/prompts");

  if (!authEnabled) {
    redirect(safeRedirect);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-4 rounded-lg border border-border p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Sign in to PromptFlow</h1>
          <p className="text-sm text-muted-foreground">Use your Google account.</p>
        </div>
        {error === "AccessDenied" && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
            That account isn&apos;t on the allowlist.
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: safeRedirect });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
