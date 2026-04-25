"use client";

import { extractVariables, validatePromptTemplate } from "@promptflow/core";
import { useId, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface PromptEditorProps {
  name: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Textarea-based editor with live variable detection.
 *
 * Picks the right balance for v1: monospace, generous height, instant
 * variable list updates on every keystroke. Monaco upgrade can come later
 * once we know which features (syntax highlighting, multi-cursor) actually
 * matter in real authoring workflows.
 */
export function PromptEditor({
  name,
  value,
  onChange,
  rows = 14,
  placeholder = "Write your prompt. Use {{variable}} for substitutions.",
  disabled,
}: PromptEditorProps) {
  const editorId = useId();
  const { variables, issues } = useMemo(() => validatePromptTemplate(value), [value]);

  return (
    <div className="space-y-3">
      <label htmlFor={editorId} className="block">
        <textarea
          id={editorId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          className="block w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        />
      </label>

      <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
        <VariablesPanel variables={variables} />
        <IssuesPanel issues={issues} />
        <CharCount value={value} />
      </div>
    </div>
  );
}

function VariablesPanel({ variables }: { variables: string[] }) {
  if (variables.length === 0) {
    return (
      <p className="text-muted-foreground">
        No variables detected. Use <code className="font-mono">{"{{name}}"}</code> for
        substitutions.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground uppercase tracking-wide">Variables</span>
      {variables.map((v) => (
        <Badge key={v} variant="secondary" className="font-mono">
          {`{{${v}}}`}
        </Badge>
      ))}
    </div>
  );
}

function IssuesPanel({ issues }: { issues: ReturnType<typeof validatePromptTemplate>["issues"] }) {
  if (issues.length === 0) return null;
  return (
    <Card className="px-3 py-2 border-amber-500/30 bg-amber-500/5 max-w-md">
      <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">
        {issues.length} {issues.length === 1 ? "issue" : "issues"}
      </p>
      <ul className="space-y-0.5 text-amber-700/80 dark:text-amber-400/80">
        {issues.slice(0, 3).map((issue) => (
          <li key={`${issue.kind}-${issue.start}`}>· {issue.message}</li>
        ))}
        {issues.length > 3 ? <li>· …and {issues.length - 3} more</li> : null}
      </ul>
    </Card>
  );
}

function CharCount({ value }: { value: string }) {
  return (
    <span className="text-muted-foreground tabular-nums">
      {value.length} chars · {extractVariables(value).length} vars
    </span>
  );
}
