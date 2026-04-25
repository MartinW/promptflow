"use client";

import { renderPrompt } from "@promptflow/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface Props {
  promptName: string;
  version: number;
  body: string;
  variables: string[];
  modelOptions: string[];
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

export function AIPlay({ promptName, version, body, variables, modelOptions }: Props) {
  const [varValues, setVarValues] = useState<Record<string, string>>(
    Object.fromEntries(variables.map((v) => [v, ""])),
  );
  const [model, setModel] = useState<string>(modelOptions[0] ?? "openai/gpt-4o-mini");
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<DoneEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Re-init variable map when prompt changes (rare; kept for safety).
  useEffect(() => {
    setVarValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of variables) next[v] = prev[v] ?? "";
      return next;
    });
  }, [variables]);

  const renderedPreview = useMemo(() => renderPrompt(body, varValues), [body, varValues]);

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
          <Badge variant="outline">v{version}</Badge>
        </header>
        <Card className="p-4">
          <pre className="text-sm font-mono whitespace-pre-wrap leading-6 max-h-[480px] overflow-y-auto">
            {body}
          </pre>
        </Card>
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
          <ModelPicker
            value={model}
            options={modelOptions}
            disabled={running}
            onChange={setModel}
          />
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
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const id = "aiplay-model";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium block">
        Model
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
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
