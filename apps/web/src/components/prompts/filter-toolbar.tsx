"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { TagFilterBar } from "@/components/tags/tag-filter-bar";

interface FilterToolbarProps {
  tags: string[];
  mode: "and" | "or";
}

/**
 * Client-side wrapper around `<TagFilterBar>` that syncs selected tags and
 * match mode to the URL. The server component reads the URL on the next
 * render to filter prompts.
 */
export function FilterToolbar({ tags, mode }: FilterToolbarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function update(nextTags: string[], nextMode: "and" | "or"): void {
    const next = new URLSearchParams(params.toString());
    if (nextTags.length === 0) {
      next.delete("tag");
    } else {
      next.set("tag", nextTags.join(","));
    }
    if (nextMode === "or") next.set("mode", "or");
    else next.delete("mode");
    startTransition(() => {
      router.replace(`/prompts${next.toString() ? `?${next}` : ""}`);
    });
  }

  return (
    <TagFilterBar
      tags={tags}
      mode={mode}
      onTagsChange={(nextTags) => update(nextTags, mode)}
      onModeChange={(nextMode) => update(tags, nextMode)}
    />
  );
}
