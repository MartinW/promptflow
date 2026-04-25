# PromptFlow

A better UI for [Langfuse](https://langfuse.com) prompt management. Open core.

> 🚧 In active development. Day 1 of a 3-week sprint.

## What

PromptFlow is a frontend for Langfuse prompt management with a UX that matches the capability of the underlying platform. Tag-first organisation, command palette, inline diffs, an integrated playground (AIPlay), and — in the Pro tier — a real eval and A/B testing workflow with statistical significance.

Langfuse is the storage layer. PromptFlow is the editor for it. Two iOS apps (separate repos) consume the same prompts to demonstrate remote prompt management for production apps.

## Status

| Component | State |
|---|---|
| `apps/web` (Next.js 16, Tailwind 4, React 19) | scaffolded, Langfuse SDK wired, status panel rendering |
| `packages/core` | skeleton |
| `packages/ui` | skeleton |
| Pro tier (`ee/`) | not started |
| CLI | not started |
| MCP server | not started |

## Quickstart

```bash
bun install
cp apps/web/.env.example apps/web/.env.local
# fill in your Langfuse keys
bun run dev
# open http://localhost:3000
```

You'll see a status panel telling you what env vars are missing if any. Once you've pasted your `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`, it'll show your prompt count.

## Stack

- [Bun](https://bun.com) workspaces + [Turborepo](https://turborepo.com) for the monorepo
- [Next.js 16](https://nextjs.org), [React 19](https://react.dev), [Tailwind 4](https://tailwindcss.com)
- [Biome](https://biomejs.dev) for lint + format
- [Langfuse](https://langfuse.com) for prompt storage
- [OpenRouter](https://openrouter.ai) for all LLM inference

## License

Root: MIT (`LICENSE`).
`ee/` directory and `@promptflow/ee-*` packages: Business Source License 1.1, converting to Apache 2.0 after 4 years.

## Roadmap

See `PRD-v1.md` (TODO) for the full plan. Highlights:
- Day 1 ✅ — workspace + Next.js + Langfuse SDK
- Day 2 — `@promptflow/core` Langfuse wrapper + tag conventions
- Day 3 — prompt list + detail UI
- Day 4 — editor + version history
- Day 5–6 — AIPlay playground
- Day 7 — Day 1 of public deploy + real README
- Week 2 — Pro tier (auth, evals, A/B), CLI, MCP
- Week 3 — iOS apps (separate repos) + portfolio

---

Built by [Martin Wright](https://github.com/MartinW).
