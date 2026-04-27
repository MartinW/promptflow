# PromptFlow

A better UI for [Langfuse](https://langfuse.com) prompt management. Open core.

PromptFlow is a frontend for the prompt-management half of Langfuse, with the UX bent toward authoring and iteration: tag-first organisation, a Cmd-K palette, inline diffs, an integrated playground (AIPlay), and — coming in the Pro tier — eval datasets, LLM-as-judge, A/B testing with statistical significance.

Langfuse is the storage layer; PromptFlow is the editor for it. The same prompts get consumed by separate iOS apps (different repos) to demonstrate remote prompt management for production apps.

> 🚧 In active development. Web app + CLI + MCP server are live; Pro tier (auth, evals, A/B) and iOS apps coming.

## Ecosystem

Three published surfaces, one prompt registry:

- **Web** — `apps/web`, deployed at [promptflow-five.vercel.app](https://promptflow-five.vercel.app).
- **CLI** — [`@promptflow/cli`](apps/cli) — `npx @promptflow/cli prompts list`. Manage prompts from the terminal.
- **MCP server** — [`@promptflow/mcp-server`](apps/mcp-server) — register with Claude Desktop / Claude Code / Cursor, your prompts become invocable MCP Prompts.

## Architecture

```
   ┌─────────────────────────────────────────────────────────────┐
   │  apps/web (Next.js 16, React 19, Tailwind 4, shadcn)        │
   │  ─ /prompts             list + tag filter + Cmd-K palette   │
   │  ─ /prompts/new         create (server action)              │
   │  ─ /prompts/[name]      detail + version history + diff     │
   │  ─ /prompts/[name]/edit new-version form                    │
   │  ─ /prompts/[name]/play AIPlay: streaming SSE through       │
   │                         OpenRouter, all models, live cost   │
   └──────────────────────┬──────────────────────────────────────┘
                          │ uses
   ┌──────────────────────▼──────────────────────────────────────┐
   │  packages/core (MIT — shared logic, 45 tests)               │
   │  ─ createClient()       typed Langfuse wrapper              │
   │  ─ Tag namespace        voice / image / eval / app / ...    │
   │  ─ validatePromptTemplate, validateSSML, renderPrompt       │
   │  ─ PromptFlowError      kind: auth/not_found/network/...    │
   └──────────────────────┬──────────────────────────────────────┘
                          │ talks to
                ┌─────────▼──────────┬──────────────┐
                │   Langfuse API     │  OpenRouter  │
                │   (BYO keys)       │  (BYO key)   │
                └────────────────────┴──────────────┘
```

## Quickstart

Requires [bun](https://bun.com) ≥ 1.1 and Node ≥ 20.

```bash
git clone https://github.com/MartinW/promptflow.git
cd promptflow
bun install
cp apps/web/.env.example apps/web/.env.local
# fill in your Langfuse + OpenRouter keys
bun run dev
# → http://localhost:3000
```

## Configuration

Both Langfuse and OpenRouter are bring-your-own-keys. Set in `apps/web/.env.local`:

| Variable | Required | Purpose |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | yes | Langfuse project public key |
| `LANGFUSE_SECRET_KEY` | yes | Langfuse project secret key (write access) |
| `LANGFUSE_HOST` | no | Defaults to `https://cloud.langfuse.com` |
| `OPENROUTER_API_KEY` | optional | Required for AIPlay streaming |

If any keys are missing, the app renders graceful "not configured" states instead of crashing.

## Features

**Web** (`apps/web`)
- Prompt list with tag filtering, search, version sidebar, inline diff, Cmd-K palette
- Compose editor with optional System Prompt + User Context fields; saves text-vs-chat type automatically
- AIPlay playground — OpenRouter SSE streaming, live token/cost/latency, provider-grouped model picker
- Drafts by default — explicit "Promote to production" checkbox

**CLI** (`@promptflow/cli`)
- `prompts list / get / pull / push / run / diff` and `auth` for credential management
- Streams `prompts run` output through OpenRouter
- Round-trip JSON pull → edit → push to author prompts as files

**MCP server** (`@promptflow/mcp-server`)
- Langfuse prompts mapped to MCP **Prompts** so host LLMs can invoke them by name
- 6 tools: `list_prompts`, `search_prompts`, `get_prompt_metadata`, `render_prompt`, `refresh_prompts`, `run_prompt`
- In-memory cache with stale-while-revalidate

**`@promptflow/core`** (private workspace package)
- Typed Langfuse client wrapper, tag namespace utilities, template validation + variable substitution
- 45 Vitest unit tests

## Roadmap

**Week 2 — Pro tier + ecosystem**

- [ ] Auth + multi-tenancy (`ee/` directory under BSL 1.1)
- [ ] Eval datasets, eval runs, LLM-as-judge — *needs a dedicated design pass before implementation*
- [ ] A/B comparison with paired t-test + bootstrap CIs
- [x] CLI (`@promptflow/cli` on npm)
- [x] MCP server exposing Langfuse prompts as MCP Prompts (Claude Desktop / Code / Cursor compatible)
- [ ] OpenTelemetry instrumentation + Grafana dashboard

**Week 3 — Mobile + portfolio**

- [ ] Voice iOS app (separate repo) — `voice:*` tagged prompts → ElevenLabs TTS
- [ ] Image iOS app (separate repo) — `image:*` tagged prompts → Gemini 2.5 Flash Image
- [ ] Portfolio page tying everything together

## Tag conventions

PromptFlow layers conventions on Langfuse's plain-string tags. Encoded as constants in `@promptflow/core`:

| Namespace | Purpose | Example |
|---|---|---|
| `voice:` | TTS-optimised templates | `voice:greeting` |
| `image:` | Image-generation templates | `image:product-shot` |
| `eval:` | LLM-as-judge templates | `eval:helpfulness` |
| `app:` | Scope to a consumer app | `app:cadence:greeting` |
| `lang:` | Locale | `lang:en-GB` |
| `env:` | Deployment scope | `env:prod`, `env:staging` |

Tags compose: a single prompt may carry several namespaced tags, and consumers filter by AND.

## License

- Root: MIT (`LICENSE`).
- `ee/` directory and `@promptflow/ee-*` packages: Business Source License 1.1, converting to Apache 2.0 after 4 years. Source-available — read freely, can't be used commercially without a licence.

This mirrors the [Langfuse open-core model](https://langfuse.com/license).

## Contributing

This is currently a one-person interview portfolio sprint. Contributions welcome after week 3 when the codebase stabilises. In the meantime, issues with bug reports, suggestions, or just kind words are appreciated.

---

Built by [Martin Wright](https://github.com/MartinW).
