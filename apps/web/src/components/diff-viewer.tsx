import { diffLines } from "diff";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  oldLabel: string;
  newLabel: string;
}

/**
 * Minimal diff viewer. Renders changed segments inline with add/remove
 * styling. Server-side rendered — `diff` runs at request time.
 */
export function DiffViewer({ oldText, newText, oldLabel, newLabel }: DiffViewerProps) {
  const parts = diffLines(oldText, newText);
  const noChange = parts.every((p) => !p.added && !p.removed);

  return (
    <div className="rounded-md border border-border overflow-hidden text-sm">
      <header className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b border-border bg-muted/40">
        <span>
          <span className="text-red-600/80 dark:text-red-400/80">− {oldLabel}</span>
          {"  "}
          <span className="text-emerald-600/80 dark:text-emerald-400/80">+ {newLabel}</span>
        </span>
        {noChange ? <span>identical</span> : null}
      </header>
      <pre className="font-mono leading-6 whitespace-pre-wrap">
        {parts.map((part, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: diff segments are positional
            key={i}
            className={
              part.added
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 block px-3"
                : part.removed
                  ? "bg-red-500/10 text-red-700 dark:text-red-300 block px-3 line-through decoration-red-500/40"
                  : "block px-3"
            }
          >
            {part.value}
          </span>
        ))}
      </pre>
    </div>
  );
}
