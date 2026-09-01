import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "PromptFlow — A Better UI for Langfuse Prompt Management",
  description:
    "Tag-first organization, integrated playground, and authoring UI for Langfuse prompts. Web app, CLI, and MCP server. Open core.",
  openGraph: {
    title: "PromptFlow — A Better UI for Langfuse Prompt Management",
    description:
      "Tag-first organization, integrated playground, and authoring UI for Langfuse prompts. Web app, CLI, and MCP server. Open core.",
    type: "website",
  },
};

export default function MarketingPage() {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
          <Link href="/" className="font-semibold tracking-tight text-base">
            PromptFlow
          </Link>
          <nav className="flex items-center gap-3">
            <a
              href="https://github.com/MartinW/promptflow"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              GitHub
            </a>
            <Link href="/prompts" className={cn(buttonVariants({ size: "sm" }))}>
              Open app
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-background to-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
          <div className="text-center space-y-6">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
              A Better UI for Langfuse
              <br />
              Prompt Management
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Tag-first organization, integrated playground, and authoring UI for your Langfuse
              prompts. Open core, self-hosted.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link href="/prompts" className={cn(buttonVariants({ size: "lg" }))}>
                Open app
              </Link>
              <a
                href="https://github.com/MartinW/promptflow"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <p className="text-lg md:text-xl text-foreground font-medium">
              Langfuse is the storage layer. PromptFlow is the editor.
            </p>
            <p className="text-base text-muted-foreground">
              Built for teams who need a better authoring experience without leaving the Langfuse
              ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                Why PromptFlow?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Langfuse is powerful, but its default prompt UI wasn't built for rapid authoring.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Pain: No Tag Navigation</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Langfuse prompts support tags, but there's no built-in filtering or
                    tag-first organization. Finding prompts by purpose or consumer app is manual.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pain: No Integrated Playground</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Testing prompt changes means copying templates into a separate tool or writing
                    code. No live preview with token counts and streaming.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                What You Get
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Authoring UI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    Compose editor with optional System Prompt and User Context fields. Inline
                    diff viewer for version comparisons. Drafts by default — explicit "Promote to
                    production" control.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Integrated Playground</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    Stream responses via OpenRouter or Vercel AI Gateway. Live token counts, cost
                    estimation, and latency. Provider-grouped model picker. Test before you save.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tag-First Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>
                    Filter prompts by purpose (voice:*, image:*, eval:*), consumer app (app:*), or
                    locale (lang:*). Tag conventions documented in @promptflow/core.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                One Registry, Multiple Consumers
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                PromptFlow is more than a web app — it's an ecosystem for managing prompts across
                platforms.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Web</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Next.js authoring UI with integrated playground. The primary interface for
                    prompt management.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>CLI</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    @promptflow/cli — list, get, pull, push, run, and diff prompts from the
                    terminal. Author prompts as JSON files.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>MCP Server</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Register with Claude Desktop or Cursor. Your Langfuse prompts become MCP
                    Prompts and tools.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Cadence iOS</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Reads voice:* tagged prompts aloud via OpenRouter. Remote prompt management —
                    edit in the web UI, see changes on launch.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Use with Agents / MCP */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                Use with AI Agents
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Your Langfuse prompts become first-class MCP Prompts that host LLMs can invoke by
                name.
              </p>
            </div>
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                <h3 className="font-semibold text-lg">MCP Server</h3>
                <p className="text-sm text-muted-foreground">
                  Register <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">@promptflow/mcp-server</code> with
                  Claude Desktop, Cursor, or other MCP clients. Your prompts become invocable
                  with version pinning, auto-discovered arguments, and built-in search tools.
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-2">Claude Desktop</div>
                    <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto">
{`{
  "mcpServers": {
    "promptflow": {
      "command": "npx",
      "args": ["-y", "@promptflow/mcp-server"],
      "env": {
        "LANGFUSE_PUBLIC_KEY": "pk-lf-...",
        "LANGFUSE_SECRET_KEY": "sk-lf-...",
        "LANGFUSE_HOST": "https://cloud.langfuse.com"
      }
    }
  }
}`}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      Config path: <code className="px-1 py-0.5 rounded bg-muted font-mono">~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS)
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Cursor</div>
                    <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto">
{`{
  "mcpServers": {
    "promptflow": {
      "command": "npx",
      "args": ["-y", "@promptflow/mcp-server"],
      "env": {
        "LANGFUSE_PUBLIC_KEY": "pk-lf-...",
        "LANGFUSE_SECRET_KEY": "sk-lf-..."
      }
    }
  }
}`}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      Config path: <code className="px-1 py-0.5 rounded bg-muted font-mono">~/.cursor/mcp.json</code>
                    </p>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 text-sm">
                  <strong className="text-amber-600 dark:text-amber-400">Status:</strong> Built
                  and tested locally; not yet published to npm. Until published, clone the repo,
                  run{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    bun install && bunx turbo run build --filter=mcp-server
                  </code>
                  , and point your config at{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    /absolute/path/to/promptflow/apps/mcp-server/dist/index.js
                  </code>
                  .
                </div>
                <div className="flex gap-3">
                  <a
                    href="https://github.com/MartinW/promptflow/tree/main/apps/mcp-server"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "text-xs",
                    )}
                  >
                    MCP Server README
                  </a>
                  <a
                    href="/llms.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <span>/llms.txt</span>
                  </a>
                  <a
                    href="/.well-known/mcp/server-card.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <span>MCP server card</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tag Conventions */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                Tag Conventions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                PromptFlow layers conventions on Langfuse's plain-string tags. Consumers filter
                by namespace.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="py-3 px-4 font-medium">Namespace</th>
                    <th className="py-3 px-4 font-medium">Purpose</th>
                    <th className="py-3 px-4 font-medium">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">voice:</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      TTS-optimized templates
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      voice:greeting
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">image:</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      Image-generation templates
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      image:product-shot
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">eval:</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      LLM-as-judge templates
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      eval:helpfulness
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">app:</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      Scope to a consumer app
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      app:cadence:greeting
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">lang:</td>
                    <td className="py-3 px-4 text-muted-foreground">Locale</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      lang:en-GB
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Open Core */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="text-center space-y-4">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
              Open Core
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Root monorepo and @promptflow/* packages are MIT. Enterprise packages (ee/) use
              Business Source License 1.1, converting to Apache 2.0 after 4 years.
            </p>
            <p className="text-sm text-muted-foreground">
              Mirrors the{" "}
              <a
                href="https://langfuse.com/license"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Langfuse open-core model
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="text-center space-y-6">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
              Get Started
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Self-hosted and open source. Bring your own Langfuse and OpenRouter keys.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link href="/prompts" className={cn(buttonVariants({ size: "lg" }))}>
                Open app
              </Link>
              <a
                href="https://github.com/MartinW/promptflow"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              Built by{" "}
              <a
                href="https://github.com/MartinW"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Martin Wright
              </a>
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/MartinW/promptflow"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://github.com/MartinW/promptflow/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                License
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
