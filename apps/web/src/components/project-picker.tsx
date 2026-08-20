"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ProjectId, ProjectSummary } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { PROJECT_COOKIE_MAX_AGE_DAYS, PROJECT_COOKIE_NAME } from "./project-cookie";

interface ProjectPickerProps {
  projects: ProjectSummary[];
  current: ProjectId | null;
}

/**
 * Segmented control for switching the active prompt-storage project. Writes
 * a `pf-project` cookie (same pattern as `ViewToggle`'s `pf-view`) and
 * refreshes so every server component re-resolves against the new provider.
 */
export function ProjectPicker({ projects, current }: ProjectPickerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(id: ProjectId, configured: boolean): void {
    if (id === current || !configured) return;
    if (typeof document !== "undefined") {
      const maxAge = PROJECT_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
      document.cookie = `${PROJECT_COOKIE_NAME}=${id}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-muted/30 p-0.5 text-xs",
        pending && "opacity-70",
      )}
      role="tablist"
      aria-label="Active project"
    >
      {projects.map(({ id, label, configured }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={id === current}
          disabled={!configured}
          onClick={() => switchTo(id, configured)}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors",
            id === current
              ? "bg-background text-foreground shadow-sm"
              : configured
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground/40 cursor-not-allowed",
          )}
        >
          {label}
          {!configured && <span className="text-[0.65rem]">(not configured)</span>}
        </button>
      ))}
    </div>
  );
}
