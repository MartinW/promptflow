"use client";

import { validatePromptTemplate } from "@promptflow/core";
import { useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { aggregateVariables, type ComposeShape } from "@/lib/prompt-shape";

interface Props {
  value: ComposeShape;
  onChange: (next: ComposeShape) => void;
  disabled?: boolean;
  /** When true (edit mode), force any field that already has content to be visible. */
  forceShowFilled?: boolean;
}

const STORAGE_KEY_SYSTEM = "promptflow.compose.showSystem";
const STORAGE_KEY_CONTEXT = "promptflow.compose.showUserContext";

export function PromptComposeEditor({ value, onChange, disabled, forceShowFilled }: Props) {
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
        disabled={disabled}
        rows={10}
      />

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
  disabled,
  rows = 8,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
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
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        className="block w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
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
