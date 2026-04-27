"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PromptComposeEditor } from "@/components/prompt-compose-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ComposeShape } from "@/lib/prompt-shape";
import { updatePromptAction } from "../../actions";

interface Props {
  name: string;
  initialShape: ComposeShape;
  initialTags: string;
  baseVersion: number;
}

export function EditPromptForm({ name, initialShape, initialTags, baseVersion }: Props) {
  const [shape, setShape] = useState<ComposeShape>(initialShape);
  const [tags, setTags] = useState(initialTags);
  const [commit, setCommit] = useState("");
  const [promote, setPromote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData();
    fd.set("name", name);
    fd.set("system", shape.system);
    fd.set("userContext", shape.userContext);
    fd.set("main", shape.main);
    fd.set("tags", tags);
    fd.set("commitMessage", commit);
    if (promote) fd.set("promote", "on");

    startTransition(async () => {
      const result = await updatePromptAction(fd);
      if (!result.ok) {
        setError(result.error ?? null);
        setFieldErrors(result.fieldErrors ?? {});
        toast.error("Couldn't save", {
          description: result.error ?? "Check the form for issues",
        });
      } else {
        toast.success(
          promote
            ? `Saved as v${baseVersion + 1} · promoted to production`
            : `Saved as v${baseVersion + 1} · draft`,
        );
      }
    });
  }

  const dirty =
    shape.system !== initialShape.system ||
    shape.userContext !== initialShape.userContext ||
    shape.main !== initialShape.main ||
    tags !== initialTags;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-5 space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Body</span>
            <span className="text-xs text-muted-foreground">
              based on v{baseVersion}
              {dirty ? " · modified" : ""}
            </span>
          </div>
          <PromptComposeEditor
            value={shape}
            onChange={setShape}
            disabled={pending}
            forceShowFilled
          />
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

        <label className="flex items-start gap-3 pt-1 cursor-pointer">
          <input
            type="checkbox"
            name="promote"
            checked={promote}
            onChange={(e) => setPromote(e.target.checked)}
            disabled={pending}
            className="mt-1 size-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium block">Promote to production</span>
            <span className="text-xs text-muted-foreground">
              Off by default — saves as a draft. Tick to make this version the production label.
            </span>
          </span>
        </label>
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
