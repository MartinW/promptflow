import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@promptflow/core";
import { PromptCache } from "./cache";
import { loadConfig } from "./config";
import { registerPromptHandlers } from "./handlers/prompts";
import { registerToolHandlers } from "./handlers/tools";
import { makeLogger } from "./logger";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = makeLogger(config);

  const client = createClient({
    publicKey: config.langfusePublicKey,
    secretKey: config.langfuseSecretKey,
    host: config.langfuseHost,
  });
  const cache = new PromptCache(
    client,
    config.cacheTtlSec * 1000,
    config.tagFilter,
    config.defaultLabel,
    logger,
  );

  const server = new Server(
    { name: "promptflow", version: "0.0.1" },
    {
      capabilities: {
        prompts: {},
        tools: {},
      },
    },
  );

  registerPromptHandlers(server, cache, logger);
  registerToolHandlers(server, cache, config, logger);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(
    "ready",
    `host=${config.langfuseHost}`,
    `tagFilter=${config.tagFilter ?? "—"}`,
    `runPrompt=${config.openrouterApiKey ? "enabled" : "disabled"}`,
  );

  // Keep process alive; transport handles stdin/stdout. Clean shutdown on
  // SIGINT/SIGTERM so `npx`-style invocations exit predictably.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      logger.info(`received ${signal}, closing`);
      server.close().finally(() => process.exit(0));
    });
  }
}

main().catch((err: unknown) => {
  process.stderr.write(
    `promptflow-mcp fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
