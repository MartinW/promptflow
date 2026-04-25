"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PromptEditor } from "@/components/prompt-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updatePromptAction } from "../../actions";

interface Props {
  name: string;
  initialBody: string;
  initialTags: string;
  baseVersion: number;
}

export function EditPromptForm({ name, initialBody, initialTags, baseVersion }: Props) {
  const [body, setBody] = useState(initialBody);
  const [tags, setTags] = useState(initialTags);
  const [commit, setCommit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await updatePromptAction(formData);
      if (!result.ok) {
        setError(result.error ?? null);
        setFieldErrors(result.fieldErrors ?? {});
        toast.error("Couldn't save", {
          description: result.error ?? "Check the form for issues",
        });
      } else {
        toast.success(`Saved as v${baseVersion + 1}`);
      }
    });
  }

  const dirty = body !== initialBody || tags !== initialTags;

  return (
    <form action={onSubmit} className="space-y-6">
      <input type="hidden" name="name" value={name} />

      <Card className="p-5 space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Body</span>
            <span className="text-xs text-muted-foreground">
              based on v{baseVersion}
              {dirty ? " · modified" : ""}
            </span>
          </div>
          <PromptEditor name="body" value={body} onChange={setBody} disabled={pending} />
          {fieldErrors.body ? (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.body}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Tags</span>
            <span className="text-xs text-muted-foreground">
              comma-separated; applies to all versions
            </span>
          </div>
          <Input
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={pending}
            placeholder="voice, env:prod"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Commit message</span>
            <span className="text-xs text-muted-foreground">describe the change</span>
          </div>
          <Input
            name="commitMessage"
            value={commit}
            onChange={(e) => setCommit(e.target.value)}
            disabled={pending}
            placeholder="Tighten the system prompt"
          />
        </div>
      </Card>

      {error ? (
        <Card className="px-5 py-4 border-red-500/30 bg-red-500/5 text-sm">
          <p className="font-medium text-red-600 dark:text-red-400">Couldn't save</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 font-mono break-all">
            {error}
          </p>
        </Card>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Saving..." : `Save as v${baseVersion + 1}`}
        </Button>
      </div>
    </form>
  );
}
