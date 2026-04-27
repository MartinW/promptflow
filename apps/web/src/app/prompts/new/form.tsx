"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PromptEditor } from "@/components/prompt-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPromptAction } from "../actions";

export function NewPromptForm() {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createPromptAction(formData);
      if (!result.ok) {
        setError(result.error ?? null);
        setFieldErrors(result.fieldErrors ?? {});
        toast.error("Couldn't create prompt", {
          description: result.error ?? "Check the form for issues",
        });
      } else {
        toast.success("Prompt created");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Card className="p-5 space-y-5">
        <Field
          label="Name"
          hint="Used to fetch this prompt; can include namespaced segments like voice:greeting"
          error={fieldErrors.name}
        >
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="voice:greeting"
            disabled={pending}
            required
          />
        </Field>

        <Field label="Body" error={fieldErrors.body}>
          <PromptEditor
            name="body"
            value={body}
            onChange={setBody}
            disabled={pending}
            placeholder="You are a helpful assistant. Greet {{name}} warmly."
          />
        </Field>

        <Field
          label="Tags"
          hint="Comma-separated. Convention: voice, image, eval, app:<name>:<feature>, lang:en-GB, env:prod"
        >
          <Input
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="voice, env:prod"
            disabled={pending}
          />
        </Field>
      </Card>

      {error ? (
        <Card className="px-5 py-4 border-red-500/30 bg-red-500/5 text-sm">
          <p className="font-medium text-red-600 dark:text-red-400">Couldn't create prompt</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 font-mono break-all">
            {error}
          </p>
        </Card>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create prompt"}
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
