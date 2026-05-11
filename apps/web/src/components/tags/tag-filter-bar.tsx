"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TagBadge } from "./tag-badge";
import { TagPicker } from "./tag-picker";

interface TagFilterBarProps {
  tags: string[];
  onTagsChange: (next: string[]) => void;
  mode: "and" | "or";
  onModeChange: (next: "and" | "or") => void;
  className?: string;
}

/**
 * Multi-tag filter for the prompt list. Renders selected tags as chips with
 * a single-click remove and exposes an AND/OR toggle that flips the matching
 * semantics. Sits below the prompt grid header.
 */
export function TagFilterBar({
  tags,
  onTagsChange,
  mode,
  onModeChange,
  className,
}: TagFilterBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">Filter by tags</span>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onModeChange(mode === "and" ? "or" : "and")}
            className={cn(
              "rounded border px-2 py-0.5 font-mono uppercase tracking-wide",
              "hover:bg-muted",
              tags.length < 2 && "opacity-50",
            )}
            disabled={tags.length < 2}
            title={
              tags.length < 2
                ? "Add at least two tags to toggle match mode"
                : `Currently matching when ${mode === "and" ? "every" : "any"} tag is present`
            }
          >
            {mode}
          </button>
        </div>
      </div>
      <TagPicker
        value={tags}
        onChange={onTagsChange}
        placeholder="Pick tags to filter…"
        className="w-full"
      />
      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag}>
              {tag}
            </TagBadge>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onTagsChange([])}
            className="h-6 px-2 text-xs"
          >
            <XIcon className="size-3" /> Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
