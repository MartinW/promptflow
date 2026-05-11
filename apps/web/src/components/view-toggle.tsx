"use client";

import { LayoutListIcon, NetworkIcon, ScanSearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export type PromptsView = "list" | "canvas" | "duplicates";

interface ViewToggleProps {
  current: PromptsView;
  className?: string;
}

const OPTIONS: Array<{ value: PromptsView; label: string; Icon: typeof LayoutListIcon }> = [
  { value: "list", label: "List", Icon: LayoutListIcon },
  { value: "canvas", label: "Canvas", Icon: NetworkIcon },
  { value: "duplicates", label: "Duplicates", Icon: ScanSearchIcon },
];

export const VIEW_COOKIE_NAME = "pf-view";
const VIEW_COOKIE_MAX_AGE_DAYS = 30;

/**
 * Segmented control that swaps the `?view=` query param on /prompts.
 * Preserves all other params so search + tag filters survive the switch,
 * and writes a `pf-view` cookie so the choice persists across navigations
 * back to `/prompts` from a prompt detail page or external link.
 */
export function ViewToggle({ current, className }: ViewToggleProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function switchTo(view: PromptsView): void {
    if (view === current) return;
    const next = new URLSearchParams(params.toString());
    next.set("view", view);
    if (typeof document !== "undefined") {
      const maxAge = VIEW_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
      document.cookie = `${VIEW_COOKIE_NAME}=${view}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    startTransition(() => {
      router.replace(`/prompts${next.toString() ? `?${next}` : ""}`);
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-muted/30 p-0.5 text-xs",
        pending && "opacity-70",
        className,
      )}
      role="tablist"
      aria-label="Prompts view"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={value === current}
          onClick={() => switchTo(value)}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors",
            value === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
