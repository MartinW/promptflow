"use client";

import type { OccurrenceMatch } from "@/app/prompts/_actions/extract";
import { cn } from "@/lib/utils";

interface ExtractOccurrencesListProps {
  matches: OccurrenceMatch[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  /** The exact text being extracted — used to highlight inside each context preview. */
  snippet: string;
  disabled?: boolean;
}

/**
 * Renders the corpus scan results as opt-in checkboxes (off by default — the
 * user must explicitly tick each prompt they want rewritten). Each row shows
 * the prompt name, match count, and a short context excerpt with the snippet
 * highlighted so the user can sanity-check before committing.
 */
export function ExtractOccurrencesList({
  matches,
  selected,
  onToggle,
  snippet,
  disabled,
}: ExtractOccurrencesListProps) {
  if (matches.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No other prompts contain this snippet — extraction will only rewrite the source.
      </p>
    );
  }
  return (
    <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
      {matches.map((match) => {
        const isOn = selected.has(match.promptName);
        return (
          <li key={match.promptName}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-background",
                disabled && "cursor-default opacity-60",
              )}
            >
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => onToggle(match.promptName)}
                disabled={disabled}
                className="mt-0.5 size-3.5 accent-primary"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-mono">{match.promptName}</span>
                  <span className="text-muted-foreground">
                    {match.matchCount} {match.matchCount === 1 ? "match" : "matches"}
                  </span>
                </div>
                <SnippetContext context={match.sampleContext} snippet={snippet} />
              </div>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function SnippetContext({ context, snippet }: { context: string; snippet: string }) {
  const idx = context.indexOf(snippet);
  if (idx === -1) {
    return <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{context}</p>;
  }
  const before = context.slice(0, idx);
  const after = context.slice(idx + snippet.length);
  return (
    <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
      {before}
      <span className="rounded bg-yellow-200/60 px-0.5 text-foreground dark:bg-yellow-500/30">
        {snippet}
      </span>
      {after}
    </p>
  );
}
