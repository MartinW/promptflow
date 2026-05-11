"use client";

import type { DuplicateGroup } from "@promptflow/core";
import { ScissorsIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkExtractDuplicateAction } from "@/app/prompts/_actions/extract";
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

interface DuplicateExtractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: DuplicateGroup;
}

const NAME_PATTERN = /^[a-zA-Z0-9._:/-]+$/;

export function DuplicateExtractDialog({ open, onOpenChange, group }: DuplicateExtractDialogProps) {
  const [newName, setNewName] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [commit, setCommit] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(
    () => new Set(group.occurrences.map((o) => o.promptName)),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function toggleTarget(name: string): void {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!newName.trim()) {
      setFieldErrors({ newName: "Name is required" });
      return;
    }
    if (!NAME_PATTERN.test(newName.trim())) {
      setFieldErrors({
        newName: "Use letters, digits, dots, hyphens, underscores, slashes, or colons",
      });
      return;
    }
    if (selectedTargets.size === 0) {
      setError("Pick at least one prompt to rewrite");
      return;
    }

    const fd = new FormData();
    fd.set("snippet", group.text);
    fd.set("newName", newName.trim());
    fd.set("newTags", newTags.join(","));
    fd.set("commitMessage", commit.trim());
    fd.set("targetNames", Array.from(selectedTargets).join(","));

    startTransition(async () => {
      const result = await bulkExtractDuplicateAction(fd);
      if (!result.ok) {
        setError(result.error ?? null);
        setFieldErrors(result.fieldErrors ?? {});
        toast.error("Extract failed", { description: result.error ?? "Check the form" });
        return;
      }
      const appliedCount = result.appliedTargets?.length ?? 0;
      const failedCount = result.failedTargets?.length ?? 0;
      toast.success(
        `Extracted to ${result.newName} · applied to ${appliedCount} prompt(s)` +
          (failedCount > 0 ? ` · ${failedCount} failed` : ""),
      );
      for (const failure of result.failedTargets ?? []) {
        toast.error(`Failed: ${failure.name}`, { description: failure.error });
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Extract duplicate to prompt</DialogTitle>
          <DialogDescription>
            Creates a new prompt with this block and replaces it with{" "}
            <code className="font-mono">{`{{@new-name}}`}</code> in each selected target.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <span className="text-sm font-medium">Duplicate text</span>
            <pre className="max-h-40 overflow-auto rounded border bg-muted px-2 py-1.5 font-mono text-xs whitespace-pre-wrap">
              {group.text}
            </pre>
            <p className="text-xs text-muted-foreground">
              {group.text.length} chars · found in {group.occurrences.length} prompts (
              {group.totalOccurrences} total occurrences)
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="dup-name">
              New prompt name
            </label>
            <Input
              id="dup-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="shared/system/persona"
              disabled={pending}
              autoFocus
            />
            {fieldErrors.newName ? (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.newName}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium">Tags</span>
            <TagPicker value={newTags} onChange={setNewTags} disabled={pending} />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium">Apply to</span>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-2">
              {group.occurrences.map((occ) => (
                <li key={occ.promptName}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-background">
                    <input
                      type="checkbox"
                      checked={selectedTargets.has(occ.promptName)}
                      onChange={() => toggleTarget(occ.promptName)}
                      disabled={pending}
                      className="size-3.5 accent-primary"
                    />
                    <span className="flex-1 truncate font-mono">{occ.promptName}</span>
                    <span className="text-muted-foreground">
                      {occ.count} {occ.count === 1 ? "match" : "matches"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="dup-commit">
              Commit message
            </label>
            <Input
              id="dup-commit"
              value={commit}
              onChange={(e) => setCommit(e.target.value)}
              placeholder={`Replaced shared block with {{@${newName || "new-prompt"}}}`}
              disabled={pending}
            />
          </div>
          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Extracting…" : (
                <span className="inline-flex items-center gap-1">
                  <ScissorsIcon className="size-3" />
                  Extract + apply to {selectedTargets.size}
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
