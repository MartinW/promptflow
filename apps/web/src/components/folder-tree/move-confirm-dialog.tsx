"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { renamePromptAction } from "@/app/prompts/actions";
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

interface MoveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oldName: string;
  newName: string;
  /** When true, surface an extra warning — the prompt has a production label. */
  hasProductionLabel?: boolean;
  onMoved?: (newName: string, oldKept: boolean) => void;
}

/**
 * Confirms a drag-to-folder move. Surfaces Langfuse's rename-as-fork
 * semantics explicitly so the user can't accidentally orphan a production-
 * labelled prompt: renaming forks a new prompt at v1 under the new name, and
 * the old name is either deleted (no production label) or kept in place
 * (production label) and must be cleaned up manually.
 */
export function MoveConfirmDialog({
  open,
  onOpenChange,
  oldName,
  newName,
  hasProductionLabel,
  onMoved,
}: MoveConfirmDialogProps) {
  const [pending, startTransition] = useTransition();

  function handleConfirm(): void {
    const fd = new FormData();
    fd.set("oldName", oldName);
    fd.set("newName", newName);
    startTransition(async () => {
      const result = await renamePromptAction(fd);
      if (!result.ok) {
        toast.error("Move failed", { description: result.error ?? "Check the form" });
        return;
      }
      toast.success(
        result.oldKept
          ? `Created ${result.newName} · old prompt kept (production label)`
          : `Moved to ${result.newName}`,
      );
      onMoved?.(result.newName ?? newName, result.oldKept ?? false);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move prompt?</DialogTitle>
          <DialogDescription>
            Renames <code className="font-mono">{oldName}</code> →{" "}
            <code className="font-mono">{newName}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Langfuse keys prompts by name, so this creates a fresh prompt at v1 under the new name —
            version history does not move.
          </p>
          {hasProductionLabel ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              The source has a <span className="font-mono">production</span> label. The old prompt
              will be <strong>kept</strong> so live consumers don't break — clean it up manually
              after migrating callers.
            </p>
          ) : (
            <p className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
              No production label detected — the old prompt will be deleted after the new one is
              created.
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
            Cancel
          </DialogClose>
          <Button type="button" onClick={handleConfirm} disabled={pending}>
            {pending ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
