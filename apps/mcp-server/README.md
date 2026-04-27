# @promptflow/mcp-server

[Model Context Protocol](https://modelcontextprotocol.io) server that exposes your [Langfuse](https://langfuse.com) prompts to MCP-aware clients (Claude Desktop, Claude Code, Cursor, Cline, etc.).

Authored prompts in [PromptFlow](https://github.com/MartinW/promptflow) become first-class MCP **Prompts** the host LLM can invoke by name.

> **Status:** built and tested locally against Claude Code; not yet published to npm. Until publishing, point your MCP client at the locally-built bundle (`/absolute/path/to/promptflow/apps/mcp-server/dist/index.js`) instead of `npx`.

## Install + register

You don't usually install this directly — register it with your MCP client and let `npx` pull it on demand.

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```jsonc
{
  "mcpServers": {
    "promptflow": {
      "command": "npx",
      "args": ["-y", "@promptflow/mcp-server"],
      "env": {
        "LANGFUSE_PUBLIC_KEY": "pk-lf-...",
        "LANGFUSE_SECRET_KEY": "sk-lf-...",
        "LANGFUSE_HOST": "https://cloud.langfuse.com",

        "// optional —": "narrow which prompts the LLM sees",
        "PROMPTFLOW_TAG_FILTER": "env:prod",

        "// optional —": "enables the run_prompt tool",
        "OPENROUTER_API_KEY": "sk-or-..."
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add promptflow npx -y @promptflow/mcp-server \
  -e LANGFUSE_PUBLIC_KEY=pk-lf-... \
  -e LANGFUSE_SECRET_KEY=sk-lf-... \
  -e LANGFUSE_HOST=https://cloud.langfuse.com
```

While the package is unpublished, replace the `npx` invocation with the locally-built bundle:

```bash
# In the promptflow checkout:
bun install
bunx turbo run build --filter=mcp-server

# Then register:
claude mcp add promptflow node /absolute/path/to/promptflow/apps/mcp-server/dist/index.js \
  -e LANGFUSE_PUBLIC_KEY=pk-lf-... \
  -e LANGFUSE_SECRET_KEY=sk-lf-...
```

### Cursor

`~/.cursor/mcp.json` — same shape as Claude Desktop, under `mcpServers`.

## What the server exposes

### MCP Prompts (the headline)

Every Langfuse prompt the server can see becomes an invocable MCP Prompt with auto-discovered arguments. In the host LLM, you can say "use the support-reply prompt" and it gets pulled in. Two name variants are supported:

- `support-reply` — resolves to the configured default label (`latest` unless overridden).
- `support-reply@v3` — pin to a specific version.
- `support-reply#staging` — pin to a specific label.

`config.defaults` from PromptFlow's compose editor pre-populates variables; caller-supplied arguments override.

### Tools

| Tool | Purpose |
|---|---|
| `list_prompts` | List with optional `tag_filter` (comma-separated, AND semantics) |
| `search_prompts` | Fuzzy search by name / tags / labels |
| `get_prompt_metadata` | Inspect type, versions, labels, detected variables |
| `render_prompt` | Substitute variables, return messages without executing |
| `refresh_prompts` | Flush the cache |
| `run_prompt` | Execute via OpenRouter (registered only when `OPENROUTER_API_KEY` is set) |

## Configuration

| Var | Default | Purpose |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | — | Required |
| `LANGFUSE_SECRET_KEY` | — | Required |
| `LANGFUSE_HOST` | `https://cloud.langfuse.com` | Self-hosted Langfuse base URL |
| `PROMPTFLOW_TAG_FILTER` | — | AND filter that scopes which prompts the LLM sees |
| `PROMPTFLOW_LABEL` | `latest` | Default Langfuse label when no version specified |
| `PROMPTFLOW_CACHE_TTL_SECONDS` | `300` | In-memory cache TTL |
| `OPENROUTER_API_KEY` | — | Enables `run_prompt` |
| `PROMPTFLOW_LOG_LEVEL` | `warn` | `debug` / `info` / `warn` / `error`; logs go to stderr |

## License

MIT.
