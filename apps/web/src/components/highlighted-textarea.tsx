"use client";

import { parseTemplateTokens, type PromptReference } from "@promptflow/core";
import { useId, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

interface HighlightedTextareaProps {
  value: string;
  onChange: (next: string) => void;
  onSelect?: (start: number, end: number, text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  /**
   * Optional id used by an external label. Falls back to a generated id so
   * the textarea is still labellable from `htmlFor=`.
   */
  id?: string;
  className?: string;
}

/**
 * Plain `<textarea>` with a ghost overlay that highlights Langfuse reference
 * tags (`@@@langfusePrompt:...@@@`) and variables (`{{name}}`) where they
 * appear in the text.
 *
 * Technique:
 *   - A backdrop `<pre>` mirrors the textarea content with each token wrapped
 *     in a styled `<span>`.
 *   - The textarea sits on top with `color: transparent` and an explicit
 *     `caretColor` so the cursor stays visible and selection highlights work.
 *   - Both elements share identical typography + box-sizing so token spans
 *     align character-by-character with the (invisible) textarea text.
 *   - The textarea's scroll position is mirrored onto the backdrop via a
 *     `transform: translate(-scrollLeft, -scrollTop)` so overlong content
 *     stays aligned when the user scrolls.
 */
export function HighlightedTextarea({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  rows = 8,
  id: providedId,
  className,
}: HighlightedTextareaProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const backdropRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => parseTemplateTokens(value).tokens, [value]);

  function syncScroll(ta: HTMLTextAreaElement): void {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = ta.scrollTop;
      backdropRef.current.scrollLeft = ta.scrollLeft;
    }
  }

  // Tokenise the value into alternating plain and styled segments. Trailing
  // characters (after the last token) are appended as a plain segment.
  const segments: Array<{ kind: "plain" | "reference" | "variable"; text: string; reference?: PromptReference; name?: string }> = [];
  {
    let cursor = 0;
    for (const token of tokens) {
      if (token.start > cursor) {
        segments.push({ kind: "plain", text: value.slice(cursor, token.start) });
      }
      segments.push({
        kind: token.kind,
        text: value.slice(token.start, token.end),
        reference: token.reference,
        name: token.name,
      });
      cursor = token.end;
    }
    if (cursor < value.length) {
      segments.push({ kind: "plain", text: value.slice(cursor) });
    }
  }

  const TYPOGRAPHY = "font-mono text-sm leading-6";
  const PADDING = "px-3 py-2";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={backdropRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent",
          TYPOGRAPHY,
          PADDING,
        )}
      >
        <pre className="m-0 whitespace-pre-wrap break-words">
          {segments.map((seg, i) => {
            if (seg.kind === "reference") {
              const pin =
                seg.reference?.version !== undefined
                  ? `v${seg.reference.version}`
                  : seg.reference?.label ?? "latest";
              return (
                <span
                  key={`${i}-ref`}
                  className="rounded-sm bg-emerald-500/20 ring-1 ring-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  title={`Reference → ${seg.name} (${pin})`}
                >
                  {seg.text}
                </span>
              );
            }
            if (seg.kind === "variable") {
              return (
                <span
                  key={`${i}-var`}
                  className="rounded-sm bg-blue-500/15 text-blue-700 dark:text-blue-300"
                  title={`Variable {{${seg.name}}}`}
                >
                  {seg.text}
                </span>
              );
            }
            return <span key={`${i}-p`}>{seg.text}</span>;
          })}
          {/* Trailing newline ensures the backdrop's height matches the textarea
              when the value ends in a newline (otherwise the final blank line is
              clipped). */}
          {"\n"}
        </pre>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => syncScroll(e.currentTarget)}
        onSelect={(e) => {
          const target = e.target as HTMLTextAreaElement;
          const start = target.selectionStart;
          const end = target.selectionEnd;
          if (onSelect) {
            const text = start !== end ? target.value.slice(start, end) : "";
            onSelect(start, end, text);
          }
        }}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        className={cn(
          "relative block w-full resize-y rounded-md border border-input bg-transparent text-transparent caret-foreground outline-none ring-offset-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          TYPOGRAPHY,
          PADDING,
        )}
      />
    </div>
  );
}
