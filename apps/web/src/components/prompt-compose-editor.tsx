"use client";

import { parseReferenceDetails, type PromptReference, validatePromptTemplate } from "@promptflow/core";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { HighlightedTextarea } from "@/components/highlighted-textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { aggregateVariables, type ComposeShape } from "@/lib/prompt-shape";

export type ComposeField = "system" | "userContext" | "main";

export interface ComposeSelection {
  field: ComposeField;
  start: number;
  end: number;
  text: string;
}

interface Props {
  value: ComposeShape;
  onChange: (next: ComposeShape) => void;
  disabled?: boolean;
  /** When true (edit mode), force any field that already has content to be visible. */
  forceShowFilled?: boolean;
  /** Fired when the user makes (or clears) a non-empty selection in one of the textareas. */
  onSelectionChange?: (selection: ComposeSelection | null) => void;
}

const STORAGE_KEY_SYSTEM = "promptflow.compose.showSystem";
const STORAGE_KEY_CONTEXT = "promptflow.compose.showUserContext";

export function PromptComposeEditor({
  value,
  onChange,
  disabled,
  forceShowFilled,
  onSelectionChange,
}: Props) {
  const [showSystem, setShowSystem] = useState<boolean>(false);
  const [showUserContext, setShowUserContext] = useState<boolean>(false);

  // Load persisted preference on mount; force-show when fields already have
  // content (so the edit form never hides existing content from the user).
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only initialiser; later edits to value mustn't reopen panels.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const persistedSystem = window.localStorage.getItem(STORAGE_KEY_SYSTEM) === "true";
    const persistedContext = window.localStorage.getItem(STORAGE_KEY_CONTEXT) === "true";
    setShowSystem(persistedSystem || (!!forceShowFilled && value.system.length > 0));
    setShowUserContext(persistedContext || (!!forceShowFilled && value.userContext.length > 0));
  }, []);

  function toggleSystem() {
    const next = !showSystem;
    setShowSystem(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY_SYSTEM, String(next));
    }
    if (!next) onChange({ ...value, system: "" });
  }

  function toggleUserContext() {
    const next = !showUserContext;
    setShowUserContext(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY_CONTEXT, String(next));
    }
    if (!next) onChange({ ...value, userContext: "" });
  }

  const variables = useMemo(() => aggregateVariables(value), [value]);
  const references = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ ref: PromptReference; fields: Array<"system" | "userContext" | "main"> }> = [];
    function consume(field: "system" | "userContext" | "main", text: string) {
      for (const ref of parseReferenceDetails(text)) {
        const existing = out.find((o) => o.ref.name === ref.name);
        if (existing) {
          if (!existing.fields.includes(field)) existing.fields.push(field);
          continue;
        }
        if (seen.has(ref.name)) continue;
        seen.add(ref.name);
        out.push({ ref, fields: [field] });
      }
    }
    consume("system", value.system);
    consume("userContext", value.userContext);
    consume("main", value.main);
    return out;
  }, [value]);
  const issues = useMemo(() => {
    const all = [
      ...validatePromptTemplate(value.system).issues.map((i) => ({
        ...i,
        field: "System" as const,
      })),
      ...validatePromptTemplate(value.userContext).issues.map((i) => ({
        ...i,
        field: "User context" as const,
      })),
      ...validatePromptTemplate(value.main).issues.map((i) => ({ ...i, field: "Prompt" as const })),
    ];
    return all;
  }, [value]);

  const willSaveAsChat = value.system.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <ToggleLink
          shown={showSystem}
          onClick={toggleSystem}
          shownLabel="Hide System Prompt"
          hiddenLabel="Show System Prompt"
          disabled={disabled}
        />
        <ToggleLink
          shown={showUserContext}
          onClick={toggleUserContext}
          shownLabel="Hide User Context"
          hiddenLabel="Show User Context"
          disabled={disabled}
        />
        <span className="ml-auto text-muted-foreground">
          will save as <span className="font-medium">{willSaveAsChat ? "chat" : "text"}</span>
        </span>
      </div>

      {showSystem ? (
        <ComposeField
          label="System prompt"
          hint="Sets the assistant's instructions, persona, or guardrails."
          placeholder="You are a helpful assistant."
          value={value.system}
          onChange={(next) => onChange({ ...value, system: next })}
          onSelect={(start, end, text) =>
            onSelectionChange?.(text ? { field: "system", start, end, text } : null)
          }
          disabled={disabled}
          rows={6}
        />
      ) : null}

      {showUserContext ? (
        <ComposeField
          label="User context"
          hint="Default value for {{user_context}} — runtime callers can override."
          placeholder="Today's date: 2026-04-27. User tier: pro."
          value={value.userContext}
          onChange={(next) => onChange({ ...value, userContext: next })}
          onSelect={(start, end, text) =>
            onSelectionChange?.(text ? { field: "userContext", start, end, text } : null)
          }
          disabled={disabled}
          rows={4}
        />
      ) : null}

      <ComposeField
        label="Prompt"
        hint="Use {{variable}} for substitutions."
        placeholder="Help the user with: {{query}}"
        value={value.main}
        onChange={(next) => onChange({ ...value, main: next })}
        onSelect={(start, end, text) =>
          onSelectionChange?.(text ? { field: "main", start, end, text } : null)
        }
        disabled={disabled}
        rows={10}
      />

      <ReferencesPanel references={references} />
      <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
        <VariablesPanel variables={variables} />
        <IssuesPanel issues={issues} />
      </div>
    </div>
  );
}

function ToggleLink({
  shown,
  onClick,
  shownLabel,
  hiddenLabel,
  disabled,
}: {
  shown: boolean;
  onClick: () => void;
  shownLabel: string;
  hiddenLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      {shown ? `− ${shownLabel}` : `+ ${hiddenLabel}`}
    </button>
  );
}

function ComposeField({
  label,
  hint,
  placeholder,
  value,
  onChange,
  onSelect,
  disabled,
  rows = 8,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  onSelect?: (start: number, end: number, text: string) => void;
  disabled?: boolean;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <HighlightedTextarea
        id={id}
        value={value}
        onChange={onChange}
        onSelect={onSelect}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
      />
    </div>
  );
}

function VariablesPanel({ variables }: { variables: string[] }) {
  if (variables.length === 0) {
    return (
      <p className="text-muted-foreground">
        No variables. Use <code className="font-mono">{"{{name}}"}</code> for substitutions.
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

function ReferencesPanel({
  references,
}: {
  references: Array<{ ref: PromptReference; fields: Array<"system" | "userContext" | "main"> }>;
}) {
  if (references.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase tracking-wide">References</span>
      {references.map(({ ref, fields }) => {
        const pin =
          ref.version !== undefined ? `v${ref.version}` : ref.label ?? "latest";
        const fieldLabel = fields.map((f) => fieldDisplayName(f)).join(", ");
        return (
          <Link
            key={ref.name}
            href={`/prompts/${encodeURIComponent(ref.name)}`}
            className="inline-flex items-center gap-1 rounded-md border bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] text-emerald-700 ring-1 ring-emerald-500/40 hover:bg-emerald-500/25 dark:text-emerald-300"
            title={`Open ${ref.name} (${pin}) · in ${fieldLabel}`}
          >
            @{ref.name}
            <span className="opacity-70">{pin}</span>
          </Link>
        );
      })}
    </div>
  );
}

function fieldDisplayName(field: "system" | "userContext" | "main"): string {
  switch (field) {
    case "system":
      return "System";
    case "userContext":
      return "User context";
    case "main":
      return "Prompt";
  }
}

function IssuesPanel({
  issues,
}: {
  issues: { kind: string; message: string; field: string; start: number; end: number }[];
}) {
  if (issues.length === 0) return null;
  return (
    <Card className="px-3 py-2 border-amber-500/30 bg-amber-500/5 max-w-md">
      <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">
        {issues.length} {issues.length === 1 ? "issue" : "issues"}
      </p>
      <ul className="space-y-0.5 text-amber-700/80 dark:text-amber-400/80">
        {issues.slice(0, 4).map((issue) => (
          <li key={`${issue.field}-${issue.start}-${issue.kind}`}>
            · <span className="font-medium">{issue.field}:</span> {issue.message}
          </li>
        ))}
        {issues.length > 4 ? <li>· …and {issues.length - 4} more</li> : null}
      </ul>
    </Card>
  );
}
