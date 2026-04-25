/**
 * Error types thrown by `@promptflow/core`.
 *
 * Wrapping Langfuse SDK errors lets callers handle them by category instead
 * of pattern-matching on error messages or HTTP status codes.
 */

export type PromptFlowErrorKind =
  | "auth"
  | "not_found"
  | "network"
  | "rate_limit"
  | "validation"
  | "unknown";

export class PromptFlowError extends Error {
  readonly kind: PromptFlowErrorKind;
  readonly cause?: unknown;
  readonly status?: number;

  constructor(
    kind: PromptFlowErrorKind,
    message: string,
    options: { cause?: unknown; status?: number } = {},
  ) {
    super(message);
    this.name = "PromptFlowError";
    this.kind = kind;
    this.cause = options.cause;
    this.status = options.status;
  }
}

/**
 * Map a thrown SDK or fetch error to a `PromptFlowError`.
 *
 * Best-effort: inspects status codes and common error shapes. Anything we
 * can't classify becomes `kind: "unknown"` with the original cause attached.
 */
export function wrapError(err: unknown): PromptFlowError {
  if (err instanceof PromptFlowError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const status = extractStatus(err);

  if (status === 401 || status === 403) {
    return new PromptFlowError("auth", "Langfuse rejected the credentials", {
      cause: err,
      status,
    });
  }
  if (status === 404) {
    return new PromptFlowError("not_found", "Prompt not found", {
      cause: err,
      status,
    });
  }
  if (status === 429) {
    return new PromptFlowError("rate_limit", "Langfuse rate limit exceeded", {
      cause: err,
      status,
    });
  }
  if (status && status >= 500) {
    return new PromptFlowError("network", `Langfuse upstream error (${status})`, {
      cause: err,
      status,
    });
  }
  if (isNetworkError(err)) {
    return new PromptFlowError("network", message, { cause: err });
  }
  return new PromptFlowError("unknown", message, { cause: err, status });
}

function extractStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const candidate = (err as { status?: unknown }).status;
  return typeof candidate === "number" ? candidate : undefined;
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(err.message);
}
