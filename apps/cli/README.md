# @promptflow/cli

Command-line access to your [Langfuse](https://langfuse.com) prompts via [PromptFlow](https://github.com/MartinW/promptflow) conventions.

```bash
npx @promptflow/cli prompts list
```

> **Status:** built and tested locally; not yet published to npm. The `npx` invocation above is the intended install path; until publishing, use the [build-from-source](#build-from-source) instructions.

## Install

Either run on demand via `npx @promptflow/cli`, or install globally:

```bash
npm i -g @promptflow/cli
# or: bun add -g @promptflow/cli
promptflow --help
```

### Build from source

While the package is unpublished, build it from the monorepo:

```bash
git clone https://github.com/MartinW/promptflow.git
cd promptflow
bun install
bunx turbo run build --filter=cli
node apps/cli/dist/index.js --help
# Optional alias:
alias pf='node /absolute/path/to/promptflow/apps/cli/dist/index.js'
```

## Configure

Three options, in priority order:

1. **Env vars** — `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` (optional, defaults to `https://cloud.langfuse.com`), `OPENROUTER_API_KEY` (optional, only needed for `prompts run`).
2. **Per-machine config** — `~/.promptflow/config.json`, written by `promptflow auth`:
   ```bash
   promptflow auth \
     --public-key pk-lf-... \
     --secret-key sk-lf-... \
     --openrouter-key sk-or-...
   ```
   Run `promptflow auth` with no args to print the saved config.
3. **A mix** — env vars override file values per-invocation, so you can keep your daily creds in the file and shadow them temporarily with `LANGFUSE_HOST=staging.example.com promptflow prompts list`.

## Commands

```bash
promptflow prompts list [--tag voice,env:prod] [--limit 50] [--json]
promptflow prompts get <name> [-v 3] [-l production] [--json]
promptflow prompts pull <name> [-o file.json]
promptflow prompts push <file> [--name override] [--commit "message"] [--promote]
promptflow prompts run <name> -m anthropic/claude-3.5-haiku --vars name=Alice tier=pro
promptflow prompts diff <name> <v1> <v2>
```

`pull` and `push` round-trip — pull a prompt to JSON, edit it, push it back as a new version.

`run` streams the response to stdout via OpenRouter and prints latency / token / cost summary to stderr at the end (so you can pipe the response cleanly).

## Tag conventions

Filters use AND semantics: `--tag voice,env:prod` returns prompts that carry **both** tags.

PromptFlow's tag namespaces:

| Namespace | Purpose |
|---|---|
| `voice:` | Authored for TTS — short sentences, no markdown |
| `image:` | Authored for image generation models |
| `eval:` | LLM-as-judge templates |
| `app:<name>:<feature>` | Scoped to a consumer app |
| `lang:<code>` | Locale modifier |
| `env:<environment>` | Deployment scope |

## License

MIT.
