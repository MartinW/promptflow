import { parseTemplateTokens } from "@promptflow/core";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HighlightedBodyProps {
  body: string;
  className?: string;
}

/**
 * Read-only sibling of `HighlightedTextarea`. Renders a saved prompt body
 * with `@@@langfusePrompt:...@@@` tags shown as clickable reference chips
 * and `{{variable}}` tokens tinted, while preserving all whitespace.
 *
 * Used on the detail page where the body isn't editable but the references
 * still need to be visible — otherwise saved prompts read as a wall of raw
 * `@@@` tag noise.
 */
export function HighlightedBody({ body, className }: HighlightedBodyProps) {
  const { tokens } = parseTemplateTokens(body);

  const segments: React.ReactNode[] = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.start > cursor) {
      segments.push(body.slice(cursor, token.start));
    }
    if (token.kind === "reference" && token.reference) {
      const pin =
        token.reference.version !== undefined
          ? `v${token.reference.version}`
          : token.reference.label ?? "latest";
      segments.push(
        <Link
          key={`r-${token.start}`}
          href={`/prompts/${encodeURIComponent(token.reference.name)}`}
          title={`Open ${token.reference.name} (${pin})`}
          className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/20 px-1 py-0.5 align-baseline font-mono text-[0.85em] text-emerald-700 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30 dark:text-emerald-300"
        >
          <span>@{token.reference.name}</span>
          <span className="opacity-70">{pin}</span>
        </Link>,
      );
    } else if (token.kind === "variable") {
      segments.push(
        <span
          key={`v-${token.start}`}
          className="rounded-sm bg-blue-500/15 text-blue-700 dark:text-blue-300"
          title={`Variable {{${token.name}}}`}
        >
          {body.slice(token.start, token.end)}
        </span>,
      );
    }
    cursor = token.end;
  }
  if (cursor < body.length) {
    segments.push(body.slice(cursor));
  }

  return (
    <pre
      className={cn(
        "whitespace-pre-wrap break-words font-mono text-sm leading-6",
        className,
      )}
    >
      {segments}
    </pre>
  );
}
