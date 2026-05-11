"use client";

import { ScanSearchIcon, ScissorsIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  extractPromptAction,
  type ExtractPromptResult,
  type OccurrenceMatch,
  scanOccurrencesAction,
} from "@/app/prompts/_actions/extract";
import type { ComposeField } from "@/components/prompt-compose-editor";
import { TagPicker } from "@/components/tags/tag-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ComposeShape } from "@/lib/prompt-shape";
import { ExtractOccurrencesList } from "./extract-occurrences-list";

interface ExtractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  sourceShape: ComposeShape;
  sourceTags: string[];
  field: ComposeField;
  selectionStart: number;
  selectionEnd: number;
  selectedText: string;
  onExtracted: (rewrittenShape: ComposeShape, newName: string) => void;
}

const NAME_PATTERN = /^[a-zA-Z0-9._:/-]+$/;

type Step = "collect" | "review";

export function ExtractDialog({
  open,
  onOpenChange,
  sourceName,
  sourceShape,
  sourceTags,
  field,
  selectionStart,
  selectionEnd,
  selectedText,
  onExtracted,
}: ExtractDialogProps) {
  const [step, setStep] = useState<Step>("collect");
  const [newName, setNewName] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [commit, setCommit] = useState("");
  const [matches, setMatches] = useState<OccurrenceMatch[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function reset(): void {
    setStep("collect");
    setNewName("");
    setNewTags([]);
    setCommit("");
    setMatches([]);
    setSelectedTargets(new Set());
    setError(null);
    setFieldErrors({});
  }

  function validateCollect(): boolean {
    setFieldErrors({});
    if (!newName.trim()) {
      setFieldErrors({ newName: "Name is required" });
      return false;
    }
    if (!NAME_PATTERN.test(newName.trim())) {
      setFieldErrors({
        newName: "Use letters, digits, dots, hyphens, underscores, slashes, or colons",
      });
      return false;
    }
    return true;
  }

  function goReview(): void {
    if (!validateCollect()) return;
    setError(null);
    startTransition(async () => {
      const result = await scanOccurrencesAction(selectedText, sourceName);
      if (!result.ok || !result.matches) {
        setError(result.error ?? "Couldn't scan corpus");
        return;
      }
      setMatches(result.matches);
      setSelectedTargets(new Set());
      setStep("review");
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Belt-and-braces: even when the dialog is rendered outside any other
    // form, stopping propagation here means a future caller can render it
    // anywhere without re-discovering the "submit bubbles up the React tree
    // through the portal" footgun.
    e.stopPropagation();
    if (step === "collect") {
      goReview();
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.set("sourceName", sourceName);
    fd.set("sourceSystem", sourceShape.system);
    fd.set("sourceUserContext", sourceShape.userContext);
    fd.set("sourceMain", sourceShape.main);
    fd.set("sourceTags", sourceTags.join(","));
    fd.set("field", field);
    fd.set("selectionStart", String(selectionStart));
    fd.set("selectionEnd", String(selectionEnd));
    fd.set("newName", newName.trim());
    fd.set("newTags", newTags.join(","));
    fd.set("commitMessage", commit.trim());
    fd.set("applyToNames", Array.from(selectedTargets).join(","));

    startTransition(async () => {
      const result: ExtractPromptResult = await extractPromptAction(fd);
      if (!result.ok) {
        setError(result.error ?? null);
        setFieldErrors(result.fieldErrors ?? {});
        toast.error("Extract failed", { description: result.error ?? "Check the form" });
        return;
      }
      const appliedCount = result.appliedTargets.length;
      const failedCount = result.failedTargets.length;
      toast.success(
        `Extracted to ${result.newName}` +
          (appliedCount > 0 ? ` · applied to ${appliedCount} other prompt(s)` : "") +
          (failedCount > 0 ? ` · ${failedCount} failed` : ""),
      );
      if (failedCount > 0) {
        for (const failure of result.failedTargets) {
          toast.error(`Failed: ${failure.name}`, { description: failure.error });
        }
      }
      onExtracted(result.rewrittenShape, result.newName);
      onOpenChange(false);
      reset();
    });
  }

  function toggleTarget(name: string): void {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAll(): void {
    setSelectedTargets(new Set(matches.map((m) => m.promptName)));
  }

  function clearAll(): void {
    setSelectedTargets(new Set());
  }

  function close(open: boolean): void {
    onOpenChange(open);
    if (!open) reset();
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "collect" ? "Extract to prompt" : "Apply to other prompts?"}
          </DialogTitle>
          <DialogDescription>
            {step === "collect" ? (
              <>
                Creates a new prompt with the selected text and replaces it in this prompt with a
                Langfuse reference tag pinned to <code className="font-mono">label=latest</code> so
                future edits to the new prompt propagate.
              </>
            ) : (
              <>
                These prompts also contain the extracted text. Tick the ones you want rewritten —
                each will get a new version with the snippet replaced by the reference.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === "collect" ? (
            <CollectStep
              selectedText={selectedText}
              field={field}
              sourceName={sourceName}
              newName={newName}
              setNewName={setNewName}
              newTags={newTags}
              setNewTags={setNewTags}
              commit={commit}
              setCommit={setCommit}
              fieldErrors={fieldErrors}
              disabled={pending}
            />
          ) : (
            <ReviewStep
              matches={matches}
              selectedTargets={selectedTargets}
              onToggle={toggleTarget}
              onSelectAll={selectAll}
              onClearAll={clearAll}
              selectedText={selectedText}
              disabled={pending}
            />
          )}
          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          <DialogFooter>
            {step === "review" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("collect")}
                disabled={pending}
              >
                Back
              </Button>
            ) : null}
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                step === "collect" ? "Scanning…" : "Extracting…"
              ) : step === "collect" ? (
                <span className="inline-flex items-center gap-1">
                  <ScanSearchIcon className="size-3" /> Next: scan corpus
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <ScissorsIcon className="size-3" />
                  Extract{selectedTargets.size > 0 ? ` + apply to ${selectedTargets.size}` : ""}
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CollectStepProps {
  selectedText: string;
  field: ComposeField;
  sourceName: string;
  newName: string;
  setNewName: (v: string) => void;
  newTags: string[];
  setNewTags: (v: string[]) => void;
  commit: string;
  setCommit: (v: string) => void;
  fieldErrors: Record<string, string>;
  disabled: boolean;
}

function CollectStep({
  selectedText,
  field,
  sourceName,
  newName,
  setNewName,
  newTags,
  setNewTags,
  commit,
  setCommit,
  fieldErrors,
  disabled,
}: CollectStepProps) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="extract-snippet">
          Selected text
        </label>
        <pre
          id="extract-snippet"
          className="max-h-32 overflow-auto rounded border bg-muted px-2 py-1.5 font-mono text-xs whitespace-pre-wrap"
        >
          {selectedText}
        </pre>
        <p className="text-xs text-muted-foreground">
          {selectedText.length} characters · in <span className="font-mono">{field}</span> field of{" "}
          <span className="font-mono">{sourceName}</span>
        </p>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="extract-name">
          New prompt name
        </label>
        <Input
          id="extract-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="shared/system/persona"
          disabled={disabled}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Slashes create folders. Conventional namespaces: voice, image, eval, app, lang, env.
        </p>
        {fieldErrors.newName ? (
          <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.newName}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="extract-tags">
          Tags
        </label>
        <TagPicker value={newTags} onChange={setNewTags} disabled={disabled} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="extract-commit">
          Commit message
        </label>
        <Input
          id="extract-commit"
          value={commit}
          onChange={(e) => setCommit(e.target.value)}
          placeholder={`Extracted shared block to @${newName || "new-prompt"}`}
          disabled={disabled}
        />
      </div>
    </>
  );
}

interface ReviewStepProps {
  matches: OccurrenceMatch[];
  selectedTargets: Set<string>;
  onToggle: (name: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  selectedText: string;
  disabled: boolean;
}

function ReviewStep({
  matches,
  selectedTargets,
  onToggle,
  onSelectAll,
  onClearAll,
  selectedText,
  disabled,
}: ReviewStepProps) {
  return (
    <div className="space-y-2">
      {matches.length > 0 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Found in {matches.length} other prompt{matches.length === 1 ? "" : "s"} · default off
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={disabled}
              className="underline hover:text-foreground"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={disabled}
              className="underline hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
      <ExtractOccurrencesList
        matches={matches}
        selected={selectedTargets}
        onToggle={onToggle}
        snippet={selectedText}
        disabled={disabled}
      />
    </div>
  );
}
