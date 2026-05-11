"use client";

import { ScissorsIcon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  PerPromptCanvas,
  type NeighbourPrompt,
} from "@/components/canvas/per-prompt-canvas";
import { ExtractDialog } from "@/components/extract/extract-dialog";
import {
  PromptComposeEditor,
  type ComposeSelection,
} from "@/components/prompt-compose-editor";
import { TagPicker } from "@/components/tags/tag-picker";
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
  reverseRefs?: string[];
  corpusByName?: Record<string, NeighbourPrompt>;
}

function parseInitialTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function EditPromptForm({
  name,
  initialShape,
  initialTags,
  baseVersion,
  reverseRefs = [],
  corpusByName = {},
}: Props) {
  const [shape, setShape] = useState<ComposeShape>(initialShape);
  const [tags, setTags] = useState<string[]>(() => parseInitialTags(initialTags));
  const [selection, setSelection] = useState<ComposeSelection | null>(null);
  const [extractOpen, setExtractOpen] = useState(false);
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
    fd.set("tags", tags.join(","));
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
    tags.join(",") !== parseInitialTags(initialTags).join(",");

  // Concat the compose fields into a single text the reference parser can
  // walk. Order is irrelevant for reference detection — we only care which
  // prompt names appear anywhere in the draft.
  const composedBody = useMemo(
    () => [shape.system, shape.userContext, shape.main].filter(Boolean).join("\n\n"),
    [shape.system, shape.userContext, shape.main],
  );

  const hasRefsInBody = composedBody.includes("@@@langfusePrompt:");
  const hasNeighbours = reverseRefs.length > 0 || Object.keys(corpusByName).length > 0 || hasRefsInBody;

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasNeighbours ? (
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Composition graph</span>
            <span className="text-xs text-muted-foreground">
              live · edges update as you type Langfuse references
            </span>
          </div>
          <PerPromptCanvas
            focusedName={name}
            focusedVersion={baseVersion}
            focusedTags={tags}
            body={composedBody}
            reverseRefs={reverseRefs}
            corpusByName={corpusByName}
          />
        </Card>
      ) : null}
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
            onSelectionChange={setSelection}
          />
          {selection ? (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Selected {selection.text.length} chars in{" "}
                <span className="font-mono">{selection.field}</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setExtractOpen(true)}
                disabled={pending}
              >
                <ScissorsIcon className="size-3" /> Extract to prompt
              </Button>
            </div>
          ) : null}
          {fieldErrors.body ? (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.body}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Tags</span>
            <span className="text-xs text-muted-foreground">applies to all versions</span>
          </div>
          <TagPicker value={tags} onChange={setTags} disabled={pending} />
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
    {/* The ExtractDialog lives OUTSIDE the edit form on purpose. React's
        synthetic event system bubbles submit events through portals along the
        React tree, so a `<form>` inside a dialog rendered as a child of the
        edit form would fire the outer form's onSubmit when the user clicks
        the dialog's "Next" button — saving the prompt and redirecting before
        the REVIEW step ever paints. */}
    {selection ? (
      <ExtractDialog
        open={extractOpen}
        onOpenChange={setExtractOpen}
        sourceName={name}
        sourceShape={shape}
        sourceTags={tags}
        field={selection.field}
        selectionStart={selection.start}
        selectionEnd={selection.end}
        selectedText={selection.text}
        onExtracted={(rewrittenShape) => {
          setShape(rewrittenShape);
          setSelection(null);
        }}
      />
    ) : null}
    </>
  );
}
