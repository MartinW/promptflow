"use client";

import { useRouter } from "next/navigation";
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
import { renamePromptAction } from "../actions";

export function RenameDialog({
  currentName,
  sourceType,
  hasProductionLabel,
}: {
  currentName: string;
  sourceType: "text" | "chat";
  hasProductionLabel: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [convertToChat, setConvertToChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canConvert = sourceType === "text";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const fd = new FormData();
    fd.set("oldName", currentName);
    fd.set("newName", newName.trim());
    if (canConvert && convertToChat) fd.set("convertToChat", "on");

    startTransition(async () => {
      const result = await renamePromptAction(fd);
      if (!result.ok) {
        setError(result.error ?? null);
        setFieldError(result.fieldErrors?.newName ?? null);
        toast.error("Couldn't rename prompt", {
          description: result.error ?? "Check the form for issues",
        });
        return;
      }

      if (result.oldKept) {
        toast.success(`Created ${result.newName}`, {
          description: `Old prompt "${currentName}" kept — update consumers and delete it manually when ready.`,
        });
      } else {
        toast.success(`Renamed to ${result.newName}`);
      }

      setOpen(false);
      if (result.newName) {
        router.push(`/prompts/${encodeURIComponent(result.newName)}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Rename</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename prompt</DialogTitle>
            <DialogDescription>
              {hasProductionLabel
                ? "Creates a new prompt under the new name. Consumers using the production label still resolve to the old name until you update them and re-promote."
                : "Creates a copy under the new name and deletes the old one. Safe because this prompt has no production label."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">From</span>
              <p className="font-mono text-sm break-all">{currentName}</p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="rename-newName"
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                To
              </label>
              <Input
                id="rename-newName"
                name="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="onboarding/welcome-email"
                disabled={pending}
                required
                autoFocus
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Letters, digits, dots, hyphens, underscores, slashes, or colons. Slashes create
                folders in Langfuse.
              </p>
              {fieldError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{fieldError}</p>
              ) : null}
            </div>

            {canConvert ? (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertToChat}
                  onChange={(e) => setConvertToChat(e.target.checked)}
                  disabled={pending}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span className="text-sm">
                  <span className="font-medium block">Convert to chat prompt</span>
                  <span className="text-xs text-muted-foreground">
                    The current text becomes a single user message. Edit the new prompt to split it
                    into system + user.
                  </span>
                </span>
              </label>
            ) : null}

            {hasProductionLabel ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-medium">Production prompt</p>
                <p className="mt-1 text-amber-700/80 dark:text-amber-400/80">
                  The old prompt won't be deleted automatically. Update any consumers fetching it by
                  name, then delete the old prompt from its detail page.
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Renaming..." : hasProductionLabel ? "Create copy" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
