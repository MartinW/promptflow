"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSkillTagsAction } from "../actions";

/**
 * Inline tag editor for the skill detail page. Tags are shared across every
 * version of a skill (Langfuse's `update` endpoint has no version scoping),
 * so this edits them independently of publishing a new version.
 */
export function TagsForm({ name, initialTags }: { name: string; initialTags: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState(initialTags.join(", "));
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    fd.set("tags", value);
    startTransition(async () => {
      const result = await updateSkillTagsAction(fd);
      if (!result.ok) {
        toast.error("Couldn't update tags", { description: result.error });
      } else {
        toast.success("Tags updated");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="comma, separated, tags"
        disabled={pending}
        className="max-w-sm"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save tags"}
      </Button>
    </form>
  );
}
