"use client";

import { parseSkillFrontmatter } from "@promptflow/core";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSkillVersionAction } from "../actions";

const TEMPLATE = `---
name: skill-name
description: Describe when to use this skill.
---
Instructions for the agent.
`;

interface ExtraFile {
  path: string;
  content: string;
}

export function NewSkillForm() {
  const [skillMd, setSkillMd] = useState(TEMPLATE);
  const [extraFiles, setExtraFiles] = useState<ExtraFile[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [promote, setPromote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!parseSkillFrontmatter(skillMd)) {
      setFieldErrors({
        skillMd: "SKILL.md must start with a --- frontmatter block containing name and description",
      });
      return;
    }

    const fd = new FormData();
    fd.set("skillMd", skillMd);
    fd.set("extraFiles", JSON.stringify(extraFiles));
    fd.set("commitMessage", commitMessage);
    if (promote) fd.set("promote", "on");

    startTransition(async () => {
      const result = await createSkillVersionAction(fd);
      if (!result.ok) {
        setError(result.error ?? null);
        setFieldErrors(result.fieldErrors ?? {});
        toast.error("Couldn't create skill", { description: result.error ?? "Check the form for issues" });
      }
    });
  }

  function addFile() {
    setExtraFiles((prev) => [...prev, { path: "", content: "" }]);
  }

  function updateFile(index: number, patch: Partial<ExtraFile>) {
    setExtraFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFile(index: number) {
    setExtraFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-5 space-y-5">
        <Field label="SKILL.md" hint="Must start with a --- frontmatter block (name, description)" error={fieldErrors.skillMd}>
          <Textarea
            value={skillMd}
            onChange={(e) => setSkillMd(e.target.value)}
            disabled={pending}
            rows={16}
            className="font-mono text-sm"
            required
          />
        </Field>

        <Field label="Commit message" hint="Optional">
          <Input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Initial version"
            disabled={pending}
          />
        </Field>

        <label className="flex items-start gap-3 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={promote}
            onChange={(e) => setPromote(e.target.checked)}
            disabled={pending}
            className="mt-1 size-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium block">Promote to production</span>
            <span className="text-xs text-muted-foreground">
              Off by default. Saves as v1 with no label — promote later when ready.
            </span>
          </span>
        </label>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Supporting files</h2>
          <Button type="button" variant="outline" size="sm" onClick={addFile} disabled={pending}>
            + Add file
          </Button>
        </div>
        {extraFiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Optional. Add any additional files referenced from SKILL.md's instructions.
          </p>
        ) : null}
        {extraFiles.map((file, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional, no stable id until saved
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={file.path}
                onChange={(e) => updateFile(i, { path: e.target.value })}
                placeholder="references/example.md"
                disabled={pending}
                className="font-mono text-sm"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(i)} disabled={pending}>
                Remove
              </Button>
            </div>
            <Textarea
              value={file.content}
              onChange={(e) => updateFile(i, { content: e.target.value })}
              disabled={pending}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        ))}
      </Card>

      {error ? (
        <Card className="px-5 py-4 border-red-500/30 bg-red-500/5 text-sm">
          <p className="font-medium text-red-600 dark:text-red-400">Couldn't create skill</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 font-mono break-all">{error}</p>
        </Card>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create skill"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hint && !error ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
