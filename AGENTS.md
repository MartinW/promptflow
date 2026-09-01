# AGENTS.md — Developer Guide for AI Agents

This document helps AI agents (and human developers) understand, develop, and extend PromptFlow.

## What is PromptFlow?

PromptFlow is an **open-core ecosystem for Langfuse prompt management**. It provides:

1. **Web app** (`apps/web`) — Next.js 16 authoring UI with integrated playground (self-hosted)
2. **CLI** (`apps/cli`) — Terminal-based prompt CRUD and execution
3. **MCP server** (`apps/mcp-server`) — Your Langfuse prompts as invocable MCP Prompts
4. **Core library** (`packages/core`) — Shared Langfuse client, tag utilities, validators (45 tests)
5. **Marketing site** (`site/`) — Static GitHub Pages site at https://martinw.github.io/promptflow/

**Positioning:** Langfuse is the storage layer; PromptFlow is the editor.

**Deployment model:**
- **Marketing/discovery:** Static GitHub Pages site (no runtime server)
- **Product app:** Self-hosted Next.js app (clone and run locally or deploy to Vercel/your infrastructure)

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.1
- Node ≥ 20
- Langfuse account with public + secret keys

### Setup
```bash
git clone https://github.com/MartinW/promptflow.git
cd promptflow
bun install

# Configure web app
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local — minimum: LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY
```

### Run locally
```bash
# Web app on http://localhost:3003
bun run dev

# CLI
bun run --filter cli dev prompts list

# MCP server (build first, then register with your MCP client)
bunx turbo run build --filter=mcp-server
# Point your MCP client at: /absolute/path/to/promptflow/apps/mcp-server/dist/index.js
```

## Architecture

```
promptflow/
├── site/             — Static marketing site for GitHub Pages
│   ├── index.html    — Marketing landing page
│   ├── style.css     — Design system CSS (based on app tokens)
│   ├── llms.txt      — AI agent discovery
│   ├── robots.txt    — Crawler permissions
│   └── .well-known/  — ai-catalog.json, mcp/server-card.json
│
├── apps/
│   ├── web/          — Next.js 16 App Router, Tailwind 4, shadcn-style components (SELF-HOSTED)
│   │   ├── src/app/
│   │   │   ├── api/           — API routes (Auth.js, playground streaming, prompts CRUD)
│   │   │   ├── prompts/       — Prompt management UI
│   │   │   ├── settings/      — Settings pages
│   │   │   └── page.tsx       — Root redirects to /prompts
│   │   ├── src/components/    — UI primitives (shadcn-style, Base UI)
│   │   ├── src/lib/           — Langfuse client, OpenRouter, utilities
│   │   └── src/proxy.ts       — Auth.js v5 middleware (optional Google sign-in)
│   │
│   ├── cli/          — Commander.js CLI with local credential store
│   ├── mcp-server/   — MCP SDK stdio server, in-memory cache (5min TTL)
│   └── docs/         — VitePress docs (minimal, mostly README-driven)
│
├── packages/
│   ├── core/         — Shared: Langfuse client, tag namespace utilities, validators (MIT)
│   └── ui/           — Shared React components (currently empty, planned)
│
└── ee/               — Enterprise packages (BSL 1.1 → Apache 2.0 after 4 years)
```

## Key Concepts

### Tag Conventions
PromptFlow layers **namespace conventions** on Langfuse's plain-string tags:

| Namespace | Purpose | Example |
|-----------|---------|---------|
| `voice:`  | TTS-optimized templates | `voice:greeting` |
| `image:`  | Image-generation templates | `image:product-shot` |
| `eval:`   | LLM-as-judge templates | `eval:helpfulness` |
| `app:`    | Scope to consumer app | `app:cadence:greeting` |
| `lang:`   | Locale | `lang:en-GB` |

**Filters are AND-combined:** `?tags=voice:greeting,lang:en` matches prompts with BOTH tags.

Defined in: `packages/core/src/tag-namespaces.ts`

### Route Groups (Web App)
The self-hosted web app (`apps/web`) uses a simple structure:
- Root `/` redirects to `/prompts` (primary app entry point)
- `/prompts/*` — Prompt management UI
- `/settings/*` — Settings pages
- All routes share the root layout with theme/font providers and AppHeader

### Auth Strategy
- **Default:** Open access (no sign-in)
- **Optional:** Google OAuth via Auth.js v5 (JWT, no database)
  - Enable by setting `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
  - Restrict with `AUTH_ALLOWED_EMAILS` and/or `AUTH_ALLOWED_EMAIL_DOMAINS`
- **Public paths when auth enabled:** `/sign-in`, `/api/auth`

Middleware: `apps/web/src/proxy.ts`

**Note:** The marketing site (GitHub Pages) is separate and always public.

### Playground Streaming
Two provider modes (env-selected):

1. **OpenRouter** (default if `OPENROUTER_API_KEY` set):
   - Direct OpenRouter API streaming
   - No telemetry to Langfuse

2. **Vercel AI SDK + AI Gateway** (if `AI_GATEWAY_API_KEY` set, takes priority):
   - Streams via Vercel AI SDK
   - Emits real-time traces to Langfuse via `@langfuse/otel` span processor
   - Same native ingest path OpenRouter uses

Playground route: `apps/web/src/app/api/playground/route.ts`

### MCP Server Capabilities
- **MCP Prompts:** Every Langfuse prompt becomes invocable by name
  - Versioning: `prompt-name@v3` or `prompt-name#staging`
  - Auto-discovered arguments from prompt variables
  - `config.defaults` from PromptFlow compose editor pre-populates variables

- **Tools:**
  - `list_prompts` — with optional `tag_filter` (AND semantics)
  - `search_prompts` — fuzzy search by name/tags/labels (Fuse.js)
  - `get_prompt_metadata` — inspect type, versions, labels, variables
  - `render_prompt` — substitute variables without executing
  - `refresh_prompts` — flush cache
  - `run_prompt` — execute via OpenRouter (requires `OPENROUTER_API_KEY`)

- **Cache:** In-memory with stale-while-revalidate (300s TTL default)

Entry: `apps/mcp-server/src/index.ts`

## Development Workflows

### Web App
```bash
bun run dev                      # Start dev server (localhost:3003)
bun run --filter web build       # Production build
bun run --filter web typecheck   # TypeScript check
bun run --filter web lint        # ESLint
```

### CLI
```bash
bun run --filter cli dev prompts list               # List prompts
bun run --filter cli dev prompts get my-prompt      # Fetch single prompt
bun run --filter cli dev prompts run my-prompt      # Execute via OpenRouter
bun run --filter cli dev prompts pull my-prompt     # Download as JSON
bun run --filter cli dev prompts push prompt.json   # Upload from JSON
bun run --filter cli dev prompts diff my-prompt@v2  # Diff two versions
```

Credentials stored in: `~/.promptflow/credentials.json`

### MCP Server
```bash
bunx turbo run build --filter=mcp-server  # Build to dist/
bun run --filter mcp-server test          # Run Vitest tests
```

**Register with Claude Desktop** (unpublished):
```bash
# After building, edit:
# ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
# ~/.config/Claude/claude_desktop_config.json (Linux)

{
  "mcpServers": {
    "promptflow": {
      "command": "node",
      "args": ["/absolute/path/to/promptflow/apps/mcp-server/dist/index.js"],
      "env": {
        "LANGFUSE_PUBLIC_KEY": "pk-lf-...",
        "LANGFUSE_SECRET_KEY": "sk-lf-..."
      }
    }
  }
}
```

**Once published to npm:**
```json
{
  "command": "npx",
  "args": ["-y", "@promptflow/mcp-server"]
}
```

### Core Library
```bash
bun run --filter core test       # Run 45 Vitest unit tests
bun run --filter core typecheck  # TypeScript check
```

### Monorepo Tasks
```bash
bun install                # Install all dependencies
bunx turbo run build       # Build all apps + packages
bunx turbo run test        # Run all tests
bunx turbo run typecheck   # TypeScript across workspace
```

## Design System (Web App)

Located in: `apps/web/src/app/globals.css`

### Theme Families (6)
- **Clean** (default) — Neutral grayscale
- **Midnight** — Blue/purple hues
- **Forest** — Green/teal tones
- **Sunset** — Orange/amber warmth
- **Lovely** — Pink/magenta with gradient accents
- **Quietly** — Low-chroma, subdued palette

Applied via class: `.theme-midnight`, `.theme-forest`, etc.

### Style Variants (5)
- **Clean** (default) — Balanced, modern
- **Brutalist** — Hard edges, no radius, no transitions, bold borders
- **Editorial** — Serif (Lora), generous spacing, subtle shadows
- **Terminal** — Monospace (JetBrains Mono), flat, no shadows
- **Lovely** — Rounded, gradient buttons, soft shadows
- **Quietly** — Calm, gentle easing, minimal contrast

Applied via class: `.style-brutalist`, `.style-editorial`, etc.

### Fonts
- **Geist Sans** (default body)
- **Geist Mono** (code)
- **Space Grotesk** (brutalist variant)
- **Lora** (editorial variant)
- **JetBrains Mono** (terminal variant)

All loaded via `next/font/google` in `apps/web/src/app/layout.tsx`.

## Testing Strategy

- **Web:** No automated tests yet (manual QA + TypeScript)
- **CLI:** Basic vitest stubs
- **MCP Server:** Unit tests for cache, search, tag filtering
- **Core:** 45 Vitest tests (tag namespaces, prompt shape validation, template rendering)

Run all: `bunx turbo run test`

## Deployment

### Web App
Standard Next.js deployment (Vercel, self-hosted Node, Docker, etc.).

**Required env vars:**
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`

**Optional:**
- `LANGFUSE_HOST` (default: `https://cloud.langfuse.com`)
- `OPENROUTER_API_KEY` or `AI_GATEWAY_API_KEY` (playground)
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (enable auth)

**Note:** When auth is enabled, ensure `/`, `/llms.txt`, `/robots.txt`, `/.well-known/*` remain public for agent discovery.

### CLI & MCP Server
Currently unpublished. Once published:

```bash
# CLI
npm install -g @promptflow/cli
promptflow prompts list

# MCP server
# Auto-installed by MCP clients via npx
```

## AI Agent Discovery

PromptFlow is **discoverable by AI agents** via standard conventions on the GitHub Pages marketing site:

- **`/llms.txt`** — Curated index (what/why/how/links) at https://martinw.github.io/promptflow/llms.txt
- **`/.well-known/ai-catalog.json`** — ARD-style catalog (specVersion 1.0)
- **`/.well-known/mcp/server-card.json`** — MCP server metadata card
- **`/robots.txt`** — Allows major AI crawlers (GPTBot, ClaudeBot, etc.)
- **`AGENTS.md`** (this file, in repo root) — Developer/agent guide

The marketing site is static HTML/CSS hosted on GitHub Pages. The self-hosted app is separate.

## Contributing

Issues, bug reports, and suggestions appreciated at: https://github.com/MartinW/promptflow/issues

For architecture questions or agent-related clarifications, consult this file or the READMEs in each package.

## License

- Root monorepo + `@promptflow/*` packages: **MIT**
- Enterprise packages (`ee/`): **Business Source License 1.1** → Apache 2.0 after 4 years

Mirrors the [Langfuse open-core model](https://langfuse.com/license).

---

Built by [Martin Wright](https://github.com/MartinW).
