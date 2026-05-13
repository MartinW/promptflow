"use client";

import { Combobox } from "@base-ui/react/combobox";
import { namespaceColor, Namespaces } from "@promptflow/core";
import { XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface TagPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Hidden field name for traditional form submission. Set to enable a hidden `<input name>` with the joined value. */
  name?: string;
  className?: string;
}

const KNOWN_NAMESPACE_PREFIXES = Object.values(Namespaces).map((ns) => `${ns}:`);

/**
 * Multi-select tag picker with autocomplete sourced from `/api/prompts/tags`
 * plus the known namespace prefixes. Free-form entry is allowed — pressing
 * Enter on a non-matching value commits it as a new tag. Backspace on an
 * empty input pops the most recent chip.
 *
 * Built on Base UI's native multi-select Combobox + chips. Tags render with
 * the same namespace-coloured background as `<TagBadge>` so the picker
 * preview matches the saved state.
 */
export function TagPicker({
  value,
  onChange,
  disabled,
  placeholder = "voice, env:prod",
  name,
  className,
}: TagPickerProps) {
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/prompts/tags")
      .then((r) => r.json())
      .then((data: { tags?: Array<{ value: string }> }) => {
        if (cancelled) return;
        const tags = (data.tags ?? []).map((t) => t.value);
        setAllTags(tags);
      })
      .catch(() => {
        // Suggestions are optional — free-form entry still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const merged = new Set<string>(allTags);
    for (const prefix of KNOWN_NAMESPACE_PREFIXES) merged.add(prefix);
    // Don't suggest values already selected.
    for (const v of value) merged.delete(v);
    return Array.from(merged).sort();
  }, [allTags, value]);

  return (
    <div className={cn("relative", className)}>
      <Combobox.Root
        multiple
        items={suggestions}
        value={value}
        onValueChange={(next) => onChange(next as string[])}
        disabled={disabled}
      >
        <Combobox.Chips className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
          {value.map((tag) => {
            const color = namespaceColor(tag);
            return (
              <Combobox.Chip
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: `hsl(${color.hue} 80% 92%)`,
                  color: `hsl(${color.hue} 70% 26%)`,
                  borderColor: `hsl(${color.hue} 60% 80%)`,
                }}
              >
                {tag}
                <Combobox.ChipRemove
                  className="inline-flex size-3 items-center justify-center rounded-full hover:bg-black/10"
                  aria-label={`Remove ${tag}`}
                >
                  <XIcon className="size-3" />
                </Combobox.ChipRemove>
              </Combobox.Chip>
            );
          })}
          <Combobox.Input
            placeholder={value.length === 0 ? placeholder : ""}
            className="min-w-[6rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </Combobox.Chips>
        <Combobox.Portal>
          <Combobox.Positioner align="start" sideOffset={4} className="z-50">
            <Combobox.Popup className="max-h-72 w-(--anchor-width) min-w-48 overflow-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
              <Combobox.Empty className="px-2 py-1.5 text-xs text-muted-foreground">
                Press Enter to add a new tag
              </Combobox.Empty>
              <Combobox.List>
                {(item: string) => (
                  <Combobox.Item
                    key={item}
                    value={item}
                    className="cursor-default rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-muted"
                  >
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {name ? <input type="hidden" name={name} value={value.join(",")} /> : null}
    </div>
  );
}
