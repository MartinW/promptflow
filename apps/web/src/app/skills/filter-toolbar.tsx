"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { TagFilterBar } from "@/components/tags/tag-filter-bar";

interface FilterToolbarProps {
  tags: string[];
  mode: "and" | "or";
}

/**
 * Same pattern as the prompts list's `FilterToolbar`, pointed at `/skills`
 * and the skills tag-suggestion endpoint — kept as a separate small
 * component rather than generalizing that one, since it hardcodes the
 * `/prompts` redirect path.
 */
export function SkillsFilterToolbar({ tags, mode }: FilterToolbarProps) {
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
      router.replace(`/skills${next.toString() ? `?${next}` : ""}`);
    });
  }

  return (
    <TagFilterBar
      tags={tags}
      mode={mode}
      onTagsChange={(nextTags) => update(nextTags, mode)}
      onModeChange={(nextMode) => update(tags, nextMode)}
      fetchUrl="/api/skills/tags"
      suggestNamespaces={false}
    />
  );
}
