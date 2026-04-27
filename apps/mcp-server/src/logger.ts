import type { ServerConfig } from "./config";

const ORDER = { debug: 10, info: 20, warn: 30, error: 40 } as const;

/**
 * Stderr-only logger.
 *
 * stdio transport uses stdout for protocol traffic, so application logs MUST
 * go to stderr. This logger keeps that invariant and applies the configured
 * level threshold.
 */
export function makeLogger(config: ServerConfig) {
  const threshold = ORDER[config.logLevel];
  function write(level: keyof typeof ORDER, args: unknown[]) {
    if (ORDER[level] < threshold) return;
    const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    process.stderr.write(`[promptflow-mcp][${level}] ${line}\n`);
  }
  return {
    debug: (...args: unknown[]) => write("debug", args),
    info: (...args: unknown[]) => write("info", args),
    warn: (...args: unknown[]) => write("warn", args),
    error: (...args: unknown[]) => write("error", args),
  };
}

export type Logger = ReturnType<typeof makeLogger>;
