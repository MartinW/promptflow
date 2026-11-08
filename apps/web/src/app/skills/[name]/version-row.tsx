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
import { deleteSkillVersionAction, promoteSkillVersionAction } from "../actions";

interface VersionRowProps {
  name: string;
  version: number;
  isActive: boolean;
  isProduction: boolean;
}

/**
 * One row in the version-history list: link to view that version, plus
 * promote/delete affordances. A separate client component because each row
 * needs its own pending state for the two action buttons.
 */
export function VersionRow({ name, version, isActive, isProduction }: VersionRowProps) {
  const router = useRouter();
  const [promotePending, startPromote] = useTransition();

  function handlePromote() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("version", String(version));
    startPromote(async () => {
      const result = await promoteSkillVersionAction(fd);
      if (!result.ok) {
        toast.error("Couldn't promote version", { description: result.error });
      } else {
        toast.success(`v${version} promoted to production`);
        router.refresh();
      }
    });
  }

  return (
    <div className={`flex items-center justify-between gap-2 px-4 py-3 text-sm ${isActive ? "bg-accent/50" : ""}`}>
      <a href={`?v=${version}`} className="flex items-center gap-2 hover:underline">
        <span className="font-mono">v{version}</span>
        {isProduction ? <span className="text-xs text-emerald-600 dark:text-emerald-400">production</span> : null}
      </a>
      <div className="flex items-center gap-1">
        {!isProduction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={promotePending}
            onClick={handlePromote}
          >
            {promotePending ? "Promoting..." : "Promote"}
          </Button>
        ) : null}
        <DeleteVersionButton name={name} version={version} isProduction={isProduction} />
      </div>
    </div>
  );
}

function DeleteVersionButton({
  name,
  version,
  isProduction,
}: {
  name: string;
  version: number;
  isProduction: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("version", String(version));
    startTransition(async () => {
      const result = await deleteSkillVersionAction(fd);
      if (!result.ok) {
        setError(result.error ?? "Delete failed");
        toast.error("Couldn't delete version", { description: result.error });
      } else {
        toast.success(`v${version} deleted`);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" className="text-red-600 dark:text-red-400" />}>
        Delete
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete version {version}</DialogTitle>
          <DialogDescription>
            {isProduction
              ? "This version is live in production. Deleting it will break any agent that fetches this skill."
              : "This removes the version permanently. Can't be undone."}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">{error}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>Cancel</DialogClose>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
            {pending ? "Deleting..." : "Delete version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
