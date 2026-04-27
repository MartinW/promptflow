"use client";

import { renderPrompt } from "@promptflow/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { ModelGroup } from "@/lib/openrouter";

export type PromptShape =
  | { type: "text"; body: string }
  | { type: "chat"; messages: { role: string; content: string }[] };

interface Props {
  promptName: string;
  version: number;
  shape: PromptShape;
  variables: string[];
  initialValues: Record<string, string>;
  modelGroups: ModelGroup[];
}

interface DoneEvent {
  type: "done";
  latencyMs: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}

type RunEvent = { type: "token"; content: string } | DoneEvent | { type: "error"; message: string };

export function AIPlay({
  promptName,
  version,
  shape,
  variables,
  initialValues,
  modelGroups,
}: Props) {
  const [varValues, setVarValues] = useState<Record<string, string>>(initialValues);
  const firstModelId =
    modelGroups.find((g) => g.models.length > 0)?.models[0]?.id ?? "openai/gpt-4o-mini";
  const [model, setModel] = useState<string>(firstModelId);
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<DoneEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Re-init variable map when prompt changes (rare; kept for safety).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when variables list changes
  useEffect(() => {
    setVarValues((prev) => {
      const next: Record<string, string> = { ...initialValues };
      for (const v of variables) {
        if (prev[v] !== undefined) next[v] = prev[v];
      }
      return next;
    });
  }, [variables]);

  const renderedPreview = useMemo(() => renderPreview(shape, varValues), [shape, varValues]);

  async function run() {
    if (running) return;
    setOutput("");
    setSummary(null);
    setError(null);
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptName,
          version,
          variables: varValues,
          model,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => res.statusText);
        try {
          const json = JSON.parse(text) as { error?: string };
          setError(json.error ?? text);
        } catch {
          setError(text);
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;
          let event: RunEvent;
          try {
            event = JSON.parse(data) as RunEvent;
          } catch {
            continue;
          }
          if (event.type === "token") {
            setOutput((prev) => prev + event.content);
          } else if (event.type === "done") {
            setSummary(event);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1.2fr] gap-4">
      <section className="space-y-2">
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Prompt body</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{shape.type}</Badge>
            <Badge variant="outline">v{version}</Badge>
          </div>
        </header>
        {shape.type === "text" ? (
          <Card className="p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap leading-6 max-h-[480px] overflow-y-auto">
              {shape.body}
            </pre>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {shape.messages.map((m, i) => (
              <Card
                // biome-ignore lint/suspicious/noArrayIndexKey: messages are positional
                key={`${i}-${m.role}`}
                className="p-3 space-y-1"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.role}
                </div>
                <pre className="text-sm font-mono whitespace-pre-wrap leading-6">{m.content}</pre>
              </Card>
            ))}
          </div>
        )}
        {variables.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {variables.length} {variables.length === 1 ? "variable" : "variables"} detected
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
          Variables &amp; model
        </h2>
        <Card className="p-4 space-y-4">
          {variables.length === 0 ? (
            <p className="text-sm text-muted-foreground">No variables — prompt runs as-is.</p>
          ) : (
            variables.map((v) => (
              <VariableInput
                key={v}
                name={v}
                value={varValues[v] ?? ""}
                onChange={(next) => setVarValues((prev) => ({ ...prev, [v]: next }))}
                disabled={running}
              />
            ))
          )}
          <Separator />
          <ModelPicker value={model} groups={modelGroups} disabled={running} onChange={setModel} />
          <div className="flex justify-end gap-2">
            {running ? (
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
            ) : (
              <Button onClick={run}>Run</Button>
            )}
          </div>
        </Card>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Rendered prompt preview
          </summary>
          <Card className="p-3 mt-2">
            <pre className="text-xs font-mono whitespace-pre-wrap leading-5">{renderedPreview}</pre>
          </Card>
        </details>
      </section>

      <section className="space-y-2">
        <header className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Output</h2>
          {running ? (
            <span className="text-xs text-muted-foreground animate-pulse">streaming…</span>
          ) : summary ? (
            <SummaryBadge summary={summary} />
          ) : null}
        </header>
        <Card className={`p-4 min-h-[400px] ${error ? "border-red-500/30 bg-red-500/5" : ""}`}>
          {error ? (
            <pre className="text-sm font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {error}
            </pre>
          ) : output ? (
            <pre className="text-sm whitespace-pre-wrap leading-6">{output}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              {running ? "Waiting for first token…" : "Output will appear here when you click Run."}
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}

function renderPreview(shape: PromptShape, vars: Record<string, string>): string {
  if (shape.type === "text") return renderPrompt(shape.body, vars);
  return shape.messages
    .map((m) => `[${m.role.toUpperCase()}]\n${renderPrompt(m.content, vars)}`)
    .join("\n\n");
}

function VariableInput({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const id = `var-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-mono block">
        {`{{${name}}}`}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Value for ${name}`}
        disabled={disabled}
      />
    </div>
  );
}

function ModelPicker({
  value,
  groups,
  disabled,
  onChange,
}: {
  value: string;
  groups: ModelGroup[];
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const id = "aiplay-model";
  const totalCount = groups.reduce((sum, g) => sum + g.models.length, 0);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          Model
        </label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {totalCount} available · price is $/M tokens (in/out)
        </span>
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {groups.map((group) => (
          <optgroup key={group.provider} label={group.provider}>
            {group.models.map((m) => (
              <option key={m.id} value={m.id}>
                {`${m.shortName} · ${m.contextLabel} · ${m.priceLabel}`}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function SummaryBadge({ summary }: { summary: DoneEvent }) {
  const tokens = summary.usage?.total_tokens;
  const cost = summary.usage?.cost;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {summary.latencyMs}ms
      {typeof tokens === "number" ? ` · ${tokens} tokens` : ""}
      {typeof cost === "number" ? ` · $${cost.toFixed(5)}` : ""}
    </span>
  );
}
