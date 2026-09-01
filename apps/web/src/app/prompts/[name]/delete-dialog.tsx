"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deletePromptAction } from "../actions";

export function DeleteDialog({
  name,
  versionCount,
  hasProductionLabel,
}: {
  name: string;
  versionCount: number;
  hasProductionLabel: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requiresTyping = hasProductionLabel;
  const typedMatches = confirmText === name;
  const canSubmit = !pending && (!requiresTyping || typedMatches);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const fd = new FormData();
    fd.set("name", name);

    startTransition(async () => {
      const result = await deletePromptAction(fd);
      // The action redirects on success, so we only see a return value on failure.
      if (result?.ok === false) {
        setError(result.error ?? "Delete failed");
        toast.error("Couldn't delete prompt", {
          description: result.error ?? "Try again or check the Langfuse UI",
        });
      }
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmText("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="destructive" />}>Delete</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Delete prompt</DialogTitle>
            <DialogDescription>
              {hasProductionLabel
                ? "This prompt is live in production. Deleting it will break any consumer that fetches it by name."
                : `Removes all ${versionCount} version${versionCount === 1 ? "" : "s"} from Langfuse. This can't be undone.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Prompt</span>
              <p className="font-mono text-sm break-all">{name}</p>
            </div>

            {hasProductionLabel ? (
              <>
                <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                  <p className="font-medium">Production prompt</p>
                  <p className="mt-1 text-red-700/80 dark:text-red-400/80">
                    Make sure all consumers have stopped fetching this name before continuing.
                    Existing traces in Langfuse may lose their prompt link.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="delete-confirm"
                    className="text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Type the prompt name to confirm
                  </label>
                  <Input
                    id="delete-confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={name}
                    disabled={pending}
                    autoFocus
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </>
            ) : null}

            {error ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>
              Cancel
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={!canSubmit}>
              {pending ? "Deleting..." : `Delete ${versionCount > 1 ? "all versions" : "prompt"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
